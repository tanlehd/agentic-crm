import {ownerCanonical,ownerFail,ownerRoute,routingDispatchBinding,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {ChatOwnerCommands} from './owner-command.js';
import type {ChatOwnership} from './ownership.js';
/** Internal pinned service assignment; all authority/capacity/CAS remains in the existing saga. */
export function chatRoutingDispatchRoutes(commands:ChatOwnerCommands,ownership:ChatOwnership):Record<string,WorkloadRoute>{
 return {'/internal/v1/owners/chat/routing-dispatch':ownerRoute('chat','routing-dispatch',['routing'],async raw=>{
  const {binding,request,ref}=routingDispatchBinding(raw as OwnerCommandRequest);
  const prepared=await commands.prepare(binding,request);if(prepared.binding_digest!==ref.binding_digest||ownerCanonical(prepared.binding)!==ownerCanonical(binding))ownerFail('CONFLICT');
  const result=await ownership.execute(raw.tenant_id,ref);
  return {command:ref,state:'committed',reconciliation:result.reconciliation};
 })};
}
