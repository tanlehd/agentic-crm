import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { NativeAuthService } from '../modules/identity/auth/native-service.js';
import type { HumanDispatchEnrollment } from '../modules/identity/dispatch-enrollment.js';
import type { OwnerCommandRequest } from '@agentic-crm/workload-transport';
import { ChatHistoryBff, createChatHistoryBff } from './chat-history-bff.js';
import { ChatOutboundBff, createChatOutboundBff } from './chat-outbound-bff.js';
import { createChatWorkspaceBff } from './chat-workspace-bff.js';
import { createChatCatalogBff } from './chat-catalog-bff.js';
import { createChatSessionProgressBff } from './chat-session-progress-bff.js';
import { createChatTransitionBff } from './chat-transition-bff.js';
import { createChatNotesBff } from './chat-notes-bff.js';
import { createChatRecordBff } from './chat-record-bff.js';
import { ChatOwnershipBff, createChatOwnershipBff } from '../modules/agents/owner-bff.js';
import { cookie } from '../modules/identity/auth/http.js';
import { AuthError } from '../modules/identity/auth/security.js';
import { CommandError } from '../kernel/reliability/commands.js';

export type ChatPublicRoute = 'history' | 'outbound' | 'workspace' | 'catalog' | 'session' | 'transition' | 'notes' | 'records' | 'ownership';
const id = '[0-9a-f-]{36}';

/** Select a reviewed facade. Unknown Chat routes must never reach legacy SQL. */
export function chatPublicRoute(method: string, pathname: string): ChatPublicRoute | 'not-found' | null {
  if (new RegExp(`^/api/v1/records/${id}/(assignment|assignment-targets|assignment-teams|ownership-history)$`).test(pathname)
    || new RegExp(`^/api/v1/conversations/${id}/takeover$`).test(pathname)) return 'ownership';
  if (pathname.startsWith('/api/v1/objects/conversation/records')) return 'records';
  if (pathname === '/api/v1/session-process' || pathname === '/api/v1/session-funnel'
    || new RegExp(`^/api/v1/conversations/${id}/sessions/`).test(pathname)) return 'session';
  if (pathname.startsWith('/api/v1/chat-workspace/')) {
    if (new RegExp(`^/api/v1/chat-workspace/conversations/${id}/activity$`).test(pathname)) return 'history';
    return new RegExp(`^/api/v1/chat-workspace/conversations/${id}/`).test(pathname) ? 'workspace' : 'catalog';
  }
  if (pathname === '/api/v1/conversation-channels') return 'history';
  if (pathname === '/api/v1/conversations' || pathname.startsWith('/api/v1/conversations/')) {
    if (method === 'GET') return 'history';
    if (new RegExp(`^/api/v1/conversations/${id}/messages(-v2)?$`).test(pathname)) return 'outbound';
    if (new RegExp(`^/api/v1/conversations/${id}/notes$`).test(pathname)) return 'notes';
    if (new RegExp(`^/api/v1/conversations/${id}/transition$`).test(pathname)) return 'transition';
    return 'not-found';
  }
  return null;
}

export function chatPublicMiddleware(auth: NativeAuthService, identity: HumanDispatchEnrollment,
  send: (request: OwnerCommandRequest) => Promise<unknown>, crmSend: (request: OwnerCommandRequest) => Promise<unknown>,
  isLocalRecord: (tenant: string, record: string) => Promise<boolean> = async () => false) {
  // These factories provide request handlers only; no extra listener or port is opened.
  const handlers: Record<ChatPublicRoute, Server> = {
    history: createChatHistoryBff(new ChatHistoryBff(auth, identity, send)),
    outbound: createChatOutboundBff(new ChatOutboundBff(auth, identity, send)),
    workspace: createChatWorkspaceBff(auth, identity, send),
    catalog: createChatCatalogBff(auth, identity, send),
    session: createChatSessionProgressBff(auth, identity, send),
    transition: createChatTransitionBff(auth, identity, send),
    notes: createChatNotesBff(auth, identity, send),
    records: createChatRecordBff(auth, identity, crmSend),
    ownership: createChatOwnershipBff(new ChatOwnershipBff(auth, identity, send)),
  };
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const route = chatPublicRoute(request.method ?? '', pathname);
    if (route === null) { next(); return; }
    if (route === 'ownership' && pathname.startsWith('/api/v1/records/')) {
      try {
        // Authenticate before resolving the CRM-owned record type; the original owner
        // controller still performs its own permission/CSRF checks after next().
        await auth.session(cookie(request, 'crm_session'), true);
        const tenant = request.headers['x-tenant-id'];
        if (typeof tenant !== 'string' || !/^[0-9a-f-]{36}$/.test(tenant)) throw new CommandError(400, 'INVALID_REQUEST');
        if (await isLocalRecord(tenant, pathname.split('/')[4]!)) { next(); return; }
      } catch (error) {
        const failure = error instanceof AuthError || error instanceof CommandError ? error : new CommandError(503, 'TEMPORARILY_UNAVAILABLE');
        response.writeHead(failure.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: { code: failure.code, retryable: failure.status === 503 } }));
        return;
      }
    }
    if (route === 'not-found') {
      response.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: { code: 'NOT_FOUND', retryable: false } }));
      return;
    }
    if (route === 'history' && request.url?.startsWith('/api/v1/chat-workspace/conversations/')) {
      request.url = request.url.replace('/api/v1/chat-workspace/conversations/', '/api/v1/conversations/');
    }
    handlers[route].emit('request', request, response);
  };
}
