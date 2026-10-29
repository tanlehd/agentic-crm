// Source-backed bootstrap for the existing baseline owner adapters. Offline only.
import {createHash} from 'node:crypto';
import {canonical,sha} from './chat-exact.mjs';
const system='01900000-0000-7000-8000-000000000001';
const fail=code=>{throw Error('NO_GO_OWNER_'+code);};
export function seedUuid(run,name){
 const b=createHash('sha1').update(Buffer.from(run.replaceAll('-',''),'hex')).update(name).digest();b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;
 const h=b.subarray(0,16).toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function mainOwnerPlan(snapshot,chatPlan){
 const {manifest:m,rows}=snapshot;
 if(m.source.db!=='agentic_crm'||m.sourceJournal.length!==43||!m.tenants.length)fail('SOURCE43_REQUIRED');
 const by=(table,t,id,col='id')=>(rows[table]??[]).find(r=>r.tenant_id===t&&r[col]===id);
 const required=(table,t,id,col)=>{const r=by(table,t,id,col);if(!r)fail('REFERENCE_'+table);return r;};
 const at=m.source.at,common={version:'1',created_at:at,updated_at:at},tables={identity_owner_gate:[],identity_account_gate:[],routing_capacity_gate:[],routing_allocation_head:[],crm_reference_gate:[],connector_reference_gate:[],crm_owner_command:[]};
 const seed=(owner,t,id='')=>({barrier_id:seedUuid(m.run,owner+':'+t+':'+id),request_digest:sha(canonical({migration_seed:1,run:m.run,owner,tenant:t,resource:id}))});
 for(const t of m.tenants){
  tables.identity_owner_gate.push({tenant_id:t,...seed('identity',t),state:'open',...common});
  tables.routing_capacity_gate.push({tenant_id:t,barrier_command_id:seed('routing',t).barrier_id,state:'open',...common});
 }
 for(const a of rows.account){if(a.tenant_id!==system)fail('ACCOUNT_SCOPE');tables.identity_account_gate.push({tenant_id:system,account_id:a.id,...seed('account',system,a.id),state:'open',...common});}
 const reference=(table,t,kind,id,revision,retired)=>tables[table].push({tenant_id:t,resource_kind:kind,resource_id:id,resource_revision:revision,state:retired?'retired':'open',barrier_command_id:retired?seed('reference',t,kind+':'+id).barrier_id:null,...common});
 for(const c of rows.contact){const r=required('crm_record',c.tenant_id,c.record_id);reference('crm_reference_gate',c.tenant_id,'contact',c.record_id,r.version,!!r.archived_at);}
 for(const i of rows.contact_identity){const r=required('crm_record',i.tenant_id,i.contact_id);reference('crm_reference_gate',i.tenant_id,'mapping',i.id,'1',!!r.archived_at);}
 for(const o of rows.object_type.filter(o=>['conversation','conversation_session','conversation_need'].includes(o.key)))reference('crm_reference_gate',o.tenant_id,'metadata',o.id,o.schema_version,!!o.archived_at);
 for(const c of rows.channel_connection)reference('connector_reference_gate',c.tenant_id,'connection',c.id,'1',c.status!=='active');
 // Closed episodes preserve a terminal head; current episodes use the current
 // registry owner. No allocation history is rewritten or fabricated.
 for(const s of rows.conversation_acquisition_session){
  const r=required('crm_record',s.tenant_id,s.conversation_id),w=by('routing_work_item',s.tenant_id,s.id,'session_id');
  const allocations=w?rows.routing_human_allocation.filter(a=>a.tenant_id===s.tenant_id&&a.work_id===w.id&&a.released_at===null):[];
  if(w&&(w.conversation_id!==s.conversation_id||(s.status==='closed')!==(w.state==='completed')))fail('ROUTING_WORK_STATE');
  if(allocations.length>1||allocations.some(a=>s.status==='closed'||a.principal_id!==r.owner_principal_id))fail('ROUTING_ALLOCATION_OWNER');
  tables.routing_allocation_head.push({tenant_id:s.tenant_id,session_id:s.id,conversation_id:s.conversation_id,principal_id:s.status==='closed'?null:r.owner_principal_id,reservation_id:null,owner_revision:r.owner_revision,state:s.status==='closed'?'closed':r.owner_principal_id?'active':'unassigned',...common});
 }
 for(const w of rows.routing_work_item)required('conversation_acquisition_session',w.tenant_id,w.session_id);
 for(const a of rows.routing_human_allocation)required('routing_work_item',a.tenant_id,a.work_id);
 for(const mapping of chatPlan.mappings.filter(p=>p.child_command_id)){
  const parent=chatPlan.selected.chat_owner_command.find(r=>r.tenant_id===mapping.tenant_id&&r.command_id===mapping.parent_command_id);
  const note=required('activity',mapping.tenant_id,mapping.activity_id,'record_id'),r=required('crm_record',mapping.tenant_id,mapping.activity_id);
  if(!parent||parent.operation!=='legacy-note-import'||note.kind!=='note'||note.related_record_id!==parent.resource_id||mapping.child_command_id!==seedUuid(parent.command_id,'note:v1')||mapping.child_key!==parent.command_id+':note:v1')fail('NOTE_CHILD');
  const result={command:{command_id:mapping.child_command_id,binding_digest:parent.binding_digest},state:'committed',activity_id:mapping.activity_id,occurred_at:r.created_at.replace(' ','T')+'Z'};
  tables.crm_owner_command.push({...parent,command_id:mapping.child_command_id,operation:'legacy-note-import',legacy_key:mapping.child_key,result_json:canonical(result),terminal_digest:sha(canonical(result))});
 }
 for(const list of Object.values(tables))for(const row of list)if(!m.tenants.includes(row.tenant_id)&&row.tenant_id!==system)fail('TENANT');
 return {format:1,sourceDigest:sha(canonical(m)),tables,digest:sha(canonical(tables))};
}
