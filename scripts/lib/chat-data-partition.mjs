// Executable design predicates. Input facts are from one validated fenced export,
// not request data. No database access, fuzzy route matching or default owner.
export const uuidPattern='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const U=`(${uuidPattern})`;
const route=(pattern,owner,refs=[])=>({pattern:`^${pattern}$`,owner,refs});
export const receiptRules=[
 route(`need-outcome:${U}:${U}:${U}`,'sales',['conversation','session','need']),
 route(`POST /api/v1/threads/${U}/sessions/${U}/needs/${U}/(?:assessment|enrich)`,'chat',['conversation','session','need']),
 route(`POST /api/v1/conversations/${U}/(?:messages|messages-v2|notes|transition|takeover)`,'chat',['conversation']),
 route(`POST /api/v1/conversations/${U}/sessions/${U}/(?:classification|progress)`,'chat',['conversation','session']),
 route(`POST /api/v1/records/${U}/assignment`,'record-owner',['record']),
 route(`PATCH /api/v1/objects/conversation/records/${U}`,'chat',['conversation']),
 route(`POST /api/v1/objects/conversation/records/${U}/archive`,'chat',['conversation']),
 route('POST /api/v1/session-process','chat'),
 route(`POST /api/v1/chat-workspace/conversations/${U}/read-state`,'chat',['conversation']),
 route(`(?:snooze|wake) /api/v1/chat-workspace/conversations/${U}`,'chat',['conversation']),
 route(`(?:PUT|DELETE) /api/v1/chat-workspace/conversations/${U}/tags/${U}`,'chat',['conversation','tag']),
 ...['inboxes','tags','snippets'].flatMap((kind)=>[
  route(`create /api/v1/chat-workspace/${kind}/`,'chat'),
  route(`(?:update|archive${kind==='inboxes'?'|shares':''}) /api/v1/chat-workspace/${kind}/${U}`,'chat',[{inboxes:'inbox',tags:'tag',snippets:'snippet'}[kind]])
 ]),
 // These retained owners do not move. Exact remaining historical keys can only
 // be admitted through a signed per-row exception, never an unrestricted prefix.
 route(`POST /api/v1/sales/records/${U}/session-context`,'sales',['sales-record']),
 route(`POST /api/v1/leads/${U}/(?:qualify|handoff|accept|merge)`,'sales',['sales-record']),
 route('POST /api/v1/(?:leads|deals)','sales'),
 route(`PATCH /api/v1/deals/${U}`,'sales',['sales-record']),
 route(`crm.resolve-contact/${U}`,'crm',['connection']),
 route('POST /api/v1/human-routing/(?:skills|team-skills|profiles|queues|reroute)','routing'),
 route(`POST /api/v1/(?:operations|integrations)/deliveries/${U}/retry`,'connector',['delivery'])
];
export const chatEvents=[
 ['conversation.created',1,'conversation','conversation'],['message.received',1,'conversation','conversation'],['message.sent',1,'conversation','conversation'],['message.delivery_failed',1,'conversation','conversation'],
 ['acquisition_session.opened',1,'acquisition_session','session'],['acquisition_session.closed',1,'acquisition_session','session'],
 ['conversation.classification_changed',1,'conversation_session','session'],['conversation.classification_changed',2,'conversation_session','session'],['need.assessed',1,'conversation_need','need'],['need.assessed',2,'conversation_need','need'],['session.progress_changed',1,'session_progress','session'],
 ['chat.read_marker.updated',1,'conversation_read_state','read-state'],['chat.snooze.changed',1,'conversation','conversation'],['chat.inbox.changed',1,'chat_inbox','inbox'],['chat.snippet.changed',1,'chat_snippet','snippet'],['chat.tag_definition.changed',1,'conversation_tag','tag'],['chat.conversation_tag.changed',1,'conversation','conversation'],['chat.registry.changed.v1',1,'conversation','conversation']
];
export const remoteEvents=[['contact.created','crm','contact'],['principal.access_changed','identity','principal'],['lead.created','sales','lead'],['lead.qualified','sales','lead'],['lead.handoff_requested','sales','lead'],['lead.accepted','sales','lead'],['deal.created','sales','deal'],['deal.won','sales','deal'],['crm.conversation_note.changed','crm','activity']];
export const chatConsumers={
 'chat.read-marker.v1':['chat','chat.read_marker.updated'],'chat.snooze.v1':['chat','chat.snooze.changed'],'chat.inbox.changed.v1':['chat','chat.inbox.changed'],'chat.snippet.changed.v1':['chat','chat.snippet.changed'],'chat.tag_definition.changed.v1':['chat','chat.tag_definition.changed'],'chat.conversation-tag.v1':['chat','chat.conversation_tag.changed'],
 'chat.activity.note.v1':['crm','crm.conversation_note.changed'],'chat.activity.automation.v1':[['workflow'],'automation.conversation_activity.v1']
};
export const retainedConsumers={
 'identity.access.v1':['identity',['identity'],'principal.access_changed',[1]],
 'routing.access.v1':['routing',['identity'],'principal.access_changed',[1]],
 'agent.runtime.access.v1':['ai-runtime',['identity'],'principal.access_changed',[1]],
 'human.routing.principal.access_changed.v1':['routing',['identity'],'principal.access_changed',[1]],
 'human.routing.acquisition_session.opened.v1':['routing',['chat'],'acquisition_session.opened',[1]],
 'human.routing.acquisition_session.closed.v1':['routing',['chat'],'acquisition_session.closed',[1]],
 'human.routing.record.assigned.v1':['routing',['chat','crm','sales'],'record.assigned',[1]],
 'workflow.starter.v1':['workflow',['chat'],'conversation.created',[1]],
 'workflow.need.starter.v1':['workflow',['chat'],'need.assessed',[1,2]],
 'workflow.lead.accepted.v1':['workflow',['sales'],'lead.accepted',[1]]
};
export const chatAudits={
 conversation:['create','assign','messages','notes','transition','message.receive','chatflow.prompt','dispatch.claim','dispatch.result','outbound.cancel','outbound.dispatch','outbound.result','outbound.retry','need.recovered','snooze','wake','snooze.deadline','snooze.inbound','snooze.manual','snooze.assignment','snooze.closed','tag_attached','tag_detached','update','archive'],
 acquisition_session:['acquisition.open'],conversation_session:['classification.update'],conversation_need:['need.update','need.enrich'],session_progress:['session.enroll','session.stage','session.need','session.identify_need','session.record','session.replace','session.retract'],session_process:['session.process_publish'],conversation_read_state:['mark_read'],
 chat_inbox:['created','updated','archived','shared','transferred'],conversation_tag:['created','updated','archived'],chat_snippet:['created','updated','archived']
};
const auditEntity={conversation:'conversation',acquisition_session:'session',conversation_session:'session',conversation_need:'need',session_progress:'session',session_process:'tenant',conversation_read_state:'read-state',chat_inbox:'inbox',conversation_tag:'tag',chat_snippet:'snippet'};
function fail(reason){return {owner:null,disposition:'NO_GO',reason};}
function result(owner,reason){return {owner,disposition:owner==='chat'?'copy':'retain-owner',reason};}
// facts.entity(tenant,kind,id) returns {owner,conversation_id?,session_id?}; it
// must reject duplicate subtype/mismatched tenant before any rule executes.
function ref(facts,row,kind,id){return kind==='tenant'&&id===row.tenant_id?{owner:'chat'}:facts.entity(row.tenant_id,kind,id);}
function validateRefs(facts,row,kinds,ids){
 let conversation,session;
 for(let n=0;n<kinds.length;n++){
  const kind=kinds[n],id=ids[n],v=ref(facts,row,kind,id);if(!v)return false;
  if(kind==='conversation')conversation=id;if(kind==='session')session=id;
  if(v.conversation_id&&conversation&&v.conversation_id!==conversation)return false;
  if(v.session_id&&session&&v.session_id!==session)return false;
 }
 return true;
}
export function partition(table,row,facts){
 if(!facts.businessTenant(row.tenant_id))return fail('unregistered/wrong-scope tenant');
 if(table==='idempotency_record'){
  const matches=receiptRules.flatMap(rule=>{const m=new RegExp(rule.pattern).exec(row.route_key);return m?[{rule,ids:m.slice(1)}]:[];});
  if(matches.length!==1)return fail('unknown/ambiguous executable receipt; expiry is not absence');
  const {rule,ids}=matches[0];if(!validateRefs(facts,row,rule.refs,ids))return fail('receipt resource/episode mismatch');
  if(['POST /api/v1/leads','POST /api/v1/deals'].includes(row.route_key)){
   let response;try{response=typeof row.response_body==='string'?JSON.parse(row.response_body):row.response_body;}catch{return fail('invalid Sales receipt response');}
   const entity=ref(facts,row,'sales-record',response?.data?.id),expected=row.route_key.endsWith('/leads')?'lead':'deal';
   if(!entity||entity.object_key!==expected)return fail('Sales create receipt resource mismatch');
  }
  return result(rule.owner==='record-owner'?ref(facts,row,'record',ids[0]).owner:rule.owner,'exact legacy route and same-tenant reference');
 }
 if(table==='audit_entry'){
  if(row.resource_type==='sales_need_outcome'&&row.action==='need.link_outcome')return ref(facts,row,'need',row.resource_id)?result('sales','effect authority, not Chat source directory'):fail('Sales audit need reference missing');
  if(chatAudits[row.resource_type]?.includes(row.action)){
   if(row.outcome==='denied')return result('chat','exact Chat action/resource; denied may name nonexistent resource');
   return ref(facts,row,auditEntity[row.resource_type],row.resource_id)?result('chat','exact action/resource and owner'):fail('accepted audit missing reference');
  }
  // Unknown immutable audits go to an explicitly approved read-only historical
  // archive, never to an executable queue. No automatic archival authorization.
  const approval=facts.archiveApproval?.(table,row);
  return approval?.rowHash&&approval?.policy==='legacy-audit-no-purge-v1'&&approval?.owner?{owner:approval.owner,disposition:'archive',reason:'signed per-row operator manifest'}:fail('unclassified audit requires authorized archive manifest');
 }
 if(table==='outbox_event'){
  if(row.event_type==='sales.stage_changed'&&Number(row.schema_version)===1&&row.aggregate_type==='sales_stage'){
   const entity=ref(facts,row,'sales-record',row.aggregate_id);
   return entity&&entity.object_key===row.payload.object_kind&&row.payload.subject_id===row.aggregate_id&&String(row.payload.sequence)===String(row.aggregate_version)
    ?result('sales','exact Sales stage subject and sequence; retain original event') : fail('Sales stage binding mismatch');
  }
  if(row.event_type==='record.assigned'&&Number(row.schema_version)===1&&row.aggregate_type==='crm_record'){
   const r=ref(facts,row,'record',row.aggregate_id);return r&&r.object_key===row.payload.object_type&&row.payload.record_id===row.aggregate_id?result(r.owner,'mixed registry event resolved by validated subtype'):fail('registry event subtype mismatch');
  }
  const match=chatEvents.find(([type,version,aggregate])=>row.event_type===type&&Number(row.schema_version)===version&&row.aggregate_type===aggregate);
  if(match){
   const entity=ref(facts,row,match[3],row.aggregate_id);if(!entity)return fail('Chat event missing source');
   const cid=row.payload.conversation_id??row.payload.thread_id;
   if(cid&&!ref(facts,row,'conversation',cid)||cid&&entity.conversation_id&&cid!==entity.conversation_id)return fail('event conversation mismatch');
   if(row.payload.session_id&&(match[3]==='session'?row.payload.session_id!==row.aggregate_id:entity.session_id&&row.payload.session_id!==entity.session_id))return fail('event episode mismatch');
   if(row.payload.need_id&&match[3]==='need'&&row.payload.need_id!==row.aggregate_id)return fail('event need mismatch');
   return result('chat','exact type/version/aggregate binding');
  }
  const remote=remoteEvents.find(([type,,aggregate])=>row.event_type===type&&row.aggregate_type===aggregate&&Number(row.schema_version)===1);
  if(remote)return result(remote[1],'registered remote producer; retain at owner');
  if(row.event_type==='automation.conversation_activity.v1'&&Number(row.schema_version)===1&&row.payload.source_service==='workflow'&&row.aggregate_type==='workflow_run')return result(row.payload.source_service,'exact automation producer');
  return fail('unclassified event, including dispatched/failed rows which remain replayable');
 }
 if(table==='consumer_inbox'){
  const subscription=chatConsumers[row.consumer_name],retained=retainedConsumers[row.consumer_name];if(!subscription&&!retained)return fail('unknown consumer');
  const event=facts.event(row.tenant_id,row.event_id);if(!event)return fail('missing original producer envelope');
  const p=partition('outbox_event',event,facts);if(p.disposition==='NO_GO')return p;
  if(retained)return retained[1].includes(p.owner)&&retained[2]===event.event_type&&retained[3].includes(Number(event.schema_version))?result(retained[0],'registered retained handler'):fail('retained consumer binding mismatch');
  if(![subscription[0]].flat().includes(p.owner)||subscription[1]!==event.event_type||Number(event.schema_version)!==1)return fail('producer/consumer allowlist mismatch');
  return result('chat','consumer authority; remote envelope retained separately, no remote outbox copy');
 }
 return fail('table outside four-ledger partition');
}
