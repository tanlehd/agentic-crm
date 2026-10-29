import {createHash,randomUUID} from 'node:crypto';
import type {DispatchBinding,DispatchRequest} from '@agentic-crm/contracts';
import type {DispatchScope as TransactionScope} from './dispatch-storage.js';
import {canonical,CommandError} from './dispatch-storage.js';

export interface HumanEnrollment {delegationId:string;principalId:string}
export type Issue=Extract<DispatchRequest,{operation:'identity-issue'}>;
export function publicIntentStatus(status:string){return status.startsWith('remote_')?status.slice(7):status;}
export async function enqueueHumanOutbound(s:TransactionScope,input:{intent:string;conversation:string;contact:string;connection:string;text:string;ownerRevision:string;recordVersion:string;teamId:string|null;sharedTeamIds:readonly string[];enrollment:HumanEnrollment}){
 const {enrollment:e}=input;
 if(!e.delegationId||!e.principalId)throw new CommandError(503,'OUTBOUND_ENROLLMENT_REQUIRED');
 const payload={version:1,platform:'mock_messenger',message:{type:'text',text:input.text}};
 const binding:DispatchBinding={tenant_id:s.context.tenantId,conversation_id:input.conversation,crm_contact_id:input.contact,connection_id:input.connection,intent_id:input.intent,attempt_id:randomUUID(),principal_id:e.principalId,delegation_id:e.delegationId,actor_kind:'human',owner_revision:input.ownerRevision,record_version:input.recordVersion,payload_digest:createHash('sha256').update(canonical(payload)).digest('hex')};
 const resource:Issue['resource_context']={object_key:'conversation',owner_principal_id:e.principalId,owner_revision:input.ownerRevision,record_version:input.recordVersion,team_id:input.teamId,shared_team_ids:[...input.sharedTeamIds].sort()};
 await s.query('INSERT INTO chat_outbound_job(tenant_id,intent_id,conversation_id,attempt_id,delegation_id,principal_id,binding_json,resource_json,next_attempt_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[s.context.tenantId,input.intent,input.conversation,binding.attempt_id,e.delegationId,e.principalId,canonical(binding),canonical(resource)]);
}
