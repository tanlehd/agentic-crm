import { randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { OwnerContactBinding, OwnerCommandBinding, OwnerIngressVerdict } from '@agentic-crm/contracts';
import { OwnerError, ownerCounter, ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { OwnerReferenceLedger, ingressReferencePin, type ReferenceInput, type ReferenceProofReader } from '../../kernel/reliability/owner-reference.js';
import type { NativeCrmOwnerMetadata } from './owner-metadata.js';

type ContactInput = { connection_id: string; crm_contact_id: string; crm_identity_id: string; external_subject_id: string };
type VerdictInput = Omit<ContactInput, 'external_subject_id'> & { external_subject_digest: string; mapping_revision: '1' };

/** Canonical CRM SQL only. Never creates a replacement Contact for an unverified binding. */
export class NativeCrmContactReferences {
  readonly ledger: OwnerReferenceLedger;
  constructor(pool: Pool, proof: ReferenceProofReader) {
    this.ledger = new OwnerReferenceLedger(pool, 'crm', ['contact', 'mapping'], proof, (_tenant, input, binding) => {
      const pin = ingressReferencePin(binding);
      if (input.resource_id !== (input.kind === 'contact' ? pin.crm_contact_id : pin.crm_identity_id) ||
          input.expected_revision !== (input.kind === 'contact' ? pin.contact_revision : pin.mapping_revision)) ownerFail('FORBIDDEN');
    }, (c, tenant, input, binding) => this.live(c, tenant, input, binding));
  }
  private async canonical(c: PoolConnection, tenant: string, pin: { connection_id: string; crm_contact_id: string; crm_identity_id: string }) {
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT i.external_subject_id,r.version FROM contact_identity i
      JOIN contact ct ON ct.tenant_id=i.tenant_id AND ct.record_id=i.contact_id
      JOIN crm_record r ON r.tenant_id=ct.tenant_id AND r.id=ct.record_id
      JOIN object_type ot ON ot.tenant_id=r.tenant_id AND ot.id=r.object_type_id
      WHERE i.tenant_id=? AND i.id=? AND i.contact_id=? AND i.connection_id=? AND r.archived_at IS NULL AND ot.archived_at IS NULL AND ot.key='contact' FOR SHARE`,
    [tenant, pin.crm_identity_id, pin.crm_contact_id, pin.connection_id]);
    if (!rows[0]) ownerFail('REFERENCE_INVALID'); return rows[0];
  }
  async read(tenant: string, raw: ContactInput): Promise<OwnerContactBinding> {
    const input = validateOwnerValue<{ payload: ContactInput }>('Request_crm-contact-binding-read', { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: 'contact-binding-read', payload: raw }).payload;
    if (!input.external_subject_id.trim() || /[\u0000-\u001f\u007f]/.test(input.external_subject_id)) ownerFail('INVALID_REQUEST');
    return this.ledger.transaction(tenant, async c => {
      const row = await this.canonical(c, tenant, input);
      if (row.external_subject_id !== input.external_subject_id) ownerFail('REFERENCE_INVALID');
      return { connection_id: input.connection_id, crm_contact_id: input.crm_contact_id, crm_identity_id: input.crm_identity_id,
        external_subject_digest: ownerDigest(input.external_subject_id), mapping_revision: '1', contact_revision: ownerCounter(String(row.version), true) };
    });
  }
  /** Explicit business verdict; transport/SQL errors remain errors, never permanent denials. */
  async verdict(tenant: string, input: VerdictInput): Promise<OwnerIngressVerdict> {
    return this.ledger.transaction(tenant, async c => {
      let valid = false;
      try { const row = await this.canonical(c, tenant, input); valid = input.mapping_revision === '1' && ownerDigest(row.external_subject_id) === input.external_subject_digest; }
      catch (error) { if (!(error instanceof OwnerError) || error.code !== 'REFERENCE_INVALID') throw error; }
      return { input_digest: ownerDigest({ tenant_id: tenant, ...input }), state: valid ? 'valid' : 'denied', error_code: valid ? null : 'CONTACT_BINDING_STALE', service_actor_id: null, team_id: null };
    });
  }
  private async live(c: PoolConnection, tenant: string, _input: ReferenceInput, binding: OwnerCommandBinding) {
    const pin = ingressReferencePin(binding);
    // A mapping is not a way around its Contact closing fence. The future coordinator must hold both.
    if (_input.kind === 'mapping') {
      await c.execute("INSERT INTO crm_reference_gate(tenant_id,resource_kind,resource_id,resource_revision,state,version,created_at,updated_at) VALUES (?,'contact',?,?,'open',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE resource_id=resource_id", [tenant, pin.crm_contact_id, pin.contact_revision]);
      const [gates] = await c.execute<RowDataPacket[]>("SELECT state FROM crm_reference_gate WHERE tenant_id=? AND resource_kind='contact' AND resource_id=? FOR SHARE", [tenant, pin.crm_contact_id]);
      if (gates[0]?.state !== 'open') ownerFail('INVALID_TRANSITION');
    }
    const row = await this.canonical(c, tenant, pin);
    if (ownerDigest(row.external_subject_id) !== pin.external_subject_digest) ownerFail('REFERENCE_INVALID');
    if (ownerCounter(String(row.version), true) !== pin.contact_revision) ownerFail('STALE_VERSION');
  }
}

/** Optional metadata routing avoids two adapters overwriting the same reference endpoint. */
export function crmContactOwnerRoutes(contacts: NativeCrmContactReferences, metadata?: NativeCrmOwnerMetadata): Record<string, WorkloadRoute> {
  return {
    '/internal/v1/owners/crm/ingress-verdict': ownerRoute('crm', 'ingress-verdict', ['chat'], r => contacts.verdict(r.tenant_id, r.payload as VerdictInput)),
    '/internal/v1/owners/crm/contact-binding-read': ownerRoute('crm', 'contact-binding-read', ['chat'], r => contacts.read(r.tenant_id, r.payload as ContactInput)),
    ...Object.fromEntries(['reference-reserve', 'reference-status', 'reference-release'].map(operation => ['/internal/v1/owners/crm/' + operation,
      ownerRoute('crm', operation, ['chat'], r => {
        const input = r.payload as ReferenceInput;
        if (input.kind === 'metadata' && metadata) return metadata.reference(r.tenant_id, operation, input as ReferenceInput & { kind: 'metadata' });
        return contacts.ledger.reference(r.tenant_id, operation, input);
      })])),
  };
}
