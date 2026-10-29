import {randomUUID} from 'node:crypto';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,type ChatClaimProofRead,type ChatClaimProofReply} from '@agentic-crm/contracts';
import type {InspectChatClaim} from './dispatch-ledger.js';
import {canonical,CommandError} from '../../kernel/reliability/commands.js';
const ajv=new Ajv({strict:true});(formats as unknown as (a:Ajv)=>void)(ajv);
ajv.addSchema(chatDispatchV1Schema);
const validReply=ajv.compile({$ref:chatDispatchV1Schema.$id+'#/definitions/ChatClaimProofReply'});
const validConsume=ajv.compile({$ref:chatDispatchV1Schema.$id+'#/definitions/IdentityConsume'});
// send must bind the expected Chat workload via authenticated transport, never a body/header identity.
export function wireChatClaimInspector(send:(request:ChatClaimProofRead,signal:AbortSignal)=>Promise<unknown>):InspectChatClaim{
 return async(input,signal)=>{
  if(!validConsume(input)||Buffer.byteLength(JSON.stringify(input))>16384)throw new CommandError(400,'INVALID_REQUEST');
  const consume=structuredClone(input),request:ChatClaimProofRead={schema_version:1,operation:'chat-claim-proof',request_id:randomUUID(),binding:consume.binding,claim_id:consume.claim_id};
  if(signal.aborted)throw new CommandError(503,'DEPENDENCY_UNAVAILABLE');
  const response=await send(structuredClone(request),signal);
  if(signal.aborted)throw new CommandError(503,'DEPENDENCY_UNAVAILABLE');
  if(!validReply(response)||Buffer.byteLength(JSON.stringify(response))>16384)throw new CommandError(403,'FORBIDDEN');
  const proof=structuredClone(response) as ChatClaimProofReply;
  if(proof.request_id!==request.request_id||proof.receipt_id!==request.claim_id||proof.claim_id!==request.claim_id||proof.grant_id!==consume.grant_id||canonical(proof.binding)!==canonical(consume.binding)||proof.resource_context.owner_principal_id!==consume.binding.principal_id||proof.resource_context.owner_revision!==consume.binding.owner_revision||proof.resource_context.record_version!==consume.binding.record_version)throw new CommandError(403,'FORBIDDEN');
  return {state:'claimed',binding:proof.binding,grant_id:proof.grant_id,claim_id:proof.claim_id,resource_context:proof.resource_context};
 };
}
