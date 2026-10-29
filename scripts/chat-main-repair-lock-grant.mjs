import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {createPool} from './lib/chat-native.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const env=parseEnv(await readFile('.env','utf8')),cfg=JSON.parse(await readFile('.local/chat-main/credentials.json','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||cfg.users.identity.user!=='main_identity')throw Error('LOCAL_MAIN_REQUIRED');
const common={host:'127.0.0.1',port:13306,database:'agentic_crm'},root=createPool({...common,user:'root',password:env.MYSQL_ROOT_PASSWORD});
try{await root.query("GRANT UPDATE(status) ON agentic_crm.tenant TO 'main_identity'@'%'");}finally{await root.end();}
const p=createPool({...common,...cfg.users.identity});
try{const c=await p.getConnection();try{await c.beginTransaction();await c.query("SELECT id FROM tenant WHERE kind='business' FOR UPDATE");await c.rollback();}finally{c.release();}
await assert.rejects(()=>p.query('SELECT * FROM conversation LIMIT 1'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
await assert.rejects(()=>p.query('SELECT * FROM crm_chat.conversation LIMIT 1'),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
const result={status:'PASS',checks:['Identity tenant locking read','old Chat read denied','own Chat schema read denied'],change:'Identity tenant UPDATE(status) for existing admission locking read; no tenant rows changed'};await writeFile((await mainEvidenceDirectory())+'/main-lock-grant.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await p.end();}
