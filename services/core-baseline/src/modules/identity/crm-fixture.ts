import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { fixtureId } from './seed.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
// Identity-owned port. Called only by the guarded local fixture in the same UoW.
export async function grantM1Fixture(scope:TransactionScope,label:string){
  const tenant=scope.context.tenantId;if(tenant!==fixtureId(`clinic_${label}`)||!['alpha','beta'].includes(label))throw new Error('SEED_TENANT_DENIED');
  const resources=['contact','company','activity','lead','appointment','service_offering'];
  const admin=[...resources.flatMap(resource=>['read','create','update','archive',...(resource==='lead'?['qualify']:[])].map(action=>({resource,action,scope:'all'}))),...['read','create','update'].map(action=>({resource:'schema',action,scope:'all'})),...['read','create'].map(action=>({resource:'association',action,scope:'all'}))];
  const viewer=[...resources.map(resource=>({resource,action:'read',scope:'all'})),{resource:'association',action:'read',scope:'all'}];
  for(const [kind,permissions] of [['admin',admin],['viewer',viewer]] as const){
    const id=fixtureId(`${label}:role:m1_crm_${kind}`);await scope.query('INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,`m1_crm_${kind}`,`M1 CRM ${kind}`,JSON.stringify(permissions)]);
    const principal=fixtureId(`${label}:human:${kind==='admin'?label+'_admin':'read_only'}`);
    const [p]=await scope.query('SELECT id FROM principal WHERE tenant_id=? AND id=?',[tenant,principal]);if(!p)throw new Error('SEED_IDENTITY_REQUIRED');
    await scope.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,principal,id]);
    await scope.query('UPDATE principal SET version=version+1,auth_revision=auth_revision+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,principal]);
    const [updated]=await scope.query('SELECT version,auth_revision FROM principal WHERE tenant_id=? AND id=?',[tenant,principal]);
    await new DurableCommands().fixtureAccessChanged(scope,{id:principal,version:String(updated.version),auth_revision:String(updated.auth_revision)});
  }
}
