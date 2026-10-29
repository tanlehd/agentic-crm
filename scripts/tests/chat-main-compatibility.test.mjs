import {test} from 'node:test';
import assert from 'node:assert/strict';
import {partition} from '../lib/chat-data-partition.mjs';
import {eventCodec} from '../lib/chat-events.mjs';
const tenant='01900000-0000-7000-8000-000000009401',id='01900000-0000-7000-8000-000000009402',session='01900000-0000-7000-8000-000000009403';
const facts={businessTenant:t=>t===tenant,entity:(t,kind,key)=>t===tenant&&key===id?{owner:kind==='sales-record'?'sales':'chat',object_key:'deal',conversation_id:id}:t===tenant&&kind==='session'&&key===session?{owner:'chat',conversation_id:id}:undefined};
test('source43 legacy classification event retains original v1 payload and validates its session binding',async()=>{
 const row={id,tenant_id:tenant,event_type:'conversation.classification_changed',schema_version:1,aggregate_type:'conversation_session',aggregate_id:session,aggregate_version:'1',payload:{thread_id:id,session_id:session,version:'1',changed_keys:['classification']},actor_kind:'human',actor_id:id,occurred_at:'2026-10-26 00:00:00.123456',correlation_id:id,causation_id:null};
 assert.equal(partition('outbox_event',row,facts).disposition,'copy');
 const codec=await eventCodec();codec.validate({...row,payload:JSON.stringify(row.payload)},'chat');
 assert.equal(partition('outbox_event',{...row,payload:{...row.payload,session_id:id}},facts).disposition,'NO_GO');
});
test('Sales stage events remain with Sales and reject mixed subject/version',()=>{
 const row={tenant_id:tenant,event_type:'sales.stage_changed',schema_version:1,aggregate_type:'sales_stage',aggregate_id:id,aggregate_version:'2',payload:{object_kind:'deal',subject_id:id,sequence:'2',from_stage:'open',to_stage:'won'}};
 assert.equal(partition('outbox_event',row,facts).owner,'sales');
 for(const payload of [{...row.payload,subject_id:session},{...row.payload,sequence:'1'},{...row.payload,object_kind:'lead'}])assert.equal(partition('outbox_event',{...row,payload},facts).disposition,'NO_GO');
});
test('Sales create receipts require a same-tenant matching subtype; unknown routes remain rejected',()=>{
 const row={tenant_id:tenant,route_key:'POST /api/v1/deals',response_body:JSON.stringify({data:{id}})};
 assert.equal(partition('idempotency_record',row,facts).owner,'sales');
 for(const invalid of [{...row,tenant_id:session},{...row,route_key:'POST /api/v1/leads'},{...row,route_key:'POST /api/v1/deals/unknown'},{...row,response_body:'{}'}])assert.equal(partition('idempotency_record',invalid,facts).disposition,'NO_GO');
});


test('main audit mappings retain exact owners and reject unknown actions and missing references',async()=>{
 const {mainAudit}=await import('../lib/chat-main-audits.mjs');
 const find=(table,t,key)=>t===tenant&&key===id?({principal:{kind:'human'},inbound_delivery:{id},crm_record:{id,object_type_id:session},deal:{record_id:id}}[table]):t===tenant&&key===session&&table==='object_type'?{key:'deal',kind:'standard'}:undefined;
 const f={businessTenant:t=>t===tenant,find};
 const audit={tenant_id:tenant,actor_kind:'human',actor_id:id,resource_type:'inbound_delivery',resource_id:id,action:'intake.processed',outcome:'accepted'};
 assert.equal(mainAudit(audit,f).owner,'connector');
 assert.equal(mainAudit({...audit,tenant_id:session},f).disposition,'NO_GO');
 assert.equal(mainAudit({...audit,resource_id:session},f).disposition,'NO_GO');
 assert.equal(mainAudit({...audit,actor_id:session},f).disposition,'NO_GO');
 assert.equal(mainAudit({...audit,action:'intake.future'},f),null);
 assert.equal(mainAudit({...audit,resource_type:'deal',action:'records.post'},f).owner,'sales');
 assert.equal(mainAudit({...audit,resource_type:'deal',action:'first_deal_won'},f).disposition,'NO_GO');
});

test('deleted record page audit requires exact historical command shape; saved pages require live or removal evidence',async()=>{
 const {mainAudit}=await import('../lib/chat-main-audits.mjs');
 const f={businessTenant:t=>t===tenant,find:(table,t,key)=>table==='principal'&&t===tenant&&key===id?{kind:'human'}:undefined};
 const audit={tenant_id:tenant,actor_kind:'human',actor_id:id,resource_type:'record_page_view',resource_id:session,action:'record_page.remove',outcome:'accepted',changed_fields:JSON.stringify(['layout','assignments'])};
 assert.equal(mainAudit(audit,f).owner,'crm');
 assert.equal(mainAudit({...audit,changed_fields:'[]'},f).disposition,'NO_GO');
 assert.equal(mainAudit({...audit,action:'record_page.save'},f).disposition,'NO_GO');
 assert.equal(mainAudit({...audit,action:'record_page.save'},{...f,removedPage:()=>true}).owner,'crm');
});
