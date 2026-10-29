import type {OwnerCommandBinding,OwnerResource,OwnerTarget} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCounter,ownerDigest,ownerFail,validateOwnerValue} from './owner-protocol.js';
import type {OwnerCommandRequest} from './owner-routes.js';
/** Exact immutable wire child. Authorization, work CAS and effects stay with owners. */
export function routingRerouteBinding(raw:OwnerCommandRequest){
 const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-routing-reroute',raw),p=input.payload,resource=p.resource as OwnerResource,target=p.target as OwnerTarget,pin=p.pin as {work_id:string;work_version:string;queue_version_id:string};
 if(input.actor.kind!=='human'||resource.object_key!=='conversation'||resource.archived||(target.principal_id===null)!==(target.kind===null)||!target.team_id)ownerFail('FORBIDDEN');
 for(const value of [resource.record_version,resource.owner_revision,resource.control_revision,pin.work_version])ownerCounter(value,true);
 const request={id:resource.resource_id,body:{owner_principal_id:target.principal_id,team_id:target.team_id,reason:'human_routing'},expected_version:resource.record_version,idempotency_key:input.command_id};
 const binding:OwnerCommandBinding={tenant_id:input.tenant_id,command_id:input.command_id,owner:'chat',operation:'routing-assignment',actor:input.actor,resource,target,session_id:p.session_id as string,fields:['owner_principal_id','team_id'],routing_reroute:pin,payload_digest:ownerDigest(request),legacy_receipt_key:'routing-reroute:'+pin.work_id+':'+input.command_id,graph:null,dependencies:[]};
 return {binding,request,ref:{command_id:input.command_id,binding_digest:ownerBindingDigest(binding)}};
}
