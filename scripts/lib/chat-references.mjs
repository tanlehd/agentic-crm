// Offline, source-backed logical references. No destination runtime cross-DB SQL.
import {readFile} from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {canonical,sha} from './chat-exact.mjs';
const system='01900000-0000-7000-8000-000000000001';
const fail=code=>{throw new Error('NO_GO_'+code);};
const json=value=>typeof value==='string'?JSON.parse(value):value;
export async function validateReferences(snapshot,selected,mappings){
 const rows=snapshot.rows,list=table=>rows[table]??[];
 const find=(table,tenant,id,column='id')=>list(table).find(r=>r.tenant_id===tenant&&r[column]===id);
 const requireRow=(table,tenant,id,column='id')=>{const r=find(table,tenant,id,column);if(!r)fail('LOGICAL_'+table);return r;};
 const principal=(tenant,id,kind)=>{const p=requireRow('principal',tenant,id);if(kind&&p.kind!==kind)fail('ACTOR_KIND');return p;};
 function actor(tenant,kind,id){
  if(kind===null&&id===null)return;
  if(kind==='system'){if(id!==system&&id!==tenant)fail('SYSTEM_ACTOR');return;}
  if(kind==='service'){requireRow('service_actor',tenant,id);return;}
  if(!['human','ai'].includes(kind))fail('ACTOR_KIND');principal(tenant,id,kind);
 }
 // Account is explicitly system-owned; membership proves its business scope.
 for(const p of list('principal')){
  if(p.kind==='human'){const member=requireRow('membership',p.tenant_id,p.membership_id);requireRow('account',system,member.account_id);}
  else if(p.kind==='ai')requireRow('ai_agent',p.tenant_id,p.ai_agent_id);
  else fail('PRINCIPAL_KIND');
 }
 for(const [table,entries] of Object.entries(selected))for(const r of entries){
  if(Object.hasOwn(r,'actor_kind'))actor(r.tenant_id,r.actor_kind,r.actor_id);
  for(const col of ['owner_principal_id','from_owner_id','to_owner_id','principal_id','owner_id'])if(r[col])principal(r.tenant_id,r[col]);
  for(const col of ['team_id','from_team_id','to_team_id'])if(r[col])requireRow('team',r.tenant_id,r[col]);
  if(['session_need','session_stage_event','session_milestone_event','sales_session_context','session_process_version'].includes(table)&&r.actor_id)principal(r.tenant_id,r.actor_id);
 }
 for(const r of selected.message_acquisition_membership){
  const s=r.session_id&&requireRow('conversation_acquisition_session',r.tenant_id,r.session_id);
  if(s&&s.conversation_id!==r.conversation_id)fail('MEMBERSHIP_EPISODE');
 }
 for(const r of selected.session_milestone_event){
  const need=requireRow('session_need',r.tenant_id,r.need_id),s=requireRow('conversation_acquisition_session',r.tenant_id,r.session_id);
  if(need.session_id!==r.session_id)fail('MILESTONE_NEED');
  if(r.supersedes_id){const parent=requireRow('session_milestone_event',r.tenant_id,r.supersedes_id);if(parent.session_id!==r.session_id||parent.need_id!==r.need_id||parent.milestone_key!==r.milestone_key||parent.kind==='retract'||BigInt(parent.revision)>=BigInt(r.revision))fail('MILESTONE_PARENT');}
  if(r.message_id){const m=requireRow('message',r.tenant_id,r.message_id),member=requireRow('message_acquisition_membership',r.tenant_id,r.message_id,'message_id');if(m.direction!=='inbound'||m.conversation_id!==s.conversation_id||member.session_id!==r.session_id)fail('MILESTONE_MESSAGE');}
 }
 for(const r of selected.need_follow_up){
  const need=requireRow('session_need',r.tenant_id,r.need_id),source=requireRow('conversation_acquisition_session',r.tenant_id,r.source_session_id),recovery=requireRow('conversation_acquisition_session',r.tenant_id,r.session_id),run=requireRow('workflow_run',r.tenant_id,r.run_id),version=requireRow('workflow_version',r.tenant_id,run.version_id);
  if(need.session_id!==source.id||source.status!=='closed'||source.conversation_id!==r.conversation_id||recovery.conversation_id!==r.conversation_id||BigInt(recovery.sequence)<=BigInt(source.sequence)||version.definition_id!==run.definition_id)fail('FOLLOW_UP_EPISODE_PIN');
  const proof=list('workflow_action').find(a=>a.tenant_id===r.tenant_id&&a.run_id===run.id&&json(a.result)?.session_id===r.session_id&&json(a.result)?.conversation_id===r.conversation_id&&json(a.result)?.outcome==='recovered');
  if(!proof)fail('FOLLOW_UP_ACTION_PROOF');
 }
 for(const r of selected.session_contribution){
  const s=requireRow('conversation_acquisition_session',r.tenant_id,r.session_id),payload=json(r.payload);
  if(s.conversation_id!==r.conversation_id)fail('CONTRIBUTION_EPISODE');
  let source;
  if(['opened','closed'].includes(r.kind)){source=s;if(r.source_id!==s.id||r.source_revision!=='1')fail('CONTRIBUTION_LIFECYCLE');}
  else if(r.kind==='outbound_submitted'){source=requireRow('message',r.tenant_id,r.source_id);if(source.direction!=='outbound'||source.conversation_id!==r.conversation_id)fail('CONTRIBUTION_MESSAGE');}
  else if(r.kind==='assignment'){source=list('ownership_history').find(h=>h.tenant_id===r.tenant_id&&h.record_id===r.source_id&&h.owner_revision===r.source_revision);if(r.source_id!==r.conversation_id||source?.to_owner_id!==r.owner_id||source?.to_team_id!==r.team_id)fail('CONTRIBUTION_ASSIGNMENT');}
  else if(r.kind==='classification'){source=list('outbox_event').find(h=>h.tenant_id===r.tenant_id&&h.aggregate_id===r.source_id&&h.aggregate_version===r.source_revision&&h.event_type==='conversation.classification_changed');}
  else if(r.kind==='stage'){source=requireRow('session_stage_event',r.tenant_id,r.source_id);if(source.session_id!==r.session_id||source.revision!==r.source_revision)fail('CONTRIBUTION_STAGE');}
  else if(r.kind==='evidence'){
   const table=['need','identify_need'].includes(payload.action)?'session_need':payload.action==='enroll'?'session_progress':'session_milestone_event';source=requireRow(table,r.tenant_id,r.source_id,table==='session_progress'?'session_id':'id');
   if(source.session_id!==r.session_id||source.revision&&source.revision!==r.source_revision)fail('CONTRIBUTION_EVIDENCE');
  }else if(r.kind==='note'){source=requireRow('activity',r.tenant_id,r.source_id,'record_id');if(source.related_record_id!==r.conversation_id||source.kind!=='note')fail('CONTRIBUTION_NOTE');const record=requireRow('crm_record',r.tenant_id,r.source_id);if(BigInt(r.source_revision)>BigInt(record.version))fail('CONTRIBUTION_NOTE_REVISION');}
  else if(r.kind==='outcome'){source=requireRow('sales_session_context',r.tenant_id,r.source_id);if(source.session_id!==r.session_id||source.conversation_id!==r.conversation_id||source.record_id!==payload.record_id||source.kind!==payload.role||r.source_revision!=='1')fail('CONTRIBUTION_SALES');}
  else fail('CONTRIBUTION_KIND');
  if(!source)fail('CONTRIBUTION_SOURCE');
  const record=requireRow('crm_record',r.tenant_id,r.conversation_id),history=list('ownership_history').find(h=>h.tenant_id===r.tenant_id&&h.record_id===r.conversation_id&&h.owner_revision===r.owner_revision);
  if(r.owner_revision!=='0'&&!(history&&history.to_owner_id===r.owner_id&&history.to_team_id===r.team_id)&&!(record.owner_revision===r.owner_revision&&record.owner_principal_id===r.owner_id&&record.team_id===r.team_id))fail('CONTRIBUTION_OWNER_HISTORY');
 }
 for(const r of list('sales_session_context')){
  const s=requireRow('conversation_acquisition_session',r.tenant_id,r.session_id),chat=requireRow('conversation',r.tenant_id,r.conversation_id,'record_id'),record=find('lead',r.tenant_id,r.record_id,'record_id')??find('deal',r.tenant_id,r.record_id,'record_id');
  if(s.conversation_id!==r.conversation_id||!record||record.contact_id!==chat.contact_id)fail('SALES_CONTEXT');principal(r.tenant_id,r.actor_id);
 }
 for(const r of list('sales_need_outcome')){
  const need=requireRow('session_need',r.tenant_id,r.need_id),session=requireRow('conversation_acquisition_session',r.tenant_id,r.session_id),chat=requireRow('conversation',r.tenant_id,r.conversation_id,'record_id'),record=find('lead',r.tenant_id,r.record_id,'record_id')??find('deal',r.tenant_id,r.record_id,'record_id');
  if(need.session_id!==session.id||session.conversation_id!==chat.record_id||!record||record.contact_id!==chat.contact_id)fail('SALES_NEED_OUTCOME');principal(r.tenant_id,r.actor_id);
 }
 for(const e of list('outbox_event')){
  const data=json(e.payload);
  if(e.event_type==='crm.conversation_note.changed'){
   const note=requireRow('activity',e.tenant_id,data.activity_id,'record_id'),record=requireRow('crm_record',e.tenant_id,note.record_id);
   if(e.aggregate_id!==note.record_id||note.kind!=='note'||note.related_record_id!==data.conversation_id||e.aggregate_version!==data.source_revision||BigInt(data.source_revision)>BigInt(record.version))fail('NOTE_EVENT_REFERENCE');
  }else if(e.event_type==='automation.conversation_activity.v1'){
   const run=requireRow('workflow_run',e.tenant_id,data.run_id),version=requireRow('workflow_version',e.tenant_id,data.definition_version_id);
   const context=json(run.context),conversation=context?.trigger?.conversation_id??context?.trigger?.aggregate_id;
   if(run.id!==e.aggregate_id||run.version_id!==version.id||conversation!==data.conversation_id||e.aggregate_version!==data.source_revision)fail('AUTOMATION_EVENT_REFERENCE');
  }else if(['message.received','message.sent','message.delivery_failed'].includes(e.event_type)){
   if(data.message_id){const m=requireRow('message',e.tenant_id,data.message_id);if(m.conversation_id!==e.aggregate_id||data.connection_id&&m.connection_id!==data.connection_id||data.outbound_intent_id&&m.outbound_intent_id!==data.outbound_intent_id)fail('MESSAGE_EVENT_REFERENCE');}
   if(data.outbound_intent_id&&requireRow('outbound_intent',e.tenant_id,data.outbound_intent_id).conversation_id!==e.aggregate_id)fail('INTENT_EVENT_REFERENCE');
  }
 }
 for(const r of selected.session_touchpoint??[]){const s=requireRow('conversation_acquisition_session',r.tenant_id,r.session_id),t=requireRow('touchpoint',r.tenant_id,r.touchpoint_id),c=requireRow('conversation',r.tenant_id,s.conversation_id,'record_id');if(t.connection_id&&t.connection_id!==c.connection_id||t.contact_identity_id&&t.contact_identity_id!==c.contact_identity_id)fail('TOUCHPOINT_BINDING');}
 const schema=JSON.parse(await readFile('packages/contracts/schemas/chat-dispatch-v1.json','utf8')),ajv=addFormats(new Ajv({strict:false}));ajv.addSchema(schema);
 const bindingValid=ajv.compile({$ref:schema.$id+'#/definitions/DispatchBinding'}),resourceValid=ajv.compile({$ref:schema.$id+'#/definitions/DispatchResourceContext'});
 function dispatch(row){
  const b=json(row.binding_json),resource=json(row.resource_json);
  if(!bindingValid(b)||!resourceValid(resource))fail('DISPATCH_SCHEMA');
  for(const col of ['tenant_id','intent_id','attempt_id','conversation_id','delegation_id','principal_id'])if(row[col]!==undefined&&row[col]!==b[col])fail('DISPATCH_COLUMNS');
  const i=requireRow('outbound_intent',b.tenant_id,b.intent_id),c=requireRow('conversation',b.tenant_id,b.conversation_id,'record_id'),d=requireRow('identity_dispatch_delegation',b.tenant_id,b.delegation_id),m=requireRow('message',b.tenant_id,b.intent_id,'outbound_intent_id');
  if(i.conversation_id!==b.conversation_id||i.actor_id!==b.principal_id||i.actor_kind!==b.actor_kind||i.owner_revision!==b.owner_revision||c.contact_id!==b.crm_contact_id||c.connection_id!==b.connection_id||d.principal_id!==b.principal_id||m.conversation_id!==i.conversation_id||m.text!==i.text||m.status!==i.status.replace(/^remote_/,''))fail('DISPATCH_BINDING');
  if(b.payload_digest!==sha(canonical({version:1,platform:'mock_messenger',message:{type:'text',text:i.text}}))||resource.owner_principal_id!==b.principal_id||resource.owner_revision!==b.owner_revision||resource.record_version!==b.record_version)fail('DISPATCH_PAYLOAD_RESOURCE');
  if(resource.team_id)requireRow('team',b.tenant_id,resource.team_id);
  for(const team of resource.shared_team_ids)requireRow('team',b.tenant_id,team);
  principal(b.tenant_id,b.principal_id,'human');return {b,i,m,resource};
 }
 for(const row of selected.chat_outbound_job){
  const {b,i}=dispatch(row),grant=row.grant_id&&requireRow('identity_dispatch_grant',row.tenant_id,row.grant_id),claim=find('chat_dispatch_claim',row.tenant_id,row.intent_id,'intent_id');
  if(grant&&(canonical(json(grant.binding_json))!==canonical(b)||canonical(json(grant.resource_json))!==canonical(json(row.resource_json))))fail('JOB_GRANT_BINDING');
  if(row.claim_id&&claim?.claim_id!==row.claim_id)fail('JOB_CLAIM_BINDING');
  if(['sending','unknown','remote_sending','remote_unknown'].includes(i.status)){
   if(!claim||claim.attempt_id!==b.attempt_id||i.dispatch_token!==claim.claim_id||!grant||grant.state!=='consumed'||grant.claim_id!==claim.claim_id||row.phase!=='deliver')fail('UNKNOWN_RECONCILIATION_ROUTE');
   mappings.push({kind:'dispatch-recovery',tenant_id:row.tenant_id,intent_id:row.intent_id,attempt_id:b.attempt_id,claim_id:claim.claim_id,grant_id:grant.id,route:'connector-receipt-status-only',resend:false});
  }
 }
 for(const row of selected.chat_dispatch_claim){const {b,i}=dispatch(row),g=requireRow('identity_dispatch_grant',row.tenant_id,row.grant_id);if(canonical(json(g.binding_json))!==canonical(b)||canonical(json(g.resource_json))!==canonical(json(row.resource_json))||g.intent_id!==row.intent_id||g.attempt_id!==row.attempt_id||i.dispatch_token!==row.claim_id)fail('CLAIM_GRANT');}
 for(const i of selected.outbound_intent){
  principal(i.tenant_id,i.actor_id,i.actor_kind);
  const message=requireRow('message',i.tenant_id,i.id,'outbound_intent_id'),conversation=requireRow('conversation',i.tenant_id,i.conversation_id,'record_id');
  if(message.direction!=='outbound'||message.conversation_id!==i.conversation_id||message.connection_id!==conversation.connection_id||message.text!==i.text||message.status!==i.status.replace(/^remote_/,'')||message.provider_message_id!==i.provider_message_id)fail('OUTBOUND_MESSAGE_BINDING');
  if(i.account_id){const p=principal(i.tenant_id,i.actor_id,'human'),membership=requireRow('membership',i.tenant_id,p.membership_id);if(membership.account_id!==i.account_id)fail('OUTBOUND_ACCOUNT');}
  if(['sending','unknown','remote_sending','remote_unknown'].includes(i.status)&&!find('chat_outbound_job',i.tenant_id,i.id,'intent_id'))fail('UNROUTABLE_UNKNOWN_ATTEMPT');
 }
 // Baseline has no trustworthy generation field. Drained terminal work is safe;
 // active work must first be pinned/reconciled by its owning adapter (T06).
 // In particular agent_execution is the real baseline table, not ai_execution.
 for(const table of ['agent_execution','workflow_run'])for(const r of list(table))if(!['completed','failed','timed_out','cancelled'].includes(r.status))fail('ACTIVE_WORK_REQUIRES_OWNER_PIN_PROOF');
}
