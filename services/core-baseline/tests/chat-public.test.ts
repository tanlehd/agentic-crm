import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chatPublicMiddleware, chatPublicRoute } from '../src/gateway/chat-public.js';
import { AuthError } from '../src/modules/identity/auth/security.js';
import type { NativeAuthService } from '../src/modules/identity/auth/native-service.js';
import type { HumanDispatchEnrollment } from '../src/modules/identity/dispatch-enrollment.js';

const id = '01900000-0000-7000-8000-000000009401';
describe('main Chat public forwarding', () => {
  it('selects each public family and isolates unrelated owners', () => {
    for (const [method, path, route] of [
      ['GET', '/conversations', 'history'], ['POST', `/conversations/${id}/messages-v2`, 'outbound'],
      ['POST', `/conversations/${id}/notes`, 'notes'], ['POST', `/conversations/${id}/transition`, 'transition'],
      ['POST', `/conversations/${id}/takeover`, 'ownership'], ['POST', `/records/${id}/assignment`, 'ownership'],
      ['GET', `/chat-workspace/conversations/${id}/activity`, 'history'], ['PUT', `/chat-workspace/conversations/${id}/snooze`, 'workspace'],
      ['GET', '/chat-workspace/inboxes', 'catalog'], ['POST', '/session-process', 'session'],
      ['PATCH', `/objects/conversation/records/${id}`, 'records'], ['POST', `/conversations/${id}/unknown`, 'not-found'],
    ]) expect(chatPublicRoute(method!, '/api/v1' + path)).toBe(route);
    expect(chatPublicRoute('GET', '/api/v1/objects/contact/records')).toBeNull();
    expect(chatPublicRoute('GET', '/auth/session')).toBeNull();
  });

  it('keeps current session/CSRF checks before owner calls and never falls back on owner failure', async () => {
    let fallback = 0, calls = 0, authenticated = false;
    const auth = {
      session: async () => { if (!authenticated) throw new AuthError(401, 'AUTH_SESSION_REQUIRED'); return { account_id: id }; },
      requireMutation: async () => { throw new AuthError(403, 'AUTH_CSRF_INVALID'); },
    } as unknown as NativeAuthService;
    const enrollment = { enroll: async () => { if (!authenticated) throw new Error('must not enroll'); return { principalId: id, delegationId: id }; } } as unknown as HumanDispatchEnrollment;
    const send = async () => { calls++; throw new Error('owner unavailable'); };
    const middleware = chatPublicMiddleware(auth, enrollment, send, send);
    const server = createServer((req, res) => middleware(req, res, () => { fallback++; res.end('owner'); }));
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
    try {
      const read = await fetch(base + '/api/v1/conversations', { headers: { 'x-tenant-id': id } }); expect(read.status).toBe(401); await read.body?.cancel();
      const write = await fetch(base + `/api/v1/conversations/${id}/messages`, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', 'x-tenant-id': id } });
      expect(write.status).toBe(403); await write.body?.cancel();
      const unknown = await fetch(base + `/api/v1/conversations/${id}/unknown`, { method: 'POST' });
      expect(unknown.status).toBe(404); await unknown.body?.cancel();
      expect(calls).toBe(0); expect(fallback).toBe(0);
      authenticated = true;
      const unavailable = await fetch(base + '/api/v1/conversations', { headers: { 'x-tenant-id': id, cookie: 'crm_session=synthetic' } });
      expect(unavailable.status).toBe(503); await unavailable.body?.cancel(); expect(calls).toBe(1); expect(fallback).toBe(0);
      const unrelated = await fetch(base + '/api/v1/objects/contact/records'); expect(await unrelated.text()).toBe('owner'); expect(fallback).toBe(1);
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });

  it('routes known non-Chat records to their owner after auth and fails closed on lookup errors', async () => {
    let authenticated=false, local=true, unavailable=false, lookups=0, forwards=0, fallbacks=0;
    const auth={session:async()=>{if(!authenticated)throw new AuthError(401,'AUTH_SESSION_REQUIRED');}} as unknown as NativeAuthService;
    const identity={enroll:async()=>({principalId:id,delegationId:id})} as unknown as HumanDispatchEnrollment;
    const send=async()=>{forwards++;throw new Error('owner unavailable');};
    const middleware=chatPublicMiddleware(auth,identity,send,send,async(tenant,record)=>{
      expect(tenant).toBe(id);expect(record).toBe(id);lookups++;if(unavailable)throw new Error('registry unavailable');return local;
    });
    const server=createServer((req,res)=>{void middleware(req,res,()=>{fallbacks++;res.end('local owner');});});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/v1/records/${id}/ownership-history`;
    const headers={'x-tenant-id':id,cookie:'crm_session=synthetic'};
    try{
      let response=await fetch(url,{headers});expect(response.status).toBe(401);await response.body?.cancel();expect(lookups).toBe(0);
      authenticated=true;response=await fetch(url,{headers});expect(await response.text()).toBe('local owner');expect(fallbacks).toBe(1);expect(forwards).toBe(0);
      local=false;response=await fetch(url,{headers});expect(response.status).toBe(503);await response.body?.cancel();expect(forwards).toBe(1);expect(fallbacks).toBe(1);
      unavailable=true;response=await fetch(url,{headers});expect(response.status).toBe(503);await response.body?.cancel();expect(forwards).toBe(1);expect(fallbacks).toBe(1);
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
});
