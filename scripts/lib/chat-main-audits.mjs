// Source43 owner mappings. These retain original audits at their owning service;
// they never archive unknown rows, alter audit payloads or manufacture approvals.
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const denied=reason=>({owner:null,disposition:'NO_GO',reason});
const retained=owner=>({owner,disposition:'retain-owner',reason:'source43 exact audit action and same-tenant owner proof'});
export function mainAudit(row,facts){
 const {tenant_id:tenant,resource_type:type,resource_id:id,action,outcome}=row;
 if(!facts.businessTenant(tenant)||!['accepted','denied'].includes(outcome))return denied('audit tenant/outcome invalid');
 const has=(table,key=id,column='id')=>facts.find(table,tenant,key,column);
 const actor=row.actor_kind==='human'||row.actor_kind==='ai'?has('principal',row.actor_id):row.actor_kind==='service'?has('service_actor',row.actor_id):row.actor_kind==='system'&&[tenant,'01900000-0000-7000-8000-000000000001'].includes(row.actor_id);
 if(!actor)return denied('audit actor binding missing');
 const record=()=>{const r=has('crm_record'),o=r&&has('object_type',r.object_type_id);return r&&o?.key===type&&has(o.kind==='custom'?'custom_record':o.key,id,'record_id')?o:undefined;};
 const exact=(actions,table,owner,column='id')=>actions.includes(action)?(outcome==='denied'||has(table,id,column)?retained(owner):denied('audit owner row missing')):null;
 if(['team','role','membership'].includes(type))return exact(type==='role'?['create','update','sales_base.bootstrap']:['create','update'],type,'identity');
 if(type==='external_app')return exact(['external_app.create','external_app.update','external_app.token','external_app.revoke'],type,'identity');
 if(type==='inbound_delivery')return exact(['intake.received','intake.processed','intake.failed','intake.retry','intake.payload_conflict'],type,'connector');
 if(type==='connection')return exact(['channels.bootstrap.v1'],'channel_connection','connector');
 if(type==='tenant'){
  const owners={'identity.bootstrap':'identity','crm.bootstrap.v3':'crm','registry.bootstrap.v2':'crm'};
  return owners[action]?(id===tenant&&has('tenant')?retained(owners[action]):denied('audit tenant resource mismatch')):null;
 }
 if(type==='workflow')return exact(['workflow.create'],'workflow_definition','workflow')??exact(['workflow.version'],'workflow_version','workflow');
 if(type==='routing'){
  const targets={profiles:['routing_human_profile','principal_id'],queues:['routing_queue','id'],skills:['routing_skill','id'],'team-skills':['routing_team_skill','team_id'],reroute:['routing_work_item','id']},target=targets[action];
  return target?(has(target[0],id,target[1])?retained('routing'):denied('Routing audit resource missing')):null;
 }
 if(type==='object_type'&&action==='workspace.update')return has('object_type')?retained('crm'):denied('object type audit resource missing');
 if(['object-types','association-types','associations'].includes(type)&&action==='create')return outcome==='denied'||has({'object-types':'object_type','association-types':'association_type',associations:'association'}[type])?retained('crm'):denied('CRM catalog audit resource missing');
 if(type==='record_page_view'&&['record_page.save','record_page.remove'].includes(action)){
  // Removal intentionally deletes the definition. Audit field list and UUID are
  // the exact immutable record-pages command shape, not a guessed resource row.
  let fields;try{fields=JSON.parse(row.changed_fields);}catch{return denied('record page audit fields invalid');}
  if(action==='record_page.save'&&!has('record_page_view')&&!facts.removedPage?.(tenant,id))return denied('record page save missing live row or removal audit');
  return uuid(id)&&JSON.stringify(fields)===JSON.stringify(['layout','assignments'])?retained('crm'):denied('record page audit shape invalid');
 }
 if(['create','records.post','records.patch','first_deal_won','note','lead.merge','lead.merge_target','session.follow_up'].includes(action)){
  const o=record();if(!o)return null;
  if(action==='first_deal_won'&&type!=='contact'||action==='note'&&type!=='activity'||['lead.merge','lead.merge_target'].includes(action)&&type!=='lead'||action==='session.follow_up'&&!['lead','deal'].includes(type))return denied('audit action subtype mismatch');
  return retained(['lead','deal'].includes(type)?'sales':'crm');
 }
 if(['properties.post','properties.patch','forms.put'].includes(action)){
  const table=action==='forms.put'?'form_definition':'property_definition',item=has(table),object=item&&has('object_type',item.object_type_id);
  return object?.key===type?retained('crm'):denied('metadata audit type mismatch');
 }
 return null;
}
