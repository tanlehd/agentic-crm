import {readFile} from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {chatConsumers,retainedConsumers} from './chat-data-partition.mjs';
import {canonical,sha} from './chat-exact.mjs';
const fail=code=>{throw new Error('NO_GO_'+code);};
const key=(tenant,id)=>tenant+':'+id;
export async function eventCodec(){
 const schema=JSON.parse(await readFile('packages/contracts/schemas/chat-owner-v1.json','utf8')),control=JSON.parse(await readFile('packages/contracts/schemas/chat-control-v1.json','utf8'));
 const ajv=addFormats(new Ajv({strict:false}));ajv.addSchema(schema);ajv.addSchema(control);
 const domain=ajv.compile({$ref:schema.$id+'#/definitions/OwnerDomainEvent'}),chat=ajv.compile({$ref:schema.$id+'#/definitions/OwnerChatEvent'}),registry=ajv.compile({$ref:control.$id+'#/definitions/ChatControlEvent'});
 function envelope(r,producer,consumer,sequence='1'){
  if(r.event_type==='chat.registry.changed.v1')return JSON.parse(r.payload);
  return {event_id:r.id,tenant_id:r.tenant_id,aggregate_id:r.aggregate_id,aggregate_type:r.aggregate_type,aggregate_version:r.aggregate_version,stream_sequence:sequence,occurred_at:r.occurred_at.replace(' ','T')+'Z',correlation_id:r.correlation_id,causation_id:r.causation_id,actor:{kind:r.actor_kind,id:r.actor_id},producer,...(chatConsumers[consumer]?{consumer}:{}),event_type:r.event_type,schema_version:Number(r.schema_version),data:JSON.parse(r.payload)};
 }
 function validate(r,producer){
  const consumer=Object.entries(chatConsumers).find(([,v])=>[v[0]].flat().includes(producer)&&v[1]===r.event_type)?.[0],wire=envelope(r,producer,consumer);
  if(!(r.event_type==='chat.registry.changed.v1'?registry(wire):consumer?chat(wire):domain(wire)))fail('EVENT_SCHEMA_'+r.event_type);
  if(r.event_type==='chat.registry.changed.v1'&&(wire.event_id!==r.id||wire.tenant_id!==r.tenant_id||wire.conversation_id!==r.aggregate_id||wire.registry_revision!==r.aggregate_version||wire.snapshot.tenant_id!==r.tenant_id||wire.snapshot.conversation_id!==r.aggregate_id))fail('CONTROL_EVENT_BINDING');
 }
 return {envelope,validate};
}
const registrations=[
 ...Object.entries(chatConsumers).map(([consumer,[producers,type]])=>({consumer,owner:'chat',producers:[producers].flat(),type,versions:[1]})),
 ...Object.entries(retainedConsumers).map(([consumer,[owner,producers,type,versions]])=>({consumer,owner,producers,type,versions})),
 ...[['crm.chat-registry.v1','crm'],['ai-runtime.chat-control.v1','ai-runtime'],['workflow.chat-control.v1','workflow']].map(([consumer,owner])=>({consumer,owner,producers:['chat'],type:'chat.registry.changed.v1',versions:[1]}))
];
export function deriveEvents(snapshot,selected,mappings,eventOwners,codec,uuid){
 const {manifest:m,rows}=snapshot,at=m.source.at,common={version:'1',created_at:at,updated_at:at};
 // Every new subscriber gets the same minimized authoritative seed. It is a
 // migration event, not an invented historical control transition or work pin.
 if(rows.outbox_event.some(r=>r.event_type==='chat.registry.changed.v1'))fail('EXISTING_CONTROL_GENERATION_REQUIRES_REVIEW');
 for(const c of selected.conversation){
  const r=selected.crm_record.find(r=>r.tenant_id===c.tenant_id&&r.id===c.record_id),owner=r.owner_principal_id&&(rows.principal??[]).find(p=>p.tenant_id===r.tenant_id&&p.id===r.owner_principal_id);
  if(r.owner_principal_id&&!owner)fail('CONTROL_OWNER_REFERENCE');
  const sessions=selected.conversation_acquisition_session.filter(s=>s.tenant_id===c.tenant_id&&s.conversation_id===c.record_id&&s.status==='active');if(sessions.length>1)fail('CONTROL_ACTIVE_SESSION');
  const id=uuid(m.run,'registry:'+c.tenant_id+':'+c.record_id);
  const wire={schema_version:1,event_type:'chat.registry.changed.v1',producer:'chat',event_id:id,tenant_id:c.tenant_id,conversation_id:c.record_id,registry_revision:'1',occurred_at:at.replace(' ','T')+'Z',correlation_id:m.run,
   snapshot:{tenant_id:c.tenant_id,conversation_id:c.record_id,registry_revision:'1',record_version:r.version,owner_revision:r.owner_revision,control_revision:'1',pause_through_revision:'0',cancel_through_revision:'0',crm_contact_id:c.contact_id,crm_identity_id:c.contact_identity_id,connection_id:c.connection_id,owner_principal_id:r.owner_principal_id,owner_kind:owner?.kind??null,team_id:r.team_id,shared_team_ids:selected.record_team_access.filter(s=>s.tenant_id===c.tenant_id&&s.record_id===c.record_id).map(s=>s.team_id).sort(),active_session_id:sessions[0]?.id??null,status:c.status,archived:r.archived_at!==null}};
  const event={id,tenant_id:c.tenant_id,event_type:wire.event_type,schema_version:'1',aggregate_type:'conversation',aggregate_id:c.record_id,aggregate_version:'1',payload:canonical(wire),correlation_id:m.run,causation_id:null,actor_kind:'system',actor_id:c.tenant_id,occurred_at:at,created_at:at,status:'pending',attempts:'0',next_attempt_at:null,lease_until:null,fencing_token:'0'};
  codec.validate(event,'chat');selected.outbox_event.push(event);eventOwners.set(key(c.tenant_id,id),'chat');
 }
 const all=[...rows.outbox_event,...selected.outbox_event.filter(e=>e.event_type==='chat.registry.changed.v1')],streams=new Map();
 for(const event of all){const producer=eventOwners.get(key(event.tenant_id,event.id));
  for(const reg of registrations.filter(r=>r.producers.includes(producer)&&r.type===event.event_type&&r.versions.includes(Number(event.schema_version)))){
   const k=canonical([producer,event.tenant_id,reg.consumer,event.aggregate_type,event.aggregate_id]);
   if(!streams.has(k))streams.set(k,{producer,reg,events:[]});streams.get(k).events.push(event);
  }
 }
 for(const {producer,reg,events} of [...streams.entries()].sort(([a],[b])=>a<b?-1:1).map(([,v])=>v)){
  events.sort((a,b)=>a.occurred_at<b.occurred_at?-1:a.occurred_at>b.occurred_at?1:a.id<b.id?-1:1);
  const first=events[0],registration=sha(canonical({version:1,producer,consumer:reg.consumer,event_type:reg.type,schema_versions:reg.versions})),deliveries=[];let ack=0n,gap=false;
  for(const [n,event] of events.entries()){
   const prior=rows.consumer_inbox.filter(i=>i.tenant_id===event.tenant_id&&i.consumer_name===reg.consumer&&i.event_id===event.id);if(prior.length>1||prior.some(i=>i.status!=='completed'||!i.processed_at))fail('CONSUMER_TERMINAL_PROOF');
   const applied=prior.length===1,sequence=String(n+1),wire=codec.envelope(event,producer,reg.consumer,sequence),digest=sha(canonical(wire));
   if(!applied)gap=true;else if(!gap)ack++;
   const base={tenant_id:event.tenant_id,consumer_name:reg.consumer,aggregate_type:event.aggregate_type,aggregate_id:event.aggregate_id,sequence,event_id:event.id,event_digest:digest,envelope_json:canonical(wire),next_attempt_at:at,attempts:'0',lease_token:null,lease_until:null,...common};
   deliveries.push({...base,registration_digest:registration,state:applied?'acked':'pending',acked_at:prior[0]?.processed_at??null});
   if(reg.owner==='chat')selected.chat_event_inbox.push({...base,producer,state:applied?'applied':'pending',applied_at:prior[0]?.processed_at??null});
  }
  const stream={tenant_id:first.tenant_id,consumer_name:reg.consumer,aggregate_type:first.aggregate_type,aggregate_id:first.aggregate_id,next_sequence:String(events.length+1),acked_through:String(ack),retained_from:'1',registration_digest:registration,...common};
  if(producer==='chat'){selected.chat_event_stream.push(stream);selected.chat_event_delivery.push(...deliveries);}
  else mappings.push({kind:'owner-event-import',owner:producer,receiver:reg.owner,stream,deliveries,effect:'import-only-no-replay'});
 }
 // Existing Workflow selections, including explicit no-enrollment decisions,
 // stay durable so missing receipts cannot choose a newly published graph.
 for(const selection of rows.workflow_trigger_selection??[]){
  const event=rows.outbox_event.find(e=>e.tenant_id===selection.tenant_id&&e.id===selection.event_id),definition=rows.workflow_definition.find(d=>d.tenant_id===selection.tenant_id&&d.id===selection.definition_id);
  if(!event||!definition)fail('WORKFLOW_SELECTION_REFERENCE');
  const runs=rows.workflow_run.filter(r=>r.tenant_id===selection.tenant_id&&r.definition_id===selection.definition_id&&r.trigger_event_id===selection.event_id);if(runs.length>1)fail('WORKFLOW_SELECTION_DUPLICATE');
  for(const run of runs)if(!rows.workflow_version.some(v=>v.tenant_id===run.tenant_id&&v.definition_id===run.definition_id&&v.id===run.version_id))fail('WORKFLOW_VERSION_PIN');
  mappings.push({kind:'workflow-selection-import',owner:'workflow',tenant_id:selection.tenant_id,event_id:selection.event_id,definition_id:selection.definition_id,selected:true,run_id:runs[0]?.id??null,version_id:runs[0]?.version_id??null,effect:'preserve-selection-no-reenrollment'});
 }
}
