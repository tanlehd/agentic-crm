// Explicit local provisioning; no provider credential/config activation.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const local=parseEnv(await readFile('.env','utf8'));
if(local.APP_ENV!=='development'||local.MYSQL_DATABASE!=='agentic_crm')throw new Error('LOCAL_ONLY');
const test=process.argv.includes('--test'),db=test?'native_seed_test':'agentic_crm',user=test?'marketing_authority_test':'marketing_authority_local',path=`.local/marketing-authority${test?'-test':''}.env`;
await mkdir('.local',{recursive:true});try{await writeFile(path,`MYSQL_MARKETING_USER=${user}\nMYSQL_MARKETING_PASSWORD=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
const env=parseEnv(await readFile(path,'utf8'));if(env.MYSQL_MARKETING_USER!==user||!/^[a-f0-9]{64}$/.test(env.MYSQL_MARKETING_PASSWORD))throw new Error('ROLE_CONFIG_INVALID');
const queries=[`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${env.MYSQL_MARKETING_PASSWORD}';`,`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${user}'@'%';`];
// MySQL requires LOCK TABLES (or a write grant) for FOR UPDATE on read-only Identity rows.
// Keep Identity non-writable while retaining the existing authorization serialization protocol.
queries.push(`GRANT LOCK TABLES ON ${db}.* TO '${user}'@'%';`);
for(const table of ['tenant','membership','principal','role','principal_role','team','team_member'])queries.push(`GRANT SELECT ON ${db}.\`${table}\` TO '${user}'@'%';`);
queries.push(`GRANT SELECT,INSERT,UPDATE ON ${db}.channel_marketing_credential TO '${user}'@'%';`,`GRANT SELECT,INSERT ON ${db}.channel_marketing_admission_receipt TO '${user}'@'%';`,`GRANT SELECT,UPDATE(marketing_admission_state,marketing_admission_version) ON ${db}.facebook_page TO '${user}'@'%';`,`GRANT SELECT,INSERT,UPDATE,DELETE ON ${db}.idempotency_record TO '${user}'@'%';`,`GRANT INSERT ON ${db}.audit_entry TO '${user}'@'%';`);
const r=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:queries.join('\n'),encoding:'utf8',windowsHide:true,timeout:30000});if(r.status!==0)throw new Error('MARKETING_GRANTS_FAILED');
if(!test){const p='.local/services/api.env';let text=await readFile(p,'utf8');for(const key of ['MYSQL_MARKETING_USER','MYSQL_MARKETING_PASSWORD'])if(!new RegExp('^'+key+'=','m').test(text))text+='\n'+key+'='+env[key];await writeFile(p,text+'\n',{mode:0o600});}
console.log(`PASS dedicated Marketing authority role on ${db}; provider integration remains disabled without explicit configuration`);
