import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../services/crm-connector/package.json',import.meta.url));
export const {createPool}=require('mysql2/promise');
const profiles={rehearsal:{source:'test_chat_source',destination:'test_crm_chat',restore:'test_crm_chat_restore',prefix:'chat_test_'},final:{source:'test_chat_source_final',destination:'test_crm_chat_final',restore:'test_crm_chat_final_restore',prefix:'chat_final_'}};
export const profileName=process.env.CHAT_STORAGE_PROFILE??'rehearsal';
if(!Object.hasOwn(profiles,profileName))throw new Error('TEST_PROFILE_DENIED');
export const profile=Object.freeze(profiles[profileName]);
export const privateRoot='.local/chat-extraction'+(profileName==='final'?'/final':'');
export const userFor=role=>{if(!['api','worker','migrator','export','fixture'].includes(role))throw new Error('TEST_ROLE_DENIED');return profile.prefix+role;};
export function rootSQL(sql){
 const r=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --skip-column-names'],{input:sql,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:60000});
 if(r.status!==0)throw new Error('CHAT_PROVISION_FAILED_'+(r.stderr.toString().match(/ERROR (\d+)/)?.[1]??'DOCKER'));
 return r.stdout.toString();
}
export async function config(){
 const v=JSON.parse(await readFile(`${privateRoot}/credentials.json`,'utf8'));
 if(v.environment!=='retained-test'||v.host!=='127.0.0.1'||v.port!==13306||v.source!==profile.source||v.destination!==profile.destination||v.restore!==profile.restore)throw new Error('TEST_ENVIRONMENT_DENIED');
 for(const [name,password] of Object.entries(v.passwords))if(!['api','worker','migrator','export','fixture'].map(userFor).includes(name)||! /^[a-f0-9]{64}$/.test(password))throw new Error('TEST_CREDENTIAL_DENIED');
 return v;
}
export function pool(cfg,role,database){
 if(![cfg.source,cfg.destination,cfg.restore].includes(database))throw new Error('TEST_SCHEMA_DENIED');
 const user=userFor(role);
 return createPool({host:cfg.host,port:cfg.port,user,password:cfg.passwords[user],database,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true,connectionLimit:5,multipleStatements:false});
}
export async function provision(){
 await mkdir(privateRoot,{recursive:true});
 const cfg={environment:'retained-test',host:'127.0.0.1',port:13306,source:profile.source,destination:profile.destination,restore:profile.restore,passwords:Object.fromEntries(['api','worker','migrator','export','fixture'].map(r=>[userFor(r),randomBytes(32).toString('hex')]))};
 try{await writeFile(`${privateRoot}/credentials.json`,JSON.stringify(cfg,null,2),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 try{await writeFile(`${privateRoot}/export.key`,randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 const c=await config(),d=JSON.parse(await readFile('services/chat/migrations/dictionary.json','utf8'));
 let sql='';
 for(const db of [c.source,c.destination,c.restore])sql+=`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;\n`;
 for(const [user,password] of Object.entries(c.passwords))sql+=`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';\n`;
 // Fixture provisioner owns only the retained synthetic source. Never a service credential.
 sql+=`GRANT ALL ON \`${c.source}\`.* TO '${userFor('fixture')}'@'%';\n`;
 // SELECT is restricted to this isolated synthetic source. Main is never granted.
 sql+=`GRANT SELECT ON \`${c.source}\`.* TO '${userFor('export')}'@'%';\n`;
 for(const db of [c.destination,c.restore]){
  sql+=`GRANT CREATE, ALTER, INDEX, REFERENCES ON \`${db}\`.* TO '${userFor('migrator')}'@'%';\n`;
  // MySQL requires CREATE in grants for a table that does not yet exist.
  // The migrator already has own-schema CREATE. Runtime grants are a second step.
  for(const t of d.tables)sql+=`GRANT CREATE,${t.grants.migrator.join(',')} ON \`${db}\`.\`${t.name}\` TO '${userFor('migrator')}'@'%';\n`;
 }
 rootSQL(sql);return c;
}
export async function provisionRuntime(){
 const c=await config(),d=JSON.parse(await readFile('services/chat/migrations/dictionary.json','utf8'));
 let sql='';
 for(const t of d.tables)for(const role of ['api','worker'])sql+=`GRANT ${t.grants[role].join(',')} ON \`${c.destination}\`.\`${t.name}\` TO '${userFor(role)}'@'%';\n`;
 rootSQL(sql);
}
