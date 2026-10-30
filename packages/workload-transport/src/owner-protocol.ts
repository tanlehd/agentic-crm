import { createHash } from 'node:crypto';
import { Ajv, type ValidateFunction } from 'ajv';
import { default as formats } from 'ajv-formats';
import { chatOwnerV1Schema, type OwnerCommandBinding } from '@agentic-crm/contracts';

const statusCodes = {
  INVALID_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, REVOKED: 403,
  NOT_FOUND: 404, CONFLICT: 409, STALE_VERSION: 409, CAPACITY: 409,
  INVALID_TRANSITION: 409, LIMIT_EXCEEDED: 422, REFERENCE_INVALID: 422,
  PRECONDITION_REQUIRED: 428, DEPENDENCY_UNAVAILABLE: 503,
} as const;
export type OwnerErrorCode = keyof typeof statusCodes;
export class OwnerError extends Error {
  readonly status: number;
  constructor(readonly code: OwnerErrorCode) {
    super(code);
    this.status = statusCodes[code];
  }
}
export function ownerFail(code: OwnerErrorCode): never { throw new OwnerError(code); }
const publicStatuses = { STAGE_REQUIREMENTS_NOT_MET:422, CONTACT_BINDING_MISMATCH:422, SESSION_SELECTION_REQUIRED:409, HUMAN_PROFILE_REQUIRED:409, HUMAN_CAPACITY_FULL:409, NO_MATCHING_SKILL:409, ROUTING_SESSION_LIMIT:422, ROUTING_REPORT_LIMIT:422, OPERATIONS_SOURCE_LIMIT:422, AI_CONFIGURATION_REQUIRED:409, OUTCOME_BINDING_MISMATCH:422, INVALID_NEED_VALUES:422, OUTCOME_LIMIT_EXCEEDED:422, INVALID_WINDOW:422, INVALID_AS_OF:422, QUERY_TOO_LARGE:422, VALUES_TOO_LARGE:422, INVALID_PROCESS:422, SESSION_CLOSED:409, ALREADY_ENROLLED:409, ENROLLMENT_REQUIRED:409, NEED_LIMIT:422, EVIDENCE_CONFLICT:409, INVALID_EVIDENCE:422, EVIDENCE_TIME_OUTSIDE_SESSION:422, INVALID_TRANSITION:422, INVALID_CURSOR: 400, FIELD_FORBIDDEN: 403, UNSUPPORTED_MESSAGE_PLATFORM: 503, CONTACT_BINDING_STALE: 409, IDEMPOTENCY_CONFLICT: 409, OWNER_CONFLICT: 409, INVALID_READ_POSITION: 422, VALIDATION_FAILED: 422, VERSION_CONFLICT: 409, CAPABILITY_UNAVAILABLE: 409, WORKSPACE_BACKFILLING: 503, ARCHIVED: 409, TAG_QUOTA: 409, CURSOR_EXPIRED: 400, QUERY_CHANGED: 409, NAME_CONFLICT: 409, SHORTCUT_CONFLICT: 409, INBOX_QUOTA: 409, INVALID_SHARE_TARGET: 422, OPTIONS_LIMIT_EXCEEDED: 422 } as const;
export function isOwnerDomainCode(code:unknown):code is keyof typeof publicStatuses{return typeof code==='string'&&Object.hasOwn(publicStatuses,code);}
export class OwnerDomainError extends Error {
  readonly status: number;
  constructor(readonly code: keyof typeof publicStatuses, readonly correlation: string) { super(code); this.status = publicStatuses[code]; }
  response() { return { error: { code: this.code, message: 'Không thể hoàn tất yêu cầu.', fields: [], retryable: this.status === 503 }, meta: { correlation_id: this.correlation } }; }
}
export const OWNER_BODY_LIMIT = 262144;
export const OWNER_HISTORY_RESPONSE_LIMIT = 8 * 1024 * 1024;
const composedChatCommands=new Set(Object.entries(chatOwnerV1Schema.definitions).filter(([name,schema])=>name.startsWith('Request_chat-')&&'required' in schema&&Array.isArray(schema.required)&&(schema.required as readonly string[]).includes('actor')&&(schema.required as readonly string[]).includes('command_id')).map(([name])=>name.slice('Request_chat-'.length)));
export function ownerDeadline(owner:string,operation:string):number{
 if(owner==='identity'&&['admit','settle','admission-cursor-subject','admission-workspace-policy','admission-conversation-policy','admission-contact-policy','admission-contact-batch-policy','admission-note-policy'].includes(operation)||owner==='crm'&&['contact-summary-read','contact-summary-batch','note-list'].includes(operation))return 5000;
 return owner==='chat'&&(composedChatCommands.has(operation)||['conversation-get-conversations-id','routing-reroute','routing-reroute-source','routing-view','routing-reply-facts','routing-proposal','routing-dispatch','routing-sync-snapshot','routing-targets','conversation-classification-get-records-id-assignment-teams','conversation-post-conversations-id-transition','need-post-enrich','need-post-outcome','need-get-assessment','need-post-assessment','session-progress-get-session-funnel','conversation-classification-get-conversations-conversation-sessions-session-contributions','conversation-classification-get-conversations-conversation-sessions-session-classification','conversation-classification-post-conversations-conversation-sessions-session-classification','workspace-get-activity','workspace-conversations','workspace-sidebar','conversation-get-conversations','conversation-channels'].includes(operation))?10000:2000;
}
export function ownerResponseLimit(owner: string, operation: string): number {
  if(owner==='identity'&&operation==='routing-view-directory')return 1024*1024;
  if(owner==='chat'&&operation==='routing-sync-snapshot')return 1024*1024;
  if(owner==='chat'&&operation==='routing-reply-facts')return 2*1024*1024;
  return owner === 'crm' && ['need-metadata-read','classification-metadata-read','note-list','activity-notes'].includes(operation) || owner === 'chat' && ['need-get-assessment','conversation-classification-get-conversations-conversation-sessions-session-contributions','conversation-classification-get-conversations-conversation-sessions-session-classification','workspace-get-activity','external-conversations-id-messages','external-conversations-id-messages-messageId','conversation-get-conversations-id-notes','conversation-get-conversations-id-messages', 'conversation-get-conversations-id-message-envelopes',
    'conversation-get-conversations-id-message-envelopes-v3','workspace-conversations','conversation-get-conversations'].includes(operation) ? OWNER_HISTORY_RESPONSE_LIMIT : OWNER_BODY_LIMIT;
}
export const MAX_COUNTER = 18446744073709551615n;
export function ownerCounter(value: unknown, positive = false): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,19})$/.test(value) ||
      BigInt(value) > MAX_COUNTER || positive && value === '0') ownerFail('INVALID_REQUEST');
  return value;
}
export function nextOwnerCounter(value: unknown): string {
  const n = BigInt(ownerCounter(value));
  if (n === MAX_COUNTER) ownerFail('LIMIT_EXCEEDED');
  return String(n + 1n);
}
export function ownerCanonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) ownerFail('INVALID_REQUEST');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(ownerCanonical).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + ownerCanonical((value as Record<string, unknown>)[key])).join(',') + '}';
  }
  return ownerFail('INVALID_REQUEST');
}
export function ownerDigest(value: unknown): string {
  return createHash('sha256').update(ownerCanonical(value)).digest('hex');
}
export function ownerBindingDigest(binding: OwnerCommandBinding): string {
  const { dependencies: _dependencies, ...core } = binding;
  return ownerDigest(core);
}
const ajv = new Ajv({ strict: true });
(formats as unknown as (a: Ajv) => void)(ajv);
ajv.addSchema(chatOwnerV1Schema);
const validators = new Map<string, ValidateFunction>();
export function validateOwnerValue<T>(definition: string, value: unknown): T {
  let validate = validators.get(definition);
  if (!validate) {
    validate = ajv.getSchema(chatOwnerV1Schema.$id + '#/definitions/' + definition);
    if (!validate) throw new Error('OWNER_SCHEMA_NOT_REGISTERED');
    validators.set(definition, validate);
  }
  if (!validate(value)) ownerFail('INVALID_REQUEST');
  const json = ownerCanonical(value);
  const reply=/^Reply_(chat|crm|identity)-(.+)$/.exec(definition);
  const limit = reply ? ownerResponseLimit(reply[1]!,reply[2]!) : definition==='OwnerRoutingReplySnapshot' ? ownerResponseLimit('chat','routing-reply-facts') : ['OwnerRoutingViewData','OwnerRoutingViewDirectory'].includes(definition) ? 1024*1024 : OWNER_BODY_LIMIT;
  if (Buffer.byteLength(json) > limit) ownerFail('LIMIT_EXCEEDED');
  return structuredClone(value) as T;
}
export function ownerErrorResponse(error: unknown, requestId: string | null) {
  if (error instanceof OwnerDomainError) return { status: error.status, body: { schema_version: 1, request_id: requestId, code: 'DOMAIN_ERROR', public_error: error.response() } };
  if (!(error instanceof OwnerError)) return null;
  return { status: error.status, body: { schema_version: 1, request_id: requestId, code: error.code } };
}
