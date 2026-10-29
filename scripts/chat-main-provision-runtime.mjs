// Explicit local provisioning after reconciled copy. Still leaves Chat shadow.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {createPool} from './lib/chat-native.mjs';
import {loadMainFinalSnapshot} from './lib/chat-main-preflight.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
import {canonical} from './lib/chat-exact.mjs';
import {grantMainOwners} from './lib/chat-main-grants.mjs';
import {applyRuntimeGrants,applyAuthGrants,chatExclusiveTables} from '../services/core-baseline/dist/kernel/database/runtime-grants.js';
import {WorkloadRegistryOperator} from '../services/core-baseline/dist/modules/identity/workload-registry.js';
import {verifyRuntimeLineage} from '../services/chat/dist/runtime-lineage.js';
import {checkChatGrants} from '../services/chat/dist/runtime-checks.js';
import {ingressTables} from '../services/chat/dist/ingress-schema.js';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{DataSource}=require('typeorm');
if(process.argv.length!==3||process.argv[2]!=='--fenced-local-main')throw Error('EXPLICIT_MAIN_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const snapshot=await loadMainFinalSnapshot(),out=await mainEvidenceDirectory(),data=JSON.parse(await readFile(out+'/main-data.json','utf8'));
if(data.status!=='READY_FOR_RUNTIME_PROVISIONING')throw Error('VALIDATED_MAIN_DATA_REQUIRED');
const cfg=JSON.parse(await readFile('.local/chat-main/credentials.json','utf8')),identityEnv=parseEnv(await readFile('.local/human-outbound/identity.env','utf8'));
if(cfg.environment!=='local-main'||cfg.database!=='agentic_crm')throw Error('MAIN_CREDENTIAL_SCOPE');
const common={host:'127.0.0.1',port:13306,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true};
const root=createPool({...common,user:'root',password:env.MYSQL_ROOT_PASSWORD,database:'agentic_crm',connectionLimit:1});
const source=new DataSource({type:'mysql',...common,database:'agentic_crm',username:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,synchronize:false});
const report={status:'IN_PROGRESS',phase:'fence',checks:[]};
async function make(c){if(!/^main_[a-z]+$/.test(c.user)||!/^[a-f0-9]{64}$/.test(c.password))throw Error('MAIN_CREDENTIAL_FORMAT');await root.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[c.user,c.password]);await root.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[c.user]);}
async function clone(old,role){
 const c=cfg.users[role];await make(c);const [rows]=await root.query("SHOW GRANTS FOR ?@'%'",[old]);let n=0;
 for(const r of rows){const g=String(Object.values(r)[0]);if(g.startsWith('GRANT USAGE ON *.*'))continue;
  // The retired Marketing login had schema-wide LOCK TABLES. Current native
  // transactions use row locks; do not transfer this unnecessary broad right.
  if(role==='marketing'&&/^GRANT LOCK TABLES ON `agentic_crm`\.\* TO /.test(g))continue;
  const m=/^GRANT (.+) ON `agentic_crm`\.`([a-z_]+)` TO /.exec(g);if(!m||/ALL|GRANT OPTION/.test(g)||chatExclusiveTables.has(m[2])||m[2].startsWith('chat_'))throw Error('UNREVIEWED_RETAINED_GRANT_'+role);await root.query(`GRANT ${m[1]} ON agentic_crm.\`${m[2]}\` TO ?@'%'`,[c.user]);n++;}
 if(!n)throw Error('RETAINED_GRANTS_EMPTY');await root.query("GRANT SELECT ON agentic_crm.schema_migration TO ?@'%'",[c.user]);
}
try{
 for(const a of snapshot.manifest.fence.accounts){const [[r]]=await root.query('SELECT account_locked FROM mysql.user WHERE User=? AND Host=?',[a.user,a.host]);if(r?.account_locked!=='Y')throw Error('OLD_WRITER_UNLOCKED');}
 const [gates]=await root.query('SELECT mode,epoch FROM crm_chat.chat_writer_gate');if(gates.length!==snapshot.manifest.tenants.length||gates.some(g=>g.mode!=='shadow'||String(g.epoch)!=='1'))throw Error('CHAT_NOT_SHADOW');
 report.phase='owner-grants';await grantMainOwners(root,'agentic_crm',cfg.users);
 for(const role of ['api','worker']){await make(cfg.users[role]);await applyRuntimeGrants(root,'agentic_crm',cfg.users[role].user);}
 await applyAuthGrants(root,'agentic_crm',cfg.users.auth.user,cfg.users.auth.password);
 await clone('outbound_identity','dispatch');await clone(identityEnv.WORKLOAD_REGISTRY_USER,'registry');await clone('marketing_authority_local','marketing');
 report.phase='routing-actor';
 for(const actor of JSON.parse(await readFile('.local/chat-main/actor-seeds.json','utf8'))){
  if(!snapshot.manifest.tenants.includes(actor.tenant_id))throw Error('ACTOR_TENANT');
  const permissions=JSON.stringify(['read','assign'].map(action=>({resource:'conversation',action,scope:'all'})));
  await root.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'human_routing_dispatch','Human routing dispatcher',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[actor.role_id,actor.tenant_id,permissions]);
  const [[role]]=await root.execute('SELECT id,permissions FROM `role` WHERE tenant_id=? AND `key`=?',[actor.tenant_id,'human_routing_dispatch']);if(role?.id!==actor.role_id||canonical(typeof role.permissions==='string'?JSON.parse(role.permissions):role.permissions)!==canonical(JSON.parse(permissions)))throw Error('ACTOR_ROLE_DRIFT');
  await root.execute("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'human_routing_dispatch',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[actor.id,actor.tenant_id,actor.role_id]);
  const [[row]]=await root.execute('SELECT id,role_id,active FROM service_actor WHERE tenant_id=? AND `key`=?',[actor.tenant_id,'human_routing_dispatch']);if(row.id!==actor.id||row.role_id!==actor.role_id||!row.active)throw Error('ACTOR_DRIFT');
 }
 report.phase='workload-enrollment';await source.initialize();const registry=new WorkloadRegistryOperator(source);
 for(const service of ['identity','chat','connector','bff','crm','routing','sales','workflow']){
  let v=await registry.initialize(service);const [r]=await source.query('SELECT enabled FROM identity_workload_service WHERE service=?',[service]);if(!r.enabled)v=await registry.setEnabled(service,v,true);
  for(const t of snapshot.manifest.tenants){const [a]=await source.query('SELECT enabled FROM identity_workload_admission WHERE tenant_id=? AND service=?',[t,service]);if(!a?.enabled)v=await registry.admit(service,v,t,true);}
 }
 report.phase='chat-grants';const dictionary=JSON.parse(await readFile('services/chat/migrations/dictionary.json','utf8'));
 for(const role of ['api','worker']){
  const c=cfg.chat[role];if(c.user!=='chat_main_'+role||!/^[a-f0-9]{64}$/.test(c.password))throw Error('CHAT_CREDENTIAL');
  await root.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[c.user,c.password]);await root.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[c.user]);
  for(const t of dictionary.tables)if(t.grants[role].length)await root.query(`GRANT ${t.grants[role].join(',')} ON crm_chat.\`${t.name}\` TO ?@'%'`,[c.user]);
  for(const table of ingressTables)await root.query(`GRANT SELECT,INSERT,UPDATE ON crm_chat.\`${table}\` TO ?@'%'`,[c.user]);
  const p=createPool({...common,...c,database:'crm_chat'});try{await checkChatGrants(p,'crm_chat');const con=await p.getConnection();try{await verifyRuntimeLineage(con);}finally{con.release();}await assert.rejects(()=>p.query('SELECT * FROM agentic_crm.tenant LIMIT 1'),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));}finally{await p.end();}
 }
 report.checks.push('chat-own-schema-and-lineage');report.phase='negative-grants';
 for(const role of ['api','worker','identity','crm','connector','routing','sales','workflow']){
  const p=createPool({...common,...cfg.users[role],database:'agentic_crm'});try{await assert.rejects(()=>p.query('SELECT * FROM conversation LIMIT 1'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');await assert.rejects(()=>p.query('SELECT * FROM crm_chat.conversation LIMIT 1'),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));}finally{await p.end();}
 }
 report.checks.push('eight-baseline-credentials-deny-old-and-new-chat');
 report.status='READY_FOR_ACTIVATION';report.phase='complete';
}catch(e){report.status='FAIL';report.error=e.code??e.message;process.exitCode=1;}finally{if(source.isInitialized)await source.destroy();await root.end();await writeFile(out+'/main-runtime-provision.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
