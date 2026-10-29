import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { OwnerCommandRef, OwnerRecoveryProof } from '@agentic-crm/contracts';
import { ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import type { NativeRoutingConfiguration } from './owner-config.js';
import type { NativeRoutingViewStorage } from './owner-view-storage.js';

/** Select the persisted operation, never let a config abort mutate another job. */
export function routingRecoveryRoutes(pool: Pool, configuration: NativeRoutingConfiguration,
  view: NativeRoutingViewStorage): Record<string, WorkloadRoute> {
  const proof = async (tenant: string, input: unknown, abort: boolean): Promise<OwnerRecoveryProof> => {
    const ref = validateOwnerValue<OwnerCommandRef>('OwnerCommandRef', input);
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT operation,binding_digest FROM routing_owner_command WHERE tenant_id=? AND command_id=?', [tenant, ref.command_id]);
    const row = rows[0];
    if (row && row.binding_digest !== ref.binding_digest) ownerFail('CONFLICT');
    if (row?.operation === 'view') return view.proof(tenant, ref, abort);
    if (row && row.operation !== null && row.operation !== 'configuration') ownerFail('FORBIDDEN');
    return configuration.proof(tenant, ref, abort);
  };
  return Object.fromEntries(['command-proof', 'command-abort'].map(operation => [
    '/internal/v1/owners/routing/' + operation,
    ownerRoute('routing', operation, ['identity'], request => proof(request.tenant_id, request.payload, operation === 'command-abort')),
  ]));
}
