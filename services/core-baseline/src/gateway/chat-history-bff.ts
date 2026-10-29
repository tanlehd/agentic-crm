import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { OwnerError, OwnerDomainError, validateOwnerValue, type OwnerCommandRequest } from '@agentic-crm/workload-transport';
import type { NativeAuthService } from '../modules/identity/auth/native-service.js';
import type { HumanDispatchEnrollment } from '../modules/identity/dispatch-enrollment.js';
import { AuthError, hash } from '../modules/identity/auth/security.js';
import { CommandError } from '../kernel/reliability/commands.js';

const routes: Record<string, string> = {
  collection: 'conversation-get-conversations',
  channels: 'conversation-channels',
  detail: 'conversation-get-conversations-id',
  notes: 'conversation-get-conversations-id-notes',
  activity: 'workspace-get-activity',
  messages: 'conversation-get-conversations-id-messages',
  'message-envelopes': 'conversation-get-conversations-id-message-envelopes',
  'message-envelopes-v3': 'conversation-get-conversations-id-message-envelopes-v3',
  'outbound-intents': 'conversation-get-conversations-id-outbound-intents-intentId',
  'acquisition-sessions': 'conversation-get-conversations-id-acquisition-sessions',
};
export class ChatHistoryBff {
  constructor(private readonly auth: NativeAuthService, private readonly identity: HumanDispatchEnrollment,
    private readonly send: (input: OwnerCommandRequest) => Promise<unknown>) {}
  async read(session: string | undefined, tenant: string, operation: string, payload: Record<string, unknown>, correlation: string) {
    await this.auth.session(session, true);
    if (!Object.values(routes).includes(operation)) throw new CommandError(404, 'NOT_FOUND');
    const placeholder = randomUUID();
    const request = validateOwnerValue<OwnerCommandRequest>('Request_chat-' + operation, {
      schema_version: 1, request_id: randomUUID(), tenant_id: tenant, correlation_id: correlation, operation,
      actor: { kind: 'human', principal_id: placeholder, delegation_id: placeholder }, command_id: randomUUID(), payload,
    });
    const enrollment = await this.identity.enroll(tenant, hash(session!));
    request.actor = { kind: 'human', principal_id: enrollment.principalId, delegation_id: enrollment.delegationId };
    return validateOwnerValue<{ result: unknown }>('Reply_chat-' + operation, {
      schema_version: 1, request_id: request.request_id, tenant_id: tenant, result: await this.send(request),
    }).result;
  }
}

/** Explicit candidate listener; production routing remains unchanged until cutover. */
export function createChatHistoryBff(adapter: ChatHistoryBff) {
  return createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
    const correlation = randomUUID();
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url ?? '', 'http://candidate.invalid');
      const collection=url.pathname==='/api/v1/conversations'?'collection':url.pathname==='/api/v1/conversation-channels'?'channels':null;
      const match = /^\/api\/v1\/conversations\/([0-9a-f-]{36})(?:\/(activity|notes|messages|message-envelopes|message-envelopes-v3|outbound-intents|acquisition-sessions)(?:\/([0-9a-f-]{36}))?)?$/.exec(url.pathname);
      if (req.method !== 'GET' || !match&&!collection || match&&(match[2] === 'outbound-intents') !== Boolean(match[3])) throw new CommandError(404, 'NOT_FOUND');
      const tenant = req.headers['x-tenant-id'];
      if (typeof tenant !== 'string' || req.headers['transfer-encoding'] !== undefined || req.headers['content-length'] !== undefined && req.headers['content-length'] !== '0') throw new CommandError(400, 'INVALID_REQUEST');
      const allowed = collection==='collection'?['limit','cursor','state','owner','team','channel','channel_id','page_id']:collection==='channels'?['limit','cursor']:match![2]==='activity'?['limit','before','after']:!match![2] || match![2] === 'outbound-intents' ? [] : ['limit', match![2] === 'acquisition-sessions' ? 'before_sequence' : 'cursor'];
      const payload: Record<string, unknown> = match?{ id: match[1], ...(match[3] ? { intentId: match[3] } : {}) }:{};
      for (const [key, value] of url.searchParams) {
        if (!allowed.includes(key) || Object.hasOwn(payload, key) || key === 'limit' && !/^[1-9][0-9]{0,2}$/.test(value)) throw new CommandError(400, 'INVALID_REQUEST');
        payload[key] = key === 'limit' && match?.[2]!=='activity' ? Number(value) : value;
      }
      const cookies = (req.headers.cookie ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith('crm_session='));
      const session = cookies.length === 1 ? cookies[0]!.slice('crm_session='.length) : undefined;
      res.end(JSON.stringify(await adapter.read(session, tenant, routes[collection??match![2]??'detail']!, payload, correlation)));
    } catch (error) {
      const failure = error instanceof AuthError || error instanceof CommandError || error instanceof OwnerError || error instanceof OwnerDomainError ? error : new CommandError(503, 'TEMPORARILY_UNAVAILABLE');
      res.statusCode = failure.status;
      res.end(JSON.stringify({ error: { code: failure.code, message: 'Không thể tải lịch sử hội thoại.', fields: [], retryable: failure.status === 503 }, meta: { correlation_id: correlation } }));
    }
  });
}
