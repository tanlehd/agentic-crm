import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const check = process.argv.includes('--check');
const dispatch = JSON.parse(await readFile('packages/contracts/schemas/chat-dispatch-v1.json', 'utf8'));
const intake = JSON.parse(await readFile('packages/contracts/schemas/intake.json', 'utf8'));
const uuid = { type: 'string', format: 'uuid', pattern: '^[0-9a-f-]{36}$' };
const ref = name => ({ $ref: '#/definitions/' + name });
const exact = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const request = (name, binding, extra = {}) => exact({ schema_version: { const: 1 }, operation: { const: name }, request_id: uuid, binding: ref(binding), ...extra });
const reply = (state, extra = {}) => exact({ schema_version: { const: 1 }, request_id: uuid, receipt_id: uuid, state: { const: state }, ...extra });
const reason = { enum: ['owner_changed', 'conversation_closed', 'authorization_revoked'] };
const definitions = {
  ExchangeDispatchBinding: dispatch.definitions.DispatchBinding,
  ExchangeIngressBinding: exact({ ...Object.fromEntries(['tenant_id', 'connection_id', 'crm_contact_id', 'crm_identity_id'].map(k => [k, uuid])), mapping_revision: { const: '1' }, platform: { const: 'mock_messenger' } }),
  ExchangeIntake: intake.definitions['intake-request'],
  ExchangePayload: exact({ version: { const: 1 }, platform: { const: 'mock_messenger' }, message: exact({ type: { const: 'text' }, text: { type: 'string', minLength: 1, maxLength: 4000, pattern: '\\S' } }) }),
  ExchangePayloadPut: request('payload-put', 'ExchangeDispatchBinding', { grant_id: uuid, payload: ref('ExchangePayload') }),
  ExchangeIngressAccept: request('ingress-accept', 'ExchangeIngressBinding', { source_delivery_id: uuid, intake: ref('ExchangeIntake') }),
  ExchangeIngressRead: request('ingress-read', 'ExchangeIngressBinding', { receipt_id: uuid }),
  ExchangeCancel: request('connector-cancel', 'ExchangeDispatchBinding', { cancellation_id: uuid, reason }),
  ExchangeCancelRead: request('cancellation-read', 'ExchangeDispatchBinding', { cancellation_id: uuid }),
  ExchangeRequest: { oneOf: ['ExchangePayloadPut', 'ExchangeIngressAccept', 'ExchangeIngressRead', 'ExchangeCancel', 'ExchangeCancelRead'].map(ref) },
  ExchangePayloadReply: reply('staged'),
  ExchangeAcceptedReply: reply('received'),
  ExchangeProcessedReply: reply('processed', { conversation_id: uuid, message_id: uuid, duplicate: { type: 'boolean' } }),
  ExchangeFailedReply: reply('failed', { error_code: { enum: ['CONTACT_BINDING_STALE', 'REVOKED', 'MESSAGE_PAYLOAD_CONFLICT'] } }),
  ExchangeCancellationReply: reply('cancelled', { cancellation_id: uuid, reason }),
  ExchangeIngressReply: { oneOf: ['ExchangeAcceptedReply', 'ExchangeProcessedReply', 'ExchangeFailedReply'].map(ref) },
  ExchangeReply: { oneOf: ['ExchangePayloadReply', 'ExchangeIngressReply', 'ExchangeCancellationReply'].map(ref) },
  ExchangeFailure: exact({ request_id: uuid, code: { enum: ['INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'REVOKED', 'EXPIRED', 'INVALID_TRANSITION', 'DEPENDENCY_UNAVAILABLE'] } })
};
const schema = { $schema: 'http://json-schema.org/draft-07/schema#', $id: 'urn:agentic-crm:chat-exchange:v1', title: 'ExchangeProtocol', oneOf: ['ExchangeRequest', 'ExchangeReply', 'ExchangeFailure'].map(ref), definitions };
const schemaRef = name => ({ $ref: '#/components/schemas/' + name });
const wire = name => ({ description: 'Private contract only; not a deployed endpoint', headers: { 'Cache-Control': { schema: { const: 'no-store' } } }, content: { 'application/json': { schema: schemaRef(name) } } });
const operations = { 'payload-put': 'ExchangePayloadPut', 'ingress-accept': 'ExchangeIngressAccept', 'ingress-read': 'ExchangeIngressRead', 'connector-cancel': 'ExchangeCancel', 'cancellation-read': 'ExchangeCancelRead' };
const replies = { 'payload-put': 'ExchangePayloadReply', 'ingress-accept': 'ExchangeAcceptedReply', 'ingress-read': 'ExchangeIngressReply', 'connector-cancel': 'ExchangeCancellationReply', 'cancellation-read': 'ExchangeCancellationReply' };
const api = {
  openapi: '3.1.0', info: { title: 'Chat exchange v1 — private contract, not deployed', version: '1.0.0' }, security: [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }],
  paths: Object.fromEntries(Object.entries(operations).map(([name, definition]) => ['/internal/v1/chat-exchange/' + name, { post: { operationId: name, requestBody: { required: true, content: { 'application/json': { schema: schemaRef(definition) } } }, responses: { ...Object.fromEntries((['payload-put', 'ingress-accept'].includes(name) ? [200, 202] : [200]).map(code => [code, wire(replies[name])])), ...Object.fromEntries([400, 401, 403, 404, 409, 503].map(code => [code, wire('ExchangeFailure')])) } } }])),
  components: { securitySchemes: { workloadLocalService: { type: 'apiKey', in: 'header', name: 'x-workload-service', description: 'Only in explicitly selected http-local development/test mode (ADR-026); no automatic TLS downgrade' }, workloadLocalKey: { type: 'apiKey', in: 'header', name: 'x-workload-key', description: 'Private configured service key; trusted local network only, paired with service and current Identity tenant admission' }, workloadMTLS: { type: 'mutualTLS', description: 'TLS1.3 verified peer SAN and current registry; no body/header impersonation' } }, schemas: JSON.parse(JSON.stringify(definitions).replaceAll('#/definitions/', '#/components/schemas/')) }
};
const outputs = {
  'packages/contracts/schemas/chat-exchange-v1.json': JSON.stringify(schema, null, 2) + '\n',
  'packages/contracts/src/generated/chat-exchange-v1.ts': await compile(schema, 'ExchangeProtocol', { bannerComment: '/* Generated private design contract. No endpoint deployment implied. */' }),
  'packages/contracts/src/generated/chat-exchange-v1-schema.ts': '/* Generated. Do not edit. */\nexport const chatExchangeV1Schema = ' + JSON.stringify(schema, null, 2) + ';\n',
  'docs/contracts/chat-exchange.openapi.json': JSON.stringify(api, null, 2) + '\n'
};
if (!check) { await mkdir('packages/contracts/src/generated', { recursive: true }); await mkdir('docs/contracts', { recursive: true }); }
for (const [file, body] of Object.entries(outputs)) {
  if (check) { if (await readFile(file, 'utf8').catch(() => '') !== body) throw new Error('Exchange contract drift: ' + file); }
  else await writeFile(file, body);
}
console.log('PASS exchange v1 schema/types/OpenAPI' + (check ? ' match source' : ' generated'));
