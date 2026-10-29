import {randomUUID} from 'node:crypto';
import type {OwnerActor,OwnerRoutingReplySnapshot} from '@agentic-crm/contracts';
import {ownerDigest,ownerFail,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';

/** HTTP source only. Call outside Routing SQL; public/report authorization stays at composition. */
export class NativeRoutingReplySource{
 constructor(private readonly call:(request:OwnerCommandRequest)=>Promise<unknown>){}
 private async read(tenant:string,actor:OwnerActor,sessions:string[],from:string,mode:'aggregate'|'facts'){
  const request=validateOwnerValue<OwnerCommandRequest>('Request_chat-routing-reply-facts',{schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:tenant,command_id:randomUUID(),operation:'routing-reply-facts',actor,payload:{session_ids:sessions,from,mode}});
  const result=validateOwnerValue<OwnerRoutingReplySnapshot>('OwnerRoutingReplySnapshot',await this.call(request));
  if(result.snapshot_digest!==ownerDigest({facts:result.facts,replies:result.replies})||mode==='aggregate'&&result.facts.length||mode==='facts'&&result.replies.length||new Set(result.facts.map(r=>r.id)).size!==result.facts.length||new Set(result.replies.map(r=>r.principal_id)).size!==result.replies.length)ownerFail('FORBIDDEN');
  if(result.facts.some(r=>!sessions.includes(r.session_id)||Date.parse(r.recorded_at)<Date.parse(from))||!sessions.length&&(result.facts.length||result.replies.length))ownerFail('FORBIDDEN');
  return result;
 }
 async replies(tenant:string,actor:OwnerActor,sessions:string[],from:string){return (await this.read(tenant,actor,sessions,from,'aggregate')).replies;}
 async replyFacts(tenant:string,actor:OwnerActor,sessions:string[],from:string){return (await this.read(tenant,actor,sessions,from,'facts')).facts;}
}
