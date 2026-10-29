// Retained synthetic public acceptance; private state contains session and request keys.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const env=parseEnv(await readFile('.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const mode=process.argv[2]??'smoke';if(!['smoke','frozen','replay','retry'].includes(mode))throw Error('MODE_REQUIRED');
const label=process.argv[3]??'alpha';if(!['alpha','beta'].includes(label))throw Error('SYNTHETIC_TENANT_REQUIRED');
const round=process.argv[4]??'';if(round&&!/^[a-z][a-z0-9-]{0,31}$/.test(round))throw Error('SYNTHETIC_ROUND_INVALID');
const suffix=(label==='alpha'?'':'-'+label)+(round?'-'+round:'');
const out=await mainEvidenceDirectory(),statePath='.local/chat-main/smoke'+suffix+'.private.json';
let s;try{s=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;s={tag:randomUUID()};}
const save=()=>writeFile(statePath,JSON.stringify(s),{mode:0o600});
const fixture=alias=>{const h=createHash('sha256').update('agentic-crm:identity-fixture:v1:'+alias).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const tenant=fixture('clinic_'+label),checks=[];
const publicPort=process.env.CHAT_MAIN_PUBLIC_PORT??'3001';if(!['3001','13001','18080'].includes(publicPort))throw Error('LOCAL_PUBLIC_PORT_REQUIRED');
let current='initial';
function check(name,ok){current=name;if(!ok)throw Error('CHECK_FAILED');checks.push(name);}
async function req(path,body,headers={},authenticated=true){
 current=path;
 const r=await fetch('http://127.0.0.1:'+publicPort+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(authenticated?{Cookie:s.cookie??'','X-Tenant-Id':tenant,...(body===undefined?{}:{Origin:env.APP_ORIGIN,'X-CSRF-Token':s.csrf??''})}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 const text=await r.text();let data;try{data=text?JSON.parse(text):{};}catch{data={};}
 return {status:r.status,body:data,cookies:r.headers.getSetCookie()};
}
function expect(r,status){if(r.status!==status)throw Error('HTTP_'+r.status+'_'+(r.body.error?.code??'UNKNOWN'));return r.body.data;}
async function wait(path,headers,done,authenticated=true){let last;for(let i=0;i<60;i++){const r=await req(path,undefined,headers,authenticated),d=expect(r,200);if(done(d))return d;last={status:d.status,error:d.error_code,attempts:d.attempts};await new Promise(r=>setTimeout(r,500));}throw Error('WORKER_TIMEOUT_'+JSON.stringify(last));}
const ingressHeaders={'X-Connection-Id':fixture(label+':mock_connection'),Authorization:'Bearer '+env['MOCK_'+label.toUpperCase()+'_TOKEN']};
try{
 if(!s.cookie){const c=await req('/auth/login-challenge',undefined,{},false);expect(c,200);const l=await req('/auth/login',{login_key:label+'_admin',password:env['SEED_'+label.toUpperCase()+'_ADMIN_PASSWORD'],csrf_token:c.body.data.csrf_token},{Origin:env.APP_ORIGIN,Cookie:c.cookies.map(x=>x.split(';')[0]).join('; ')},false);expect(l,204);s.cookie=l.cookies.find(x=>x.startsWith('crm_session=')).split(';')[0];s.csrf=expect(await req('/auth/csrf'),200).csrf_token;await save();}
 check('native login/session',!!expect(await req('/auth/session'),200).account_id);
 if(mode==='retry'){expect(await req('/api/v1/integrations/deliveries/'+s.delivery+'/retry',{}, {'Idempotency-Key':'retry-'+randomUUID()}),200);console.log('Synthetic delivery retry accepted');process.exit(0);}
 for(const path of ['me/memberships','objects/contact/records','leads','workflows']){expect(await req('/api/v1/'+path),200);checks.push('non-Chat '+path);}
 if(mode==='smoke'){
  if(!s.ingress){s.ingress={provider_event_id:'synthetic-t09-'+s.tag,provider_message_id:'synthetic-message-'+s.tag,external_subject_id:'synthetic-subject-'+s.tag,display_label:'T09 synthetic',occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic T09 main cutover'},referral:{source:'ctm',ad_id:'synthetic-ad',campaign_id:'synthetic-campaign'}};await save();}
  const ack=expect(await req('/api/v1/integrations/mock-messenger/deliveries',s.ingress,ingressHeaders,false),202);s.delivery=ack.delivery_id;await save();
  const delivery=await wait('/api/v1/integrations/deliveries/'+s.delivery,ingressHeaders,d=>d.status==='processed',false);s.conversation=delivery.conversation_id;s.inboundMessage=delivery.message_id;await save();check('public ingress through shared worker',!!s.conversation);
  const replay=expect(await req('/api/v1/integrations/mock-messenger/deliveries',s.ingress,ingressHeaders,false),202);check('ingress durable replay',replay.delivery_id===s.delivery);
 }
 if(!s.conversation)throw Error('SMOKE_STATE_REQUIRED');
 const base='/api/v1/conversations/'+s.conversation;
 if(mode==='frozen'){
  const r=await req(base+'/notes',{text:'Synthetic frozen rejection'},{'Idempotency-Key':'frozen-'+s.tag});check('frozen writer rejects public mutation',r.status===503);
 }else{
  let detail=expect(await req(base),200);
  if(!s.takeover||!s.taken&&s.takeover.body.reason!=='human_takeover'){s.takeover={key:'takeover-'+s.tag+(s.rejectedTakeover?'-after-terminal-rejection':''),version:String(detail.version),body:{reason:'human_takeover'}};await save();}
  if(mode==='smoke'&&!s.taken){expect(await req(base+'/takeover',s.takeover.body,{'Idempotency-Key':s.takeover.key,'If-Match':'"'+s.takeover.version+'"'}),200);s.taken=true;await save();checks.push('Human takeover');}
  detail=expect(await req(base),200);
  if(!s.send){s.send={key:'send-'+s.tag,body:{text:'Synthetic T09 outbound',owner_revision:String(detail.owner_revision),crm_contact_id:detail.contact_id}};await save();}
  const sent=expect(await req(base+'/messages-v2',s.send.body,{'Idempotency-Key':s.send.key}),202);
  if(s.intent)check('send replay same intent/message',sent.id===s.intent&&sent.message_id===s.outboundMessage);
  else{s.intent=sent.id;s.outboundMessage=sent.message_id;await save();}
  const intent=await wait(base+'/outbound-intents/'+s.intent,{},d=>d.status==='sent');check('mock outbound terminal sent',intent.status==='sent');
  const note=expect(await req(base+'/notes',{text:'Synthetic T09 CRM note'},{'Idempotency-Key':'note-'+s.tag}),201);
  if(s.note)check('note replay same CRM receipt',note.id===s.note);else{s.note=note.id;await save();}
  const noteReplay=expect(await req(base+'/notes',{text:'Synthetic T09 CRM note'},{'Idempotency-Key':'note-'+s.tag}),201);check('note idempotency',noteReplay.id===s.note);
  for(const path of [base+'/messages',base+'/acquisition-sessions','/api/v1/chat-workspace/conversations/'+s.conversation+'/read-state','/api/v1/chat-workspace/tags','/api/v1/conversation-channels','/api/v1/objects/conversation/records/'+s.conversation]){expect(await req(path),200);checks.push('Chat read '+path.replace(s.conversation,':id'));}
  const foreign=await req(base,undefined,{'X-Tenant-Id':fixture('clinic_'+(label==='alpha'?'beta':'alpha'))});
  if(![403,404].includes(foreign.status))throw Error('CROSS_TENANT_HTTP_'+foreign.status+'_'+(foreign.body.error?.code??'UNKNOWN'));
  checks.push('cross-tenant denial');
  check('CSRF denial',(await req(base+'/notes',{text:'Synthetic denied'},{'Idempotency-Key':'csrf-'+s.tag,'X-CSRF-Token':'invalid'})).status===403);
 }
 expect(await req('/api/v1/reporting/definitions'),200);checks.push('non-Chat reporting/definitions');
 await writeFile(out+'/main-'+mode+'-'+label+(round?'-'+round:'')+'-'+publicPort+'.json',JSON.stringify({status:'PASS',checks,syntheticTenant:label,round,publicPort,syntheticRecordsRetained:true},null,2));console.log(JSON.stringify({status:'PASS',mode,tenant:label,round,publicPort,checks}));
}catch(e){const report={status:'FAIL',mode,tenant:label,at:current,error:e.message,checks};await writeFile(out+'/main-'+mode+'-failure-'+Date.now()+'.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
