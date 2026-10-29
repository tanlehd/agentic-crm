import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Ajv } from 'ajv';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { messageContentSchema, type MessageContent, type OwnerAdmission, type OwnerCommandBinding, type OwnerCommandRef, type OwnerResource } from '@agentic-crm/contracts';
import { ownerCanonical, ownerCounter, ownerDigest, ownerFail, ownerRoute, OwnerDomainError, validateOwnerValue, type OwnerCommandRequest, type WorkloadRoute } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';

export const historyOperations = {
  messages: 'conversation-get-conversations-id-messages',
  envelopes: 'conversation-get-conversations-id-message-envelopes',
  rich: 'conversation-get-conversations-id-message-envelopes-v3',
  intent: 'conversation-get-conversations-id-outbound-intents-intentId',
  sessions: 'conversation-get-conversations-id-acquisition-sessions',
} as const;
export type HistoryPeers = {
  admit(tenant: string, command: OwnerCommandRef): Promise<OwnerAdmission>;
  settle(tenant: string, command: OwnerCommandRef, admission: string): Promise<unknown>;
  subject(tenant: string, command: OwnerCommandRef, admission: string): Promise<{ account_id: string }>;
  platform(tenant: string, connection: string): Promise<{ connection_id: string; platform: 'mock_messenger' }>;
};
type Position = { time: string; id: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const contentValidator = new Ajv({ strict: true }).compile<MessageContent>(messageContentSchema);
const stamp = (v: unknown): string | null => v === null ? null : new Date(String(v).replace(' ', 'T').replace(/Z?$/, 'Z')).toISOString();

/** Historical public cursor format, including the account binding and microseconds. */
export class ChatTimelineCursor {
  private readonly key: Buffer;
  constructor(key: string | Buffer) { this.key = Buffer.from(key); if (this.key.length < 32) throw new Error('CHAT_RETAINED_CURSOR_KEY_REQUIRED'); }
  private binding(account: string, tenant: string, id: string) { return { account, tenant, id, state: null, owner: null, team: null }; }
  decode(cursor: unknown, account: string, tenant: string, id: string, correlation: string): Position | undefined {
    if (cursor === undefined) return undefined;
    try {
      if (typeof cursor !== 'string' || cursor.length > 4096) throw new Error();
      const [payload, signature, ...rest] = cursor.split('.');
      if (!payload || !signature || rest.length) throw new Error();
      const expected = createHmac('sha256', this.key).update(payload).digest('base64url');
      if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error();
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (ownerCanonical(parsed.binding) !== ownerCanonical(this.binding(account, tenant, id)) || !uuid.test(parsed.position.id) ||
          !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(parsed.position.time)) throw new Error();
      return parsed.position as Position;
    } catch { throw new OwnerDomainError('INVALID_CURSOR', correlation); }
  }
  encode(position: Position, account: string, tenant: string, id: string) {
    const payload = Buffer.from(JSON.stringify({ binding: this.binding(account, tenant, id), position })).toString('base64url');
    return payload + '.' + createHmac('sha256', this.key).update(payload).digest('base64url');
  }
}

/** Read data lives only in memory; the durable command stores its request and terminal proof. */
export class ChatHistory {
  private readonly cursor: ChatTimelineCursor;
  constructor(private readonly commands: ChatOwnerCommands, private readonly peers: HistoryPeers, retainedCursorKey: string | Buffer) {
    this.cursor = new ChatTimelineCursor(retainedCursorKey);
  }
  private async snapshot(c: PoolConnection, tenant: string, id: string) {
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,h.control_revision,v.connection_id
      FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id
      JOIN chat_control_head h ON h.tenant_id=r.tenant_id AND h.conversation_id=r.id WHERE r.tenant_id=? AND r.id=? FOR UPDATE`, [tenant, id]);
    const r = rows[0]; if (!r || r.archived_at !== null) ownerFail('NOT_FOUND');
    const [teams] = await c.execute<RowDataPacket[]>('SELECT team_id FROM record_team_access WHERE tenant_id=? AND record_id=? ORDER BY team_id FOR UPDATE', [tenant, id]);
    const resource: OwnerResource = { resource_id: id, object_key: 'conversation', record_version: String(r.version), owner_revision: String(r.owner_revision),
      control_revision: String(r.control_revision), owner_principal_id: r.owner_principal_id, team_id: r.team_id, shared_team_ids: teams.map(t => String(t.team_id)), archived: false };
    return { resource, connection: String(r.connection_id) };
  }
  async read(raw: OwnerCommandRequest) {
    if (!(Object.values(historyOperations) as string[]).includes(raw.operation)) ownerFail('INVALID_REQUEST');
    const input = validateOwnerValue<OwnerCommandRequest>('Request_chat-' + raw.operation, raw);
    if (input.actor.kind !== 'human') ownerFail('FORBIDDEN');
    const tenant = input.tenant_id, id = input.payload.id as string, operation = input.operation;
    const timeline = ![historyOperations.intent, historyOperations.sessions].includes(operation as typeof historyOperations.intent);
    const fields = timeline ? ['text'] : operation === historyOperations.sessions ? ['attribution', 'channel', 'channel_id', 'contact_id', 'page_id'] : [];
    const snapshot = await this.commands.transaction(tenant, c => this.snapshot(c, tenant, id));
    const command = randomUUID(), request = { payload: input.payload, request_command_id: input.command_id };
    const binding: OwnerCommandBinding = { tenant_id: tenant, command_id: command, owner: 'chat', operation, actor: input.actor, resource: snapshot.resource,
      target: null, session_id: null, fields, payload_digest: ownerDigest(request), legacy_receipt_key: 'history:' + command, graph: null, dependencies: [] };
    const prepared = await this.commands.prepare(binding, request), ref = { command_id: command, binding_digest: prepared.binding_digest };
    let admission: OwnerAdmission | undefined;
    try {
      admission = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await this.peers.admit(tenant, ref));
      if (admission.command_id !== command || admission.binding_digest !== ref.binding_digest || admission.state !== 'admitted' ||
          admission.allowed_fields.some(f => !fields.includes(f)) || !timeline && admission.allowed_fields.length !== fields.length) ownerFail('FORBIDDEN');
      await this.commands.rememberDependency(tenant, ref, 'identity-admission', admission);
      const subject = timeline ? await this.peers.subject(tenant, ref, admission.admission_id) : null;
      if (subject && !uuid.test(subject.account_id)) ownerFail('FORBIDDEN');
      const position = timeline ? this.cursor.decode(input.payload.cursor, subject!.account_id, tenant, id, input.correlation_id) : undefined;
      const platform = [historyOperations.envelopes, historyOperations.rich].includes(operation as typeof historyOperations.rich) ? await this.peers.platform(tenant, snapshot.connection) : null;
      if (platform && (platform.connection_id !== snapshot.connection || platform.platform !== 'mock_messenger')) ownerFail('FORBIDDEN');
      const allowed = admission.allowed_fields.includes('text');
      let result: Record<string, unknown> | undefined;
      await this.commands.commit(tenant, ref, admission.admission_id, async c => {
        if (ownerCanonical(await this.snapshot(c, tenant, id)) !== ownerCanonical(snapshot)) ownerFail('STALE_VERSION');
        if (timeline) result = await this.timeline(c, tenant, id, snapshot.connection, input, subject!.account_id, position, allowed, platform?.platform);
        else if (operation === historyOperations.intent) result = await this.intent(c, tenant, id, input.payload.intentId as string);
        else result = await this.sessions(c, tenant, id, input.payload);
        // Validate before committing or returning any rows.
        validateOwnerValue('Reply_chat-' + operation, { schema_version: 1, request_id: input.request_id, tenant_id: tenant,
          result: { ...result, meta: { correlation_id: input.correlation_id } } });
        return { effect_id: id, effect_revision: snapshot.resource.record_version };
      });
      if (!result) ownerFail('DEPENDENCY_UNAVAILABLE');
      await this.peers.settle(tenant, ref, admission.admission_id);
      return { ...result, meta: { correlation_id: input.correlation_id } };
    } catch (error) {
      try { await this.commands.abort(tenant, ref); if (admission) await this.peers.settle(tenant, ref, admission.admission_id); } catch { /* Native Identity drain resolves retained proof on recovery. */ }
      throw error;
    }
  }
  private async timeline(c: PoolConnection, tenant: string, id: string, connection: string, input: OwnerCommandRequest,
    account: string, position: Position | undefined, textAllowed: boolean, platform: 'mock_messenger' | undefined) {
    const limit = input.payload.limit === undefined ? 50 : Number(input.payload.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) ownerFail('INVALID_REQUEST');
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT m.id,m.conversation_id,m.direction,${textAllowed ? 'm.text,' : ''}m.status,m.provider_message_id,m.outbound_intent_id,
      m.occurred_at,m.received_at,DATE_FORMAT(m.received_at,'%Y-%m-%d %H:%i:%s.%f') position_time
      FROM message m WHERE m.tenant_id=? AND m.conversation_id=? ${position ? 'AND (m.received_at>? OR (m.received_at=? AND m.id>?))' : ''}
      ORDER BY m.received_at,m.id LIMIT ${limit + 1}`, [tenant, id, ...(position ? [position.time, position.time, position.id] : [])]);
    const page = rows.slice(0, limit), contents = new Map<string, MessageContent>();
    if (input.operation === historyOperations.rich && page.length) {
      const [stored] = await c.execute<RowDataPacket[]>(`SELECT message_id,content FROM message_content WHERE tenant_id=? AND message_id IN (${page.map(() => '?').join(',')})`, [tenant, ...page.map(r => r.id)]);
      for (const row of stored) {
        const value: unknown = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        if (!contentValidator(value)) ownerFail('DEPENDENCY_UNAVAILABLE');
        contents.set(row.message_id, value);
      }
    }
    const replyIds = textAllowed ? [...new Set([...contents.values()].flatMap(content => content.reply_to ? [content.reply_to.external_msg_id] : []))] : [];
    const replies = new Map<string, string>();
    if (replyIds.length) {
      const [targets] = await c.execute<RowDataPacket[]>(`SELECT id,provider_message_id FROM message WHERE tenant_id=? AND connection_id=? AND conversation_id=? AND provider_message_id IN (${replyIds.map(() => '?').join(',')})`, [tenant, connection, id, ...replyIds]);
      for (const target of targets) replies.set(target.provider_message_id, target.id);
    }
    const data = [];
    for (const row of page) {
      const { position_time: _time, ...wire } = row;
      const base: Record<string, unknown> = { ...wire, occurred_at: stamp(row.occurred_at), received_at: stamp(row.received_at) };
      if (input.operation === historyOperations.messages) { data.push(base); continue; }
      const content = contents.get(row.id);
      const { provider_message_id, ...message } = base;
      const envelope: Record<string, unknown> = { ...message, schema_version: input.operation === historyOperations.rich ? 3 : 2,
        connection_id: connection, platform, message_type: content?.message_type ?? 'text', external_msg_id: provider_message_id,
        ...(input.operation === historyOperations.rich ? { text_source: content && content.message_type !== 'text' ? content.text_source ?? 'preview' : 'original' } : {}) };
      if (textAllowed) {
        let reply = null;
        if (content?.reply_to) {
          const target = replies.get(content.reply_to.external_msg_id);
          reply = { external_msg_id: content.reply_to.external_msg_id, internal_message_id: target && target !== row.id ? target : null };
        }
        Object.assign(envelope, { reply_to: reply, attachment: content?.attachment ?? null });
      }
      data.push(envelope);
    }
    const last = rows[limit - 1];
    return { data, next_cursor: rows.length > limit && last ? this.cursor.encode({ time: last.position_time, id: last.id }, account, tenant, id) : null };
  }
  private async intent(c: PoolConnection, tenant: string, id: string, intent: string) {
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT i.id,i.conversation_id,m.id message_id,i.status,i.provider_message_id,i.error_code FROM outbound_intent i
      JOIN message m ON m.tenant_id=i.tenant_id AND m.outbound_intent_id=i.id AND m.conversation_id=i.conversation_id
      WHERE i.tenant_id=? AND i.conversation_id=? AND i.id=?`, [tenant, id, intent]);
    const row = rows[0]; if (!row) ownerFail('NOT_FOUND');
    return { data: { ...row, status: row.status.startsWith('remote_') ? row.status.slice(7) : row.status } };
  }
  private async sessions(c: PoolConnection, tenant: string, id: string, query: Record<string, unknown>) {
    const limit = query.limit === undefined ? 50 : Number(query.limit), before = query.before_sequence;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) ownerFail('INVALID_REQUEST');
    const beforeSequence = before === undefined ? undefined : ownerCounter(before, true);
    const [rows] = await c.execute<RowDataPacket[]>(`SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=?
      ${beforeSequence ? 'AND sequence<?' : ''} ORDER BY sequence DESC LIMIT ${limit + 1}`, [tenant, id, ...(beforeSequence ? [beforeSequence] : [])]);
    return { data: rows.slice(0, limit).map(r => {
      const { tenant_id: _tenant, active_conversation_key: _active, ...row } = r;
      return { ...row, sequence: String(r.sequence), version: String(r.version), opened_at: stamp(r.opened_at), opening_occurred_at: stamp(r.opening_occurred_at), closed_at: stamp(r.closed_at) };
    }), next_before_sequence: rows.length > limit ? String(rows[limit - 1]!.sequence) : null };
  }
}
export function chatHistoryRoutes(history: ChatHistory): Record<string, WorkloadRoute> {
  return Object.fromEntries(Object.values(historyOperations).map(operation => ['/internal/v1/owners/chat/' + operation,
    ownerRoute('chat', operation, ['bff'], request => history.read(request as OwnerCommandRequest))]));
}
