import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createPool} from './lib/chat-native.mjs';
import {randomUUID} from 'node:crypto';
const env=parseEnv(await readFile('.env','utf8')),state=JSON.parse(await readFile('.local/chat-main/smoke.private.json','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||!state.ingress?.external_subject_id?.startsWith('synthetic-subject-'))throw Error('LOCAL_SYNTHETIC_REQUIRED');
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,database:'agentic_crm'});
try{const [[row]]=await pool.execute('SELECT d.tenant_id,d.connection_id,i.contact_id,i.id FROM inbound_delivery d JOIN contact_identity i ON i.tenant_id=d.tenant_id AND i.connection_id=d.connection_id AND i.external_subject_id=? WHERE d.id=?',[state.ingress.external_subject_id,state.delivery]);if(!row)throw Error('SYNTHETIC_MAPPING_MISSING');
await writeFile('.local/chat-main/material/diagnostic-ingress.json',JSON.stringify({schema_version:1,operation:'ingress-accept',request_id:state.delivery,source_delivery_id:state.delivery,binding:{tenant_id:row.tenant_id,connection_id:row.connection_id,crm_contact_id:row.contact_id,crm_identity_id:row.id,mapping_revision:'1',platform:'mock_messenger'},intake:state.ingress}),{mode:0o600});
const [[command]]=await pool.execute("SELECT command_id,binding_digest FROM crm_chat.chat_owner_command WHERE tenant_id=? AND operation='ingress-accept' AND state='prepared' AND JSON_UNQUOTE(JSON_EXTRACT(binding_json,'$.references.crm_contact_id'))=? ORDER BY created_at DESC LIMIT 1",[row.tenant_id,row.contact_id]);
if(command)await writeFile('.local/chat-main/material/diagnostic-owner.json',JSON.stringify({schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:row.tenant_id,operation:'admit',payload:{owner:'chat',command}}),{mode:0o600});
console.log('Private synthetic diagnostic input prepared');}finally{await pool.end();}
