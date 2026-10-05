import type { DataSource } from 'typeorm';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { CrmRecords } from '../crm/records.js';
import { coreDomains,contactReferences,stamp } from '../crm/core.js';
import { RecordRegistry } from '../crm/registry.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { fieldAllowed,permits,type Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { ChannelReferences } from '../channels/ports.js';
import { page } from '../operations/paging.js';
import { leadDomain } from './leads.js';
export class SalesWorkspace {
 readonly records:CrmRecords;private readonly registry=new RecordRegistry();
 constructor(source:DataSource){const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));this.records=new CrmRecords(source,'sales-projection',domains);}
 private async project(s:TransactionScope,a:Access,id:string,detail=false){
  const r=await this.registry.get(s,id);if(r.objectKey!=='lead'||r.archived)throw new CommandError(404,'NOT_FOUND');this.registry.read(a,r);
  const record=await this.records.output(s,a,r),q=record.fields.qualification;
  if(q&&typeof q==='object')record.fields.qualification=Object.fromEntries(Object.entries(q).filter(([k])=>fieldAllowed(a,'lead',k,'read')));
  const [l]=await s.query('SELECT contact_id,conversation_id,source_touchpoint_id FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]),[h]=await s.query('SELECT id,status,target_team_id,due_at,accepted_at,attention FROM lead_handoff WHERE tenant_id=? AND lead_id=? ORDER BY created_at DESC,id DESC LIMIT 1',[s.context.tenantId,id]);
  const source=fieldAllowed(a,'lead','source_touchpoint_id','read')?await new ChannelReferences().leadSource(s,l.source_touchpoint_id):null;
  const handoff=h&&fieldAllowed(a,'lead','status','read')?{id:h.id,status:h.status,due_at:stamp(h.due_at),accepted_at:fieldAllowed(a,'lead','accepted_at','read')?stamp(h.accepted_at):null,attention:!!h.attention}:null;
  const canAccept=!!h&&h.status==='pending'&&r.teamId===h.target_team_id&&a.teamIds.includes(h.target_team_id)&&allows(a,'lead','accept',r)&&(!r.ownerPrincipalId||r.ownerPrincipalId===a.principalId||allows(a,'lead','assign',r))&&['status','accepted_at','owner_principal_id','team_id'].every(k=>fieldAllowed(a,'lead',k,'read'));
  let contact:null|{id:string;label:string}=null,conversation:null|string=null;
  if(detail){if(fieldAllowed(a,'lead','contact_id','read')){const c=await this.registry.get(s,l.contact_id);if(!c.archived&&allows(a,'contact','read',c)){const data=await this.records.output(s,a,c);contact={id:c.id,label:typeof data.fields.display_name==='string'?data.fields.display_name:c.id};}}
   if(l.conversation_id&&fieldAllowed(a,'lead','conversation_id','read')){const c=await this.registry.get(s,l.conversation_id);if(permits(a,'conversation','read',c))conversation=c.id;}
  }
  return {record,handoff,source,can_accept:canAccept,contact,conversation_id:conversation};
 }
 read(account:string,tenant:string,id?:string,query:Record<string,unknown>={}){return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
  const a=await withFieldPolicies(s,raw);if(id){if(!uuid(id)||Object.keys(query).length)throw new CommandError(400,'INVALID_REQUEST');return {data:await this.project(s,a,id,true)};}
  const {limit,cursor}=page(query,['status','owner','team','source']),status=query.status??'handed_off',owner=query.owner??'all',source=query.source??'all';if(!['handed_off','accepted'].includes(String(status))||!['all','mine','unassigned'].includes(String(owner))||!['all','ctm','unknown'].includes(String(source))||query.team!==undefined&&!uuid(query.team))throw new CommandError(400,'INVALID_REQUEST');
  if(!a.capabilities.includes('read')||!a.grants.some(g=>g.resource==='lead'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');if(!fieldAllowed(a,'lead','status','filter')||source!=='all'&&!fieldAllowed(a,'lead','source_touchpoint_id','filter'))throw new CommandError(403,'FIELD_FORBIDDEN');
  const rows=await s.query('SELECT record_id FROM `lead` WHERE tenant_id=? AND status=? AND record_id>? ORDER BY record_id LIMIT 201',[tenant,status,cursor]),data=[];let scanned=cursor;
  for(const row of rows.slice(0,200)){scanned=row.record_id;const r=await this.registry.get(s,row.record_id);if(r.archived||!allows(a,'lead','read',r)||owner==='mine'&&r.ownerPrincipalId!==a.principalId||owner==='unassigned'&&r.ownerPrincipalId!==null||query.team&&r.teamId!==query.team)continue;const item=await this.project(s,a,r.id);if(source!=='all'&&item.source!==source)continue;data.push(item);if(data.length===limit)break;}
  return {data,next_cursor:rows.some((r:any)=>r.record_id>scanned)?scanned:null};
 });}
}
