// Explicit, local-only warm upgrade. Never invoked by startup or tests.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { databaseSource } from '../apps/backend/dist/kernel/database/data-source.js';
import { migrate } from '../apps/backend/dist/kernel/database/migration-runner.js';
import { backfillWorkspace } from '../apps/backend/dist/modules/conversation/workspace-storage.js';
import { backfillActivity } from '../apps/backend/dist/modules/conversation/activity-storage.js';
import { fixtureId,seedUsers,seedIdentity } from '../apps/backend/dist/modules/identity/seed.js';
import { passwordHash } from '../apps/backend/dist/modules/identity/auth/password.js';
import { PLATFORM_TENANT_ID as system } from '../apps/backend/dist/kernel/database/system-scope.js';
const env=parseEnv(await readFile('.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||!['localhost','127.0.0.1'].includes(new URL(env.APP_ORIGIN).hostname))throw new Error('LOCAL_UPGRADE_DENIED');
for(const key of ['MYSQL_USER','MYSQL_AUTH_USER'])if(!/^[a-z][a-z0-9_]{0,40}$/.test(env[key]??'')||env[key]==='root')throw new Error('ROLE_INVALID');
if(env.MYSQL_AUTH_USER===env.MYSQL_USER||!/^[a-f0-9]{64}$/.test(env.MYSQL_AUTH_PASSWORD??''))throw new Error('AUTH_ROLE_INVALID');
const status=await(await fetch('http://127.0.0.1:3020/status',{signal:AbortSignal.timeout(5000)})).json();
if(status.services.filter(s=>['api','worker'].includes(s.id)).some(s=>s.owned||!['stopped'].includes(s.health)))throw new Error('STOP_APPLICATION_WRITERS');
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:null,maxBuffer:128*1024*1024,windowsHide:true,timeout:60000});if(r.status!==0)throw new Error('LOCAL_DOCKER_OPERATION_FAILED');return r.stdout;};
// Independent container writer check; stopped host ports were checked through monitor above.
const running=docker(['ps','--filter','label=com.docker.compose.project=agentic-crm','--format','{{.Label "com.docker.compose.service"}}']).toString().trim().split('\n');
if(running.some(x=>['api','worker'].includes(x.trim())))throw new Error('STOP_CONTAINER_WRITERS');
await mkdir('artifacts/SRC-038',{recursive:true});const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const backup=docker(['exec','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF agentic_crm']);
await writeFile(`artifacts/SRC-038/pre-native-${stamp}.sql`,backup,{mode:0o600,flag:'wx'});
Object.assign(process.env,env,{MYSQL_HOST:'127.0.0.1',MYSQL_PORT:env.LOCAL_MYSQL_PORT??'13306'});
const source=databaseSource(true);await source.initialize();
const before={};
try{
  const journalExists=await source.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migration'");
  const originalVersion=journalExists.length?Number((await source.query('SELECT COALESCE(MAX(version),0) version FROM schema_migration'))[0].version):0;
  const tables=await source.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'");
  for(const {name} of tables){if(!/^[a-z][a-z0-9_]*$/.test(name))throw new Error('INVALID_TABLE');const columns=(await source.query('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[name])).map(x=>x.name);const rows=await source.query(`SELECT ${columns.map(x=>'`'+x+'`').join(',')} FROM \`${name}\`${name==='tenant'?` WHERE id<>'${system}'`:''}`);before[name]={columns,rows:rows.map(x=>JSON.stringify(x)).sort()};}
  const applied=await migrate(source);await backfillWorkspace(source);await backfillActivity(source);
  const comparisons=[];
  for(const [name,{columns,rows}] of Object.entries(before)){const where=name==='tenant'?` WHERE id<>'${system}'`:name==='schema_migration'?` WHERE version<=${originalVersion}`:'';const actual=(await source.query(`SELECT ${columns.map(x=>'`'+x+'`').join(',')} FROM \`${name}\`${where}`)).map(x=>JSON.stringify(x)).sort();if(JSON.stringify(rows)!==JSON.stringify(actual))throw new Error('PRESERVATION_CHECK_FAILED:'+name);comparisons.push(name);}
  if(process.argv.includes('--seed'))await seedIdentity(source,{issuer:'urn:agentic-crm:native',subjects:Object.fromEntries(seedUsers.map(user=>[user,fixtureId(`native:${user}`)]))},{...process.env,IDENTITY_SEED_MODE:'native'});
  // Enroll only known fixture memberships, never match/adopt accounts by email.
  let enrolled=0,preserved=0;
  for(const user of seedUsers){
    const label=user==='beta_admin'?'beta':'alpha';const [member]=await source.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[fixtureId(`clinic_${label}`),fixtureId(`${label}:member:${user}`)]);
    if(!member)throw new Error('FIXTURE_MEMBERSHIP_MISSING');
    const runner=source.createQueryRunner();await runner.connect();
    try{await runner.startTransaction();const [account]=await runner.query('SELECT id,login_key FROM account WHERE tenant_id=? AND id=? FOR UPDATE',[system,member.account_id]);if(!account||(account.login_key!==null&&account.login_key!==user))throw new Error('FIXTURE_ACCOUNT_CONFLICT');
      const credentials=await runner.query('SELECT version FROM account_credential WHERE tenant_id=? AND account_id=?',[system,account.id]);
      if(credentials.length){if(account.login_key!==user)throw new Error('FIXTURE_LOGIN_CONFLICT');preserved++;}
      else{const encoded=await passwordHash(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await runner.query('UPDATE account SET login_key=? WHERE tenant_id=? AND id=?',[user,system,account.id]);await runner.query('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?)',[system,account.id,encoded,Date.now()]);enrolled++;}
      await runner.commitTransaction();
    }catch(error){await runner.rollbackTransaction();throw error;}finally{await runner.release();}
  }
  const names=(await source.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'")).map(x=>x.name);
  const authTables=['account_credential','auth_session','auth_token','auth_challenge','auth_attempt','system_audit_entry'];
  const sql=[`CREATE USER IF NOT EXISTS '${env.MYSQL_AUTH_USER}'@'%' IDENTIFIED BY '${env.MYSQL_AUTH_PASSWORD}';`,`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${env.MYSQL_USER}'@'%';`,`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${env.MYSQL_AUTH_USER}'@'%';`];
  for(const name of names){if(authTables.includes(name))continue;const permissions=['audit_entry','ownership_history'].includes(name)?'SELECT,INSERT':['account','schema_migration'].includes(name)?'SELECT':'SELECT,INSERT,UPDATE,DELETE';sql.push(`GRANT ${permissions} ON agentic_crm.\`${name}\` TO '${env.MYSQL_USER}'@'%';`);}
  sql.push(`GRANT SELECT,UPDATE(security_revision) ON agentic_crm.account TO '${env.MYSQL_AUTH_USER}'@'%';`);
  for(const name of authTables)sql.push(`GRANT ${name==='system_audit_entry'?'INSERT':'SELECT,INSERT,UPDATE,DELETE'} ON agentic_crm.\`${name}\` TO '${env.MYSQL_AUTH_USER}'@'%';`);
  docker(['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],sql.join('\n'));
  // Add missing settings to private host API config without rotating other values.
  const path='.local/services/api.env';let text=await readFile(path,'utf8');for(const key of ['MYSQL_AUTH_USER','MYSQL_AUTH_PASSWORD'])if(!new RegExp('^'+key+'=','m').test(text))text+='\n'+key+'='+JSON.stringify(env[key]);await writeFile(path,text+'\n',{mode:0o600});
  const evidence={applied,enrolled,preserved,originalTablesCompared:comparisons,backup:`pre-native-${stamp}.sql`,backupSha256:createHash('sha256').update(backup).digest('hex'),repeatApplied:await migrate(source)};
  await writeFile(`artifacts/SRC-038/local-upgrade-${stamp}.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify({applied,enrolled,preserved,originalTablesCompared:comparisons.length,repeatApplied:evidence.repeatApplied}));
}finally{await source.destroy();}
