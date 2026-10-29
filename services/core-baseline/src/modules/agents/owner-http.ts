import { ownerRoute, type WorkloadRoute } from '@agentic-crm/workload-transport';
import type { OwnerCommandRef } from '@agentic-crm/contracts';
import type { NativeOwnerCapacity } from './owner-capacity.js';

export function routingOwnerRoutes(capacity: NativeOwnerCapacity): Record<string, WorkloadRoute> {
  return Object.fromEntries(['reserve', 'confirm', 'release', 'status'].map(action => [
    '/internal/v1/owners/routing/capacity-' + action,
    ownerRoute('routing', 'capacity-' + action, ['chat'], async request => {
      const { command, session_id: session, reservation_id: id } = request.payload as { command: OwnerCommandRef; session_id: string; reservation_id: string | null };
      if (action === 'reserve') return capacity.reserve(request.tenant_id, command, session, id);
      if (action === 'status') return capacity.status(request.tenant_id, command, session, id);
      return capacity.settle(request.tenant_id, command, session, id, action === 'release');
    }),
  ]));
}
