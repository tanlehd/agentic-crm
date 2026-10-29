import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import type { OwnerRecoveryProof } from '@agentic-crm/contracts';
import { chatConnection } from '../../gateway/chat-connection.js';
import { NativeOwnerCapacity } from './owner-capacity.js';
import { NativeRoutingReconciliation } from './owner-reconciliation.js';
import { NativeHumanDispatcher } from './owner-dispatch.js';
import { NativeRoutingReroute } from './owner-reroute.js';

export function routingJobs(pool: Pool, actors: ReadonlyMap<string, string>) {
  const client = chatConnection('routing');
  const actor = (tenant: string) => { const id = actors.get(tenant); if (!id) throw new Error('ROUTING_ACTOR_NOT_CONFIGURED'); return id; };
  const recover = async (tenant: string, ref: { command_id: string; binding_digest: string }, abort = false) =>
    (await client()).read<OwnerRecoveryProof>(tenant, abort ? 'command-abort' : 'command-proof', { ...ref });
  const capacity = new NativeOwnerCapacity(pool, recover);
  const sync = new NativeRoutingReconciliation(pool, async (tenant, payload) => (await client()).command({
    schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant,
    operation: 'routing-sync-snapshot', command_id: randomUUID(), actor: { kind: 'service', principal_id: actor(tenant), delegation_id: actor(tenant) }, payload,
  }));
  const send = async <T>(request: Parameters<Awaited<ReturnType<typeof client>>['command']>[0]): Promise<T> => (await client()).command<T>(request);
  return { capacity, sync,
    dispatcher: new NativeHumanDispatcher(pool, actor, { proposal: send, dispatch: send, recover }, capacity, sync),
    reroute: new NativeRoutingReroute(pool, { source: send, effect: send, recover }, capacity, sync),
  };
}
