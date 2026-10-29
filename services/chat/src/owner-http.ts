import type { OwnerCommandRef, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import type { ChatOwnerCommands } from './owner-command.js';

function referenceRecovery(peer: string, proof: OwnerRecoveryProof) {
  if (peer !== 'crm' && peer !== 'connector' && peer !== 'workflow' && peer!=='sales') return;
  if (!('binding' in proof)) ownerFail('FORBIDDEN');
  if(peer==='sales'){if(['need-post-outcome','need-outcome-effect','need-get-assessment','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(proof.binding.operation)&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&proof.binding.session_id&&proof.binding.projection)return;ownerFail('FORBIDDEN');}
  if(peer==='crm'&&proof.binding.operation==='session-source'&&['human','service'].includes(proof.binding.actor.kind)&&proof.binding.resource.object_key==='conversation'&&proof.binding.projection)return;
  if(['crm','workflow'].includes(peer)&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&proof.binding.operation==='workspace-get-activity'&&proof.binding.projection)return;
  if(peer==='workflow')ownerFail('FORBIDDEN');
  if(peer==='crm'&&proof.binding.operation==='read-need'&&proof.binding.actor.kind==='service'&&proof.binding.actor.delegation_id===proof.binding.actor.principal_id&&proof.binding.resource.object_key==='conversation'&&proof.binding.projection&&proof.binding.session_id&&proof.binding.need)return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&['need-get-assessment','need-post-assessment','need-post-enrich'].includes(proof.binding.operation)&&proof.binding.projection&&proof.binding.session_id&&proof.binding.metadata&&proof.binding.need)return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&['need-post-outcome','need-outcome-effect'].includes(proof.binding.operation)&&proof.binding.projection&&proof.binding.session_id&&proof.binding.need&&proof.binding.outcome)return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='session_funnel'&&proof.binding.operation==='session-progress-get-session-funnel')return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&['conversation-classification-get-conversations-conversation-sessions-session-classification','conversation-classification-post-conversations-conversation-sessions-session-classification','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(proof.binding.operation)&&proof.binding.projection&&proof.binding.session_id&&proof.binding.metadata)return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&['session-progress-get-conversations-conversation-sessions-session-progress','session-progress-post-conversations-conversation-sessions-session-progress'].includes(proof.binding.operation)&&proof.binding.projection&&proof.binding.session_id)return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='conversation'&&['conversation-get-conversations-id-notes','note-effect'].includes(proof.binding.operation))return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&proof.binding.resource.object_key==='chat_workspace_query'&&['workspace-conversations','workspace-sidebar','conversation-get-conversations','conversation-channels'].includes(proof.binding.operation))return;
  if(peer==='crm'&&proof.binding.actor.kind==='human'&&['conversation-get-conversations-id','conversation-post-conversations-id-transition'].includes(proof.binding.operation)&&proof.binding.projection)return;
  if (peer === 'crm' && proof.binding.operation === 'custom-values-patch' && proof.binding.metadata) return;
  if (proof.binding.actor.kind !== 'service' || proof.binding.resource.object_key !== 'conversation' || !proof.binding.references ||
      !['ingress-accept', 'ingress-process', 'ingress-receipt'].includes(proof.binding.operation)) ownerFail('FORBIDDEN');
}

/** Minimal recovery surface; no public mutation or authority bypass is registered. */
export function chatOwnerRecoveryRoutes(commands: ChatOwnerCommands, noteRecovery?:(tenant:string,ref:OwnerCommandRef)=>Promise<unknown>,outcomeRecovery?:(tenant:string,ref:OwnerCommandRef)=>Promise<unknown>): Record<string, WorkloadRoute> {
  return {
    '/internal/v1/owners/chat/command-proof': ownerRoute('chat', 'command-proof', ['identity', 'routing', 'crm', 'connector','workflow','sales'], async (request, peer) => {
      const proof = await commands.proof(request.tenant_id, validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',request.payload));
      referenceRecovery(peer.service, proof);
      return proof;
    }),
    '/internal/v1/owners/chat/command-abort': ownerRoute('chat', 'command-abort', ['identity', 'routing', 'crm', 'connector'], async (request, peer) => {
      const ref=validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',request.payload);
      if (peer.service === 'crm' || peer.service === 'connector') {
        const proof = await commands.proof(request.tenant_id, ref);
        referenceRecovery(peer.service, proof);
      }
      const observed=await commands.proof(request.tenant_id,ref).catch(error=>{if(error?.code==='NOT_FOUND')return null;throw error;});
      if(observed&&'binding' in observed&&observed.binding.operation==='note-effect'&&noteRecovery)await noteRecovery(request.tenant_id,ref);
      else if(observed&&'binding' in observed&&observed.binding.operation==='need-outcome-effect'&&outcomeRecovery)await outcomeRecovery(request.tenant_id,ref);
      else await commands.abort(request.tenant_id, ref);
      return commands.proof(request.tenant_id, ref);
    }),
  };
}
