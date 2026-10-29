import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
// Bootstrap-only Identity port; caller is guarded local seed under tenant lock.
export async function ingressFixture(s:TransactionScope,ids:{role:string;actor:string;operatorRole:string;admin:string},existing:boolean){
  if(existing){
    const [actor]=await s.query('SELECT role_id FROM service_actor WHERE tenant_id=? AND id=?',[s.context.tenantId,ids.actor]);
    const roles=await s.query('SELECT id FROM `role` WHERE tenant_id=? AND id IN (?,?)',[s.context.tenantId,ids.role,ids.operatorRole]);
    if(actor?.role_id!==ids.role||roles.length!==2)throw new Error('SEED_INCOMPLETE');return;
  }
  const [admin]=await s.query("SELECT p.id FROM principal p JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id=? AND p.status='active' AND m.status='active' AND m.seat_code='admin'",[s.context.tenantId,ids.admin]);if(!admin)throw new Error('SEED_IDENTITY_REQUIRED');
  for(const [id,key,permissions] of [[ids.role,'mock_ingress',[{resource:'integration',action:'deliver',scope:'all'}]],[ids.operatorRole,'integration_operator',['read','retry'].map(action=>({resource:'integration',action,scope:'all'}))]] as const)await s.query('INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,s.context.tenantId,key,key,JSON.stringify(permissions)]);
  await s.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'mock_messenger_ingress',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ids.actor,s.context.tenantId,ids.role]);
  await s.query('INSERT INTO principal_role VALUES (?,?,?)',[s.context.tenantId,ids.admin,ids.operatorRole]);
  await s.query('UPDATE principal SET auth_revision=auth_revision+1,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[s.context.tenantId,ids.admin]);
  const [principal]=await s.query('SELECT id,version,auth_revision FROM principal WHERE tenant_id=? AND id=?',[s.context.tenantId,ids.admin]);await new DurableCommands().fixtureAccessChanged(s,principal,'channels-fixture-v1');
}
