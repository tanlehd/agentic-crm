import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { ownerCanonical, validateOwnerValue, strictJson, OWNER_BODY_LIMIT, OwnerError, type OwnerCommandRequest } from '@agentic-crm/workload-transport';
import { CommandError } from '../../kernel/reliability/commands.js';
import { hash, AuthError } from '../identity/auth/security.js';
import type { NativeAuthService } from '../identity/auth/native-service.js';
import type { HumanDispatchEnrollment } from '../identity/dispatch-enrollment.js';

type PublicAssignment = { data: { id: string; tenant_id: string; object_key: string; version: string; owner_revision: string; owner_principal_id: string | null; team_id: string | null }; meta: { correlation_id: string } };
type PublicInput = { session: string | undefined; origin: unknown; csrf: unknown; tenant: string; id: string; takeover: boolean; body: unknown; key: unknown; version: string | undefined; correlation: string };

/** Candidate BFF application adapter. Only Identity's native port sees the session verifier. */
export class ChatOwnershipBff {
  constructor(private readonly auth: NativeAuthService, private readonly identity: HumanDispatchEnrollment,
    private readonly send: (request: OwnerCommandRequest) => Promise<unknown>) {}

  async history(session: string | undefined, tenant: string, id: string, correlation: string) {
    return this.read(session,tenant,'routing-history',{id},correlation);
  }
  async directory(session:string|undefined,tenant:string,id:string,teams:boolean,team:string|undefined,correlation:string){
    return this.read(session,tenant,teams?'conversation-classification-get-records-id-assignment-teams':'routing-targets',{id,...(team!==undefined?{team_id:team}:{})},correlation);
  }
  private async read(session:string|undefined,tenant:string,operation:string,payload:Record<string,unknown>,correlation:string){
    await this.auth.session(session, true);
    const placeholder = randomUUID();
    const request = validateOwnerValue<OwnerCommandRequest>('Request_chat-'+operation, {
      schema_version: 1, request_id: randomUUID(), correlation_id: correlation, tenant_id: tenant, operation,
      actor: { kind: 'human', principal_id: placeholder, delegation_id: placeholder }, command_id: randomUUID(), payload,
    });
    const enrollment = await this.identity.enroll(tenant, hash(session!));
    request.actor = { kind: 'human', principal_id: enrollment.principalId, delegation_id: enrollment.delegationId };
    const response = validateOwnerValue<{ result: unknown }>('Reply_chat-'+operation, {
      schema_version: 1, request_id: request.request_id, tenant_id: tenant, result: await this.send(request),
    });
    return response.result;
  }

  async mutate(input: PublicInput): Promise<{ status: 200; body: PublicAssignment }> {
    await this.auth.requireMutation(input.session, input.origin, input.csrf);
    if (typeof input.key !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(input.key)) throw new CommandError(400, 'INVALID_REQUEST');
    if (input.version === undefined) throw new CommandError(428, 'PRECONDITION_REQUIRED');
    const operation = input.takeover ? 'routing-takeover' : 'routing-assignment';
    // Validate the public DTO and IDs before creating a delegation row.
    const placeholder = randomUUID();
    const request = validateOwnerValue<OwnerCommandRequest>('Request_chat-' + operation, {
      schema_version: 1, request_id: randomUUID(), correlation_id: input.correlation, tenant_id: input.tenant, operation,
      actor: { kind: 'human', principal_id: placeholder, delegation_id: placeholder }, command_id: placeholder,
      payload: { id: input.id, body: input.body, expected_version: input.version, idempotency_key: input.key },
    });
    const enrollment = await this.identity.enroll(input.tenant, hash(input.session!));
    const route = `POST /api/v1/${input.takeover ? 'conversations' : 'records'}/${input.id}/${input.takeover ? 'takeover' : 'assignment'}`;
    const digest = createHash('sha256').update(ownerCanonical({ tenant: input.tenant, principal: enrollment.principalId, route, key: input.key })).digest('hex');
    request.command_id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    request.actor = { kind: 'human', principal_id: enrollment.principalId, delegation_id: enrollment.delegationId };
    const body = validateOwnerValue<{ result: PublicAssignment }>('Reply_chat-' + operation, {
      schema_version: 1, request_id: request.request_id, tenant_id: request.tenant_id, result: await this.send(request),
    });
    return { status: 200, body: body.result };
  }
}

/** Explicitly constructed candidate listener; importing this module never binds a port. */
export function createChatOwnershipBff(adapter: ChatOwnershipBff) {
  return createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
    const correlation = randomUUID();
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const cookies = (req.headers.cookie ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith('crm_session='));
      const session = cookies.length === 1 ? cookies[0]!.slice('crm_session='.length) : undefined;
      const url=new URL(req.url??'','http://localhost'),directoryPath=/^\/api\/v1\/records\/([0-9a-f-]{36})\/assignment-(targets|teams)$/.exec(url.pathname);
      if(req.method==='GET'&&directoryPath){
        const tenant=req.headers['x-tenant-id'],teams=directoryPath[2]==='teams';
        if(typeof tenant!=='string'||[...url.searchParams.keys()].some(k=>teams||k!=='team_id')||url.searchParams.getAll('team_id').length>1||req.headers['transfer-encoding']!==undefined||req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')throw new CommandError(400,'INVALID_REQUEST');
        res.end(JSON.stringify(await adapter.directory(session,tenant,directoryPath[1]!,teams,url.searchParams.get('team_id')??undefined,correlation)));return;
      }
      const historyPath = /^\/api\/v1\/records\/([0-9a-f-]{36})\/ownership-history$/.exec((req.url ?? '').split('?')[0]!);
      if (req.method === 'GET' && historyPath) {
        const tenant = req.headers['x-tenant-id'];
        if (typeof tenant !== 'string' || (req.url ?? '').includes('?') || req.headers['transfer-encoding'] !== undefined || req.headers['content-length'] !== undefined && req.headers['content-length'] !== '0') throw new CommandError(400, 'INVALID_REQUEST');
        res.end(JSON.stringify(await adapter.history(session, tenant, historyPath[1]!, correlation))); return;
      }
      const match = /^\/api\/v1\/(records|conversations)\/([0-9a-f-]{36})\/(assignment|takeover)$/.exec(req.url ?? '');
      if (req.method !== 'POST' || !match || (match[1] === 'records') !== (match[3] === 'assignment')) throw new CommandError(404, 'NOT_FOUND');
      const version = req.headers['if-match'], tenant = req.headers['x-tenant-id'];
      if (typeof tenant !== 'string' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '') ||
          version !== undefined && (typeof version !== 'string' || !/^"[1-9][0-9]{0,19}"$/.test(version))) throw new CommandError(400, 'INVALID_REQUEST');
      const parts: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk); size += bytes.length;
        if (size > OWNER_BODY_LIMIT) throw new CommandError(413, 'PAYLOAD_TOO_LARGE'); parts.push(bytes);
      }
      let body: unknown;
      try { body = strictJson(Buffer.concat(parts)); } catch { throw new CommandError(400, 'INVALID_REQUEST'); }
      const result = await adapter.mutate({ session,
        origin: req.headers.origin, csrf: req.headers['x-csrf-token'], tenant, id: match[2]!, takeover: match[3] === 'takeover', body,
        key: req.headers['idempotency-key'], version: typeof version === 'string' ? version.slice(1, -1) : undefined, correlation });
      res.statusCode = result.status; res.setHeader('ETag', `"${result.body.data.version}"`); res.end(JSON.stringify(result.body));
    } catch (error) {
      const failure = error instanceof AuthError || error instanceof CommandError || error instanceof OwnerError ? error : new CommandError(503, 'TEMPORARILY_UNAVAILABLE');
      res.statusCode = failure.status; res.end(JSON.stringify({ error: { code: failure.code, message: 'Không thể hoàn tất yêu cầu.', fields: [], retryable: failure.status === 503 }, meta: { correlation_id: correlation } }));
    }
  });
}
