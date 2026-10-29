import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {partition} from './chat-data-partition.mjs';
import {eventCodec,deriveEvents} from './chat-events.mjs';
import {loadExceptions} from './chat-exceptions.mjs';
import {validateReferences} from './chat-references.mjs';
import {canonical,canonicalJSON,parseExact,rowHash,sha,primary} from './chat-exact.mjs';
const system='01900000-0000-7000-8000-000000000001';
const uuid=(namespace,name)=>{const hash=createHash('sha1').update(Buffer.from(namespace.replaceAll('-',''),'hex')).update(name).digest();hash[6]=(hash[6]&15)|80;hash[8]=(hash[8]&63)|128;const h=hash.subarray(0,16).toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const fail=code=>{throw new Error('NO_GO_'+code);};
const entry=(tenant,id)=>tenant+':'+id;
export async function selectSnapshot(snapshot){
 const {rows,manifest}=snapshot,dictionary=JSON.parse(await readFile('services/chat/migrations/dictionary.json','utf8'));
 const source=JSON.parse(await readFile('docs/data/chat-extraction/source-v42.json','utf8'));
 const tenants=new Set(manifest.tenants),selected={},dispositions=[],mappings=[],exceptions=await loadExceptions(snapshot),codec=await eventCodec();
 const by=(table,tenant,id,column='id')=>(rows[table]??[]).find(r=>r.tenant_id===tenant&&r[column]===id);
 const has=(table,tenant,id,column='id')=>!!by(table,tenant,id,column);
 const registry=new Map(),conversations=new Set();
 // Validate all business tenant references, even rows retained at another owner.
 for(const [name,list] of Object.entries(rows))for(const row of list)if(!tenants.has(row.tenant_id)&&row.tenant_id!==system)fail('UNREGISTERED_TENANT_'+name);
 for(const r of rows.crm_record){
  const type=by('object_type',r.tenant_id,r.object_type_id);if(!type)fail('REGISTRY_TYPE');
  const subtypes=['contact','company','activity','lead','deal','custom_record','conversation'].filter(t=>has(t,r.tenant_id,r.id,'record_id'));
  if(subtypes.length!==1||type.kind==='standard'&&subtypes[0]!==type.key||type.kind==='custom'&&subtypes[0]!=='custom_record')fail('REGISTRY_SUBTYPE');
  const owner=type.key==='conversation'?'chat':['lead','deal'].includes(type.key)?'sales':'crm';
  registry.set(entry(r.tenant_id,r.id),{owner,object_key:type.key,record:r});
  if(owner==='chat')conversations.add(entry(r.tenant_id,r.id));
 }
 for(const c of rows.conversation){
  if(!conversations.has(entry(c.tenant_id,c.record_id)))fail('CONVERSATION_REGISTRY');
  const contact=by('crm_record',c.tenant_id,c.contact_id),identity=by('contact_identity',c.tenant_id,c.contact_identity_id);
  if(!has('contact',c.tenant_id,c.contact_id,'record_id')||!identity||identity.contact_id!==c.contact_id||identity.connection_id!==c.connection_id)fail('CONTACT_BINDING');
  if(contact.archived_at!==null&&c.status!=='closed')fail('ARCHIVED_CONTACT_ACTIVE');
 }
 // Exact source FK checks also validate outgoing/incoming logical references in
 // the operator snapshot. Never query source from the destination runtime.
 for(const fk of source.foreignKeys){
  for(const row of rows[fk.source_table]??[]){
   if(fk.columns.some(k=>row[k.source_column]===null))continue;
   if(!(rows[fk.target_table]??[]).some(p=>fk.columns.every(k=>p[k.target_column]===row[k.source_column])))fail('REFERENCE_'+fk.constraint_name);
  }
 }
 const facts={businessTenant:t=>tenants.has(t),entity:(t,kind,id)=>{
  const reg=registry.get(entry(t,id));
  if(kind==='record')return reg;
  if(kind==='conversation')return reg?.owner==='chat'?{...reg,conversation_id:id}:undefined;
  if(kind==='sales-record')return reg?.owner==='sales'?reg:undefined;
  if(kind==='session'){const r=by('conversation_acquisition_session',t,id);return r?{owner:'chat',conversation_id:r.conversation_id}:undefined;}
  if(kind==='need'){const n=by('session_need',t,id),s=n&&by('conversation_acquisition_session',t,n.session_id);return s?{owner:'chat',conversation_id:s.conversation_id,session_id:n.session_id}:undefined;}
  const tables={tag:'conversation_tag',inbox:'chat_inbox',snippet:'chat_snippet','read-state':'conversation_read_state',delivery:'inbound_delivery',connection:'channel_connection'};
  return tables[kind]&&has(tables[kind],t,id)?{owner:kind==='delivery'?'connector':'chat'}:undefined;
 },event:(t,id)=>{const r=by('outbox_event',t,id);return r?{...r,payload:JSON.parse(r.payload)}:undefined;}};
 // An exact exception can classify an unknown row, never repair a known rule
 // whose reference/schema failed. Its full signed decision is bound into plan.
 facts.archiveApproval=(_table,row)=>exceptions.resolve('audit_entry',row);
 function classify(table,row){
  const p=partition(table,table==='outbox_event'?{...row,payload:JSON.parse(row.payload)}:row,facts);
  const unknown=table==='idempotency_record'&&p.reason==='unknown/ambiguous executable receipt; expiry is not absence'||table==='outbox_event'&&p.reason==='unclassified event, including dispatched/failed rows which remain replayable';
  if(p.disposition==='NO_GO'&&unknown){const e=exceptions.resolve(table,row);if(e)return {owner:e.owner,disposition:e.decision,exception:true};}
  return p;
 }
 const eventOwners=new Map();
 for(const r of rows.outbox_event){
  if(canonicalJSON(r.payload)!==canonical(JSON.parse(r.payload)))fail('EVENT_UNSAFE_NUMERIC_PAYLOAD');
  const p=classify('outbox_event',r);if(p.disposition==='NO_GO')fail('EVENT_CLASSIFICATION');
  if(!p.exception)codec.validate(r,p.owner);
  eventOwners.set(entry(r.tenant_id,r.id),p.owner);
 }
 for(const t of dictionary.tables.filter(t=>t.legacy)){
  const sourceTable=manifest.tables.find(s=>s.name===t.name);
  if(!sourceTable||canonical(sourceTable.columns.map(c=>[c.name,c.type,c.nullable]))!==canonical(t.columns.map(c=>[c.name,c.type,c.nullable])))fail('SOURCE_SCHEMA_'+t.name);
  selected[t.name]=[];
  for(const row of rows[t.name]){
   let p={owner:'chat',disposition:'copy'};
   if(t.name==='crm_record')p={owner:registry.get(entry(row.tenant_id,row.id)).owner,disposition:conversations.has(entry(row.tenant_id,row.id))?'copy':'retain-owner'};
   else if(['ownership_history','record_team_access','property_index_value'].includes(t.name))p={owner:registry.get(entry(row.tenant_id,row.record_id))?.owner,disposition:conversations.has(entry(row.tenant_id,row.record_id))?'copy':'retain-owner'};
   else if(['audit_entry','idempotency_record','outbox_event','consumer_inbox'].includes(t.name))p=classify(t.name,row);
   if(p.disposition==='NO_GO'||!p.owner)fail('PARTITION_'+t.name);
   if(t.name==='idempotency_record'&&row.status!=='completed')fail('PENDING_RECEIPT');
   if(t.name==='consumer_inbox'&&row.status!=='completed')fail('PROCESSING_CONSUMER');
   dispositions.push({table:t.name,tenant:row.tenant_id,key:primary(t).map(k=>row[k]),hash:rowHash(t,row),owner:p.owner,disposition:p.disposition});
   if(p.disposition==='copy')selected[t.name].push(row);
  }
 }
 for(const t of dictionary.tables)selected[t.name]??=[];
 // Validate projected property indexes against the authoritative custom values.
 for(const r of selected.property_index_value){
  const def=by('property_definition',r.tenant_id,r.property_id),record=by('crm_record',r.tenant_id,r.record_id);
  if(!def||def.object_type_id!==record.object_type_id||def.indexed!=='1'||def.type!==r.value_kind)fail('PROPERTY_DEFINITION');
  const value=parseExact(record.custom_values)[def.key],column={string:'string_value',enum:'string_value',integer:'integer_value',decimal:'decimal_value',boolean:'boolean_value',date:'date_value',datetime:'datetime_value'}[r.value_kind];
  if(!column||value===undefined||String(value)!==r[column]&&canonical(value)!==r[column])fail('PROPERTY_INDEX_VALUE');
 }
 for(const m of selected.message_content){
  // SQL JSON precision is checked independently by the row codec. Do not parse
  // arbitrary rich content through a lossy JS Number to build its row hash.
  const value=JSON.parse(m.content),reply=value.reply_to_message_id;
  if(reply){const parent=by('message',m.tenant_id,m.message_id),target=by('message',m.tenant_id,reply);if(!target||target.conversation_id!==parent.conversation_id)fail('MESSAGE_REPLY');}
 }
 for(const r of selected.message_acquisition_membership){const message=by('message',r.tenant_id,r.message_id);if(!message||message.conversation_id!==r.conversation_id)fail('MEMBERSHIP_CONVERSATION');}
 await validateReferences(snapshot,selected,mappings);
 const at=manifest.source.at,common={version:'1',created_at:at,updated_at:at};
 for(const tenant of manifest.tenants){
  selected.chat_writer_gate.push({tenant_id:tenant,epoch:'1',mode:'shadow',manifest_digest:sha(canonical(manifest)),updated_at:at});
  for(const dataset of ['conversion','stage','progress','routing','registry'])selected.chat_dataset_head.push({tenant_id:tenant,dataset,revision:'1',...common});
 }
 for(const c of selected.conversation)selected.chat_control_head.push({tenant_id:c.tenant_id,conversation_id:c.record_id,registry_revision:'1',control_revision:'1',cancel_through:'0',pause_through:'0',...common});
 for(const r of rows.contact){const record=by('crm_record',r.tenant_id,r.record_id);selected.chat_contact_guard.push({tenant_id:r.tenant_id,contact_id:r.record_id,archive_command_id:uuid(manifest.run,'crm:'+r.tenant_id+':'+r.record_id),binding_digest:sha(canonical({migration_seed:1,run:manifest.run,tenant:r.tenant_id,id:r.record_id})),state:record.archived_at?'archived':'released',core_revision:record.version,...common});}
 for(const r of selected.idempotency_record.filter(r=>/\/notes$/.test(r.route_key))){
  const cid=r.route_key.match(/\/conversations\/([^/]+)\/notes$/)[1],noteId=JSON.parse(r.response_body)?.data?.id,note=by('activity',r.tenant_id,noteId,'record_id'),record=by('crm_record',r.tenant_id,cid);
  if(!note||note.kind!=='note'||note.related_record_id!==cid)fail('LEGACY_NOTE_CHILD');
  const digest=sha(canonical({migration_format:1,tenant_id:r.tenant_id,receipt_id:r.id,request_hash:r.request_hash,response_status:r.response_status,response_body:parseExact(r.response_body)})),child=uuid(r.id,'note:v1');
  const command=Object.fromEntries(dictionary.tables.find(t=>t.name==='chat_owner_command').columns.map(c=>[c.name,null]));
  selected.chat_owner_command.push({...command,tenant_id:r.tenant_id,command_id:r.id,operation:'legacy-note-import',binding_digest:digest,actor_kind:r.actor_kind,actor_id:r.actor_id,resource_kind:'conversation',resource_id:cid,record_version:record.version,owner_revision:record.owner_revision,control_revision:'1',legacy_route:r.route_key,legacy_key:r.key,legacy_request_hash:r.request_hash,result_json:r.response_body,state:'committed',terminal_digest:digest,terminal_at:r.updated_at,...common});
  mappings.push({tenant_id:r.tenant_id,parent_command_id:r.id,child_command_id:child,child_key:r.id+':note:v1',activity_id:noteId,source_receipt_hash:rowHash(dictionary.tables.find(t=>t.name==='idempotency_record'),r),state:'legacy-terminal',effect:'existing-core-note-no-reexecution'});
 }
 deriveEvents(snapshot,selected,mappings,eventOwners,codec,uuid);
 exceptions.finish();
 mappings.push({kind:'reviewed-exceptions',digest:exceptions.digest,entries:exceptions.entries});
 // Validate the complete selected local graph before any destination write.
 for(const t of dictionary.tables)for(const f of t.foreignKeys)for(const row of selected[t.name])if(!f.columns.some(k=>row[k.source_column]===null)&&!selected[f.target_table].some(p=>f.columns.every(k=>p[k.target_column]===row[k.source_column])))fail('SELECTED_FK_'+f.constraint_name);
 return {selected,dispositions,mappings,dictionary,classificationHash:sha(canonical(dispositions)),mappingHash:sha(canonical(mappings))};
}
