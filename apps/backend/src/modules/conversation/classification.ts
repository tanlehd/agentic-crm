import {randomUUID} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError,DurableCommands} from '../../kernel/reliability/commands.js';
import {fieldAllowed,permits,type Access} from '../identity/domain/authorization.js';
import {withFieldPolicies} from '../crm/access.js';
import {object,properties,json,checkField,mergeValues,type Property} from '../crm/properties.js';
import {contactReferences,stamp} from '../crm/core.js';
import {CrmActivityPort} from '../crm/activity-port.js';
import {visibleSalesContribution} from '../sales/contribution-port.js';
import {Conversations,conversation,requirePermission} from './domain.js';
import {contribute} from './contribution-storage.js';
const resource='conversation_session';
const fail=(code:string,status:number):never=>{throw new CommandError(status,code);};
export function classificationPatch(defs:Property[],old:Record<string,unknown>,input:unknown,a:Access){
 const patch=object(input);if(!Object.keys(patch).length||Object.keys(patch).length>100)fail('INVALID_REQUEST',400);
 for(const key of Object.keys(patch))checkField(a,resource,key,'read');
 const values=mergeValues(defs,old,patch,a,resource);if(Buffer.byteLength(JSON.stringify(values))>65536)fail('VALUES_TOO_LARGE',422);return values;
}
export class ConversationClassification {
 constructor(private readonly conversations:Conversations){}
 private async authorize(s:TransactionScope,account:string,cid:string,sid:string,write=false){
  const a=await withFieldPolicies(s,await this.conversations.auth.loadHuman(s,account,undefined,write));
  const {record,row}=await conversation(s,cid,write);requirePermission(a,record,'read');if(write)requirePermission(a,record,'update');
  for(const f of ['contact_id','text'])checkField(a,'conversation',f,'read');if(write)checkField(a,'conversation','text','write');
  await contactReferences.requireActive(s,a,row.contact_id);
  const [session]=await s.query('SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND id=?',[s.context.tenantId,cid,sid]);if(!session)fail('NOT_FOUND',404);
  return {a,record,session};
 }
 private async definitions(s:TransactionScope){const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation_session' AND kind='standard' AND archived_at IS NULL",[s.context.tenantId]);if(!type)fail('CAPABILITY_UNAVAILABLE',409);return properties(s,type.id);}
 async read(account:string,tenant:string,cid:string,sid:string){return this.conversations.uow.run({tenantId:tenant},async s=>{
  const {a,record,session}=await this.authorize(s,account,cid,sid),defs=await this.definitions(s),[row]=await s.query('SELECT * FROM session_classification WHERE tenant_id=? AND session_id=?',[tenant,sid]);
  const visible=defs.filter(p=>fieldAllowed(a,resource,p.key,'read'));
  return {data:{session_id:sid,thread_id:cid,status:session.status,version:String(row?.version??0),can_edit:session.status==='active'&&permits(a,'conversation','update',record)&&fieldAllowed(a,'conversation','text','write'),definitions:visible.map(p=>({...p,can_write:fieldAllowed(a,resource,p.key,'write')})),values:Object.fromEntries(Object.entries(row?json(row.values_json):{}).filter(([key])=>visible.some(p=>p.key===key)))}};
 });}
 async mutate(account:string,tenant:string,cid:string,sid:string,input:unknown,key:string,version:string|undefined,correlation:string){
  const b=object(input,['values']);if(!version)fail('PRECONDITION_REQUIRED',428);const expected=version!;if(!/^(0|[1-9][0-9]{0,19})$/.test(expected)||! /^[\x21-\x7e]{1,128}$/.test(key))fail('INVALID_REQUEST',400);
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const {a,session}=await this.authorize(s,account,cid,sid,true),defs=await this.definitions(s),[row]=await s.query('SELECT * FROM session_classification WHERE tenant_id=? AND session_id=?',[tenant,sid]);
   const old=row?json(row.values_json):{},values=classificationPatch(defs,old,b.values,a),commands=new DurableCommands();
   const cmd={actorId:a.principalId,correlationId:correlation,route:`POST /api/v1/conversations/${cid}/sessions/${sid}/classification`,key,version,body:b};
   const replay=await commands.replay(s,cmd,async()=>{});if(replay)return replay;
   if(session.status!=='active')fail('SESSION_CLOSED',409);if(String(row?.version??0)!==version)fail('VERSION_CONFLICT',409);
   const next=String(BigInt(expected)+1n),changes=Object.fromEntries(Object.keys(b.values).map(k=>[k,{before:old[k]??null,after:values[k]??null}]));
   await s.query('INSERT INTO session_classification(tenant_id,session_id,values_json,version,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE values_json=?,version=?,updated_at=UTC_TIMESTAMP(6)',[tenant,sid,JSON.stringify(values),next,JSON.stringify(values),next]);
   await contribute(s,cid,{session:sid,kind:'classification',source:sid,revision:next,actor:{kind:'human',id:a.principalId},payload:{changes}});
   await commands.audit(s,a.principalId,correlation,resource,sid,'classification.update',Object.keys(b.values));
   await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'conversation.classification_changed',1,'conversation_session',?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,sid,next,JSON.stringify({thread_id:cid,session_id:sid,version:next,changed_keys:Object.keys(b.values)}),correlation,a.principalId]);
   const response={status:200,body:{data:{session_id:sid,version:next},meta:{correlation_id:correlation}}};await commands.complete(s,cmd,response);return response;
  });
 }
 async history(account:string,tenant:string,cid:string,sid:string,q:Record<string,unknown>={}){
  if(Object.keys(q).some(k=>k!=='before_revision')||q.before_revision!==undefined&&(typeof q.before_revision!=='string'||! /^[1-9][0-9]{0,19}$/.test(q.before_revision)))fail('INVALID_REQUEST',400);
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const {a,record,session}=await this.authorize(s,account,cid,sid),rows=await s.query(`SELECT * FROM session_contribution WHERE tenant_id=? AND session_id=? ${q.before_revision?'AND revision<?':''} ORDER BY revision DESC LIMIT 51`,[tenant,sid,...(q.before_revision?[q.before_revision]:[])]);
   const [first]=await s.query('SELECT kind FROM session_contribution WHERE tenant_id=? AND session_id=? ORDER BY revision LIMIT 1',[tenant,sid]);
   const [last]=await s.query('SELECT owner_id,team_id,owner_revision FROM session_contribution WHERE tenant_id=? AND session_id=? ORDER BY revision DESC LIMIT 1',[tenant,sid]);
   const data=[];for(const r of rows.slice(0,50)){
    const payload=json(r.payload);
    if(r.kind==='classification'){payload.changes=Object.fromEntries(Object.entries(payload.changes).filter(([k])=>fieldAllowed(a,resource,k,'read')));if(!Object.keys(payload.changes).length)continue;}
    if(r.kind==='note'&&!await new CrmActivityPort().read(s,a,r.source_id,cid))continue;
    if(r.kind==='outcome'&&!await visibleSalesContribution(s,a,r.source_id,sid))continue;
    data.push({id:r.id,revision:String(r.revision),kind:r.kind,source_id:r.source_id,source_revision:r.source_revision,actor:r.actor_id?{kind:r.actor_kind,id:r.actor_id}:null,owner_id:r.owner_id,handling_team_id:r.team_id,owner_revision:String(r.owner_revision),recorded_at:stamp(r.recorded_at),payload});
   }
   return {data:{session_id:sid,coverage:!first?'none':first.kind==='opened'?'full':'partial',owner:session.status==='active'?{id:record.ownerPrincipalId,team_id:record.teamId,revision:record.ownerRevision}:last?{id:last.owner_id,team_id:last.team_id,revision:String(last.owner_revision)}:null,history:data,next_before_revision:rows.length>50?String(rows[49].revision):null}};
  },'REPEATABLE READ');
 }
}
