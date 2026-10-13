// Explicit local database provisioning only. No service startup, Meta calls or schedules.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { connect,migrate,digest,systemTenant } from './lib/marketing-database.mjs';
const test=process.argv.includes('--test');
const db=test?'test_crm_marketing':'crm_marketing';
const prefix=test?'mkt_test':'mkt_local';
const file=`.local/marketing${test?'-test':''}.env`;
const local=parseEnv(await readFile('.env','utf8'));
if(local.APP_ENV!=='development'||local.MYSQL_DATABASE!=='agentic_crm'||!['localhost','127.0.0.1'].includes(new URL(local.APP_ORIGIN).hostname))throw new Error('LOCAL_DEVELOPMENT_ONLY');
await mkdir('.local',{recursive:true});await mkdir('artifacts/marketing-database',{recursive:true});
try{await writeFile(file,`MARKETING_DB_HOST=127.0.0.1\nMARKETING_DB_PORT=13306\nMARKETING_DB_NAME=${db}\nMARKETING_OPERATOR_USER=${prefix}_operator\nMARKETING_OPERATOR_PASSWORD=${randomBytes(32).toString('hex')}\nMARKETING_RUNTIME_USER=${prefix}_runtime\nMARKETING_RUNTIME_PASSWORD=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
const env=parseEnv(await readFile(file,'utf8'));
if(env.MARKETING_DB_NAME!==db)throw new Error('WRONG_DATABASE');
for(const role of ['OPERATOR','RUNTIME'])if(env[`MARKETING_${role}_USER`]!==`${prefix}_${role.toLowerCase()}`||!/^[a-f0-9]{64}$/.test(env[`MARKETING_${role}_PASSWORD`]))throw new Error('INVALID_LOCAL_ROLE');
function docker(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:128*1024*1024,windowsHide:true,timeout:60000});if(r.status!==0)throw new Error('LOCAL_DOCKER_OPERATION_FAILED');return r.stdout;}
const sql=q=>docker(['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --skip-column-names'],q);
// Registered system tenant must already exist. This is an operator precondition, not a service cross-schema query.
if(sql(`SELECT COUNT(*) FROM agentic_crm.tenant WHERE tenant_id='${systemTenant}' AND id='${systemTenant}' AND kind='system';`).trim()!=='1')throw new Error('PLATFORM_TENANT_NOT_REGISTERED');
const crmVersionBefore=sql('SELECT MAX(version) FROM agentic_crm.schema_migration;').trim();
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const exists=sql(`SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${db}';`).trim()==='1';
let backup=null;
if(exists){const data=docker(['exec','agentic-crm-mysql-1','sh','-c',`MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces --set-gtid-purged=OFF ${db}`]);backup=`artifacts/marketing-database/${db}-${stamp}.sql`;await writeFile(backup,data,{flag:'wx',mode:0o600});}
sql(`CREATE DATABASE IF NOT EXISTS ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
CREATE USER IF NOT EXISTS '${env.MARKETING_OPERATOR_USER}'@'%' IDENTIFIED BY '${env.MARKETING_OPERATOR_PASSWORD}';
CREATE USER IF NOT EXISTS '${env.MARKETING_RUNTIME_USER}'@'%' IDENTIFIED BY '${env.MARKETING_RUNTIME_PASSWORD}';
GRANT ALL ON ${db}.* TO '${env.MARKETING_OPERATOR_USER}'@'%';`);
const c=await connect(env);
async function fingerprint(previous){
 const [tables]=await c.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migration'");const out={};
 for(const {name} of tables){
  if(!/^[a-z_]+$/.test(name))throw new Error('TABLE_NAME_DENIED');
  const [cols]=await c.execute('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[name]);
  const columns=previous?.[name]?.columns??cols.map(x=>x.name);
  if(columns.some(x=>!cols.some(y=>y.name===x)||!/^[a-z_][a-z0-9_]*$/.test(x)))throw new Error('PRESERVATION_COLUMN_MISSING');
  const [rows]=await c.query('SELECT '+columns.map(x=>'`'+x+'`').join(',')+' FROM `'+name+'`');
  out[name]={columns,hash:digest(JSON.stringify(rows.map(x=>JSON.stringify(x)).sort()))};
 }return out;
}
try{
 const before=await fingerprint(),result=await migrate(c),after=await fingerprint(before);
 for(const [name,hash] of Object.entries(before))if(after[name].hash!==hash.hash)throw new Error('PRESERVATION_FAILED:'+name);
 const immutable=new Set(['marketing_operation_receipt','marketing_change_event','marketing_object_observation','marketing_page_instagram_link','marketing_creative_revision','marketing_content_variant','marketing_targeting_revision','marketing_targeting_audience_ref','marketing_ad_creative_binding','marketing_insight_grain','marketing_insight_observation','marketing_insight_action']);
 sql(Object.keys(after).map(name=>`GRANT ${immutable.has(name)?'SELECT,INSERT':'SELECT,INSERT,UPDATE,DELETE'} ON ${db}.${name} TO '${env.MARKETING_RUNTIME_USER}'@'%';`).join('\n'));
 const crmVersionAfter=sql('SELECT MAX(version) FROM agentic_crm.schema_migration;').trim();
 if(crmVersionBefore!==crmVersionAfter)throw new Error('CRM_SCHEMA_CHANGED_DURING_PROVISIONING');
 const evidence={database:db,...result,repeat:await migrate(c),businessTables:Object.keys(after).length,preservedTables:Object.keys(before).length,crmVersionBefore,crmVersionAfter,backup};
 await writeFile(`artifacts/marketing-database/${db}-${stamp}.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await c.end();}

