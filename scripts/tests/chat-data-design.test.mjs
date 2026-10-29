import test from 'node:test';
import assert from 'node:assert/strict';
import {partition,receiptRules,chatConsumers,retainedConsumers,chatAudits} from '../lib/chat-data-partition.mjs';
import {additions,systemTenant,catalog} from '../lib/chat-data-design.mjs';
const tenant='01900000-0000-7000-8000-000000000101',beta='01900000-0000-7000-8000-000000000102';
const c='01900000-0000-7000-8000-000000000201',session='01900000-0000-7000-8000-000000000202',need='01900000-0000-7000-8000-000000000203',sales='01900000-0000-7000-8000-000000000204',tag='01900000-0000-7000-8000-000000000205';
const entities=new Map([[`conversation:${c}`,{owner:'chat',object_key:'conversation'}],[`record:${c}`,{owner:'chat',object_key:'conversation'}],[`record:${sales}`,{owner:'sales',object_key:'lead'}],[`session:${session}`,{owner:'chat',conversation_id:c}],[`need:${need}`,{owner:'chat',conversation_id:c,session_id:session}],[`tag:${tag}`,{owner:'chat'}]]);
const facts={businessTenant:t=>[tenant,beta].includes(t),entity:(t,k,id)=>t===tenant?entities.get(k+':'+id):undefined,event:()=>undefined};
const receipt=(route_key,extra={})=>partition('idempotency_record',{tenant_id:tenant,route_key,...extra},facts);
const event=(data,extraFacts={})=>partition('outbox_event',{tenant_id:tenant,event_type:'record.assigned',schema_version:1,aggregate_type:'crm_record',aggregate_id:c,payload:{record_id:c,object_type:'conversation'},...data},{...facts,...extraFacts});
test('legacy thread keys and Sales need-outcome retain different owners',()=>{
 assert.equal(receipt(`POST /api/v1/threads/${c}/sessions/${session}/needs/${need}/assessment`).owner,'chat');
 assert.equal(receipt(`POST /api/v1/threads/${c}/sessions/${session}/needs/${need}/enrich`).owner,'chat');
 assert.equal(receipt(`need-outcome:${c}:${session}:${need}`).owner,'sales');
 assert.equal(receipt(`POST /api/v1/conversations/${c}/sessions/${session}/needs/${need}/assessment`).disposition,'NO_GO');
});
test('generic assignment resolves validated subtype, not source directory',()=>{
 assert.equal(receipt(`POST /api/v1/records/${c}/assignment`).owner,'chat');
 assert.equal(receipt(`POST /api/v1/records/${sales}/assignment`).owner,'sales');
 assert.equal(receipt(`POST /api/v1/records/${need}/assignment`).disposition,'NO_GO');
});
test('tenant and nested episode mismatch are fail-closed',()=>{
 const key=`POST /api/v1/threads/${c}/sessions/${session}/needs/${need}/enrich`;
 for(const t of [beta,systemTenant,'',null])assert.equal(receipt(key,{tenant_id:t}).disposition,'NO_GO');
 const broken={...facts,entity:(t,k,id)=>k==='need'?{owner:'chat',conversation_id:c,session_id:sales}:facts.entity(t,k,id)};
 assert.equal(partition('idempotency_record',{tenant_id:tenant,route_key:key},broken).disposition,'NO_GO');
});
test('note public receipt belongs to Chat, Core note event stays remote',()=>{
 assert.equal(receipt(`POST /api/v1/conversations/${c}/notes`).owner,'chat');
 assert.equal(event({event_type:'crm.conversation_note.changed',aggregate_type:'activity'}).owner,'crm');
});
test('catalog source verbs/trailing slash and link verbs are exact',()=>{
 assert.equal(receipt('create /api/v1/chat-workspace/inboxes/').owner,'chat');
 assert.equal(receipt('POST /api/v1/chat-workspace/inboxes').disposition,'NO_GO');
 assert.equal(receipt(`PUT /api/v1/chat-workspace/conversations/${c}/tags/${tag}`).owner,'chat');
 assert.equal(receipt(`snooze /api/v1/chat-workspace/conversations/${c}`).owner,'chat');
 assert.equal(receipt(`wake /api/v1/chat-workspace/conversations/${c}`).owner,'chat');
});
test('unknown, expired, partial and suffix-spoofed executable routes never archive',()=>{
 for(const key of ['unknown','POST /api/v1/session-process/','xPOST /api/v1/session-process','POST /api/v1/session-process?x=1'])assert.equal(receipt(key,{status:'completed',expires_at:'2000-01-01'}).disposition,'NO_GO');
 assert(receiptRules.every(r=>r.pattern.startsWith('^')&&r.pattern.endsWith('$')));
});
test('mixed assigned event requires actual object type and payload ID',()=>{
 assert.equal(event({}).owner,'chat');
 assert.equal(event({aggregate_id:sales,payload:{record_id:sales,object_type:'lead'}}).owner,'sales');
 assert.equal(event({payload:{record_id:c,object_type:'lead'}}).disposition,'NO_GO');
 assert.equal(event({payload:{record_id:sales,object_type:'conversation'}}).disposition,'NO_GO');
});
test('unknown event/version stays NO_GO even dispatched or failed',()=>{
 for(const status of ['pending','processing','dispatched','failed'])assert.equal(event({event_type:'chat.something.new',status}).disposition,'NO_GO');
 assert.equal(event({schema_version:99}).disposition,'NO_GO');
 assert.equal(event({event_type:'contact.created',aggregate_type:'contact'}).owner,'crm');
});
test('need event v1/v2 preserves same-tenant episode identity',()=>{
 for(const version of [1,2])assert.equal(event({event_type:'need.assessed',schema_version:version,aggregate_type:'conversation_need',aggregate_id:need,payload:{[version===1?'thread_id':'conversation_id']:c,session_id:session,need_id:need}}).owner,'chat');
 assert.equal(event({event_type:'need.assessed',schema_version:2,aggregate_type:'conversation_need',aggregate_id:need,payload:{conversation_id:c,session_id:sales,need_id:need}}).disposition,'NO_GO');
});
test('remote inbox receipt is Chat-owned without moving producer outbox',()=>{
 const e={tenant_id:tenant,event_type:'crm.conversation_note.changed',schema_version:1,aggregate_type:'activity',aggregate_id:need,payload:{conversation_id:c}};
 const f={...facts,event:()=>e};
 assert.equal(partition('consumer_inbox',{tenant_id:tenant,consumer_name:'chat.activity.note.v1',event_id:need,status:'completed'},f).owner,'chat');
 assert.equal(partition('outbox_event',e,f).owner,'crm');
 assert.equal(partition('consumer_inbox',{tenant_id:tenant,consumer_name:'chat.activity.automation.v1',event_id:need},f).disposition,'NO_GO');
});
test('unified automation producer and retained Workflow handlers are registered',()=>{
 for(const producer of ['workflow']){
  const e={tenant_id:tenant,event_type:'automation.conversation_activity.v1',schema_version:1,aggregate_type:'workflow_run',aggregate_id:need,payload:{source_service:producer,conversation_id:c}};
  assert.equal(partition('consumer_inbox',{tenant_id:tenant,consumer_name:'chat.activity.automation.v1',event_id:need},{...facts,event:()=>e}).owner,'chat');
 }
 assert.equal(Object.keys(chatConsumers).length,8);assert.equal(Object.keys(retainedConsumers).length,10);
 assert(catalog.subscriptions.every(s=>chatConsumers[s.consumer]));
});
test('denied audit resource can be absent, accepted audit cannot',()=>{
 const row={tenant_id:tenant,resource_type:'conversation',resource_id:null,action:'messages',outcome:'denied'};
 assert.equal(partition('audit_entry',row,facts).owner,'chat');
 assert.equal(partition('audit_entry',{...row,outcome:'accepted'},facts).disposition,'NO_GO');
 assert.equal(partition('audit_entry',{...row,resource_type:'sales_need_outcome',resource_id:need,action:'need.link_outcome',outcome:'accepted'},facts).owner,'sales');
 for(const action of ['enroll','stage','need','identify_need','record','replace','retract'])assert(chatAudits.session_progress.includes('session.'+action));
});
test('historical audit archive needs explicit row-bound approved policy',()=>{
 const row={tenant_id:tenant,action:'unknown',resource_type:'unknown'};
 assert.equal(partition('audit_entry',row,facts).disposition,'NO_GO');
 assert.equal(partition('audit_entry',row,{...facts,archiveApproval:()=>({owner:'crm',rowHash:'a'.repeat(64),policy:'legacy-audit-no-purge-v1'})}).disposition,'archive');
 assert.equal(partition('audit_entry',row,{...facts,archiveApproval:()=>({owner:'crm'})}).disposition,'NO_GO');
});
test('storage matches pre-prepare abort and per-aggregate transport contracts',()=>{
 for(const t of additions.filter(t=>t.name.endsWith('_owner_command'))){
  assert(t.columns.find(c=>c.name==='operation').nullable);assert(t.columns.find(c=>c.name==='request_json'));
  assert(t.checks.some(c=>c.includes("state='prepared'")&&c.includes('request_json IS NOT NULL')));
 }
 for(const t of additions.filter(t=>t.name.endsWith('_event_stream')))assert.deepEqual(t.pk,['tenant_id','consumer_name','aggregate_type','aggregate_id']);
 const control=additions.find(t=>t.name==='chat_control_head');assert(control.checks.includes('cancel_through < control_revision'));
});
