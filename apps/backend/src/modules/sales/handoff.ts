import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization,requireActiveTenant } from '../identity/authorization.js';
import { RoutingIdentityPort } from '../identity/routing-port.js';
import type { Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { RecordRegistry,type RegistryRecord } from '../crm/registry.js';
import { SalesCrmPort } from '../crm/sales-port.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { object,checkField } from '../crm/properties.js';
import { stamp } from '../crm/core.js';
import { selectSalesHuman } from '../agents/sales-routing-port.js';
import type { ChildContext } from '../workflow/ports.js';
export class SalesHandoffs {
 readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly registry=new RecordRegistry();private readonly crm=new SalesCrmPort();private readonly identity=new RoutingIdentityPort();private readonly commands=new DurableCommands();
 constructor(private readonly source:DataSource){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
 private permission(a:Access,r:RegistryRecord,action:'handoff'|'accept'){
  if(r.objectKey!=='lead')throw new CommandError(404,'NOT_FOUND');this.registry.read(a,r);if(!allows(a,'lead',action,r))throw new CommandError(403,'FORBIDDEN');
  for(const f of ['status','accepted_at','owner_principal_id','team_id'])checkField(a,'lead',f,'read');
 }
 private async handoff(s:TransactionScope,id:string,lead?:string){const [h]=await s.query('SELECT * FROM lead_handoff WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);if(!h||lead&&h.lead_id!==lead)throw new CommandError(404,'NOT_FOUND');return h;}
 private async lead(s:TransactionScope,id:string){const [l]=await s.query('SELECT * FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);if(!l)throw new CommandError(404,'NOT_FOUND');return l;}
 private output(r:RegistryRecord,h:any){return {id:r.id,version:r.version,owner_revision:r.ownerRevision,owner_principal_id:r.ownerPrincipalId,team_id:r.teamId,handoff_id:h.id,status:h.status,due_at:stamp(h.due_at),accepted_at:stamp(h.accepted_at),attention:!!h.attention};}
 private async audit(s:TransactionScope,a:Access,id:string,action:string,correlation:string,kind:'human'|'service'){
  const fields=['status','owner_principal_id','team_id','owner_revision'];if(kind==='human')await this.commands.audit(s,a.principalId,correlation,'lead',id,action,fields);else await this.commands.systemAudit(s,correlation,'lead',id,action,fields,{kind,id:a.principalId});
 }
 async request(s:TransactionScope,a:Access,id:string,team:string,version:string,correlation:string,kind:'human'|'service',context?:ChildContext){
  if(!uuid(id)||!uuid(team)||a.tenantId!==s.context.tenantId)throw new CommandError(400,'INVALID_REQUEST');
  const r=await this.registry.get(s,id,true);this.permission(a,r,'handoff');await this.identity.salesTeam(s,team);
  if(kind==='service'&&(!context||context.actorId!==a.principalId))throw new CommandError(403,'FORBIDDEN');
  if(context){const [prior]=await s.query('SELECT * FROM lead_handoff WHERE tenant_id=? AND start_action_key=?',[s.context.tenantId,context.actionKey]);if(prior){if(prior.parent_run_id!==context.runId||prior.lead_id!==id||prior.target_team_id!==team)throw new CommandError(409,'HANDOFF_ACTION_CONFLICT');return this.output(r,prior);}}
  const l=await this.lead(s,id);if(r.archived||l.status!=='qualified')throw new CommandError(409,'INVALID_TRANSITION');if(r.version!==version)throw new CommandError(409,'VERSION_CONFLICT');await this.crm.contact(s,l.contact_id);
  const owner=await selectSalesHuman(s,r,team),hid=randomUUID();
  await s.query("INSERT INTO lead_handoff(id,tenant_id,lead_id,target_team_id,requested_by_kind,requested_by_id,status,parent_run_id,start_action_key,due_at,attention) VALUES (?,?,?,?,?,?,'pending',?,?,TIMESTAMPADD(MINUTE,15,UTC_TIMESTAMP(6)),?)",[hid,s.context.tenantId,id,team,kind,a.principalId,context?.runId??null,context?.actionKey??null,owner===null?1:0]);
  await s.query("UPDATE `lead` SET status='handed_off' WHERE tenant_id=? AND record_id=?",[s.context.tenantId,id]);
  await this.crm.shareContact(s,l.contact_id,team);const current=await this.crm.ownership(s,a,r,version,owner,team,correlation,kind,'handoff'),h=await this.handoff(s,hid);
  await this.audit(s,a,id,'lead.handoff',correlation,kind);await this.commands.automationEvent(s,'lead.handoff_requested',id,current.version,{lead_id:id,handoff_id:hid,target_team_id:team,due_at:stamp(h.due_at)},{kind,id:a.principalId},correlation);return this.output(current,h);
 }
 async mutate(account:string,tenant:string,id:string,handoffId:string|undefined,input:unknown,key:string,version:string|undefined,correlation:string){
  if(!uuid(tenant)||!uuid(id)||handoffId!==undefined&&!uuid(handoffId)||typeof key!=='string'||! /^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');if(!/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
  const body=object(input,handoffId?['owner_revision']:['target_team_id']);if(handoffId?typeof body.owner_revision!=='string'||! /^[1-9][0-9]{0,19}$/.test(body.owner_revision):!uuid(body.target_team_id))throw new CommandError(400,'INVALID_REQUEST');
  return this.uow.run({tenantId:tenant},async s=>{
   const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true)),r=await this.registry.get(s,id,true);this.permission(a,r,handoffId?'accept':'handoff');
   const h=handoffId?await this.handoff(s,handoffId,id):null;
   if(h){await this.identity.salesTeam(s,h.target_team_id);if(!a.teamIds.includes(h.target_team_id)||r.teamId!==h.target_team_id)throw new CommandError(403,'FORBIDDEN');if(r.ownerPrincipalId&&r.ownerPrincipalId!==a.principalId&&!allows(a,'lead','assign',r)){if(r.version!==version||r.ownerRevision!==body.owner_revision)throw new CommandError(409,'OWNER_CONFLICT');throw new CommandError(403,'FORBIDDEN');}}
   const command={actorId:a.principalId,correlationId:correlation,route:`sales:${id}:${handoffId??'handoff'}`,key,body,version};const replay=await this.commands.replay(s,command,async()=>{});if(replay)return replay;
   let data:Record<string,unknown>;
   if(!h)data=await this.request(s,a,id,body.target_team_id,version,correlation,'human');
   else{
    const l=await this.lead(s,id);if(r.archived||h.status!=='pending'||l.status!=='handed_off')throw new CommandError(409,'INVALID_TRANSITION');if(r.ownerRevision!==body.owner_revision)throw new CommandError(409,'OWNER_CONFLICT');
    const current=await this.crm.ownership(s,a,r,version,a.principalId,h.target_team_id,correlation,'human','accept');
    await s.query("UPDATE lead_handoff SET status='accepted',accepted_by_principal_id=?,accepted_at=UTC_TIMESTAMP(6),attention=0 WHERE tenant_id=? AND id=?",[a.principalId,tenant,h.id]);
    await s.query("UPDATE `lead` SET status='accepted',accepted_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[tenant,id]);
    const saved=await this.handoff(s,h.id);await this.audit(s,a,id,'lead.accept',correlation,'human');await this.commands.automationEvent(s,'lead.accepted',id,current.version,{lead_id:id,handoff_id:h.id,accepted_by:a.principalId,accepted_at:stamp(saved.accepted_at)},{kind:'human',id:a.principalId},correlation);data=this.output(current,saved);
   }
   const response={status:200,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(s,command,response);return response;
  });
 }
 async read(account:string,tenant:string,id:string){return this.uow.run({tenantId:tenant},async s=>{const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true)),r=await this.registry.get(s,id);if(r.objectKey!=='lead')throw new CommandError(404,'NOT_FOUND');this.registry.read(a,r);for(const f of ['status','accepted_at','owner_principal_id','team_id'])checkField(a,'lead',f,'read');return {data:(await s.query('SELECT * FROM lead_handoff WHERE tenant_id=? AND lead_id=? ORDER BY created_at DESC,id DESC LIMIT 100',[tenant,id])).map((h:any)=>this.output(r,h))};});}
 async result(s:TransactionScope,run:string,id:string){const h=await this.handoff(s,id);if(h.parent_run_id!==run)throw new CommandError(409,'HANDOFF_PARENT_INVALID');return h.status==='pending'?null:{outcome:h.status,lead_id:h.lead_id};}
 async tick(){
  const rows=await this.source.query("SELECT tenant_id,id,lead_id FROM lead_handoff WHERE status='pending' AND attention=0 AND due_at<=UTC_TIMESTAMP(6) ORDER BY due_at,id LIMIT 100");
  for(const row of rows)await this.uow.run({tenantId:row.tenant_id},async s=>{try{await requireActiveTenant(s,true);}catch{return;}await this.registry.get(s,row.lead_id,true);const h=await this.handoff(s,row.id);const changed=await s.query("UPDATE lead_handoff SET attention=1 WHERE tenant_id=? AND id=? AND status='pending' AND attention=0 AND due_at<=UTC_TIMESTAMP(6)",[row.tenant_id,h.id]);if(changed.affectedRows)await this.commands.systemAudit(s,h.id,'lead_handoff',h.id,'lead.handoff_overdue',['attention']);});
 }
}
