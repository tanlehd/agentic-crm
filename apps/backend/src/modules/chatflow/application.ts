import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { permits,fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { object,validKey,checkField } from '../crm/properties.js';
import { uuid } from '../identity/admin.js';
import { chatflowParent } from '../workflow/parent-port.js';
import { ChatflowEngine,json } from './engine.js';
import { validateGraph,explicitBoolean } from './graph.js';
export type Operation='create'|'version'|'publish'|'complete';
export class Chatflows {
 readonly engine:ChatflowEngine;readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
 constructor(source:DataSource){this.engine=new ChatflowEngine(source);this.auth=new IdentityAuthorization(this.engine.uow);}
 private permission(a:Access,action:string){if(!permits(a,'automation',action))throw new CommandError(403,'FORBIDDEN');}
 private async definition(s:TransactionScope,id:string){const [d]=await s.query('SELECT * FROM chatflow_definition WHERE tenant_id=? AND id=? FOR UPDATE',[s.context.tenantId,id]);if(!d)throw new CommandError(404,'NOT_FOUND');return d;}
 private async readable(s:TransactionScope,a:Access,id:string){const r=await this.engine.lock(s,id),c=await this.engine.conversations.read(s,r.conversation_id,a);if(!permits(a,'automation','read',c.record))throw new CommandError(404,'NOT_FOUND');return {r,c};}
 private canComplete(a:Access,c:any){return c.row.status!=='closed'&&c.record.ownerPrincipalId===a.principalId&&allows(a,'lead','create',c.record)&&allows(a,'lead','qualify',c.record)&&['qualification','service_interest','need_summary','preferred_contact_method','phone','contact_permission','consent_evidence'].every(k=>fieldAllowed(a,'lead',k,'read')&&fieldAllowed(a,'lead',k,'write'))&&fieldAllowed(a,'conversation','text','read');}
 private async output(s:TransactionScope,a:Access,r:any,c:any){const visible=(k:string)=>fieldAllowed(a,'lead','qualification','read')&&fieldAllowed(a,'lead',k,'read');return {nodes:await s.query('SELECT node_key,status,invalid_attempts FROM chatflow_node_run WHERE tenant_id=? AND session_id=? ORDER BY node_key',[s.context.tenantId,r.id]),turns:fieldAllowed(a,'conversation','text','read')?await s.query('SELECT message_id,node_key,status FROM chatflow_turn WHERE tenant_id=? AND session_id=? ORDER BY message_id',[s.context.tenantId,r.id]):[],id:r.id,version:r.version,version_id:r.version_id,parent_run_id:r.parent_run_id,conversation_id:r.conversation_id,status:r.status,node_key:r.node_key,owner_revision:c.record.ownerRevision,outcome:r.outcome,error_code:r.error_code,lead_id:r.lead_id,draft:Object.fromEntries(Object.entries(r.draft).filter(([k])=>visible(k))),variables:Object.fromEntries(Object.entries(r.variables).filter(([k])=>visible(k))),provenance:Object.fromEntries(Object.entries(r.provenance).filter(([k])=>visible(k)&&fieldAllowed(a,'conversation','text','read')&&fieldAllowed(a,'lead','consent_evidence','read'))),can_complete:r.status==='paused_human'&&this.canComplete(a,c)};}
 read(account:string,tenant:string,kind:'definitions'|'versions'|'session'|'conversation',id?:string,limit=50){return this.engine.uow.run({tenantId:tenant},async s=>{const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true));
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new CommandError(400,'INVALID_REQUEST');
  if(kind==='session'||kind==='conversation'){
   if(kind==='conversation'){const c=await this.engine.conversations.read(s,id!,a);if(!permits(a,'automation','read',c.record))throw new CommandError(404,'NOT_FOUND');const [r]=await s.query('SELECT id FROM chatflow_session WHERE tenant_id=? AND conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 1',[tenant,id]);if(!r)return {data:null};id=r.id;}
   const {r,c}=await this.readable(s,a,id!);return {data:await this.output(s,a,r,c)};
  }
  this.permission(a,'design');if(kind==='versions'){await this.definition(s,id!);return {data:(await s.query('SELECT id,number,state,graph FROM chatflow_version WHERE tenant_id=? AND definition_id=? ORDER BY number DESC LIMIT ?',[tenant,id,limit])).map((v:any)=>({...v,graph:json(v.graph)}))};}
  return {data:(await s.query('SELECT id,`key`,name,active_version_id,version FROM chatflow_definition WHERE tenant_id=? ORDER BY id LIMIT ?',[tenant,limit])).map((d:any)=>({...d,version:String(d.version)}))};
 });}
 mutate(account:string,tenant:string,op:Operation,input:unknown,key:string,correlation:string,id?:string,num?:number,version?:string){return this.engine.uow.run({tenantId:tenant},async s=>{
  const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true));if(typeof key!=='string'||! /^[\x21-\x7e]{1,128}$/.test(key)||id!==undefined&&!uuid(id))throw new CommandError(400,'INVALID_REQUEST');
  const body=object(input,op==='create'?['key','name']:op==='version'?['graph']:op==='complete'?['qualification','consent_message_id','owner_revision']:[]);
  if(op!=='complete')this.permission(a,op==='publish'?'publish':'design');
  let bound:Awaited<ReturnType<Chatflows['readable']>>|undefined;
  if(op==='complete'){bound=await this.readable(s,a,id!);if(!this.canComplete(a,bound.c))throw new CommandError(403,'FORBIDDEN');}
  const command={actorId:a.principalId,correlationId:correlation,route:`chatflow:${op}:${id??''}:${num??''}`,key,body,version};
  const replay=await this.commands.replay(s,command,async()=>{});if(replay)return replay;
  let data:Record<string,unknown>;
  if(op==='create'){
   if(!validKey(body.key)||typeof body.name!=='string'||!body.name.trim()||body.name.length>255)throw new CommandError(422,'VALIDATION_FAILED');if((await s.query('SELECT id FROM chatflow_definition WHERE tenant_id=? AND `key`=?',[tenant,body.key])).length)throw new CommandError(409,'CHATFLOW_KEY_EXISTS');const created=randomUUID();await s.query('INSERT INTO chatflow_definition(id,tenant_id,`key`,name) VALUES (?,?,?,?)',[created,tenant,body.key,body.name]);data={id:created,version:'1'};
  }else if(op==='complete'){
   const {r,c}=bound!;if(!version)throw new CommandError(428,'VERSION_REQUIRED');if(r.version!==version)throw new CommandError(409,'VERSION_CONFLICT');if(r.status!=='paused_human')throw new CommandError(409,'INVALID_TRANSITION');if(body.owner_revision!==c.record.ownerRevision)throw new CommandError(409,'OWNER_CONFLICT');
   await chatflowParent(s,r.parent_run_id,r.conversation_id,r.service_actor_id,true);
   if(!uuid(body.consent_message_id))throw new CommandError(422,'CONSENT_MESSAGE_INVALID');const m=await this.engine.conversations.inbound(s,r.conversation_id,body.consent_message_id);if(explicitBoolean(m.text)!==true)throw new CommandError(422,'CONSENT_MESSAGE_INVALID');
   const q=object(body.qualification,['service_interest','need_summary','preferred_contact_method','phone','contact_permission']);if(q.contact_permission!==true)throw new CommandError(422,'CONSENT_REQUIRED');for(const k of Object.keys(q)){checkField(a,'lead',k,'read');checkField(a,'lead',k,'write');}
   this.engine.leads.validate(a,q,m.id);r.variables=q;r.draft={};r.provenance=Object.fromEntries(Object.keys(q).map(k=>[k,k==='contact_permission'?{kind:'message',message_id:m.id,node_key:r.node_key}:{kind:'human',principal_id:a.principalId}]));r.owner_revision=c.record.ownerRevision;
   await s.query('UPDATE chatflow_session SET owner_revision=? WHERE tenant_id=? AND id=?',[r.owner_revision,tenant,id]);await this.engine.saveLead(s,r,a,true,'human');await this.engine.terminal(s,r,'qualified',{kind:'human',id:a.principalId});const saved=await this.engine.lock(s,id!);data={id,version:saved.version,status:saved.status,outcome:saved.outcome,lead_id:saved.lead_id};
  }else{
   const d=await this.definition(s,id!);if(op==='version'){const graph=validateGraph(body.graph),[last]=await s.query('SELECT COALESCE(MAX(number),0)+1 n FROM chatflow_version WHERE tenant_id=? AND definition_id=?',[tenant,id]),vid=randomUUID();await s.query("INSERT INTO chatflow_version(id,tenant_id,definition_id,number,graph,state) VALUES (?,?,?,?,?,'draft')",[vid,tenant,id,last.n,JSON.stringify(graph)]);data={id:vid,number:Number(last.n),state:'draft'};
   }else{if(!version)throw new CommandError(428,'VERSION_REQUIRED');if(String(d.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');const [v]=await s.query('SELECT * FROM chatflow_version WHERE tenant_id=? AND definition_id=? AND number=? FOR UPDATE',[tenant,id,num]);if(!v)throw new CommandError(404,'NOT_FOUND');if(v.state!=='draft')throw new CommandError(409,'VERSION_IMMUTABLE');const graph=validateGraph(json(v.graph));for(const n of graph.nodes)if(n.type==='request_human')await this.engine.identity.chatTeam(s,n.config.target_chat_team);await s.query("UPDATE chatflow_version SET state='published' WHERE tenant_id=? AND id=?",[tenant,v.id]);await s.query('UPDATE chatflow_definition SET active_version_id=?,version=version+1 WHERE tenant_id=? AND id=?',[v.id,tenant,id]);data={id,version:String(BigInt(d.version)+1n)};}
  }
  await this.commands.audit(s,a.principalId,correlation,'chatflow',String(data.id),`chatflow.${op}`,Object.keys(body));const response={status:op==='create'||op==='version'?201:200,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(s,command,response);return response;
 });}
}
