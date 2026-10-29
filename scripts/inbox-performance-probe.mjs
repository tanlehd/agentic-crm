// Read-only HTTP probe of retained synthetic fixtures. Never print bodies or cookies.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const port=process.argv[2]??'18080',rounds=Number(process.argv[3]??3);
if(!['18080','13001','13101'].includes(port)||!Number.isInteger(rounds)||rounds<1||rounds>10)throw Error('LOCAL_PROBE_REQUIRED');
const s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8'));
const h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex');
const tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
const base='/api/v1/conversations/'+s.conversation;
const routes={capabilities:'/api/v1/chat-workspace/capabilities',queue:'/api/v1/chat-workspace/conversations?limit=30&sort=latest_message_desc&scope=all&status=open,pending&snooze=exclude&unread=any',sidebar:'/api/v1/chat-workspace/sidebar',detail:base,messages:base+'/message-envelopes-v3?limit=50',notes:base+'/notes?limit=50',channels:'/api/v1/conversation-channels?limit=100'};
async function get(name,path,round,mode){const start=performance.now();try{const r=await fetch('http://127.0.0.1:'+port+path,{headers:{Cookie:s.cookie,'X-Tenant-Id':tenant},signal:AbortSignal.timeout(20000)});const body=await r.json().catch(()=>({}));const result={port,round,mode,route:name,status:r.status,ms:Math.round(performance.now()-start),code:body.error?.code??null,count:Array.isArray(body.data)?body.data.length:undefined};console.log(JSON.stringify(result));return result;}catch{console.log(JSON.stringify({port,round,mode,route:name,status:0,ms:Math.round(performance.now()-start)}));}}
for(let round=1;round<=rounds;round++){
 for(const [name,path]of Object.entries(routes))await get(name,path,round,'sequential');
 await Promise.all(Object.entries(routes).map(([name,path])=>get(name,path,round,'parallel')));
}
