import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {connect,migrate,digest} from './lib/reporting-database.mjs';
const origin='http://127.0.0.1:3020',html=await(await fetch(origin)).text(),token=/const token='([a-f0-9]+)'/.exec(html)?.[1];assert(token);
const action=async act=>assert.equal((await fetch(origin+'/service/reporting/'+act,{method:'POST',headers:{Origin:origin,'X-Local-Token':token}})).status,200);
await action('stop');
for(let i=0;i<30;i++){const s=await(await fetch(origin+'/status')).json();if(s.services.find(x=>x.id==='reporting').health==='stopped')break;await new Promise(r=>setTimeout(r,300));}
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:null,maxBuffer:256*1024*1024,windowsHide:true,timeout:60000});assert.equal(r.status,0,'Docker operation failed');return r.stdout;};
const results=[];
for(const file of ['.local/reporting.env','.local/reporting-test.env']){
 const env=parseEnv(await readFile(file,'utf8'));assert(['crm_reporting','test_crm_reporting'].includes(env.REPORTING_DB_NAME));const c=await connect(env);
 try{
 const db=env.REPORTING_DB_NAME,backup='artifacts/operations-reporting/'+db+'-before5.sql';const dump=docker(['exec','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces --set-gtid-purged=OFF '+db]);await writeFile(backup,dump,{flag:'wx',mode:0o600});
 const [tables]=await c.query('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()'),before=[];
 for(const {name}of tables){assert(/^[a-z_]+$/.test(name));const [cols]=await c.query('SHOW COLUMNS FROM '+name);const sql='SELECT '+cols.map(x=>'`'+x.Field+'`').join(',')+' FROM '+name+(name==='schema_migration'?' WHERE version<=4':'');const [data]=await c.query(sql);before.push({name,sql,hash:digest(JSON.stringify(data.map(r=>JSON.stringify(r)).sort()))});}
 const applied=await migrate(c);for(const b of before){const [data]=await c.query(b.sql);assert.equal(digest(JSON.stringify(data.map(r=>JSON.stringify(r)).sort())),b.hash,b.name);}
 const user=env.REPORTING_RUNTIME_USER;assert(/^[a-z][a-z0-9_]+$/.test(user));docker(['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],`GRANT SELECT,INSERT ON ${db}.report_connected_catalog TO '${user}'@'%';`);
 results.push({database:db,applied,repeat:await migrate(c),preservedTables:before.length,backup,backupHash:digest(dump)});
 }finally{await c.end();}
}
await writeFile('artifacts/operations-reporting/upgrade.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));await action('start');
