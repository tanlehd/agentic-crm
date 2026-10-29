import { randomUUID } from 'node:crypto';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { CrmRecords } from '../crm/records.js';
import { RecordRegistry } from '../crm/registry.js';
import { withFieldPolicies,allows } from '../crm/access.js';
import { object,checkField,fieldError } from '../crm/properties.js';
import { stamp,contactReferences } from '../crm/core.js';
import { uuid } from '../identity/admin.js';
import { salesChatSource } from './chat-source.js';

export function contextInput(b:Record<string,any>){
 if(b.conversation_session_id!=null&&!b.conversation_id)fieldError('conversation_id');
 if(b.conversation_id!=null&&!uuid(b.conversation_id))fieldError('conversation_id');
 if(b.conversation_session_id!=null&&!uuid(b.conversation_session_id))fieldError('conversation_session_id');
}
export async function appendSalesContext(s:TransactionScope,record:string,conversation:string,session:string,actor:string,kind:'created'|'follow_up'|'closing'){
 const [existing]=await s.query('SELECT id FROM sales_session_context WHERE tenant_id=? AND record_id=? AND session_id=? AND kind=?',[s.context.tenantId,record,session,kind]);
 if(existing)return {id:existing.id,created:false};
 const id=randomUUID();await s.query('INSERT INTO sales_session_context(tenant_id,id,record_id,conversation_id,session_id,actor_id,kind,recorded_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,id,record,conversation,session,actor,kind]);
 return {id,created:true};
}
export class SalesSessionContext {
 constructor(private readonly records:CrmRecords){}
 async link(account:string,tenant:string,id:string,input:unknown,key:string,version:string|undefined,correlation:string){
  if(!uuid(id)||!key||key.length>128||!/^[\x21-\x7e]+$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
  if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');if(!/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
  const b=object(input,['conversation_id','conversation_session_id']);if(!uuid(b.conversation_id)||!uuid(b.conversation_session_id))throw new CommandError(400,'INVALID_REQUEST');
  return this.records.uow.run({tenantId:tenant},async s=>{
   const a=await withFieldPolicies(s,await this.records.authorization.loadHuman(s,account,undefined,true));
   // Check live access even on replay. Closed-after-success is still replayable.
   const ctx=await salesChatSource.session(a,b.conversation_id,b.conversation_session_id,undefined,false);
   const registry=new RecordRegistry(),r=await registry.get(s,id,true);registry.read(a,r);
   if(!['lead','deal'].includes(r.objectKey))throw new CommandError(404,'NOT_FOUND');
   if(!allows(a,r.objectKey,r.objectKey==='lead'?'qualify':'update',r))throw new CommandError(403,'FORBIDDEN');
   for(const f of ['contact_id',r.objectKey==='lead'?'status':'stage'])checkField(a,r.objectKey,f,'read');
   const [record]=await s.query(`SELECT contact_id,${r.objectKey==='lead'?'status':'stage'} state FROM \`${r.objectKey}\` WHERE tenant_id=? AND record_id=?`,[tenant,id]);
   if(record.contact_id!==ctx.contactId)throw new CommandError(422,'CONTACT_BINDING_MISMATCH');
   const commands=new DurableCommands(),cmd={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/sales/records/${id}/session-context`,key,body:b,version};
   const replay=await commands.replay(s,cmd,async()=>{});if(replay)return replay;
   if(r.archived||['disqualified','won','lost'].includes(record.state))throw new CommandError(409,'INVALID_TRANSITION');
   await salesChatSource.session(a,b.conversation_id,b.conversation_session_id,record.contact_id);
   if(r.version!==version)throw new CommandError(409,'VERSION_CONFLICT');
   const link=await appendSalesContext(s,id,b.conversation_id,b.conversation_session_id,a.principalId,'follow_up');
   if(link.created){await registry.bump(s,r,version);await commands.audit(s,a.principalId,correlation,r.objectKey,id,'session.follow_up',['session_id']);}
   const response={status:200,body:{data:{id,version:link.created?String(BigInt(version)+1n):version,context_id:link.id,conversation_id:b.conversation_id,session_id:b.conversation_session_id,kind:'follow_up'},meta:{correlation_id:correlation}}};
   await commands.complete(s,cmd,response);return response;
  });
 }
 async read(account:string,tenant:string,id:string,query:Record<string,unknown>={}){
  if(!uuid(id)||Object.keys(query).some(k=>k!=='before_id')||query.before_id!==undefined&&!uuid(query.before_id))throw new CommandError(400,'INVALID_REQUEST');
  return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
   const a=await withFieldPolicies(s,raw),registry=new RecordRegistry(),r=await registry.get(s,id);registry.read(a,r);
   if(!['lead','deal'].includes(r.objectKey))throw new CommandError(404,'NOT_FOUND');checkField(a,r.objectKey,'contact_id','read');
   const [record]=await s.query(`SELECT contact_id FROM \`${r.objectKey}\` WHERE tenant_id=? AND record_id=?`,[tenant,id]);await contactReferences.requireActive(s,a,record.contact_id);
   const rows=await s.query(`SELECT * FROM sales_session_context WHERE tenant_id=? AND record_id=? ${query.before_id?'AND id<?':''} ORDER BY id DESC LIMIT 51`,[tenant,id,...(query.before_id?[query.before_id]:[])]),data=[];
   for(const row of rows.slice(0,50)){
    try{await salesChatSource.session(a,row.conversation_id,row.session_id,record.contact_id,false,false);}
    catch(e){if(e instanceof CommandError&&[403,404,422].includes(e.status))continue;throw e;}
    data.push({id:row.id,record_id:row.record_id,conversation_id:row.conversation_id,session_id:row.session_id,kind:row.kind,recorded_at:stamp(row.recorded_at)});
   }
   return {data,next_before_id:rows.length>50?rows[49].id:null};
  });
 }
}
