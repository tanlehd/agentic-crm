import type { OwnerTarget } from '@agentic-crm/contracts';
import { ownerFail, ownerRoute, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { type AssignmentInput, ChatOwnership } from './ownership.js';

/** Candidate BFF routes; target resolver is an authenticated Identity adapter. */
export function chatOwnershipRoutes(ownership: ChatOwnership, target: (tenant: string, principal: string | null, team: string | null) => Promise<OwnerTarget>): Record<string, WorkloadRoute> {
  return Object.fromEntries(['routing-assignment', 'routing-takeover'].map(operation => [
    '/internal/v1/owners/chat/' + operation,
    ownerRoute('chat', operation, operation === 'routing-takeover' ? ['bff'] : ['bff', 'routing'], async (request, peer) => {
      const input = request as AssignmentInput;
      if (peer.service === 'bff' && input.actor.kind !== 'human' || peer.service === 'routing' && input.actor.kind !== 'service') ownerFail('FORBIDDEN');
      const proof = await ownership.prepareResolved(input, target);
      const ref = { command_id: proof.binding.command_id, binding_digest: proof.binding_digest };
      await ownership.execute(input.tenant_id, ref);
      return { data: await ownership.readReceipt(input.tenant_id, ref, input.actor), meta: { correlation_id: input.correlation_id } };
    }),
  ]));
}
