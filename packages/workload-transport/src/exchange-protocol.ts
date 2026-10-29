import { Ajv } from 'ajv';
import { default as formats } from 'ajv-formats';
import { chatExchangeV1Schema } from '@agentic-crm/contracts';
const statuses = { INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, REVOKED: 403, EXPIRED: 409, INVALID_TRANSITION: 409, DEPENDENCY_UNAVAILABLE: 503 } as const;
export class ExchangeError extends Error {
  readonly status: number;
  constructor(readonly code: keyof typeof statuses) { super(code); this.status = statuses[code]; }
}
const ajv = new Ajv({ strict: true });
(formats as unknown as (a: Ajv) => void)(ajv); ajv.addSchema(chatExchangeV1Schema);
export function validateExchangeValue<T>(name: string, value: unknown): T {
  const validator = ajv.getSchema(chatExchangeV1Schema.$id + '#/definitions/' + name);
  if (!validator || !validator(value)) throw new ExchangeError('INVALID_REQUEST');
  return structuredClone(value) as T;
}
export const ingressExchangePath = (path: string) => /^\/internal\/v1\/chat-exchange\/ingress-(accept|read)$/.test(path);
export function exchangeErrorResponse(error: unknown, requestId: string | null) {
  if (!(error instanceof ExchangeError) || requestId === null) return null;
  return { status: error.status, body: validateExchangeValue<Record<string, unknown>>('ExchangeFailure', { request_id: requestId, code: error.code }) };
}
