import type { ExchangeIngressBinding, OwnerIngressVerdict } from '@agentic-crm/contracts';
import { ExchangeError, OwnerError, ownerDigest, ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';

export type IngressVerdictReader = (tenant: string, owner: 'crm' | 'connector' | 'identity', input: Record<string, unknown>) => Promise<OwnerIngressVerdict>;
export type IngressDenial = { owner: 'crm' | 'connector' | 'identity'; error_code: 'CONTACT_BINDING_STALE' | 'REVOKED'; input_digest: string; verdict_digest: string };

export function diagnosableIngressError(error: unknown): boolean {
  return (error instanceof OwnerError || error instanceof ExchangeError) && ['FORBIDDEN', 'REVOKED', 'REFERENCE_INVALID', 'STALE_VERSION', 'INVALID_TRANSITION'].includes(error.code);
}

/** Only explicit, correlated business verdicts classify accepted intake. Errors remain unknown. */
export async function diagnoseIngress(binding: ExchangeIngressBinding, subject: string, read: IngressVerdictReader): Promise<IngressDenial | null> {
  const tenant = binding.tenant_id;
  async function check(owner: IngressDenial['owner'], input: Record<string, unknown>) {
    const result = validateOwnerValue<OwnerIngressVerdict>('OwnerIngressVerdict', await read(tenant, owner, input));
    if (result.input_digest !== ownerDigest({ tenant_id: tenant, ...input }) || result.state === 'valid' && result.error_code !== null || result.state === 'denied' && result.error_code !== (owner === 'crm' ? 'CONTACT_BINDING_STALE' : 'REVOKED') ||
      (owner !== 'connector' || result.state === 'denied') && (result.service_actor_id !== null || result.team_id !== null) || owner === 'connector' && result.state === 'valid' && (!result.service_actor_id || !result.team_id)) ownerFail('FORBIDDEN');
    return { result, denial: result.state === 'denied' ? { owner, error_code: result.error_code!, input_digest: result.input_digest, verdict_digest: ownerDigest(result) } : null };
  }
  const contact = await check('crm', { connection_id: binding.connection_id, crm_contact_id: binding.crm_contact_id, crm_identity_id: binding.crm_identity_id, external_subject_digest: ownerDigest(subject), mapping_revision: binding.mapping_revision });
  if (contact.denial) return contact.denial;
  const channel = await check('connector', { connection_id: binding.connection_id, platform: binding.platform });
  if (channel.denial) return channel.denial;
  return (await check('identity', { service_actor_id: channel.result.service_actor_id, team_id: channel.result.team_id })).denial;
}
