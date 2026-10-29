// Retained local-only synthetic scenario. All native writes use authenticated application APIs.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {fixtureId} from '../services/core-baseline/dist/modules/identity/seed.js';
import {inboxDemoEpisodes} from '../services/reporting/dist/inbox-demo.js';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN,tenant=fixtureId('clinic_alpha');
assert.equal(env.APP_ENV,'development');assert.equal(origin,'http://localhost:18080');assert.equal(env.MYSQL_DATABASE,'agentic_crm');
const file='.local/inbox50-v1.json';let manifest;
try{manifest=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;manifest={namespace:'inbox50_v1',tenant,binding:randomUUID(),items:[]};}
assert.equal(manifest.tenant,tenant);assert.equal(manifest.namespace,'inbox50_v1');
const persist=async()=>{await writeFile(file+'.tmp',JSON.stringify(manifest,null,2));await rename(file+'.tmp',file);};
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();page.setDefaultTimeout(30000);
await mkdir('artifacts/inbox-demo',{recursive:true});
try{
 await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/');
 const csrf=(await(await page.request.get(origin+'/auth/csrf')).json()).data.csrf_token;
 const call=async(path,body,key=randomUUID(),version,attempt=0)=>{if(body!==undefined){manifest.commands??={};manifest.commands[key]??={path,body,version};const prior=manifest.commands[key];assert.equal(prior.path,path);assert.deepEqual(prior.body,body);version=prior.version;await persist();}const r=await page.request.fetch(origin+'/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:{'X-Tenant-Id':tenant,Origin:origin,'X-CSRF-Token':csrf,'Idempotency-Key':key,...(version?{'If-Match':`"${version}"`}:{})},...(body===undefined?{}:{data:body})});const b=await r.json();if(r.status()===503&&attempt<4){await new Promise(r=>setTimeout(r,500));return call(path,body,key,version,attempt+1);}assert([200,201,202].includes(r.status()),path+' '+r.status()+' '+JSON.stringify(b));return b.data;};
 const ctx=await call('crm/context'),headers={'Content-Type':'application/json','X-Connection-Id':fixtureId('alpha:mock_connection'),Authorization:'Bearer '+env.MOCK_ALPHA_TOKEN};
 for(const e of inboxDemoEpisodes()){
  let item=manifest.items[e.index];if(!item){item={index:e.index,state:e.state,ad:e.ad,event:randomUUID(),at:new Date().toISOString(),keys:{assign:randomUUID(),reply:randomUUID(),note:randomUUID(),lead:randomUUID(),close:randomUUID(),finalAssign:randomUUID(),stage:randomUUID(),need:randomUUID(),milestone:randomUUID()}};manifest.items.push(item);await persist();}
  if(!item.conversation){
   const r=await fetch(origin+'/api/v1/integrations/mock-messenger/deliveries',{method:'POST',headers,body:JSON.stringify({provider_event_id:item.event,provider_message_id:item.event,external_subject_id:'inbox50_v1_'+e.index,display_label:'DEMO Inbox50 #'+String(e.index+1).padStart(2,'0'),occurred_at:item.at,message:{type:'text',text:'DEMO 50 inbox · '+e.state},referral:{source:'ctm',ad_id:'inbox50-ad-'+e.ad.charAt(3),campaign_id:'inbox50-demo'}})});assert.equal(r.status,202,await r.clone().text());const id=(await r.json()).data.delivery_id;
   for(let n=0;n<80;n++){const b=await(await fetch(origin+'/api/v1/integrations/deliveries/'+id,{headers})).json();if(b.data.status==='processed'){item.conversation=b.data.conversation_id;break;}assert(b.data.status!=='failed',JSON.stringify(b));await new Promise(r=>setTimeout(r,250));}assert(item.conversation,'DELIVERY_TIMEOUT');await persist();
  }
  let detail=await call('conversations/'+item.conversation);const sessions=await call(`conversations/${item.conversation}/acquisition-sessions`);assert.equal(sessions.length,1);item.session=sessions[0].id;item.contact=detail.contact_id;await persist();
  if(process.argv.includes('--inspect')){console.log(JSON.stringify({contextPrincipal:ctx.principal_id,targets:await call(`records/${item.conversation}/assignment-targets`),process:await call('session-process')},null,2));break;}
  if(e.state!=='queued'&&!item.done){
   item.keys.stage??=randomUUID();item.keys.need??=randomUUID();item.keys.milestone??=randomUUID();
   const target=e.index%2===0?ctx.principal_id:fixtureId('alpha:human:chat_anna');
   const targets=await call(`records/${item.conversation}/assignment-targets`);assert(targets.some(t=>t.id===target&&t.eligible),'Existing agent must be eligible');
   if(!item.assigned){if(detail.owner_principal_id!==ctx.principal_id)detail=await call(`records/${item.conversation}/assignment`,{owner_principal_id:ctx.principal_id,reason:'manual'},item.keys.assign,detail.version);item.assigned=true;await persist();}
   detail=await call('conversations/'+item.conversation);
   if(!item.replied){const intent=await call(`conversations/${item.conversation}/messages`,{text:'DEMO · Agent tiếp nhận và hỏi nhu cầu đầu tiên.',owner_revision:detail.owner_revision},item.keys.reply);item.intent=intent.id;item.replied=true;await persist();}
   if(item.intent&&!item.sent){for(let n=0;n<60;n++){const intent=await call(`conversations/${item.conversation}/outbound-intents/${item.intent}`);if(intent.status==='sent'){item.sent=true;await persist();break;}assert(!['failed','cancelled','unknown'].includes(intent.status),'DEMO_OUTBOUND_'+intent.status);await new Promise(r=>setTimeout(r,250));}assert(item.sent,'DEMO_SEND_TIMEOUT');}
   if(!item.noted){await call(`conversations/${item.conversation}/notes`,{text:'DEMO inbox50_v1 · Kết quả mô phỏng: '+e.state+'. Thời gian dashboard thuộc ca giả định 14/10/2026 09:00–10:00; lịch sử CRM giữ thời gian thật.'},item.keys.note);item.noted=true;await persist();}
   if(e.state==='lead'&&!item.lead){const lead=await call('leads',{contact_id:item.contact,conversation_id:item.conversation,conversation_session_id:item.session},item.keys.lead);item.lead=lead.id;await persist();}
   // Native owner distribution uses actual eligible identities; reporting timing is explicitly simulated.
   if(!item.finalAssigned){detail=await call('conversations/'+item.conversation);if(detail.status!=='closed'&&detail.owner_principal_id!==target)await call(`records/${item.conversation}/assignment`,{owner_principal_id:target,reason:'manual'},item.keys.finalAssign,detail.version);item.finalAssigned=true;await persist();}
   if(e.state==='spam'&&!item.closed){detail=await call('conversations/'+item.conversation);if(detail.status!=='closed')await call(`conversations/${item.conversation}/transition`,{target_status:'closed',reason:'DEMO: khách spam'},item.keys.close,detail.version);item.closed=true;await persist();}
   item.agent=(await call('conversations/'+item.conversation)).owner_principal_id;item.done=true;await persist();
  }
  console.log('Reconciled '+(e.index+1)+'/50 '+e.state);
 }
 // Retain cancelled attempts from an interrupted early seed; repair only definite non-delivery.
 if(!process.argv.includes('--inspect'))for(const item of manifest.items.filter(x=>x.state!=='queued')){
  const messages=await call(`conversations/${item.conversation}/messages`);if(messages.some(m=>m.direction==='outbound'&&m.status==='sent'))continue;
  assert(messages.filter(m=>m.direction==='outbound').every(m=>m.status==='cancelled'),'DEMO_DELIVERY_UNCERTAIN');
  let detail=await call('conversations/'+item.conversation);assert.notEqual(detail.status,'closed','CLOSED_FIXTURE_REQUIRES_REVIEW');
  item.repair??={assign:randomUUID(),send:randomUUID(),restore:randomUUID()};await persist();
  if(detail.owner_principal_id!==ctx.principal_id)await call(`records/${item.conversation}/assignment`,{owner_principal_id:ctx.principal_id,reason:'manual'},item.repair.assign,detail.version);
  detail=await call('conversations/'+item.conversation);const intent=await call(`conversations/${item.conversation}/messages`,{text:'DEMO · Agent tiếp nhận và hỏi nhu cầu đầu tiên.',owner_revision:detail.owner_revision},item.repair.send);
  let sent=false;for(let n=0;n<60;n++){const current=await call(`conversations/${item.conversation}/outbound-intents/${intent.id}`);if(current.status==='sent'){sent=true;break;}assert(!['cancelled','failed','unknown'].includes(current.status));await new Promise(r=>setTimeout(r,250));}assert(sent);
  detail=await call('conversations/'+item.conversation);if(detail.owner_principal_id!==item.agent)await call(`records/${item.conversation}/assignment`,{owner_principal_id:item.agent,reason:'manual'},item.repair.restore,detail.version);item.sent=true;await persist();
 }
 if(!process.argv.includes('--inspect'))for(const item of manifest.items.filter(x=>['lead','information'].includes(x.state))){
  if(!item.followup){item.followup={event:randomUUID(),at:new Date().toISOString()};await persist();}
  if(!item.followup.done){const f=item.followup,r=await fetch(origin+'/api/v1/integrations/mock-messenger/deliveries',{method:'POST',headers,body:JSON.stringify({provider_event_id:f.event,provider_message_id:f.event,external_subject_id:'inbox50_v1_'+item.index,display_label:'DEMO Inbox50 #'+String(item.index+1).padStart(2,'0'),occurred_at:f.at,message:{type:'text',text:item.state==='lead'?'DEMO khách xác nhận nhu cầu, đồng ý tạo Lead.':'DEMO khách đang trao đổi thêm thông tin về nhu cầu.'}})});assert.equal(r.status,202);const delivery=(await r.json()).data.delivery_id;for(let n=0;n<80;n++){const b=await(await fetch(origin+'/api/v1/integrations/deliveries/'+delivery,{headers})).json();if(b.data.status==='processed'){assert.equal(b.data.conversation_id,item.conversation);f.done=true;await persist();break;}await new Promise(r=>setTimeout(r,250));}assert(f.done);}
  const path=`conversations/${item.conversation}/sessions/${item.session}/progress`;let progress=await call(path);const stage=item.state==='lead'?'next_step':'consulting';
  item.keys.stage??=randomUUID();item.keys.need??=randomUUID();item.keys.milestone??=randomUUID();await persist();
  if(!item.staged){assert(progress.process.definition.stages.some(s=>s.key===stage),'DEMO_STAGE_NOT_AVAILABLE');if(progress.stage_key!==stage)await call(path,{action:'stage',stage_key:stage,reason:'DEMO inbox50_v1: '+item.state},item.keys.stage,progress.version);item.staged=true;await persist();}
  if(!item.need){progress=await call(path);const need=await call(path,{action:'need',label:'DEMO nhu cầu #'+(item.index+1)},item.keys.need,progress.version);item.need=need.id;await persist();}
  if(item.state==='lead'&&!item.milestone){progress=await call(path);assert(progress.process.definition.milestones.some(m=>m.key==='need_confirmed'));const milestone=await call(path,{action:'record',need_id:item.need,milestone_key:'need_confirmed',occurred_at:item.followup.at,reason:'DEMO: khách xác nhận nhu cầu qua phản hồi mô phỏng.'},item.keys.milestone,progress.version);item.milestone=milestone.id;await persist();}
 }
 if(!process.argv.includes('--inspect')){const checks=[];for(const item of manifest.items){const d=await call('conversations/'+item.conversation);assert.equal(!!d.owner_principal_id,item.state!=='queued');assert.equal(d.status==='closed',item.state==='spam');const messages=await call(`conversations/${item.conversation}/messages`);const outbound=messages.filter(m=>m.direction==='outbound');assert.equal(outbound.filter(m=>m.status==='sent').length,item.state==='queued'?0:1);assert(outbound.every(m=>['sent','cancelled'].includes(m.status)));assert.equal(messages.filter(m=>m.direction==='inbound').length,['lead','information'].includes(item.state)?2:1);checks.push({session:item.session,conversation:item.conversation,contact:item.contact,lead:item.lead??null,state:item.state,owner:d.owner_principal_id});}assert.equal(checks.length,50);assert.equal(checks.filter(x=>x.lead).length,10);await writeFile('artifacts/inbox-demo/native.json',JSON.stringify({at:new Date().toISOString(),namespace:manifest.namespace,mode:'native synthetic CRM IDs; dashboard timings and capacity separately simulated',counts:{sessions:50,accepted:30,queued:20,leads:10},checks},null,2));}
}finally{await browser.close();}
