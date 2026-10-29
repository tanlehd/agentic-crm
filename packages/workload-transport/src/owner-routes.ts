import { randomUUID } from 'node:crypto';
import { OWNER_BODY_LIMIT, ownerResponseLimit, ownerFail, validateOwnerValue } from './owner-protocol.js';
import type { OwnerActor } from '@agentic-crm/contracts';
import { workloadRequest, workloadProtocol, createWorkloadAgent, createLocalWorkloadAgent, type CurrentAuthority, type Peer, type ServiceName, type TlsMaterial, type WorkloadRoute } from './workload-tls.js';

export type OwnerRequest = { schema_version: 1; request_id: string; correlation_id: string; tenant_id: string; operation: string; payload: Record<string, unknown> };
export type OwnerCommandRequest = OwnerRequest & { actor: OwnerActor; command_id: string };
export function ownerRoute(owner: ServiceName, operation: string, callers: readonly ServiceName[],
  handle: (request: OwnerRequest, peer: Peer, signal: AbortSignal) => Promise<unknown>): WorkloadRoute {
  const requestSchema = 'Request_' + owner + '-' + operation, replySchema = 'Reply_' + owner + '-' + operation;
  return {
    callers, bodyLimit: OWNER_BODY_LIMIT, responseLimit: ownerResponseLimit(owner, operation),
    validate(value) { return validateOwnerValue<OwnerRequest>(requestSchema, value); },
    async handle(value, peer, signal) {
      const request = validateOwnerValue<OwnerRequest>(requestSchema, value);
      if (!callers.includes(peer.service)) ownerFail('FORBIDDEN');
      if (signal.aborted) ownerFail('DEPENDENCY_UNAVAILABLE');
      const result = await handle(request, peer, signal);
      return validateOwnerValue<Record<string, unknown>>(replySchema, {
        schema_version: 1, request_id: request.request_id, tenant_id: request.tenant_id, result,
      });
    },
  };
}

/** Sends an already bound command/read request; actor references remain Identity-owned. */
export function ownerCommandClient(material: TlsMaterial, authority: CurrentAuthority, owner: ServiceName, baseUrl: URL) {
  const transport = material.localHttp ? { httpAgent: createLocalWorkloadAgent() } : { agent: createWorkloadAgent(owner) };
  if (baseUrl.protocol !== workloadProtocol(material) || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash || baseUrl.username || baseUrl.password) ownerFail('INVALID_REQUEST');
  return async <T>(input: OwnerCommandRequest, signal?: AbortSignal): Promise<T> => {
    const request = validateOwnerValue<OwnerCommandRequest>('Request_' + owner + '-' + input.operation, input);
    const reply = await workloadRequest(material, authority, { ...transport, url: new URL('/internal/v1/owners/' + owner + '/' + request.operation, baseUrl), expectedService: owner, tenant: request.tenant_id, data: request, responseLimit: ownerResponseLimit(owner, request.operation), signal });
    const parsed = validateOwnerValue<{ request_id: string; tenant_id: string; result: T }>('Reply_' + owner + '-' + request.operation, reply);
    if (parsed.request_id !== request.request_id || parsed.tenant_id !== request.tenant_id) ownerFail('FORBIDDEN');
    return parsed.result;
  };
}

export function ownerClient(material: TlsMaterial, authority: CurrentAuthority, owner: ServiceName, baseUrl: URL) {
  const transport = material.localHttp ? { httpAgent: createLocalWorkloadAgent() } : { agent: createWorkloadAgent(owner) };
  if (baseUrl.protocol !== workloadProtocol(material) || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash || baseUrl.username || baseUrl.password) ownerFail('INVALID_REQUEST');
  return async <T>(tenant: string, operation: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> => {
    const request: OwnerRequest = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation, payload };
    validateOwnerValue('Request_' + owner + '-' + operation, request);
    const reply = await workloadRequest(material, authority, { ...transport, url: new URL('/internal/v1/owners/' + owner + '/' + operation, baseUrl), expectedService: owner,
      tenant, data: request, responseLimit: ownerResponseLimit(owner,operation), signal });
    const parsed = validateOwnerValue<{ request_id: string; tenant_id: string; result: T }>('Reply_' + owner + '-' + operation, reply);
    if (parsed.request_id !== request.request_id || parsed.tenant_id !== tenant) ownerFail('FORBIDDEN');
    return parsed.result;
  };
}
