import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
import { seedGuard,fixtureId } from './seed.js';
import { requireActiveTenant } from './authorization.js';
// Additive local fixture: preserve any existing role or revocation on repeat.
export async function seedRouting(source:DataSource,env=process.env){
  seedGuard(env);if(source.options.type!=='mysql'||source.options.host!==env.MYSQL_HOST||source.options.database!==env.MYSQL_DATABASE)throw new Error('SEED_DATABASE_DENIED');
  let created=0;const uow=new UnitOfWork(source);
  for(const label of ['alpha','beta'])await uow.run({tenantId:fixtureId(`clinic_${label}`)},async s=>{
    await requireActiveTenant(s,true);const role=fixtureId(`${label}:role:routing_operator`),principal=fixtureId(`${label}:human:${label}_admin`);
    if((await s.query('SELECT id FROM `role` WHERE tenant_id=? AND id=?',[s.context.tenantId,role])).length)return;
    const [p]=await s.query("SELECT id FROM principal WHERE tenant_id=? AND id=? AND status='active'",[s.context.tenantId,principal]);if(!p)throw new Error('SEED_IDENTITY_REQUIRED');
    const grants=['read','assign','takeover'].map(action=>({resource:'conversation',action,scope:'all'}));
    await s.query('INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,\'routing_operator\',\'Routing operator\',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[role,s.context.tenantId,JSON.stringify(grants)]);
    await s.query('INSERT INTO principal_role VALUES (?,?,?)',[s.context.tenantId,principal,role]);
    await s.query('UPDATE principal SET auth_revision=auth_revision+1,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[s.context.tenantId,principal]);
    const [updated]=await s.query('SELECT id,version,auth_revision FROM principal WHERE tenant_id=? AND id=?',[s.context.tenantId,principal]);await new DurableCommands().fixtureAccessChanged(s,updated,'routing-fixture-v1');created++;
  });return {created,existing:2-created};
}
