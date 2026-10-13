import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { connect,migrate,digest,systemTenant } from './lib/reporting-database.mjs';
const test=process.argv.includes('--test'),db=test?'test_crm_reporting':'crm_reporting',prefix=test?'rpt_test':'rpt_local',file=`.local/reporting${test?'-test':''}.env`;
if(process.argv.slice(2).some(x=>x!=='--test'))throw new Error('UNSUPPORTED_ARGUMENT');
const local=parseEnv(await readFile('.env','utf8'));
if(local.APP_ENV!=='development'||local.MYSQL_DATABASE!=='agentic_crm'||!['127.0.0.1','localhost'].includes(new URL(local.APP_ORIGIN).hostname))throw new Error('LOCAL_DEVELOPMENT_ONLY');
await mkdir('.local',{recursive:true});await mkdir('artifacts/reporting-database',{recursive:true});
try{await writeFile(file,`REPORTING_DB_HOST=127.0.0.1\nREPORTING_DB_PORT=13306\nREPORTING_DB_NAME=${db}\nREPORTING_OPERATOR_USER=${prefix}_operator\nREPORTING_OPERATOR_PASSWORD=${randomBytes(32).toString('hex')}\nREPORTING_RUNTIME_USER=${prefix}_runtime\nREPORTING_RUNTIME_PASSWORD=${randomBytes(32).toString('hex')}\nREPORTING_ADMISSION_KEY=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
const env=parseEnv(await readFile(file,'utf8'));if(env.REPORTING_DB_NAME!==db)throw new Error('WRONG_DATABASE');
for(const role of ['OPERATOR','RUNTIME'])if(env[`REPORTING_${role}_USER`]!==`${prefix}_${role.toLowerCase()}`||!/^[a-f0-9]{64}$/.test(env[`REPORTING_${role}_PASSWORD`]))throw new Error('INVALID_LOCAL_ROLE');
function docker(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true,timeout:60000});if(r.status!==0)throw new Error('LOCAL_DOCKER_OPERATION_FAILED');return r.stdout;}
const sql=q=>docker(['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --skip-column-names'],q);
if(sql(`SELECT COUNT(*) FROM agentic_crm.tenant WHERE tenant_id='${systemTenant}' AND id='${systemTenant}' AND kind='system';`).trim()!=='1')throw new Error('PLATFORM_TENANT_NOT_REGISTERED');
const crmBefore=sql('SELECT MAX(version) FROM agentic_crm.schema_migration;').trim();const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');let backup=null;
if(sql(`SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${db}';`).trim()==='1'){
 backup=`artifacts/reporting-database/${db}-${stamp}.sql`;await writeFile(backup,docker(['exec','agentic-crm-mysql-1','sh','-c',`MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces --set-gtid-purged=OFF ${db}`]),{flag:'wx',mode:0o600});
}
sql(`CREATE DATABASE IF NOT EXISTS ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
CREATE USER IF NOT EXISTS '${env.REPORTING_OPERATOR_USER}'@'%' IDENTIFIED BY '${env.REPORTING_OPERATOR_PASSWORD}';
CREATE USER IF NOT EXISTS '${env.REPORTING_RUNTIME_USER}'@'%' IDENTIFIED BY '${env.REPORTING_RUNTIME_PASSWORD}';
GRANT ALL ON ${db}.* TO '${env.REPORTING_OPERATOR_USER}'@'%';`);
const c=await connect(env);
async function fingerprint(){const [tables]=await c.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migration'");const result={};for(const {name}of tables){if(!/^report_[a-z_]+$/.test(name))throw new Error('UNKNOWN_TABLE');const [rows]=await c.query('SELECT * FROM `'+name+'`');result[name]=digest(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort()));}return result;}
try{
 const before=await fingerprint(),result=await migrate(c),after=await fingerprint();for(const [name,value]of Object.entries(before))if(after[name]!==value)throw new Error('PRESERVATION_FAILED');
 sql(Object.keys(after).map(name=>`GRANT ${['report_definition','report_source_binding','report_projection_generation','report_query_run'].includes(name)?'SELECT,INSERT,UPDATE':'SELECT,INSERT'} ON ${db}.${name} TO '${env.REPORTING_RUNTIME_USER}'@'%';`).join('\n'));
 const crmAfter=sql('SELECT MAX(version) FROM agentic_crm.schema_migration;').trim();if(crmBefore!==crmAfter)throw new Error('CRM_SCHEMA_CHANGED');
 const evidence={database:db,...result,repeat:await migrate(c),businessTables:Object.keys(after).length,preservedTables:Object.keys(before).length,crmBefore,crmAfter,backup};
 await writeFile(`artifacts/reporting-database/${db}-${stamp}.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await c.end();}
