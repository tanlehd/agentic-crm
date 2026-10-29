import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const check = process.argv.includes('--check');
const uuid = { type: 'string', format: 'uuid', pattern: '^[0-9a-f-]{36}$' };
const ref = name => ({ $ref: '#/definitions/' + name });
const exact = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const operation = (name, extra = {}) => exact({ schema_version: { const: 1 }, operation: { const: name }, request_id: uuid, binding: ref('DispatchBinding'), ...extra });
const response = (states, extra = {}) => exact({ schema_version: { const: 1 }, request_id: uuid, receipt_id: uuid, state: { enum: states }, ...extra });
const definitions = {
  DispatchBinding: exact({ ...Object.fromEntries(['tenant_id', 'conversation_id', 'crm_contact_id', 'connection_id', 'intent_id', 'attempt_id', 'principal_id', 'delegation_id'].map(name => [name, uuid])), actor_kind: { enum: ['human', 'ai'] }, owner_revision: { type: 'string', pattern: '^[1-9][0-9]{0,19}$' }, record_version: { type: 'string', pattern: '^[1-9][0-9]{0,19}$' }, payload_digest: { type: 'string', pattern: '^[0-9a-f]{64}$' } }),
  DispatchResourceContext: exact({ object_key: { const: 'conversation' }, owner_principal_id: uuid, owner_revision: { type: 'string', pattern: '^[1-9][0-9]{0,19}$' }, record_version: { type: 'string', pattern: '^[1-9][0-9]{0,19}$' }, team_id: { anyOf: [uuid, { type: 'null' }] }, shared_team_ids: { type: 'array', items: uuid, uniqueItems: true, maxItems: 200 } }),
  IdentityIssue: operation('identity-issue', { resource_context: ref('DispatchResourceContext') }),
  IdentityConsume: operation('identity-consume', { grant_id: uuid, claim_id: uuid, fence_id: uuid }),
  ChatClaim: operation('chat-claim', { grant_id: uuid }),
  ConnectorPrepare: operation('connector-prepare', { grant_id: uuid }),
  ConnectorBegin: operation('connector-begin', { grant_id: uuid, claim_id: uuid }),
  ConnectorResult: { oneOf: [operation('connector-result', { outcome: { const: 'sent' }, provider_message_id: { type: 'string', minLength: 1, maxLength: 200 } }), operation('connector-result', { outcome: { const: 'unknown' }, error_code: { const: 'DELIVERY_UNKNOWN' } })] },
  ReceiptRead: operation('receipt-read', { receipt_id: uuid }),
  ChatClaimProofRead: operation('chat-claim-proof', { claim_id: uuid }),
  ChatClaimProofReply: response(['claimed'], { binding: ref('DispatchBinding'), grant_id: uuid, claim_id: uuid, resource_context: ref('DispatchResourceContext') }),
  DispatchRequest: { oneOf: ['IdentityIssue', 'IdentityConsume', 'ChatClaim', 'ConnectorPrepare', 'ConnectorBegin', 'ConnectorResult', 'ReceiptRead'].map(ref) },
  DispatchReply: { oneOf: [response(['issued'], { grant_id: uuid, expires_at: { type: 'string', format: 'date-time' }, resource_context: ref('DispatchResourceContext') }), response(['claimed'], { claim_id: uuid }), response(['consumed'], { grant_id: uuid, claim_id: uuid, resource_context: ref('DispatchResourceContext') }), response(['prepared', 'admitting', 'started', 'unknown', 'rejected', 'cancelled', 'expired', 'revoked']), response(['sent'], { provider_message_id: { type: 'string', minLength: 1, maxLength: 200 } })] },
  DispatchFailure: exact({ request_id: uuid, code: { enum: ['INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'STALE_OWNER', 'REVOKED', 'EXPIRED', 'INVALID_TRANSITION', 'DEPENDENCY_UNAVAILABLE'] } })
};
const schema = { $schema: 'http://json-schema.org/draft-07/schema#', $id: 'urn:agentic-crm:chat-dispatch:v1', title: 'DispatchProtocol', oneOf: ['DispatchRequest', 'DispatchReply', 'DispatchFailure', 'ChatClaimProofRead', 'ChatClaimProofReply'].map(ref), definitions };
const schemaRef = name => ({ $ref: '#/components/schemas/' + name });
const wireResponse = name => ({ description: 'Private protocol receipt; contract only, endpoint not deployed', content: { 'application/json': { schema: schemaRef(name) } } });
const operations = { 'identity-issue': 'IdentityIssue', 'identity-consume': 'IdentityConsume', 'chat-claim': 'ChatClaim', 'connector-prepare': 'ConnectorPrepare', 'connector-begin': 'ConnectorBegin', 'connector-result': 'ConnectorResult', 'receipt-read': 'ReceiptRead' };
const api = {
  openapi: '3.1.0', info: { title: 'Chat dispatch v1 — private design contract, not deployed', version: '1.0.0', description: 'Workload mTLS plus live authority and tenant/attempt binding. Machine schemas do not establish authorization or deployment.' },
  security: [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }],
  paths: Object.fromEntries(Object.entries(operations).map(([name, definition]) => ['/internal/v1/dispatch/' + name, { post: { operationId: name, requestBody: { required: true, content: { 'application/json': { schema: schemaRef(definition) } } }, responses: { ...Object.fromEntries((name === 'identity-issue' ? [200, 201] : ['connector-prepare', 'connector-begin'].includes(name) ? [200, 202] : [200]).map(code => [code, wireResponse('DispatchReply')])), ...Object.fromEntries([400, 401, 403, 404, 409, 503].map(code => [code, wireResponse('DispatchFailure')])) } } }])),
  components: { securitySchemes: { workloadLocalService: { type: 'apiKey', in: 'header', name: 'x-workload-service', description: 'Only in explicitly selected http-local development/test mode (ADR-026); no automatic TLS downgrade' }, workloadLocalKey: { type: 'apiKey', in: 'header', name: 'x-workload-key', description: 'Private configured service key; trusted local network only, paired with service and current Identity tenant admission' }, workloadMTLS: { type: 'mutualTLS', description: 'TLS1.3 peer SAN identity, active workload registry and per-operation allowlist; no identity from forwarded headers' } }, schemas: JSON.parse(JSON.stringify(definitions).replaceAll('#/definitions/', '#/components/schemas/')) }
};
api.paths['/internal/v1/dispatch/chat-claim-proof']={post:{operationId:'chat-claim-proof',description:'Identity or Connector to Chat only. Stable full proof, not a send capability.',requestBody:{required:true,content:{'application/json':{schema:schemaRef('ChatClaimProofRead')}}},responses:{200:wireResponse('ChatClaimProofReply'),...Object.fromEntries([400,401,403,404,409,503].map(code=>[code,wireResponse('DispatchFailure')]))}}};
const outputs = {
  'packages/contracts/schemas/chat-dispatch-v1.json': JSON.stringify(schema, null, 2) + '\n',
  'packages/contracts/src/generated/chat-dispatch-v1.ts': await compile(schema, 'DispatchProtocol', { bannerComment: '/* Generated private design contract. No endpoint deployment implied. */' }),
  'packages/contracts/src/generated/chat-dispatch-v1-schema.ts': '/* Generated. Do not edit. */\nexport const chatDispatchV1Schema = ' + JSON.stringify(schema, null, 2) + ';\n',
  'docs/contracts/chat-dispatch.openapi.json': JSON.stringify(api, null, 2) + '\n'
};
if (!check) { await mkdir('packages/contracts/src/generated', { recursive: true }); await mkdir('docs/contracts', { recursive: true }); }
for (const [file, body] of Object.entries(outputs)) {
  if (check) { if (await readFile(file, 'utf8').catch(() => '') !== body) throw new Error('Dispatch contract drift: ' + file); }
  else await writeFile(file, body);
}
console.log('PASS dispatch v1 schema/types/OpenAPI' + (check ? ' match source' : ' generated'));
