import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerIngressVerdict } from '@agentic-crm/contracts';
import { OwnerError, ownerDigest, ownerFail, ownerRoute, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { OwnerReferenceLedger, ingressReferencePin, type ReferenceInput, type ReferenceProofReader } from '../../kernel/reliability/owner-reference.js';

/** Connection namespace is immutable at revision1; status admission is current on every new reservation. */
export class NativeChannelReferences {
  readonly ledger: OwnerReferenceLedger;
  constructor(pool: Pool, proof: ReferenceProofReader) {
    this.ledger = new OwnerReferenceLedger(pool, 'connector', ['connection'], proof, (_tenant, input, binding) => {
      const pin = ingressReferencePin(binding);
      if (input.resource_id !== pin.connection_id || input.expected_revision !== pin.connection_revision) ownerFail('FORBIDDEN');
    }, async (c, tenant, input, binding) => {
      const row = await this.connection(c, tenant, input.resource_id, !!binding.ingress_channel);
      if (binding.ingress_channel && (binding.ingress_channel.service_actor_id !== row.service_actor_id || binding.actor.principal_id !== row.service_actor_id || binding.ingress_channel.team_id !== row.team_id || binding.ingress_channel.channel_id !== row.channel_id)) ownerFail('STALE_VERSION');
    });
  }
  private async connection(c: PoolConnection, tenant: string, id: string, ingress = false) {
    const [rows] = await c.execute<RowDataPacket[]>("SELECT id,external_account_id,team_id,service_actor_id FROM channel_connection WHERE tenant_id=? AND id=? AND provider='mock_messenger' AND status='active' FOR SHARE", [tenant, id]);
    if (!rows[0]) ownerFail('REFERENCE_INVALID');
    if (ingress && !rows[0].service_actor_id) ownerFail('REFERENCE_INVALID');
    return { connection_id: rows[0].id as string, platform: 'mock_messenger' as const, connection_revision: '1' as const, channel_id: rows[0].external_account_id as string, team_id: rows[0].team_id as string, ...(ingress ? { service_actor_id: rows[0].service_actor_id as string } : {}) };
  }
  read(tenant: string, id: string, ingress = false) { return this.ledger.transaction(tenant, c => this.connection(c, tenant, id, ingress)); }
  catalog(tenant:string,id:string){return this.ledger.transaction(tenant,async c=>{
    const [[row]]=await c.execute<RowDataPacket[]>('SELECT id FROM channel_connection WHERE tenant_id=? AND id=? FOR SHARE',[tenant,id]);if(!row)ownerFail('REFERENCE_INVALID');return {connection_id:String(row.id)};
  });}
  verdict(tenant: string, input: { connection_id: string; platform: 'mock_messenger' }): Promise<OwnerIngressVerdict> {
    return this.ledger.transaction(tenant, async c => {
      const digest = ownerDigest({ tenant_id: tenant, ...input });
      try {
        const row = await this.connection(c, tenant, input.connection_id, true);
        return { input_digest: digest, state: 'valid', error_code: null, service_actor_id: row.service_actor_id!, team_id: row.team_id };
      } catch (error) {
        if (!(error instanceof OwnerError) || error.code !== 'REFERENCE_INVALID') throw error;
        return { input_digest: digest, state: 'denied', error_code: 'REVOKED', service_actor_id: null, team_id: null };
      }
    });
  }
}
export function channelReferenceOwnerRoutes(channels: NativeChannelReferences): Record<string, WorkloadRoute> {
  return {
    '/internal/v1/owners/connector/catalog-connection-read': ownerRoute('connector','catalog-connection-read',['chat'],r=>channels.catalog(r.tenant_id,r.payload.connection_id as string)),
    '/internal/v1/owners/connector/ingress-verdict': ownerRoute('connector', 'ingress-verdict', ['chat'], r => channels.verdict(r.tenant_id, r.payload as { connection_id: string; platform: 'mock_messenger' })),
    '/internal/v1/owners/connector/connection-binding-read': ownerRoute('connector', 'connection-binding-read', ['chat'], r => channels.read(r.tenant_id, r.payload.connection_id as string)),
    '/internal/v1/owners/connector/connection-ingress-read': ownerRoute('connector', 'connection-ingress-read', ['chat'], r => channels.read(r.tenant_id, r.payload.connection_id as string, true)),
    ...Object.fromEntries(['reference-reserve', 'reference-status', 'reference-release'].map(operation => ['/internal/v1/owners/connector/' + operation,
      ownerRoute('connector', operation, ['chat'], r => channels.ledger.reference(r.tenant_id, operation, r.payload as ReferenceInput))])),
  };
}
