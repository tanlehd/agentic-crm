import {needReceipt} from './need-receipt.js';
import {emitNeedAssessment} from './need-events.js';
import { linkNeedOutcome,listNeedOutcomes } from '../sales/need-outcome-port.js';
import {createHash} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError,DurableCommands} from '../../kernel/reliability/commands.js';
import {fieldAllowed,permits} from '../identity/domain/authorization.js';
import {uuid} from '../identity/admin.js';
import {withFieldPolicies} from '../crm/access.js';
import {object,properties,json,checkField} from '../crm/properties.js';
import {contactReferences,stamp} from '../crm/core.js';
import {Conversations,conversation,requirePermission} from './domain.js';
import {needBuiltins,needDefaults,needResource,validateNeedValues,mergeNeedValues,validateProposal} from './need-values.js';
import {configuredNeedProvider,type NeedProvider} from './need-provider.js';
const fail=(code:string,status=409):never=>{throw new CommandError(status,code);};
const fingerprint=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export class NeedAssessments {
 constructor(private readonly conversations:Conversations,private readonly providerFactory:()=>NeedProvider=configuredNeedProvider){}
 private async snapshot(s:TransactionScope,account:string,thread:string,session:string,need:string,write:boolean){
  if(![thread,session,need].every(uuid))fail('INVALID_REQUEST',400);
  const a=await withFieldPolicies(s,await this.conversations.auth.loadHuman(s,account,undefined,write));
  const {record,row}=await conversation(s,thread,write);requirePermission(a,record,'read');if(write)requirePermission(a,record,'update');
  for(const f of ['text','contact_id'])checkField(a,'conversation',f,'read');if(write)checkField(a,'conversation','text','write');
  await contactReferences.requireActive(s,a,row.contact_id);
  const [n]=await s.query('SELECT n.id,n.label,c.status,c.version FROM session_need n JOIN conversation_acquisition_session c ON c.tenant_id=n.tenant_id AND c.id=n.session_id WHERE n.tenant_id=? AND n.id=? AND n.session_id=? AND c.conversation_id=?',[s.context.tenantId,need,session,thread]);if(!n)fail('NOT_FOUND',404);
  const [type]=await s.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation_need' AND archived_at IS NULL",[s.context.tenantId]);if(!type)fail('CAPABILITY_UNAVAILABLE');
  const defs=[...needBuiltins,...await properties(s,type.id)],visible=defs.filter(p=>fieldAllowed(a,needResource,p.key,'read'));
  const [assessment]=await s.query('SELECT * FROM need_assessment WHERE tenant_id=? AND need_id=?',[s.context.tenantId,need]);
  return {a,record,row,n,defs,visible,assessment,version:String(assessment?.version??0),values:assessment?json(assessment.values_json):needDefaults,pins:assessment?json(assessment.pinned_json) as string[]:[],proposal:assessment?json(assessment.proposal_json):{}};
 }
 private async evidence(s:TransactionScope,session:string){
  const rows=await s.query("SELECT m.id,m.direction,m.text,m.occurred_at,m.status FROM message_acquisition_membership x JOIN message m ON m.tenant_id=x.tenant_id AND m.id=x.message_id WHERE x.tenant_id=? AND x.session_id=? AND x.resolution='assigned' AND (m.direction='inbound' OR m.status='sent') ORDER BY m.received_at,m.id LIMIT 101",[s.context.tenantId,session]);
  if(rows.length>100||Buffer.byteLength(JSON.stringify(rows))>100000)fail('EVIDENCE_TOO_LARGE',422);return rows;
 }
 async link(account:string,tenant:string,thread:string,session:string,need:string,input:unknown,key:string,version:string|undefined,correlation:string){
  const b=object(input,['record_id']);if(!uuid(b.record_id)||! /^[\x21-\x7e]{1,128}$/.test(key))fail('INVALID_REQUEST',400);if(!version)fail('PRECONDITION_REQUIRED',428);
  return this.conversations.uow.run({tenantId:tenant},async s=>{const x=await this.snapshot(s,account,thread,session,need,true),commands=new DurableCommands(),cmd={actorId:x.a.principalId,route:`need-outcome:${thread}:${session}:${need}`,key,version,body:b,correlationId:correlation};
   // Revalidate Sales rights even on replay; link is naturally idempotent.
   if(x.version!==version)fail('VERSION_CONFLICT');await linkNeedOutcome(s,x.a,{thread,session,need,record:b.record_id,contact:x.row.contact_id});
   const replay=await commands.replay(s,cmd,async()=>{});if(replay)return needReceipt(replay);
   await commands.audit(s,x.a.principalId,correlation,'sales_need_outcome',need,'need.link_outcome',['record_id']);const response={status:200,body:{data:{conversation_id:thread,session_id:session,need_id:need,version:x.version},meta:{correlation_id:correlation}}};await commands.complete(s,cmd,response);return response;
  });
 }
 async read(account:string,tenant:string,thread:string,session:string,need:string){return this.conversations.uow.run({tenantId:tenant},async s=>{
  const x=await this.snapshot(s,account,thread,session,need,false),filter=(v:Record<string,unknown>)=>Object.fromEntries(Object.entries(v).filter(([k])=>x.visible.some(p=>p.key===k)));
  const revisions=await s.query('SELECT version,values_json,pinned_json,proposal_json,recorded_at FROM need_assessment_revision WHERE tenant_id=? AND need_id=? ORDER BY version DESC LIMIT 50',[tenant,need]);
  const safeProposal=(p:any)=>({...p,values:filter(p.values??{})});
  return {data:{conversation_id:thread,session_id:session,need_id:need,version:x.version,outcomes:await listNeedOutcomes(s,x.a,session,need),can_edit:permits(x.a,'conversation','update',x.record)&&fieldAllowed(x.a,'conversation','text','write'),definitions:x.visible.map(p=>({...p,can_write:fieldAllowed(x.a,needResource,p.key,'write')})),values:filter(x.values),pinned:x.pins.filter(k=>x.visible.some(p=>p.key===k)),proposal:safeProposal(x.proposal),history:revisions.map((r:any)=>({version:String(r.version),values:filter(json(r.values_json)),recorded_at:stamp(r.recorded_at),proposal:safeProposal(json(r.proposal_json))}))}};
 });}
 async mutate(account:string,tenant:string,thread:string,session:string,need:string,input:unknown,key:string,version:string|undefined,correlation:string,enrich=false){
  const b=object(input,enrich?[]:['values','release_pins']);if(!version)fail('PRECONDITION_REQUIRED',428);if(!/^(0|[1-9][0-9]{0,19})$/.test(version!)||! /^[\x21-\x7e]{1,128}$/.test(key))fail('INVALID_REQUEST',400);
  // Stable internal key preserves retries issued through either HTTP alias.
  const commands=new DurableCommands(),route=`POST /api/v1/threads/${thread}/sessions/${session}/needs/${need}/${enrich?'enrich':'assessment'}`;
  const prepare=await this.conversations.uow.run({tenantId:tenant},async s=>{
   const x=await this.snapshot(s,account,thread,session,need,true),cmd={actorId:x.a.principalId,route,key,version,body:b,correlationId:correlation};
   const keys=enrich?needBuiltins.map(p=>p.key):[...Object.keys(object(b.values??{})),...(Array.isArray(b.release_pins)?b.release_pins:[])];for(const k of keys){checkField(x.a,needResource,k,'read');checkField(x.a,needResource,k,'write');}
   // Prepare only inspects an existing receipt. A reservation must not commit before AI I/O.
   const [receipt]=await s.query("SELECT id FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? AND (status<>'completed' OR expires_at>UTC_TIMESTAMP(6))",[tenant,x.a.principalId,route,key]);
   const replay=receipt?await commands.replay(s,cmd,async()=>{}):undefined;if(replay)return {replay};
   if(x.version!==version)fail('VERSION_CONFLICT');
   if(!enrich)return {human:true};
   // Field-denied evidence must never leave Chat. Only permitted definitions/values enter provider input.
   const defs=x.visible.filter(p=>fieldAllowed(x.a,needResource,p.key,'write'));
   if(needBuiltins.some(p=>!defs.some(d=>d.key===p.key)))fail('FIELD_FORBIDDEN',403);
   const evidence=await this.evidence(s,session);if(!evidence.length)fail('INSUFFICIENT_EVIDENCE',422);
   const input={need:{id:need,label:x.n.label},fields:defs.map(p=>({key:p.key,label:p.label,type:p.type,options:p.options,version:p.version})),messages:evidence};
   return {input,defs,hash:fingerprint({input,version:x.version,owner:x.record.ownerRevision,sessionVersion:x.n.version})};
  });
  if(prepare.replay)return needReceipt(prepare.replay);
  let proposal:any;
  if(enrich){const provider=this.providerFactory();const p=validateProposal(await provider.assess(prepare.input),prepare.defs!,prepare.input!.messages.filter((m:any)=>m.direction==='inbound').map((m:any)=>m.id));proposal={...p,provider:provider.provider,model:provider.model,config_version:provider.configVersion,input_fingerprint:prepare.hash,assessed_at:new Date().toISOString()};}
  return this.conversations.uow.run({tenantId:tenant},async s=>{
   const x=await this.snapshot(s,account,thread,session,need,true),cmd={actorId:x.a.principalId,route,key,version,body:b,correlationId:correlation};const replay=await commands.replay(s,cmd,async()=>{});if(replay)return needReceipt(replay);if(x.version!==version)fail('VERSION_CONFLICT');
   let pins=[...x.pins],patch:Record<string,unknown>;
   if(enrich){
    const currentProvider=this.providerFactory();if(currentProvider.provider!==proposal.provider||currentProvider.model!==proposal.model||currentProvider.configVersion!==proposal.config_version)fail('AI_CONFIG_CHANGED');
    const defs=x.visible.filter(p=>fieldAllowed(x.a,needResource,p.key,'write')),input={need:{id:need,label:x.n.label},fields:defs.map(p=>({key:p.key,label:p.label,type:p.type,options:p.options,version:p.version})),messages:await this.evidence(s,session)};
    if(fingerprint({input,version:x.version,owner:x.record.ownerRevision,sessionVersion:x.n.version})!==prepare.hash)fail('AI_INPUT_STALE');patch=validateNeedValues(proposal.values,defs);
   }else{
    patch=validateNeedValues(b.values??{},x.defs);const released=b.release_pins??[];if(!Array.isArray(released)||released.some(k=>typeof k!=='string'||!x.defs.some(p=>p.key===k))||!Object.keys(patch).length&&!released.length)fail('INVALID_REQUEST',400);
    for(const k of [...Object.keys(patch),...released]){checkField(x.a,needResource,k,'read');checkField(x.a,needResource,k,'write');}
    pins=[...new Set([...pins.filter(k=>!released.includes(k)),...Object.keys(patch)])];proposal=x.proposal;
   }
   const values=mergeNeedValues(x.values,patch,pins,enrich),next=String(BigInt(version!)+1n);if(Buffer.byteLength(JSON.stringify(values))>65536)fail('VALUES_TOO_LARGE',422);
   await s.query('INSERT INTO need_assessment(tenant_id,need_id,conversation_id,session_id,values_json,pinned_json,proposal_json,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE values_json=?,pinned_json=?,proposal_json=?,version=?,updated_at=UTC_TIMESTAMP(6)',[tenant,need,thread,session,JSON.stringify(values),JSON.stringify(pins),JSON.stringify(proposal),next,JSON.stringify(values),JSON.stringify(pins),JSON.stringify(proposal),next]);
   await s.query('INSERT INTO need_assessment_revision(tenant_id,need_id,version,values_json,pinned_json,proposal_json,actor_id,recorded_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,need,next,JSON.stringify(values),JSON.stringify(pins),JSON.stringify(proposal),x.a.principalId]);
   await emitNeedAssessment(s,thread,session,need,next,correlation,{kind:'human',id:x.a.principalId});await commands.audit(s,x.a.principalId,correlation,needResource,need,enrich?'need.enrich':'need.update',Object.keys(patch));
   const response={status:200,body:{data:{conversation_id:thread,session_id:session,need_id:need,version:next},meta:{correlation_id:correlation}}};await commands.complete(s,cmd,response);return response;
  });
 }
}
