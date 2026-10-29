import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const check = process.argv.includes('--check');
const uuid = { type: 'string', format: 'uuid', pattern: '^[0-9a-f-]{36}$' };
const revision = { type: 'string', pattern: '^[1-9][0-9]{0,19}$' };
const watermark = { type: 'string', pattern: '^(0|[1-9][0-9]{0,19})$' };
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const exact = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const ref = name => ({ $ref: '#/definitions/' + name });
const request = (operation, properties) => exact({ schema_version: { const: 1 }, request_id: uuid, operation: { const: operation }, ...properties });
const base = { tenant_id: uuid, conversation_id: uuid };
const definitions = {
  ChatRegistrySnapshot: exact({ ...base, registry_revision: revision, record_version: revision, owner_revision: revision, control_revision: revision, pause_through_revision: watermark, cancel_through_revision: watermark,
    crm_contact_id: uuid, crm_identity_id: uuid, connection_id: uuid, owner_principal_id: nullable(uuid), owner_kind: { enum: ['human', 'ai', null] }, team_id: nullable(uuid), shared_team_ids: { type: 'array', items: uuid, uniqueItems: true, maxItems: 200 }, active_session_id: nullable(uuid), status: { enum: ['open', 'pending', 'closed'] }, archived: { type: 'boolean' } }),
  ChatControlNotice: exact({ schema_version: { const: 1 }, event_id: uuid, ...base, registry_revision: revision }),
  ChatControlEvent: exact({ schema_version: { const: 1 }, event_type: { const: 'chat.registry.changed.v1' }, producer: { const: 'chat' }, event_id: uuid, ...base, registry_revision: revision, occurred_at: { type: 'string', format: 'date-time' }, correlation_id: uuid, snapshot: ref('ChatRegistrySnapshot') }),
  ChatRegistryRead: request('registry-read', { ...base, minimum_revision: revision }),
  ChatControlEventRead: request('event-read', { notice: ref('ChatControlNotice') }),
  ChatContactCheck: request('contact-check', { tenant_id: uuid, connection_id: uuid, crm_contact_id: uuid, crm_identity_id: uuid, external_subject_id: { type: 'string', minLength: 1, maxLength: 255, pattern: '^(?!.*[\\u0000-\\u001f\\u007f])(?=.*\\S).*$' }, mapping_revision: { const: '1' } }),
  ChatConnectionCheck: request('connection-check', { tenant_id: uuid, connection_id: uuid, platform: { const: 'mock_messenger' } }),
  ChatPrincipalCheck: request('principal-check', { tenant_id: uuid, principal_id: uuid, kind: { enum: ['human', 'ai'] }, team_id: nullable(uuid) }),
  ChatMetadataCheck: request('metadata-check', { tenant_id: uuid, object_key: { const: 'conversation' }, schema_revision: revision }),
  ChatControlRequest: { oneOf: ['ChatRegistryRead', 'ChatControlEventRead', 'ChatContactCheck', 'ChatConnectionCheck', 'ChatPrincipalCheck', 'ChatMetadataCheck'].map(ref) },
  ChatRegistryReply: exact({ schema_version: { const: 1 }, request_id: uuid, snapshot: ref('ChatRegistrySnapshot') }),
  ChatControlEventReply: exact({ schema_version: { const: 1 }, request_id: uuid, event: ref('ChatControlEvent') }),
  ChatReferenceReply: exact({ schema_version: { const: 1 }, request_id: uuid, status: { const: 'current' }, observed_revision: revision }),
  ChatControlFailure: exact({ schema_version: { const: 1 }, request_id: uuid, code: { enum: ['INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'REVOKED', 'DEPENDENCY_UNAVAILABLE'] } })
};
const schema = { $schema: 'http://json-schema.org/draft-07/schema#', $id: 'urn:agentic-crm:chat-control:v1', title: 'ChatControlProtocol', oneOf: ['ChatControlRequest', 'ChatRegistryReply', 'ChatControlEventReply', 'ChatReferenceReply', 'ChatControlFailure', 'ChatControlEvent', 'ChatControlNotice'].map(ref), definitions };
const operations = { 'registry-read': ['ChatRegistryRead', 'ChatRegistryReply'], 'event-read': ['ChatControlEventRead', 'ChatControlEventReply'], 'contact-check': ['ChatContactCheck', 'ChatReferenceReply'], 'connection-check': ['ChatConnectionCheck', 'ChatReferenceReply'], 'principal-check': ['ChatPrincipalCheck', 'ChatReferenceReply'], 'metadata-check': ['ChatMetadataCheck', 'ChatReferenceReply'] };
const wire = name => ({ description: 'Owner-authenticated read only; no cached authorization grant', headers: { 'Cache-Control': { schema: { const: 'no-store' } } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + name } } } });
const api = { openapi: '3.1.0', info: { title: 'Chat registry/control v1 — contract only, not deployed', version: '1.0.0' }, security: [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }],
  paths: Object.fromEntries(Object.entries(operations).map(([name, [input, output]]) => ['/internal/v1/chat-control/' + name, { post: { operationId: name, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + input } } } }, responses: { 200: wire(output), ...Object.fromEntries([400, 401, 403, 404, 409, 503].map(code => [code, wire('ChatControlFailure')])) } } }])),
  components: { securitySchemes: { workloadLocalService: { type: 'apiKey', in: 'header', name: 'x-workload-service', description: 'Only in explicitly selected http-local development/test mode (ADR-026); no automatic TLS downgrade' }, workloadLocalKey: { type: 'apiKey', in: 'header', name: 'x-workload-key', description: 'Private configured service key; trusted local network only, paired with service and current Identity tenant admission' }, workloadMTLS: { type: 'mutualTLS' } }, schemas: JSON.parse(JSON.stringify(definitions).replaceAll('#/definitions/', '#/components/schemas/')) } };
const outputs = {
  'packages/contracts/schemas/chat-control-v1.json': JSON.stringify(schema, null, 2) + '\n',
  'packages/contracts/src/generated/chat-control-v1.ts': await compile(schema, 'ChatControlProtocol', { bannerComment: '/* Generated private design contract. No endpoint deployment implied. */' }),
  'packages/contracts/src/generated/chat-control-v1-schema.ts': '/* Generated. Do not edit. */\nexport const chatControlV1Schema = ' + JSON.stringify(schema, null, 2) + ';\n',
  'docs/contracts/chat-control.openapi.json': JSON.stringify(api, null, 2) + '\n'
};
if (!check) { await mkdir('packages/contracts/src/generated', { recursive: true }); await mkdir('docs/contracts', { recursive: true }); }
for (const [path, body] of Object.entries(outputs)) {
  if (check) { if (await readFile(path, 'utf8').catch(() => '') !== body) throw new Error('Chat control contract drift: ' + path); }
  else await writeFile(path, body);
}
console.log('PASS Chat control schemas/types/OpenAPI' + (check ? ' match source' : ' generated'));
