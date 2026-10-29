import type {OwnerCommandBinding,OwnerResource,OwnerTarget} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCounter,ownerDigest,ownerFail,validateOwnerValue} from './owner-protocol.js';
import type {OwnerCommandRequest} from './owner-routes.js';
/** Exact wire binding shared by sender and owner; contains no policy, SQL or business effects. */
export function routingDispatchBinding(raw:OwnerCommandRequest){
 const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-routing-dispatch',raw),p=input.payload;
 const resource=p.resource as OwnerResource,target=p.target as OwnerTarget,pin=p.pin as {work_id:string;entry_id:string;queue_version_id:string};
 if(input.actor.kind!=='service'||input.actor.principal_id!==input.actor.delegation_id||resource.object_key!=='conversation'||resource.archived||resource.owner_principal_id!==null)ownerFail('FORBIDDEN');
 ownerCounter(resource.record_version,true);ownerCounter(resource.owner_revision,true);ownerCounter(resource.control_revision,true);
 const request={id:resource.resource_id,body:{owner_principal_id:target.principal_id,team_id:target.team_id,reason:'human_routing'},expected_version:resource.record_version,idempotency_key:input.command_id};
 const binding:OwnerCommandBinding={tenant_id:input.tenant_id,command_id:input.command_id,owner:'chat',operation:'routing-assignment',actor:input.actor,resource,target,session_id:p.session_id as string,fields:['owner_principal_id','team_id'],routing_dispatch:pin,payload_digest:ownerDigest(request),legacy_receipt_key:`routing-dispatch:${pin.work_id}:${pin.entry_id}:${input.command_id}`,graph:null,dependencies:[]};
 return {binding,request,ref:{command_id:input.command_id,binding_digest:ownerBindingDigest(binding)}};
}
