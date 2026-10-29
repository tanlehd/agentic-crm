import {randomUUID} from 'node:crypto';
import type {OwnerAdmission,OwnerCommandBinding} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,routingRerouteBinding,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {ChatOwnerCommands} from './owner-command.js';
import {chatOwnershipSnapshot,type ChatOwnership} from './ownership.js';
import type {RecordPeers} from './record-action.js';

export class ChatRoutingRerouteSource{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:RecordPeers){}
 async read(raw:OwnerCommandRequest){
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-routing-reroute-source',raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,command=randomUUID(),request={payload:input.payload};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:{resource_id:tenant,object_key:'routing_source',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:['owner_principal_id','team_id'],payload_digest:ownerDigest(request),legacy_receipt_key:'reroute-source:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||ownerCanonical(admission.allowed_fields)!==ownerCanonical(binding.fields))ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const snapshot=await this.commands.transaction(tenant,c=>chatOwnershipSnapshot(c,tenant,input.payload.id as string));
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await chatOwnershipSnapshot(c,tenant,input.payload.id as string))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    return {effect_id:tenant,effect_revision:'1'};
   });await this.peers.settle(tenant,ref,admission.admission_id);
   return {resource:snapshot.resource,session_id:snapshot.session};
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Retained proof is drained by Identity. */}throw error;}
 }
}
export function chatRoutingRerouteRoutes(source:ChatRoutingRerouteSource,commands:ChatOwnerCommands,ownership:ChatOwnership):Record<string,WorkloadRoute>{return {
 '/internal/v1/owners/chat/routing-reroute-source':ownerRoute('chat','routing-reroute-source',['routing'],raw=>source.read(raw as OwnerCommandRequest)),
 '/internal/v1/owners/chat/routing-reroute':ownerRoute('chat','routing-reroute',['routing'],async raw=>{
  const {binding,request,ref}=routingRerouteBinding(raw as OwnerCommandRequest),prepared=await commands.prepare(binding,request);
  if(prepared.binding_digest!==ref.binding_digest||ownerCanonical(prepared.binding)!==ownerCanonical(binding))ownerFail('CONFLICT');
  const result=await ownership.execute(raw.tenant_id,ref);return {command:ref,state:'committed',reconciliation:result.reconciliation};
 })
};}
