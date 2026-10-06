import { spawnSync } from 'node:child_process';
import { randomBytes,randomUUID } from 'node:crypto';
// Disposable project only; never loads .env or references preview volumes.
const project=`agentic-crm-connector-test-${process.pid}`;
const api=`${project}-api`,worker=`${project}-worker`;
const secret=()=>randomBytes(32).toString('hex');
const env={...process.env,CONNECTOR_MIGRATION_PASSWORD:secret(),CONNECTOR_DB_PASSWORD:secret(),CONNECTOR_CONNECTION_ID:randomUUID(),CONNECTOR_TENANT_ID:randomUUID(),CONNECTOR_REMOTE_CONNECTION_ID:randomUUID(),CONNECTOR_INGRESS_TOKEN:secret(),CONNECTOR_REMOTE_TOKEN_LOCAL:secret(),CONNECTOR_REMOTE_ORIGIN:'http://127.0.0.1:1',CONNECTOR_ALLOW_HTTP:'true',CONNECTOR_META_APPS:JSON.stringify([{id:'100',secret_env:'CONNECTOR_META_APP_SECRET',verify_env:'CONNECTOR_META_VERIFY_TOKEN'}]),CONNECTOR_META_APP_SECRET:secret(),CONNECTOR_META_VERIFY_TOKEN:secret(),CONNECTOR_META_BINDING_ID:randomUUID(),CONNECTOR_META_APP_ID:'100',CONNECTOR_META_PAGE_ID:'300'};
function docker(args,input){const r=spawnSync('docker',args,{env,input,encoding:'utf8',maxBuffer:16*1024*1024});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');if(r.error||r.status!==0)throw new Error('CONNECTOR_SMOKE_COMMAND_FAILED');return r.stdout;}
const compose=(...args)=>docker(['compose','-p',project,'-f','compose.connector.yaml',...args]);
const script=`
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createPool } from 'mysql2/promise';
const url='http://127.0.0.1:3010/connector/v1';
for(let i=0;;i++){try{assert.equal((await fetch(url+'/health/ready')).status,200);break;}catch(e){if(i===40)throw e;await new Promise(r=>setTimeout(r,250));}}
assert.notEqual(process.getuid(),0);
const headers={'content-type':'application/json','x-connection-id':process.env.CONNECTOR_CONNECTION_ID,authorization:'Bearer '+process.env.CONNECTOR_INGRESS_TOKEN};
const input={provider_event_id:'synthetic-image-smoke',provider_message_id:'synthetic-image-message',external_subject_id:'synthetic-image-subject',occurred_at:'2026-10-06T00:00:00Z',message:{type:'text',text:'Synthetic container smoke'}};
const post=()=>fetch(url+'/deliveries',{method:'POST',headers,body:JSON.stringify(input)});
const response=await post();assert.equal(response.status,202);const {data}=await response.json();
assert.equal((await (await post()).json()).data.delivery_id,data.delivery_id);
for(let i=0;;i++){const r=await (await fetch(url+'/deliveries/'+data.delivery_id,{headers})).json();assert.equal(r.data.status,'queued');if(r.data.error_code==='REMOTE_UNAVAILABLE')break;if(i===40)throw new Error('NO_WORKER_RETRY');await new Promise(r=>setTimeout(r,250));}
const webhook=url+'/messenger/100/webhook';
const q=new URLSearchParams({'hub.mode':'subscribe','hub.verify_token':process.env.CONNECTOR_META_VERIFY_TOKEN,'hub.challenge':'123'});
assert.equal(await (await fetch(webhook+'?'+q)).text(),'123');
const raw=JSON.stringify({object:'page',entry:[{id:'300',messaging:[{sender:{id:'200'},recipient:{id:'300'},timestamp:1791244800000,message:{mid:'synthetic-release-mid',text:'Synthetic release'}}]}]});
const signature='sha256='+createHmac('sha256',process.env.CONNECTOR_META_APP_SECRET).update(raw).digest('hex');
assert.equal((await fetch(webhook,{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':signature},body:raw})).status,200);
const db=createPool({host:process.env.CONNECTOR_DB_HOST,user:process.env.CONNECTOR_DB_USER,password:process.env.CONNECTOR_DB_PASSWORD,database:process.env.CONNECTOR_DB_NAME});
try{const [rows]=await db.query('SELECT COUNT(*) n FROM connector_meta_event');assert.equal(rows[0].n,1);}finally{await db.end();}
console.log('PASS: signed Messenger challenge/capture and restart replay, one durable event.');
console.log('PASS: non-root release image, private migration/grants/provision, HTTP intake/dedup/status, durable remote outage and readiness.');
`;
try{
 compose('build','connector-api');
 compose('up','-d','--wait','connector-mysql');
 for(const mode of ['migrate','migrate','grant','provision','provision','provision-meta','provision-meta'])compose('run','--rm','--no-deps','connector-admin','node','dist/main.js',mode);
 compose('run','-d','--no-deps','--name',api,'connector-api');
 compose('run','-d','--no-deps','--name',worker,'connector-worker');
 const exec=()=>docker(['exec','-i','-e','CONNECTOR_CONNECTION_ID','-e','CONNECTOR_INGRESS_TOKEN',api,'node','--input-type=module'],script);
 exec();docker(['restart',api]);exec();
 console.log('PASS: API container restart preserves delivery identity.');
}finally{
 for(const name of [api,worker])spawnSync('docker',['rm','-f',name],{env,stdio:'ignore'});
 compose('down','--volumes','--remove-orphans');
}
