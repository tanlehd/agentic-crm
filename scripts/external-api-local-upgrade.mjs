import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';

const env=parseEnv(await readFile('.env','utf8'));assert.equal(env.APP_ENV,'development');assert.equal(env.MYSQL_DATABASE,'agentic_crm');assert.equal(env.APP_ORIGIN,'http://localhost:18080');assert(/^[a-z][a-z0-9_]{0,40}$/.test(env.MYSQL_USER));
const origin='http://127.0.0.1:3020',html=await(await fetch(origin)).text(),token=/const token='([a-f0-9]+)'/.exec(html)?.[1];assert(token);
const status=async()=>await(await fetch(origin+'/status')).json(),action=async(id,act)=>{const r=await fetch(`${origin}/service/${id}/${act}`,{method:'POST',headers:{Origin:origin,'X-Local-Token':token}});assert.equal(r.status,200,`${id} ${act}`);};
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:null,maxBuffer:256*1024*1024,windowsHide:true,timeout:60000});assert.equal(r.status,0,'Docker operation failed');return r.stdout;};
assert(!docker(['ps','--filter','label=com.docker.compose.project=agentic-crm','--format','{{.Label "com.docker.compose.service"}}']).toString().split('\n').some(x=>['api','worker'].includes(x.trim())));
for(const id of ['api','worker']){const s=(await status()).services.find(x=>x.id===id);if(s.health!=='stopped'){assert(s.owned,'Unmanaged writer');await action(id,'stop');}}
for(let i=0;i<30;i++){if((await status()).services.filter(s=>['api','worker'].includes(s.id)).every(s=>s.health==='stopped'))break;await new Promise(r=>setTimeout(r,500));}assert((await status()).services.filter(s=>['api','worker'].includes(s.id)).every(s=>s.health==='stopped'));
await mkdir('artifacts/external-api',{recursive:true});const backup='artifacts/external-api/before-'+new Date().toISOString().replaceAll(/[:.]/g,'-')+'.sql',dump=docker(['exec','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF agentic_crm']);await writeFile(backup,dump,{flag:'wx',mode:0o600});
Object.assign(process.env,env,{MYSQL_HOST:'127.0.0.1',MYSQL_PORT:env.LOCAL_MYSQL_PORT??'13306'});const ds=databaseSource(true);await ds.initialize();
try{
 const tables=await ds.query('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()'),before=new Map(),version=Number((await ds.query('SELECT MAX(version) v FROM schema_migration'))[0].v);
 const hash=async name=>{assert(/^[a-z][a-z0-9_]*$/.test(name));const rows=(await ds.query(`SELECT * FROM \`${name}\`${name==='schema_migration'?' WHERE version<='+version:''}`)).map(r=>JSON.stringify(r)).sort();return createHash('sha256').update(JSON.stringify(rows)).digest('hex');};
 for(const {name}of tables)before.set(name,await hash(name));const applied=await migrate(ds);for(const [name,h]of before)assert.equal(await hash(name),h,'Preservation '+name);
 const names=['external_app'];
 docker(['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],names.map(name=>`GRANT SELECT,INSERT${name==='external_app'?',UPDATE':''} ON agentic_crm.${name} TO '${env.MYSQL_USER}'@'%';`).join('\n'));
 const evidence={at:new Date().toISOString(),applied,repeat:await migrate(ds),previousVersion:version,preservedTables:before.size,backup,backupSha256:createHash('sha256').update(dump).digest('hex')};await writeFile('artifacts/external-api/upgrade.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));

}finally{await ds.destroy();}
for(const id of ['api','worker'])await action(id,'start');
let ready=false;for(let i=0;i<45;i++){ready=(await status()).services.filter(s=>['api','worker'].includes(s.id)).every(s=>s.health==='ready');if(ready)break;await new Promise(r=>setTimeout(r,1000));}assert(ready,'API/worker readiness');console.log('PASS API/worker ready after forward37');
