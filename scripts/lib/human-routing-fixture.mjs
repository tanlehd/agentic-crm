import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {fixtureId} from '../../apps/backend/dist/modules/identity/seed.js';
import {passwordHash} from '../../apps/backend/dist/modules/identity/auth/password.js';
import {PLATFORM_TENANT_ID} from '../../apps/backend/dist/kernel/database/system-scope.js';
export async function humanRoutingFixture(ds){
 assert(['agentic_crm','native_seed_test'].includes(ds.options.database));assert(['127.0.0.1','localhost'].includes(ds.options.host));
 const file='.local/human-routing-'+ds.options.database+'.json';let f;
 try{f=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;f={tenant:fixtureId('clinic_alpha'),team:fixtureId('hr:team'),connection:fixtureId('hr:connection'),token:randomBytes(32).toString('hex'),agents:['lan','minh'].map(name=>({name:'Routing '+name,login:'routing_'+name,password:randomBytes(24).toString('base64url'),account:fixtureId('hr:account:'+name),member:fixtureId('hr:member:'+name),principal:fixtureId('hr:principal:'+name)}))};await writeFile(file,JSON.stringify(f),{flag:'wx',mode:0o600});}
 const role=fixtureId('hr:role');await ds.transaction(async m=>{
  await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[f.tenant]);
  if(!(await m.query('SELECT id FROM team WHERE tenant_id=? AND id=?',[f.tenant,f.team]))[0])await m.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Routing Demo · Tư vấn','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[f.team,f.tenant]);
  if(!(await m.query('SELECT id FROM `role` WHERE tenant_id=? AND id=?',[f.tenant,role]))[0])await m.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'human_routing_demo','Routing Demo agents',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,f.tenant,JSON.stringify([...['read','reply','note','update','takeover'].map(action=>({resource:'conversation',action,scope:'own'})),{resource:'contact',action:'read',scope:'all'}])]);
  for(const a of f.agents){
   if(!(await m.query('SELECT id FROM account WHERE tenant_id=? AND id=?',[PLATFORM_TENANT_ID,a.account]))[0]){
    await m.query("INSERT INTO account(id,tenant_id,issuer,subject,display_name,login_key,created_at,updated_at) VALUES (?,?,'urn:agentic-crm:native',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[a.account,PLATFORM_TENANT_ID,a.account,a.name,a.login]);
    await m.query('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?)',[PLATFORM_TENANT_ID,a.account,await passwordHash(a.password),Date.now()]);
    await m.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[a.member,f.tenant,a.account]);
    await m.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[a.principal,f.tenant,a.member]);
    await m.query('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)',[f.tenant,a.principal,role]);
    await m.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[f.tenant,f.team,a.principal]);
   }
  }
  if(!(await m.query('SELECT id FROM channel_connection WHERE tenant_id=? AND id=?',[f.tenant,f.connection]))[0]){
   const [source]=await m.query('SELECT service_actor_id FROM channel_connection WHERE tenant_id=? AND id=?',[f.tenant,fixtureId('alpha:mock_connection')]);assert(source?.service_actor_id);
   await m.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id,service_actor_id,credential_hash) VALUES (?,?,'mock_messenger','synthetic-human-routing-page',?,?,?)",[f.connection,f.tenant,f.team,source.service_actor_id,createHash('sha256').update(f.token).digest('hex')]);
  }
 });return f;
}
