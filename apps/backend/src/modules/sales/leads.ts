import type { DataSource } from 'typeorm';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { CrmRecords,type RecordDomain } from '../crm/records.js';
import { RecordRegistry } from '../crm/registry.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { object,fieldError,checkField,json } from '../crm/properties.js';
import { phone,stamp,type ContactReferencePort,type ArchiveGuard } from '../crm/core.js';
// Reserved orchestration port: M2 must authenticate a Chatflow service actor,
// check the session's live owner/revision and supply the same transaction.
export interface SessionLeadCreationPort {
  createFromSession(scope:TransactionScope,input:{sessionId:string;ownerRevision:string;contactId:string;qualification:Record<string,unknown>}):Promise<string>;
}
export const unavailableSessionLeadCreation:SessionLeadCreationPort={createFromSession:async()=>{throw new CommandError(422,'M2_REFERENCE_NOT_AVAILABLE');}};
export function qualification(input:unknown,access:Access,complete:boolean,old:Record<string,unknown>={}){
  const b=object(input,['service_interest','need_summary','contact_permission','preferred_contact_method','phone','consent_evidence']),out={...old};
  for(const [k,v] of Object.entries(b)){
    if(k==='service_interest'||k==='need_summary'){if(typeof v!=='string'||v.length>(k==='service_interest'?255:4000))fieldError(`qualification.${k}`);out[k]=v.trim();}
    else if(k==='contact_permission'){if(typeof v!=='boolean')fieldError(`qualification.${k}`);out[k]=v;}
    else if(k==='preferred_contact_method'){if(!['messenger','phone'].includes(String(v)))fieldError(`qualification.${k}`);out[k]=v;}
    else if(k==='phone')out[k]=phone(v);
    else{
      const e=object(v,['kind','note']);if(e.kind!=='manual'||typeof e.note!=='string'||!e.note.trim()||e.note.length>1000)fieldError('qualification.consent_evidence');
      out[k]={kind:'manual',note:e.note.trim(),recorded_by_principal_id:access.principalId,recorded_at:new Date().toISOString()};
    }
  }
  if(complete){
    for(const k of ['service_interest','need_summary'])if(typeof out[k]!=='string'||!(out[k] as string).trim())fieldError(`qualification.${k}`);
    if(out.contact_permission!==true)fieldError('qualification.contact_permission');
    if(!['messenger','phone'].includes(String(out.preferred_contact_method)))fieldError('qualification.preferred_contact_method');
    if(out.preferred_contact_method==='phone'&&!out.phone)fieldError('qualification.phone');
    if(!out.consent_evidence)fieldError('qualification.consent_evidence');
  }
  return out;
}
export function leadDomain(contacts:ContactReferencePort):RecordDomain{
  const row=async(s:TransactionScope,id:string)=>{const [r]=await s.query('SELECT * FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);if(!r)throw new CommandError(404,'NOT_FOUND');return r;};
  return {genericCreate:false,allowCustomValues:false,updateAction:'qualify',
    adapter:{insert:async(s,id,input,a,correlation)=>{
      const b=object(input,['contact_id','qualification']);if(!uuid(b.contact_id))fieldError('contact_id');await contacts.requireActive(s,a,b.contact_id);
      const q=qualification(b.qualification??{},a,false);if(Object.keys(q).length&&!allows(a,'lead','qualify',{tenantId:a.tenantId,ownerPrincipalId:a.principalId,teamId:null,sharedTeamIds:[]}))throw new CommandError(403,'FORBIDDEN');
      await s.query('INSERT INTO `lead`(tenant_id,record_id,contact_id,status,qualification) VALUES (?,?,?,?,?)',[s.context.tenantId,id,b.contact_id,Object.keys(q).length?'qualifying':'new',JSON.stringify(q)]);
      await new DurableCommands().domainEvent(s,a.principalId,correlation,'lead.created',id,'1',{lead_id:id,contact_id:b.contact_id,conversation_id:null});
    },exists:async(s,id)=>!!(await s.query('SELECT record_id FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]))[0],eligible:async()=>{},assigned:async()=>{}},
    read:async(s,r)=>{const data=await row(s,r.id);return {contact_id:data.contact_id,conversation_id:data.conversation_id,qualification_session_id:data.qualification_session_id,source_touchpoint_id:data.source_touchpoint_id,status:data.status,qualification:json(data.qualification),qualified_at:stamp(data.qualified_at),accepted_at:stamp(data.accepted_at)};},
    update:async(s,r,fields,a)=>{
      const b=object(fields,['qualification']);if(!Object.hasOwn(b,'qualification'))throw new CommandError(400,'INVALID_REQUEST');const data=await row(s,r.id);if(!['new','qualifying'].includes(data.status))throw new CommandError(409,'INVALID_TRANSITION');
      const q=qualification(b.qualification,a,false,json(data.qualification));await s.query("UPDATE `lead` SET qualification=?,status=? WHERE tenant_id=? AND record_id=?",[JSON.stringify(q),Object.keys(q).length?'qualifying':'new',s.context.tenantId,r.id]);
    },archive:async()=>{throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');},
  };
}
export const leadArchiveGuard:ArchiveGuard=async(s,r)=>{
  if(r.objectKey==='contact'&&(await s.query("SELECT record_id FROM `lead` WHERE tenant_id=? AND contact_id=? AND status<>'disqualified' LIMIT 1",[s.context.tenantId,r.id])).length)throw new CommandError(409,'ACTIVE_DEPENDENCY');
};
export class LeadService {
  private readonly commands=new DurableCommands();
  constructor(private readonly records:CrmRecords,private readonly contacts:ContactReferencePort){}
  async create(account:string,tenant:string,input:unknown,key:string,correlation:string){
    const b=object(input,['contact_id','qualification','conversation_id','qualification_session_id']);
    if(b.qualification_session_id!==undefined&&b.qualification_session_id!==null)throw new CommandError(403,'FORBIDDEN');
    if(b.conversation_id!==undefined&&b.conversation_id!==null)throw new CommandError(422,'M2_REFERENCE_NOT_AVAILABLE');
    return this.records.mutate(account,tenant,{object:'lead',kind:'records'},{fields:{contact_id:b.contact_id,qualification:b.qualification??{}}},key,undefined,correlation,true);
  }
  async command(account:string,tenant:string,id:string,action:'qualification'|'disqualify',input:unknown,key:string,version:string|undefined,correlation:string){
    if(!uuid(id)||!key||key.length>128||!/^[\x21-\x7e]+$/.test(key))throw new CommandError(400,'INVALID_REQUEST');if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');if(!/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
    const body=object(input,action==='qualification'?['qualification']:['reason']);let actor:string|undefined;
    try{return await this.records.uow.run({tenantId:tenant},async scope=>{
      const access=await withFieldPolicies(scope,await this.records.authorization.loadHuman(scope,account,undefined,true));actor=access.principalId;
      const registry=new RecordRegistry(),record=await registry.get(scope,id,true);if(record.objectKey!=='lead')throw new CommandError(404,'NOT_FOUND');registry.read(access,record);
      if(!allows(access,'lead','qualify',record))throw new CommandError(403,'FORBIDDEN');checkField(access,'lead','qualification','write');
      const cmd={actorId:access.principalId,correlationId:correlation,route:`POST /api/v1/leads/${id}/${action}`,key,body,version};
      const replay=await this.commands.replay(scope,cmd,async response=>{for(const field of Object.keys(object(response.body.data.fields)))checkField(access,'lead',field,'read');});if(replay)return replay;
      const [lead]=await scope.query('SELECT * FROM `lead` WHERE tenant_id=? AND record_id=?',[tenant,id]);if(!lead||record.archived||!['new','qualifying'].includes(lead.status))throw new CommandError(409,'INVALID_TRANSITION');
      await registry.bump(scope,record,version);
      if(action==='qualification'){
        await this.contacts.requireActive(scope,access,lead.contact_id);
        const q=qualification(body.qualification,access,true);await scope.query("UPDATE `lead` SET qualification=?,status='qualified',qualified_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND record_id=?",[JSON.stringify(q),tenant,id]);
        const [saved]=await scope.query('SELECT qualified_at FROM `lead` WHERE tenant_id=? AND record_id=?',[tenant,id]);
        await this.commands.domainEvent(scope,access.principalId,correlation,'lead.qualified',id,String(BigInt(record.version)+1n),{lead_id:id,qualified_at:stamp(saved.qualified_at),source_touchpoint_id:null});
      }else{
        if(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>1000)fieldError('reason');
        await scope.query("UPDATE `lead` SET status='disqualified' WHERE tenant_id=? AND record_id=?",[tenant,id]);
      }
      const data=await this.records.output(scope,access,await registry.get(scope,id));
      await this.commands.audit(scope,access.principalId,correlation,'lead',id,action,action==='qualification'?['qualification','status','qualified_at']:['status']);
      const response={status:200,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(scope,cmd,response);return response;
    });}catch(error){if(actor&&error instanceof CommandError&&[403,409].includes(error.status))await this.records.uow.run({tenantId:tenant},s=>this.commands.audit(s,actor!,correlation,'lead',id,action,[],'denied',error.code));throw error;}
  }
  read(account:string,tenant:string,id?:string,query:Record<string,unknown>={}){
    const rest={...query};let filter:unknown[]=[];
    try{if(rest.filter!==undefined){if(typeof rest.filter!=='string')throw new Error();filter=JSON.parse(rest.filter);if(!Array.isArray(filter))throw new Error();}}catch{throw new CommandError(400,'INVALID_REQUEST');}
    if(rest.status!==undefined){filter.push({field:'status',op:'eq',value:rest.status});delete rest.status;}
    // Owner/team queue filters are handled by the shared registry query evaluator.
    if(filter.length)rest.filter=JSON.stringify(filter);
    return this.records.read(account,tenant,{object:'lead',kind:'records',...(id?{id}:{})},rest);
  }
}
