// Enrich only the new final retained source. No mutation of earlier rehearsals.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {config,pool,privateRoot,profileName} from './lib/chat-native.mjs';
import {canonical,sha} from './lib/chat-exact.mjs';
if(profileName!=='final')throw new Error('FINAL_PROFILE_REQUIRED');
const cfg=await config(),fixture=JSON.parse(await readFile(privateRoot+'/fixture.json','utf8'));
const id=label=>{const h=createHash('sha256').update('chat-storage-retained-v1:'+label).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-7${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
const at=fixture.now,system='01900000-0000-7000-8000-000000000001';
const p=pool(cfg,'fixture',cfg.source),c=await p.getConnection();
try{
 await c.beginTransaction();
 async function insert(table,row,keys=['tenant_id','id']){
  const [old]=await c.query('SELECT * FROM `'+table+'` WHERE '+keys.map(k=>'`'+k+'`=?').join(' AND '),keys.map(k=>row[k]));
  if(old.length){for(const k of Object.keys(row)){const a=old[0][k],b=row[k];if(a===null||b===null)assert.equal(a,b,table+'.'+k);else if(typeof b==='string'&&/^[\[{]/.test(b))assert.equal(canonical(JSON.parse(a)),canonical(JSON.parse(b)),table+'.'+k);else assert.equal(String(a),String(b),table+'.'+k);}return;}
  try{await c.execute('INSERT INTO `'+table+'` ('+Object.keys(row).map(k=>'`'+k+'`').join(',')+') VALUES ('+Object.keys(row).map(()=>'?').join(',')+')',Object.values(row));}catch(e){throw new Error('FINAL_FIXTURE_'+table+'_'+e.code+'_'+(e.sqlMessage?.match(/(?:Unknown column|Field|constraint) [\x27\x60]([^\x27\x60]+)/i)?.[1]??''));}
 }
 for(const [label,f] of Object.entries(fixture.labels)){
  const t=f.tenant,human=id(label+':human'),account=id(label+':account'),membership=id(label+':member'),role=id(label+':workflow-role'),service=id(label+':workflow-actor'),wd=id(label+':workflow'),wv=id(label+':workflow-v1'),wr=id(label+':workflow-run');
  await insert('account',{id:account,tenant_id:system,issuer:'native',subject:account,display_name:'Synthetic retained '+label,login_key:'chat-final-'+label,native_status:'active',security_revision:'1',created_at:at,updated_at:at});
  await insert('membership',{id:membership,tenant_id:t,account_id:account,status:'active',seat_code:'chat',created_at:at,updated_at:at});
  await insert('principal',{id:human,tenant_id:t,kind:'human',membership_id:membership,status:'active',availability:'available',created_at:at,updated_at:at});
  await insert('role',{id:role,tenant_id:t,key:'chat-final-workflow',name:'Synthetic workflow',permissions:'[]',created_at:at,updated_at:at});
  await insert('service_actor',{id:service,tenant_id:t,key:'chat-final-workflow',role_id:role,created_at:at,updated_at:at});
  // Fixture-only correction before first export: the old basic fixture used a
  // system ID in this untyped Human actor field. Existing rehearsals stay intact.
  await c.execute('UPDATE session_need SET actor_id=? WHERE tenant_id=? AND id=? AND actor_id=?',[human,t,f.need,system]);
  await c.execute('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=? AND owner_principal_id IS NULL',[human,t,f.conversation]);
  await c.execute('UPDATE ownership_history SET to_owner_id=? WHERE tenant_id=? AND record_id=? AND to_owner_id IS NULL',[human,t,f.conversation]);
  await insert('conversation_read_state',{tenant_id:t,conversation_id:f.conversation,principal_id:human,id:id(label+':read'),last_read_inbound_seq:'0',revision:'1',updated_at:at},['tenant_id','conversation_id','principal_id']);
  await insert('workflow_definition',{id:wd,tenant_id:t,key:'chat-final',name:'Synthetic retained graph',service_actor_id:service,enabled:'0',created_at:at});
  const graph=JSON.stringify({version:1,nodes:[{key:'finish',type:'end'}]});
  await insert('workflow_version',{id:wv,tenant_id:t,definition_id:wd,number:'1',graph,execution_role_id:role,state:'published',published_at:at,created_at:at});
  await insert('workflow_trigger_selection',{tenant_id:t,definition_id:wd,event_id:id(label+':created'),created_at:at},['tenant_id','definition_id','event_id']);
  await insert('workflow_run',{id:wr,tenant_id:t,definition_id:wd,version_id:wv,trigger_event_id:id(label+':created'),service_actor_id:service,current_node:'finish',context:JSON.stringify({conversation_id:f.conversation}),status:'completed',correlation_id:'synthetic-final',started_at:at,finished_at:at});
  async function event(suffix,type,aggregate,aggregateId,revision,payload,second,consumer){
   const occurred='2026-10-18 00:00:'+String(second).padStart(2,'0')+'.123456',eid=id(label+':final-event:'+suffix);
   await insert('outbox_event',{id:eid,tenant_id:t,event_type:type,schema_version:'1',aggregate_type:aggregate,aggregate_id:aggregateId,aggregate_version:revision,payload:JSON.stringify(payload),correlation_id:'synthetic-final',actor_kind:'system',actor_id:system,occurred_at:occurred,created_at:occurred,status:consumer?'dispatched':'pending'});
   if(consumer)await insert('consumer_inbox',{tenant_id:t,consumer_name:consumer,event_id:eid,status:'completed',processed_at:occurred},['tenant_id','consumer_name','event_id']);
   return eid;
  }
  // Completed, gap, completed: ACK must remain 1 while receipt 3 stays applied.
  for(let n=1;n<=3;n++)await event('note-'+n,'crm.conversation_note.changed','activity',f.note,String(n),{conversation_id:f.conversation,activity_id:f.note,operation:n===1?'created':'updated',source_revision:String(n)},n,n===2?null:'chat.activity.note.v1');
  for(const [producer,run,version,aggregate] of [['workflow',wr,wv,'workflow_run']])await event(producer,'automation.conversation_activity.v1',aggregate,run,'1',{conversation_id:f.conversation,source_service:producer,run_id:run,definition_version_id:version,state:'completed',source_revision:'1'},4,producer==='workflow'?'chat.activity.automation.v1':null);
  await event('message','message.received','conversation',f.conversation,'9007199254740993',{conversation_id:f.conversation,message_id:id(label+':message:0'),connection_id:f.connection},5,null);
  await insert('session_milestone_event',{tenant_id:t,id:id(label+':milestone'),session_id:f.session,need_id:f.need,revision:'2',milestone_key:'qualified',kind:'record',message_id:id(label+':message:0'),reason:'Synthetic retained evidence',occurred_at:at,recorded_at:at,actor_id:human});
  await insert('session_contribution',{tenant_id:t,session_id:f.session,id:id(label+':contribution'),conversation_id:f.conversation,revision:'1',kind:'evidence',source_id:id(label+':milestone'),source_revision:'2',actor_kind:'human',actor_id:human,owner_id:human,team_id:f.team,owner_revision:'9007199254740995',payload:'{"action":"record"}',recorded_at:at});
  for(const state of ['remote_queued','remote_unknown']){
   const intent=id(label+':'+state),attempt=id(label+':attempt:'+state),delegation=id(label+':delegation:'+state),claim=id(label+':claim:'+state),grant=id(label+':grant:'+state),text='Synthetic retained dispatch '+state,unknown=state==='remote_unknown';
   const binding={tenant_id:t,conversation_id:f.conversation,crm_contact_id:f.contact,connection_id:f.connection,intent_id:intent,attempt_id:attempt,principal_id:human,delegation_id:delegation,actor_kind:'human',owner_revision:'9007199254740995',record_version:'9007199254740993',payload_digest:sha(canonical({version:1,platform:'mock_messenger',message:{type:'text',text}}))};
   const resource={object_key:'conversation',owner_principal_id:human,owner_revision:binding.owner_revision,record_version:binding.record_version,team_id:f.team,shared_team_ids:[f.team]};
   await insert('outbound_intent',{tenant_id:t,id:intent,conversation_id:f.conversation,actor_kind:'human',actor_id:human,account_id:account,owner_revision:binding.owner_revision,text,status:state,idempotency_key:state,dispatch_token:unknown?claim:null,sending_at:unknown?at:null,created_at:at});
   await insert('message',{tenant_id:t,id:id(label+':outbound:'+state),conversation_id:f.conversation,connection_id:f.connection,outbound_intent_id:intent,direction:'outbound',text,occurred_at:at,received_at:at,status:unknown?'unknown':'queued'});
   await insert('identity_dispatch_delegation',{tenant_id:t,id:delegation,principal_id:human,session_hash:sha('synthetic-final:'+label+state),principal_revision:'1',security_revision:'1',created_at:at});
   if(unknown){
    await insert('identity_dispatch_grant',{tenant_id:t,id:grant,intent_id:intent,attempt_id:attempt,delegation_id:delegation,binding_json:canonical(binding),resource_json:canonical(resource),principal_revision:'1',security_revision:'1',state:'consumed',claim_id:claim,fence_id:id(label+':fence:'+state),expires_at:at,version:'2',created_at:at,updated_at:at});
    await insert('chat_dispatch_claim',{tenant_id:t,intent_id:intent,attempt_id:attempt,claim_id:claim,grant_id:grant,conversation_id:f.conversation,binding_json:canonical(binding),resource_json:canonical(resource),created_at:at},['tenant_id','intent_id']);
   }
   await insert('chat_outbound_job',{tenant_id:t,intent_id:intent,conversation_id:f.conversation,attempt_id:attempt,delegation_id:delegation,principal_id:human,binding_json:canonical(binding),resource_json:canonical(resource),phase:unknown?'deliver':'issue',status:unknown?'attention':'pending',grant_id:unknown?grant:null,claim_id:unknown?claim:null,next_attempt_at:at,created_at:at,updated_at:at},['tenant_id','intent_id']);
  }
  await insert('idempotency_record',{id:id(label+':exception-receipt'),tenant_id:t,actor_kind:'human',actor_id:human,route_key:'POST /synthetic/legacy/core-note',key:'synthetic-exception',request_hash:sha('synthetic-exception'),status:'completed',response_status:200,response_body:JSON.stringify({data:{id:f.note}}),created_at:at,updated_at:at,expires_at:at});
  await event('exception','synthetic.legacy.note','activity',f.note,'1',{activity_id:f.note},6,null);
  await insert('audit_entry',{id:id(label+':exception-audit'),tenant_id:t,actor_kind:'human',actor_id:human,action:'synthetic.legacy.note',resource_type:'activity',resource_id:f.note,outcome:'accepted',changed_fields:'[]',correlation_id:'synthetic-final',occurred_at:at,created_at:at});
 }
 await c.commit();await writeFile(privateRoot+'/final-fixture.json',JSON.stringify({format:1,synthetic:true,at,tenants:fixture.tenants,source:cfg.source}),{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});console.log('PASS final retained fixture: native actors, note gaps, pinned terminal Workflow, milestones and queued/unknown dispatch');
}catch(e){await c.rollback();throw e;}finally{c.release();await p.end();}
