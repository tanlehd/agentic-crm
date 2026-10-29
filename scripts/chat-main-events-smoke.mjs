import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {createPool} from './lib/chat-native.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const mode=process.argv[2];if(!['create','verify'].includes(mode))throw Error('MODE_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const path='.local/chat-main/smoke-beta-stable.private.json',s=JSON.parse(await readFile(path,'utf8')),h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex'),tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
if(mode==='create'){
 for(let i=0;i<2;i++){
  const r=await fetch('http://127.0.0.1:13001/api/v1/chat-workspace/tags',{method:'POST',headers:{'Content-Type':'application/json','X-Tenant-Id':tenant,Cookie:s.cookie,Origin:env.APP_ORIGIN,'X-CSRF-Token':s.csrf,'Idempotency-Key':'event-tag-'+s.tag},body:JSON.stringify({name:'T09-'+s.tag,color:'blue'}),signal:AbortSignal.timeout(20000)});
  const b=await r.json();if(r.status!==201)throw Error('TAG_HTTP_'+r.status+'_'+b.error?.code);
  if(s.eventTag&&s.eventTag!==b.data.id)throw Error('TAG_REPLAY_MISMATCH');s.eventTag=b.data.id;await writeFile(path,JSON.stringify(s),{mode:0o600});
 }
 console.log('Synthetic tag create/replay PASS');
}else{
 if(!s.eventTag)throw Error('TAG_STATE_REQUIRED');
 const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,database:'crm_chat',connectionLimit:1});
 try{
  let result;
  for(let i=0;i<40;i++){
   const [events]=await pool.query("SELECT id,status FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='chat.tag_definition.changed'",[tenant,s.eventTag]);
   const [delivery]=await pool.query("SELECT state,event_id FROM chat_event_delivery WHERE tenant_id=? AND aggregate_id=? AND consumer_name='chat.tag_definition.changed.v1'",[tenant,s.eventTag]);
   const [inbox]=await pool.query("SELECT state,event_id FROM chat_event_inbox WHERE tenant_id=? AND aggregate_id=? AND consumer_name='chat.tag_definition.changed.v1'",[tenant,s.eventTag]);
   if(events.length===1&&delivery.length===1&&inbox.length===1&&events[0].status==='dispatched'&&delivery[0].state==='acked'&&inbox[0].state==='applied'&&events[0].id===delivery[0].event_id&&events[0].id===inbox[0].event_id){result={status:'PASS',publicCreateReplay:true,events:1,deliveries:1,inboxes:1,publication:'dispatched',delivery:'acked',inbox:'applied',sameEventId:true};break;}
   await new Promise(r=>setTimeout(r,500));
  }
  if(!result)throw Error('LOCAL_EVENT_NOT_APPLIED');
  await writeFile((await mainEvidenceDirectory())+'/main-events.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await pool.end();}
}
