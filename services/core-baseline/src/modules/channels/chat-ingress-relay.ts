import { randomUUID } from 'node:crypto';
import type { ExchangeIngressBinding, ExchangeReply } from '@agentic-crm/contracts';
import { registryConfig, remoteRegistryAuthority, required, validateExchangeValue, workloadMaterial, workloadRequest } from '@agentic-crm/workload-transport';
import type { NormalizedInbound } from './normalized.js';
type ExchangeIngressReply = Extract<ExchangeReply, { state: 'received' | 'processed' | 'failed' }>;
type ExchangeCall = (operation: 'ingress-accept' | 'ingress-read', tenant: string, request: Record<string, unknown>) => Promise<unknown>;

/** The legacy bridge retains its delivery receipt; all message effects belong to Chat. */
export class ChannelChatIngressRelay {
  constructor(private readonly exchange: ExchangeCall = ChannelChatIngressRelay.exchange) {}
  private static async exchange(operation: 'ingress-accept' | 'ingress-read', tenant: string, request: Record<string, unknown>) {
    const material = await workloadMaterial('connector');
    const authority = remoteRegistryAuthority(material, await registryConfig());
    const origin = new URL(required(process.env, 'CHAT_OWNER_URL'));
    if (origin.protocol !== (material.localHttp ? 'http:' : 'https:') || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash) throw new Error('CHAT_OWNER_URL_INVALID');
    return workloadRequest(material, authority, {
      url: new URL('/internal/v1/chat-exchange/' + operation, origin), expectedService: 'chat', tenant, data: request,
    });
  }
  async receive(binding: ExchangeIngressBinding, delivery: string, intake: NormalizedInbound): Promise<ExchangeIngressReply> {
    const request = validateExchangeValue<Record<string, unknown>>('ExchangeIngressAccept', {
      schema_version: 1, operation: 'ingress-accept', request_id: delivery, binding,
      source_delivery_id: delivery, intake,
    });
    const accepted = validateExchangeValue<ExchangeIngressReply>('ExchangeIngressReply', await this.exchange('ingress-accept', binding.tenant_id, request));
    if (accepted.request_id !== request.request_id || accepted.state !== 'received') throw new Error('CHAT_INGRESS_REPLY_MISMATCH');
    // Accept always acknowledges "received", including replays after processing.
    // Only the authenticated receipt read can return the durable terminal state.
    const read = validateExchangeValue<Record<string, unknown>>('ExchangeIngressRead', {
      schema_version: 1, operation: 'ingress-read', request_id: randomUUID(), binding, receipt_id: accepted.receipt_id,
    });
    const reply = validateExchangeValue<ExchangeIngressReply>('ExchangeIngressReply', await this.exchange('ingress-read', binding.tenant_id, read));
    if (reply.request_id !== read.request_id || reply.receipt_id !== accepted.receipt_id) throw new Error('CHAT_INGRESS_REPLY_MISMATCH');
    return reply;
  }
}
