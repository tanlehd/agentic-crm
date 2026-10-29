import { readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

// T01 private contract kit only. No handlers, database access or runtime enrollment.
const check = process.argv.includes('--check');
const uuid = { type: 'string', format: 'uuid' };
const str = (max = 128) => ({ type: 'string', minLength: 1, maxLength: max });
const rev = { type: 'string', pattern: '^[1-9][0-9]{0,19}$' };
const seq = { type: 'string', pattern: '^(0|[1-9][0-9]{0,19})$' };
const hash = { type: 'string', pattern: '^[0-9a-f]{64}$' };
const time = { type: 'string', format: 'date-time' };
const nullable = s => ({ anyOf: [s, { type: 'null' }] });
const array = (items, maxItems = 100) => ({ type: 'array', items, maxItems });
const exact = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, properties, required });
const ref = n => ({ $ref: '#/definitions/' + n });
const services = ['chat', 'identity', 'crm', 'connector', 'routing', 'ai-runtime', 'workflow', 'reporting', 'external-api', 'bff'];
const service = { enum: services };
const fields = { ...array(str(), 200), uniqueItems: true };
const definitions = {};
const source = JSON.parse(await readFile('packages/contracts/openapi.json', 'utf8'));
function imported(components, name, prefix, pointer = '#/components/schemas/') {
  const key = prefix + name;
  if (!(key in definitions)) {
    if (!components[name]) throw new Error('Missing source definition: ' + name);
    definitions[key] = {};
    const walk = value => {
      if (Array.isArray(value)) return value.map(walk);
      if (!value || typeof value !== 'object') return value;
      if (value.$ref) {
        if (!value.$ref.startsWith(pointer)) throw new Error('Unsupported source ref: ' + value.$ref);
        return imported(components, value.$ref.slice(pointer.length), prefix, pointer);
      }
      if (Array.isArray(value.type) && value.type.filter(t => t !== 'null').length > 1) {
        const { type, ...rest } = value;
        return { ...walk(rest), anyOf: type.map(t => ({ type: t })) };
      }
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
    };
    definitions[key] = walk(components[name]);
  }
  return ref(key);
}
const legacy = n => imported(source.components.schemas, n, 'Public_');
const schemaFiles = new Map();
async function fromFile(file, name) {
  if (!schemaFiles.has(file)) schemaFiles.set(file, JSON.parse(await readFile(`packages/contracts/schemas/${file}.json`, 'utf8')));
  return imported(schemaFiles.get(file).definitions, name, file.replaceAll('-', '_') + '_', '#/definitions/');
}
Object.assign(definitions, {
  OwnerActor: exact({ kind: { enum: ['human', 'app', 'service', 'ai'] }, principal_id: uuid, delegation_id: uuid }),
  OwnerResource: exact({ resource_id: uuid, object_key: str(64), record_version: seq, owner_revision: seq, control_revision: seq, owner_principal_id: nullable(uuid), team_id: nullable(uuid), shared_team_ids: { ...array(uuid, 200), uniqueItems: true }, archived: { type: 'boolean' } }),
  OwnerTarget: exact({ principal_id: nullable(uuid), kind: { enum: ['human', 'ai', null] }, team_id: nullable(uuid) }),
  OwnerMetadataPin: exact({ object_type_id: uuid, schema_revision: rev, snapshot_digest: hash }),
  OwnerCustomProperty: exact({ id: uuid, key: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,63}$' }, type: { enum: ['string', 'text', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'enum'] }, required: { type: 'boolean' }, indexed: { type: 'boolean' }, options: nullable(array(str(255))), version: rev }),
  OwnerMetadataSnapshot: exact({ tenant_id: uuid, object_type_id: uuid, object_key: { enum: ['conversation', 'conversation_session', 'conversation_need'] }, schema_revision: rev, properties: array(ref('OwnerCustomProperty'), 200), snapshot_digest: hash }),
  OwnerDependency: exact({ owner: service, receipt_id: uuid, binding_digest: hash }),
  OwnerGraph: exact({ graph_version_id: uuid, run_id: uuid, step_id: str(), attempt: rev, action_key: str(255) }),
  OwnerCommandBinding: exact({ tenant_id: uuid, command_id: uuid, owner: service, operation: str(160), actor: ref('OwnerActor'), resource: ref('OwnerResource'), target: nullable(ref('OwnerTarget')), session_id: nullable(uuid), fields, payload_digest: hash, legacy_receipt_key: str(512), graph: nullable(ref('OwnerGraph')), dependencies: array(ref('OwnerDependency'), 16) }),
  OwnerCommandRef: exact({ command_id: uuid, binding_digest: hash }),
  OwnerCommandTombstone: exact({ command_id: uuid, binding_digest: hash, state: { const: 'aborted' } }),
  OwnerRecoveryProof: { oneOf: [ref('OwnerCommandProof'), ref('OwnerCommandTombstone')] },
  OwnerCommandProof: exact({ binding: ref('OwnerCommandBinding'), binding_digest: hash, state: { enum: ['prepared', 'committed', 'aborted'] }, effect_id: nullable(uuid), effect_revision: nullable(rev), children: array(ref('OwnerDependency'), 16), candidate_digest: nullable(hash), resource_contexts: array(ref('OwnerResource')) }),
  OwnerAdmission: exact({ admission_id: uuid, command_id: uuid, binding_digest: hash, state: { enum: ['admitted', 'settled', 'denied'] }, auth_revision: rev, allowed_fields: fields }),
  OwnerBarrier: exact({ barrier_id: uuid, state: { enum: ['closing', 'completed'] }, pending_count: { type: 'integer', minimum: 0 }, auth_revision: rev }),
  OwnerCapacity: exact({ reservation_id: uuid, command_id: uuid, binding_digest: hash, session_id: uuid, principal_id: nullable(uuid), owner_revision: rev, state: { enum: ['reserved', 'confirmed', 'released', 'not-managed'] }, allocation_id: nullable(uuid), queue_version_id: nullable(uuid) }),
  OwnerReference: exact({ reservation_id: uuid, command_id: uuid, binding_digest: hash, resource_id: uuid, revision: rev, state: { enum: ['reserved', 'released', 'closing', 'archived', 'rejected'] } }),
  OwnerPage: exact({ limit: { type: 'integer', minimum: 1, maximum: 100 }, cursor: nullable(str(8192)), minimum_watermark: seq, fields }),
  OwnerFreshness: exact({ as_of: time, watermark: seq, state: { enum: ['ready', 'delayed', 'unavailable', 'partial'] }, next_cursor: nullable(str(8192)) }),
  OwnerFieldValue: { anyOf: [{ type: 'string', maxLength: 65536 }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }, array(str(1024), 200)] },
  OwnerProjectedRecord: exact({ id: uuid, version: rev, properties: { type: 'object', maxProperties: 200, patternProperties: { '^[a-zA-Z][a-zA-Z0-9_.]{0,127}$': ref('OwnerFieldValue') }, additionalProperties: false } }),
  OwnerBatchItem: { oneOf: [exact({ id: uuid, state: { const: 'found' }, record: ref('OwnerProjectedRecord') }), exact({ id: uuid, state: { enum: ['not_found', 'forbidden', 'unavailable'] } })] },
  OwnerBatch: exact({ data: array(ref('OwnerBatchItem')), freshness: ref('OwnerFreshness') }),
  OwnerSessionSource: exact({ conversation_id: uuid, session_id: nullable(uuid), crm_contact_id: uuid, source_touchpoint_id: nullable(uuid), source_classification: { enum: ['paid', 'organic', 'unknown'] }, source_channel: nullable(str(64)), source_connection_id: nullable(uuid), source_page_id: nullable(str(255)), source_ad_id: nullable(str(255)), source_campaign_id: nullable(str(255)), record_version: rev, session_revision: seq }),
  OwnerOutcome: exact({ need_id: uuid, state: { enum: ['absent', 'linked', 'ambiguous'] }, record_id: nullable(uuid), record_version: nullable(rev), reservation: nullable(ref('OwnerReference')) }),
  OwnerFact: exact({ id: uuid, conversation_id: uuid, session_id: nullable(uuid), need_id: nullable(uuid), actor_id: nullable(uuid), team_id: nullable(uuid), kind: { enum: ['session', 'stage_enter', 'stage_exit', 'milestone', 'contribution', 'reply_submitted', 'owner', 'coverage'] }, occurred_at: time, recorded_at: time, revision: rev, stage_key: nullable(str(64)), process_version_id: nullable(uuid), supersedes_id: nullable(uuid), coverage: { enum: ['full', 'partial', 'none'] } }),
  OwnerFacts: exact({ data: array(ref('OwnerFact'), 5000), freshness: ref('OwnerFreshness') }),
  OwnerActivityBinding: exact({ conversation_id: uuid, source_id: uuid, revision: rev, definition_version_id: nullable(uuid), visible: { type: 'boolean' } }),
  OwnerRecovery: exact({ outcome: { enum: ['recovered', 'already_recovered', 'not_assessed', 'assessment_changed', 'newer_session', 'thread_open', 'cooldown', 'stale_evidence', 'newer_evidence', 'need_not_clear', 'no_unresolved_reason', 'confidence_too_low', 'outcome_exists', 'outcome_unmapped'] }, conversation_id: uuid, session_id: nullable(uuid), owner_id: nullable(uuid) }),
  OwnerCapabilities: exact({ lineage: { const: 'crm_chat' }, capabilities: { ...array({ enum: ['workspace_read_v1', 'workspace_catalog_v1', 'activity_v1', 'owner_v1'] }, 4), uniqueItems: true }, watermark: seq }),
  OwnerFailure: exact({ schema_version: { const: 1 }, request_id: uuid, code: { enum: ['INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'REVOKED', 'NOT_FOUND', 'CONFLICT', 'STALE_VERSION', 'CAPACITY', 'INVALID_TRANSITION', 'LIMIT_EXCEEDED', 'REFERENCE_INVALID', 'PRECONDITION_REQUIRED', 'DEPENDENCY_UNAVAILABLE'] } })
});
const operations = [];
definitions.OwnerCommandBinding.properties.metadata = ref('OwnerMetadataPin');
definitions.OwnerCommandBinding.properties.session_write_fields = fields;
definitions.OwnerCommandBinding.properties.record_read_fields = fields;
definitions.OwnerCommandBinding.properties.need = exact({need_id:uuid,assessment_version:seq});
definitions.OwnerOutcomeSource = exact({resource:ref('OwnerResource'),source_digest:hash});
definitions.OwnerOutcomePin = exact({record_id:uuid,source:nullable(ref('OwnerOutcomeSource')),request_hash:hash,key:str(128),correlation_id:uuid});
definitions.OwnerCommandBinding.properties.outcome = ref('OwnerOutcomePin');
definitions.OwnerOutcomeReceipt = exact({command:ref('OwnerCommandRef'),state:{enum:['committed','aborted']},record_id:nullable(uuid)});
definitions.OwnerClassificationMetadata = exact({snapshot:ref('OwnerMetadataSnapshot'),definitions:array(exact({...definitions.OwnerCustomProperty.properties,label:str(255),default_value:{type:'null'},sensitive:{type:'boolean'}}),100)});
definitions.OwnerClassificationPolicy = exact({principal_id:uuid,auth_revision:rev,can_edit:{type:'boolean'},read_fields:fields,write_fields:fields});
definitions.OwnerInboxInputs = exact({ targets: array(exact({ kind: { enum: ['principal', 'team'] }, id: uuid }), 52), filter_fields: fields });
definitions.OwnerCommandBinding.properties.inbox_inputs = ref('OwnerInboxInputs');
definitions.OwnerProjectionPin = exact({ contact_id: uuid, connection_id: uuid });
definitions.OwnerCommandBinding.properties.projection = ref('OwnerProjectionPin');
definitions.OwnerContactSummary = exact({ id: uuid, display_name: { type: 'string', maxLength: 65536 }, normalized_phone: nullable({ type: 'string', maxLength: 65536 }), normalized_email: nullable({ type: 'string', maxLength: 65536 }) }, []);
definitions.OwnerConversationPolicy = exact({ principal_id: uuid, auth_revision: rev, owner_kind: { enum: ['human', 'ai', null] }, allowed_fields: fields, allowed_actions: array({ enum: ['reply','note','update','assign','takeover'] }, 5) });
definitions.OwnerAssignmentDirectory = exact({ principal_id: uuid, auth_revision: rev, resource: ref('OwnerResource'), team_id: nullable(uuid), candidates: array(exact({ id: uuid, kind: { enum: ['human','ai'] }, eligible: { type: 'boolean' }, reason: { enum: [null,'unavailable','team','capability','role','field','policy'] } }),200), teams: array(exact({ id: uuid, name: str(255), purpose: { enum: ['chat','sales','service','general'] } }),200) });
definitions.OwnerCommandBinding.properties.query_filter_fields = fields;
definitions.OwnerCommandBinding.properties.routing_snapshot = hash;
definitions.OwnerRoutingDispatchPin=exact({work_id:uuid,entry_id:uuid,queue_version_id:uuid});
definitions.OwnerCommandBinding.properties.routing_dispatch=ref('OwnerRoutingDispatchPin');
definitions.OwnerRoutingReroutePin=exact({work_id:uuid,work_version:rev,queue_version_id:uuid});
definitions.OwnerCommandBinding.properties.routing_reroute=ref('OwnerRoutingReroutePin');
definitions.OwnerRoutingSession = exact({session_id:uuid,conversation_id:uuid,connection_id:uuid,opened_at:time,closed_at:nullable(time),status:{enum:['active','closed']},owner_principal_id:nullable(uuid),team_id:nullable(uuid),owner_revision:rev,assigned_at:time});
definitions.OwnerRoutingSnapshot = exact({sessions:array(ref('OwnerRoutingSession'),1000),missing:array(uuid,500),snapshot_digest:hash});
definitions.OwnerRoutingReplyFact=exact({id:uuid,session_id:uuid,actor_id:uuid,team_id:nullable(uuid),recorded_at:time});
definitions.OwnerRoutingReplySnapshot=exact({facts:array(ref('OwnerRoutingReplyFact'),5000),replies:array(exact({principal_id:uuid,submitted_replies:{type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER}}),500),snapshot_digest:hash});
definitions.OwnerReadPredicate = exact({ all: { type: 'boolean' }, own: { type: 'boolean' }, team_ids: array(uuid, 200) });
definitions.OwnerRoutingViewSelection=exact({mine:{type:'boolean'},profile_ids:{...array(uuid,500),uniqueItems:true},conversation_ids:{...array(uuid,500),uniqueItems:true},session_ids:{...array(uuid,5000),uniqueItems:true},from:time});
definitions.OwnerCommandBinding.properties.routing_view=ref('OwnerRoutingViewSelection');
definitions.OwnerRoutingViewPolicy=exact({principal_id:uuid,auth_revision:rev,selection:ref('OwnerRoutingViewSelection'),read:ref('OwnerReadPredicate'),allowed_fields:fields});
definitions.OwnerRoutingViewDirectory=exact({policy_digest:hash,available:array(exact({principal_id:uuid,available:{type:'boolean'}}),500),principals:array(exact({id:uuid,name:str(500)}),500),teams:array(exact({id:uuid,name:str(500)}),200)});
definitions.OwnerRoutingViewChat=exact({policy_digest:hash,visible_ids:{...array(uuid,500),uniqueItems:true},replies:definitions.OwnerRoutingReplySnapshot.properties.replies,snapshot_digest:hash});
definitions.OwnerRoutingViewData={oneOf:[await fromFile('human-routing','human-routing-mine'),await fromFile('human-routing','human-routing-snapshot')]};
definitions.OwnerFunnelPolicy=exact({principal_id:uuid,auth_revision:rev,read:ref('OwnerReadPredicate'),fields_visible:{type:'boolean'}});
definitions.OwnerWorkspacePolicy = exact({ principal_id: uuid, auth_revision: rev, team_ids: array(uuid, 200), read: ref('OwnerReadPredicate'), update: ref('OwnerReadPredicate'), allowed_fields: fields, filter_fields: fields, tags_write: { type: 'boolean' }, inbox_manage_all: { type: 'boolean' }, rows: array(exact({ id: uuid, policy: ref('OwnerConversationPolicy') })) });
definitions.OwnerContactDecision = exact({ id: uuid, allowed: { type: 'boolean' }, fields });
definitions.OwnerContactBinding = exact({ connection_id: uuid, crm_contact_id: uuid, crm_identity_id: uuid, external_subject_digest: hash, mapping_revision: { const: '1' }, contact_revision: rev });
definitions.OwnerIngressReferences = exact({ ...definitions.OwnerContactBinding.properties, platform: { const: 'mock_messenger' }, connection_revision: { const: '1' } });
definitions.OwnerCommandBinding.properties.references = ref('OwnerIngressReferences');
definitions.OwnerIngressChannel = exact({ service_actor_id: uuid, team_id: uuid, channel_id: str(255) });
definitions.OwnerCommandBinding.properties.ingress_channel = ref('OwnerIngressChannel');
definitions.OwnerIngressTouchpoint = exact({ id: uuid, receipt_id: uuid, provider_message_digest: hash, occurred_at: time, ad_id: nullable(str(255)), campaign_id: nullable(str(255)) });
definitions.OwnerCommandBinding.properties.ingress_touchpoint = ref('OwnerIngressTouchpoint');
definitions.OwnerIngressResult = exact({ receipt_id: uuid, state: { enum: ['processed', 'failed'] }, conversation_id: nullable(uuid), message_id: nullable(uuid), touchpoint_id: nullable(uuid), session_id: nullable(uuid) });
definitions.OwnerCommandProof.properties.ingress_result = ref('OwnerIngressResult');
definitions.OwnerTouchpointReceipt = exact({ id: uuid, command: ref('OwnerCommandRef'), state: { enum: ['prepared', 'bound', 'discarded', 'cancelled'] }, conversation_id: nullable(uuid), message_id: nullable(uuid), session_id: nullable(uuid) });
definitions.OwnerIngressVerdict = exact({ input_digest: hash, state: { enum: ['valid', 'denied'] }, error_code: { enum: [null, 'CONTACT_BINDING_STALE', 'REVOKED'] }, service_actor_id: nullable(uuid), team_id: nullable(uuid) });
definitions.OwnerBoundaryFailure = definitions.OwnerFailure;
definitions.OwnerFailure = { oneOf: [ref('OwnerBoundaryFailure'), exact({ schema_version: { const: 1 }, request_id: uuid, code: { const: 'DOMAIN_ERROR' }, public_error: legacy('AuthErrorResponse') })] };
function operation(owner, name, callers, capability, mode, payload, result, publicRoute = null) {
  const key = owner + '-' + name;
  if (operations.some(o => o.key === key)) throw new Error('Duplicate operation ' + key);
  const input = 'Request_' + key, output = 'Reply_' + key;
  definitions[input] = exact({ schema_version: { const: 1 }, request_id: uuid, correlation_id: uuid, tenant_id: uuid, operation: { const: name }, ...(mode === 'read' || mode === 'command' ? { actor: ref('OwnerActor'), command_id: uuid } : {}), payload });
  definitions[output] = exact({ schema_version: { const: 1 }, request_id: uuid, tenant_id: uuid, result });
  operations.push({ key, owner, name, callers, capability, mode, input, output, publicRoute, acceptance: 'CO-' + String(capability).padStart(2, '0') });
}
const allOwners = ['chat', 'identity', 'crm', 'connector', 'routing', 'sales', 'ai-runtime', 'workflow', 'reporting'];
operation('crm', 'ingress-verdict', ['chat'], 1, 'recovery', exact({ connection_id: uuid, crm_contact_id: uuid, crm_identity_id: uuid, external_subject_digest: hash, mapping_revision: { const: '1' } }), ref('OwnerIngressVerdict'));
operation('connector', 'ingress-verdict', ['chat'], 1, 'recovery', exact({ connection_id: uuid, platform: { const: 'mock_messenger' } }), ref('OwnerIngressVerdict'));
operation('identity', 'ingress-verdict', ['chat'], 1, 'recovery', exact({ service_actor_id: uuid, team_id: uuid }), ref('OwnerIngressVerdict'));
for (const name of ['touchpoint-prepare', 'touchpoint-finalize']) operation('connector', name, ['chat'], 1, 'recovery', ref('OwnerCommandRef'), ref('OwnerTouchpointReceipt'));
services.push('sales');
for (const owner of allOwners.filter(o => o !== 'identity')) {
  for (const name of ['command-proof', 'command-abort']) operation(owner, name, ['identity', ...allOwners.filter(s => s !== owner)], 16, 'recovery', ref('OwnerCommandRef'), ref('OwnerRecoveryProof'));
}
operation('identity', 'admit', allOwners.filter(o => o !== 'identity'), 4, 'recovery', exact({ owner: service, command: ref('OwnerCommandRef') }), ref('OwnerAdmission'));
operation('identity', 'admission-read', allOwners.filter(o => o !== 'identity'), 4, 'recovery', exact({ owner: service, command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerAdmission'));
operation('identity', 'admission-cursor-subject', ['chat'], 2, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), exact({ account_id: uuid }));
operation('identity', 'admission-catalog-policy', ['chat'], 8, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), exact({ kind: { enum: ['tags', 'snippets'] }, principal_id: uuid, auth_revision: rev, can_read: { type: 'boolean' }, can_manage: { type: 'boolean' } }));
operation('identity', 'admission-conversation-policy', ['chat'], 2, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerConversationPolicy'));
operation('identity', 'admission-assignment-directory', ['chat','routing'], 4, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerAssignmentDirectory'));
operation('identity','admission-routing-view',['chat','routing','connector'],5,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerRoutingViewPolicy'));
operation('identity','routing-view-directory',['routing'],5,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerRoutingViewDirectory'));
operation('chat','routing-view',['routing'],5,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerRoutingViewChat'));
operation('connector','routing-view-connections',['routing'],5,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),exact({policy_digest:hash,data:array(exact({id:uuid,name:str(500),provider:str(100)}),201)}));
operation('routing', 'assignment-directory-capacity', ['chat'], 5, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), exact({ directory_digest: hash, data: array(exact({ id: uuid, eligible: { type: 'boolean' } }),200) }));
operation('chat','routing-proposal',['routing'],5,'read',exact({id:uuid,team_id:uuid}),ref('OwnerAssignmentDirectory'));
operation('chat','routing-dispatch',['routing'],5,'command',exact({resource:ref('OwnerResource'),session_id:uuid,target:exact({principal_id:uuid,kind:{const:'human'},team_id:uuid}),pin:ref('OwnerRoutingDispatchPin')}),exact({command:ref('OwnerCommandRef'),state:{const:'committed'},reconciliation:{enum:['pending','complete']}}));
operation('chat','routing-reroute-source',['routing'],5,'read',exact({id:uuid}),exact({resource:ref('OwnerResource'),session_id:uuid}));
operation('chat','routing-reroute',['routing'],5,'command',exact({resource:ref('OwnerResource'),session_id:uuid,target:exact({principal_id:nullable(uuid),kind:nullable({const:'human'}),team_id:uuid}),pin:ref('OwnerRoutingReroutePin')}),exact({command:ref('OwnerCommandRef'),state:{const:'committed'},reconciliation:{enum:['pending','complete']}}));
operation('identity', 'admission-workspace-policy', ['chat'], 7, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid, resources: array(ref('OwnerResource')) }), ref('OwnerWorkspacePolicy'));
operation('identity', 'admission-contact-batch-policy', ['crm'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid, resources: array(ref('OwnerResource')) }), exact({ principal_id: uuid, auth_revision: rev, data: array(ref('OwnerContactDecision')) }));
operation('crm', 'contact-summary-batch', ['chat'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid, ids: { ...array(uuid), uniqueItems: true } }), exact({ data: array(exact({ contact_id: uuid, summary: nullable(ref('OwnerContactSummary')) })) }));
operation('identity', 'admission-contact-policy', ['crm'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid, resource: ref('OwnerResource') }), exact({ principal_id: uuid, auth_revision: rev, allowed: { type: 'boolean' }, fields }));
operation('crm', 'contact-summary-read', ['chat'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), exact({ contact_id: uuid, summary: nullable(ref('OwnerContactSummary')) }));
operation('connector', 'detail-channel-read', ['chat'], 2, 'recovery', exact({ connection_id: uuid, conversation_id: uuid }), exact({ channel: { enum: ['mock_messenger','messenger'] }, channel_id: uuid, page_id: str(255), channel_name: str(255), attribution: exact({ source: { enum: ['unknown','ctm'] }, ad_id: nullable(str(255)), campaign_id: nullable(str(255)) }) }));
operation('connector', 'detail-channel-batch', ['chat'], 2, 'recovery', exact({ items: array(exact({ connection_id: uuid, conversation_id: uuid })) }), exact({ data: array(exact({ conversation_id: uuid, metadata: definitions['Reply_connector-detail-channel-read'].properties.result })) }));
operation('connector','source-channel-read',['chat'],12,'recovery',exact({connection_id:uuid,conversation_id:uuid}),exact({...definitions['Reply_connector-detail-channel-read'].properties.result.properties,source_touchpoint_id:nullable(uuid)}));
operation('identity', 'admission-inbox-policy', ['chat'], 7, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), exact({ principal_id: uuid, auth_revision: rev, team_ids: array(uuid, 200), can_manage_own: { type: 'boolean' }, can_manage_all: { type: 'boolean' }, can_share_own: { type: 'boolean' }, filter_fields: fields, directory: nullable(exact({ teams: array(exact({ id: uuid, name: str(255) }), 200), principals: array(exact({ id: uuid, name: str(255) }), 500) })) }));
operation('connector', 'catalog-connection-read', ['chat'], 7, 'recovery', exact({ connection_id: uuid }), exact({ connection_id: uuid }));
operation('connector', 'history-platform-read', ['chat'], 2, 'recovery', exact({ connection_id: uuid }), exact({ connection_id: uuid, platform: { const: 'mock_messenger' } }));
operation('crm', 'contact-binding-read', ['chat'], 1, 'recovery', exact({ connection_id: uuid, crm_contact_id: uuid, crm_identity_id: uuid, external_subject_id: str(255) }), ref('OwnerContactBinding'));
operation('connector', 'connection-binding-read', ['chat'], 1, 'recovery', exact({ connection_id: uuid }), exact({ connection_id: uuid, platform: { const: 'mock_messenger' }, connection_revision: { const: '1' }, channel_id: str(255), team_id: uuid }));
operation('connector', 'connection-ingress-read', ['chat'], 1, 'recovery', exact({ connection_id: uuid }), exact({ connection_id: uuid, platform: { const: 'mock_messenger' }, connection_revision: { const: '1' }, channel_id: str(255), team_id: uuid, service_actor_id: uuid }));
for(const action of ['disable','enable','status'])operation('connector','transport-'+action,['connector'],3,'recovery',exact({connection_id:uuid,barrier_id:uuid}),exact({connection_id:uuid,barrier_id:uuid,state:{enum:['disabled','enabled','absent']}}));
operation('identity', 'settle', allOwners.filter(o => o !== 'identity'), 16, 'recovery', exact({ owner: service, command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerAdmission'));
operation('identity', 'target-read', ['chat'], 4, 'recovery', exact({ principal_id: nullable(uuid), team_id: nullable(uuid) }), exact({ target: ref('OwnerTarget'), observed_revision: rev }));
operation('identity', 'principal-kind-read', ['chat'], 4, 'recovery', exact({ principal_id: nullable(uuid) }), exact({ principal_id: nullable(uuid), kind: { enum: ['human', 'ai', null] } }));
operation('identity', 'barrier-status', ['bff'], 16, 'recovery', exact({ barrier_id: uuid, delegation_id: uuid }), ref('OwnerBarrier'));
operation('identity', 'directory', ['chat', 'routing'], 7, 'read', exact({ kind: { enum: ['principals', 'teams', 'inbox-targets', 'assignment-targets'] }, page: ref('OwnerPage'), resource: nullable(ref('OwnerResource')) }), ref('OwnerBatch'));
for (const name of ['capacity-reserve', 'capacity-confirm', 'capacity-release', 'capacity-status']) operation('routing', name, ['chat'], 5, 'recovery', exact({ command: ref('OwnerCommandRef'), session_id: uuid, reservation_id: nullable(uuid) }), ref('OwnerCapacity'));
for (const owner of ['crm', 'connector']) for (const name of ['reference-reserve', 'reference-status', 'reference-release']) operation(owner, name, ['chat', 'sales'], 1, 'recovery', exact({ command: ref('OwnerCommandRef'), resource_id: uuid, kind: { enum: owner === 'crm' ? ['contact', 'mapping', 'metadata'] : ['connection', 'touchpoint'] }, expected_revision: rev, reservation_id: nullable(uuid) }), ref('OwnerReference'));
operation('chat', 'contact-archive-guard', ['crm'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), contact_id: uuid }), ref('OwnerReference'));
operation('crm', 'contact-lookup', ['chat', 'connector'], 1, 'read', exact({ connection_id: uuid, external_subject_id: str(255) }), await fromFile('contact-resolution', 'contact-lookup-response'));
operation('crm', 'contact-resolve', ['connector'], 1, 'command', exact({ connection_id: uuid, input: await fromFile('contact-resolution', 'contact-resolve-request') }), await fromFile('contact-resolution', 'contact-resolve-response'));
operation('crm', 'contact-batch', ['chat', 'sales'], 11, 'read', exact({ ids: { ...array(uuid), uniqueItems: true }, page: ref('OwnerPage') }), ref('OwnerBatch'));
operation('crm', 'metadata-read', ['chat', 'routing', 'workflow', 'reporting'], 9, 'read', exact({ object_key: { enum: ['conversation', 'conversation_session', 'conversation_need'] }, schema_revision: nullable(rev) }), legacy('crm-descriptor-response'));
operation('crm', 'metadata-schema-read', ['chat'], 9, 'recovery', exact({ object_key: { enum: ['conversation', 'conversation_session', 'conversation_need'] }, schema_revision: nullable(rev) }), ref('OwnerMetadataSnapshot'));
operation('connector', 'channel-batch', ['chat', 'routing', 'sales'], 2, 'read', exact({ ids: { ...array(uuid), uniqueItems: true }, page: ref('OwnerPage') }), ref('OwnerBatch'));
definitions.OwnerNotePin = exact({ body_digest: hash, request_hash: hash, key: str(128), correlation_id: uuid });
definitions.OwnerCommandBinding.properties.note = ref('OwnerNotePin');
definitions.OwnerNoteReceipt = exact({ command: ref('OwnerCommandRef'), state: { enum: ['committed','aborted'] }, activity_id: nullable(uuid), occurred_at: nullable(time) });
operation('identity', 'admission-note-child', ['crm'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerAdmission'));
operation('crm', 'note-create', ['chat'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), text: str(4000) }), ref('OwnerNoteReceipt'));
operation('crm', 'note-abort', ['chat'], 11, 'recovery', ref('OwnerCommandRef'), ref('OwnerNoteReceipt'));
definitions.OwnerNotePolicy = exact({ principal_id: uuid, auth_revision: rev, all: { type: 'boolean' }, own: { type: 'boolean' }, team_ids: array(uuid, 200), body: { type: 'boolean' } });
definitions.OwnerActivityPolicy = exact({ principal_id: uuid, auth_revision: rev, allowed_fields: fields, automation_read: { type: 'boolean' }, note_policy_digest: hash });
definitions.OwnerSessionProgressPolicy = exact({principal_id:uuid,auth_revision:rev,can_edit:{type:'boolean'}});
operation('identity','admission-session-progress-policy',['chat'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerSessionProgressPolicy'));
operation('identity','admission-funnel-policy',['chat'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerFunnelPolicy'));
operation('identity','admission-funnel-contact-policy',['crm'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,resources:array(ref('OwnerResource'),25)}),exact({principal_id:uuid,auth_revision:rev,visible_ids:{...array(uuid,25),uniqueItems:true}}));
operation('crm','funnel-contact-read',['chat'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,ids:{...array(uuid,100),uniqueItems:true}}),exact({visible_ids:{...array(uuid,100),uniqueItems:true}}));
operation('identity','admission-classification-policy',['chat'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerClassificationPolicy'));
operation('crm','classification-metadata-read',['chat'],9,'recovery',exact({schema_revision:nullable(rev)}),ref('OwnerClassificationMetadata'));
operation('crm','need-metadata-read',['chat'],10,'recovery',exact({schema_revision:nullable(rev)}),ref('OwnerClassificationMetadata'));
operation('identity','admission-need-policy',['chat'],10,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerClassificationPolicy'));
operation('identity','admission-need-outcomes-policy',['sales'],10,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,resources:array(ref('OwnerResource'),25)}),exact({principal_id:uuid,auth_revision:rev,data:array(exact({id:uuid,visible:{type:'boolean'},can_link:{type:'boolean'}}),25)}));
operation('identity','admission-outcome-link-policy',['sales'],10,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,resource:ref('OwnerResource')}),exact({principal_id:uuid,auth_revision:rev,allowed:{type:'boolean'}}));
operation('sales','outcome-link-inspect',['chat'],10,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),ref('OwnerOutcomeSource'));
operation('sales','outcome-link-apply',['chat'],10,'recovery',ref('OwnerCommandRef'),ref('OwnerOutcomeReceipt'));
operation('sales','outcome-link-abort',['chat'],10,'recovery',ref('OwnerCommandRef'),ref('OwnerOutcomeReceipt'));
operation('sales','need-outcomes-list',['chat'],10,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),exact({data:array(exact({id:uuid,label:str(255),linked:{type:'boolean'},can_link:{type:'boolean'}}),100)}));
for(const owner of ['crm','sales'])operation(owner,'contribution-sources-read',['chat'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,ids:{...array(uuid,50),uniqueItems:true}}),exact({visible_ids:{...array(uuid,50),uniqueItems:true}}));
operation('identity','admission-contribution-sales-policy',['sales'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,resources:array(ref('OwnerResource'),50)}),exact({principal_id:uuid,auth_revision:rev,visible_ids:{...array(uuid,50),uniqueItems:true}}));
operation('identity','admission-session-contact-policy',['crm'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid,resource:ref('OwnerResource')}),exact({principal_id:uuid,auth_revision:rev,allowed:{type:'boolean'}}));
operation('crm','session-contact-read',['chat'],9,'recovery',exact({command:ref('OwnerCommandRef'),admission_id:uuid}),exact({contact_id:uuid,version:rev}));
operation('identity', 'admission-activity-policy', ['chat','workflow'], 13, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerActivityPolicy'));
const activityBatch = exact({ command: ref('OwnerCommandRef'), admission_id: uuid, ids: { ...array(uuid,2000), uniqueItems: true }, limit: { type: 'integer', minimum: 1, maximum: 100 } });
const sourceState = { enum: ['ready','delayed','unavailable'] };
operation('crm', 'activity-notes', ['chat'], 13, 'recovery', activityBatch, exact({ policy_digest: hash, state: sourceState, data: array(exact({ activity_id: uuid, body: nullable({ type: 'string', maxLength: 65536 }) },['activity_id'])) }));
operation('workflow', 'activity-runs', ['chat'], 13, 'recovery', activityBatch, exact({ policy_digest: hash, state: sourceState, data: array(exact({ run_id: uuid, definition_version_id: uuid, revision: rev })) }));
operation('identity', 'admission-note-policy', ['crm'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid }), ref('OwnerNotePolicy'));
operation('crm', 'note-list', ['chat'], 11, 'recovery', exact({ command: ref('OwnerCommandRef'), admission_id: uuid, limit: { type: 'integer', minimum: 1, maximum: 100 }, cursor: nullable(uuid) }), await fromFile('conversation', 'conversation-notes'));
operation('crm', 'note-read', ['chat'], 11, 'read', exact({ conversation_id: uuid, activity_id: uuid }), ref('OwnerProjectedRecord'));
for (const owner of ['crm', 'workflow']) operation(owner, 'activity-binding', ['chat'], 13, 'read', exact({ conversation_id: uuid, source_id: uuid, minimum_revision: rev }), ref('OwnerActivityBinding'));
definitions.OwnerActivityNotificationBinding = exact({ conversation_id: uuid, source_id: uuid, revision: rev, definition_version_id: nullable(uuid), projection: nullable(exact({contact_id:uuid,connection_id:uuid})) });
for (const owner of ['crm','workflow']) operation(owner,'activity-notification-binding',['chat'],13,'recovery',exact({conversation_id:uuid,source_id:uuid,minimum_revision:rev}),ref('OwnerActivityNotificationBinding'));
operation('chat', 'session-source', ['sales', 'workflow'], 12, 'read', exact({ conversation_id: uuid, session_id: nullable(uuid), contact_id: uuid }), ref('OwnerSessionSource'));
operation('sales', 'session-link', ['chat', 'workflow', 'crm'], 12, 'command', exact({ record_id: uuid, expected_version: rev, source: ref('OwnerSessionSource') }), await fromFile('customer360', 'sales-session-response'));
operation('sales', 'need-outcome-link', ['chat'], 10, 'command', exact({ conversation_id: uuid, session_id: uuid, need_id: uuid, record_id: uuid, contact_id: uuid, expected_version: rev }), ref('OwnerOutcome'));
operation('sales', 'need-outcome-read', ['chat', 'workflow'], 10, 'read', exact({ conversation_id: uuid, session_id: uuid, need_id: uuid, contact_id: uuid }), ref('OwnerOutcome'));
for (const name of ['outcome-reserve', 'outcome-release', 'outcome-status']) operation('sales', name, ['chat'], 10, 'recovery', exact({ command: ref('OwnerCommandRef'), conversation_id: uuid, session_id: uuid, need_id: uuid, reservation_id: nullable(uuid) }), ref('OwnerOutcome'));
operation('chat', 'recover-need', ['workflow'], 10, 'command', exact({ conversation_id: uuid, session_id: uuid, need_id: uuid, assessment_version: rev, team_id: uuid, preference: { enum: ['human', 'ai', 'any'] }, min_confidence: { type: 'number', minimum: 0, maximum: 1 }, cooldown_seconds: { type: 'integer', minimum: 0, maximum: 31536000 }, max_age_seconds: { type: 'integer', minimum: 1, maximum: 31536000 }, graph: ref('OwnerGraph') }), ref('OwnerRecovery'));
operation('chat', 'record-batch', ['crm', 'routing', 'workflow', 'reporting'], 15, 'read', exact({ ids: { ...array(uuid), uniqueItems: true }, page: ref('OwnerPage') }), ref('OwnerBatch'));
operation('chat', 'custom-values-patch', ['crm'], 9, 'command', exact({ conversation_id: uuid, expected_version: rev, schema_revision: rev, input: legacy('crm-record-patch'), hydrate_record: { const: true } }, ['conversation_id','expected_version','schema_revision','input']), legacy('crm-record-response'));
operation('chat', 'record-get', ['crm'], 15, 'read', exact({ id: uuid }), legacy('crm-record-response'));
operation('chat', 'record-patch', ['crm'], 15, 'command', exact({ id: uuid, expected_version: nullable(rev), idempotency_key: str(128), body: legacy('crm-record-patch') }), legacy('crm-record-response'));
operation('chat', 'record-archive', ['crm'], 15, 'command', exact({ conversation_id: uuid, expected_version: rev, input: legacy('crm-archive') }), legacy('crm-record-response'));
for (const name of ['routing-facts', 'conversion-facts', 'stage-facts', 'progress-facts']) operation('chat', name, ['reporting', 'routing'], 14, 'read', exact({ session_ids: { ...array(uuid, 5000), uniqueItems: true }, from: time, to: time, as_of: time, process_version_id: nullable(uuid), page: ref('OwnerPage') }), ref('OwnerFacts'));
operation('chat', 'routing-active', ['routing'], 5, 'read', exact({ principal_ids: { ...array(uuid, 500), uniqueItems: true }, connection_ids: { ...array(uuid, 500), uniqueItems: true }, all_channels: { type: 'boolean' }, page: ref('OwnerPage') }), ref('OwnerBatch'));
operation('chat','routing-sync-snapshot',['routing'],5,'read',exact({principal_ids:{...array(uuid,500),uniqueItems:true},connection_ids:{...array(uuid,500),uniqueItems:true},all_channels:{type:'boolean'},known_session_ids:{...array(uuid,500),uniqueItems:true}}),ref('OwnerRoutingSnapshot'));
operation('chat','routing-reply-facts',['routing'],5,'read',exact({session_ids:{...array(uuid,5000),uniqueItems:true},from:{type:'string',pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$',format:'date-time'},mode:{enum:['aggregate','facts']}}),ref('OwnerRoutingReplySnapshot'));
operation('chat', 'runtime-capabilities', ['bff', 'crm'], 16, 'read', exact({}), ref('OwnerCapabilities'));
definitions.OwnerInferenceContext = exact({ conversation_id: uuid, owner_revision: rev, control_revision: rev, messages: array(exact({ id: uuid, direction: { enum: ['inbound', 'outbound'] }, text: { type: 'string', maxLength: 10000 }, text_source: { enum: ['original', 'preview', 'extracted'] } }), 20), contact: nullable(ref('OwnerProjectedRecord')), input_digest: hash });
operation('chat', 'agent-context', ['ai-runtime'], 6, 'read', exact({ conversation_id: uuid, message_id: uuid, expected_owner_revision: rev, expected_control_revision: rev }), ref('OwnerInferenceContext'));
operation('chat', 'inbound-next', ['workflow'], 6, 'read', exact({ conversation_id: uuid, purpose: { enum: ['consent', 'inference'] }, used_message_ids: { ...array(uuid, 1000), uniqueItems: true }, expected_control_revision: rev }), exact({ message: nullable(exact({ id: uuid, text: { type: 'string', maxLength: 10000 }, text_source: { enum: ['original', 'preview', 'extracted'] } })) }));
operation('chat', 'prompt-submit', ['ai-runtime'], 6, 'command', exact({ conversation_id: uuid, crm_contact_id: uuid, expected_owner_revision: rev, expected_control_revision: rev, graph: ref('OwnerGraph'), text: str(10000) }), await fromFile('conversation', 'conversation-send-response'));
operation('chat', 'read-need', ['workflow'], 10, 'read', exact({ conversation_id: uuid, session_id: uuid, need_id: uuid, assessment_version: rev }), exact({ current: { type: 'boolean' }, assessment_status: { enum: ['', 'unassessed', 'insufficient', 'assessed'] }, need_clarity: { enum: ['', 'none', 'ambiguous', 'clear'] }, intent: { enum: ['', 'research', 'buy', 'support', 'cancel', 'other'] }, product_interest: { type: 'string', maxLength: 65536 }, unresolved_reason: { type: 'string', maxLength: 65536 } }));
operation('sales', 'contribution-visible', ['chat'], 12, 'read', exact({ context_id: uuid, session_id: uuid }), exact({ visible: { type: 'boolean' } }));
// Retained unmounted design shape only: CHG-20261024-01 removes the reverse outcome mirror from D3 gates.
// Sales source lineage supplies conversion; see docs/contracts/chat-sales-conversion-boundary.md.
operation('chat', 'contribution-apply', ['sales'], 12, 'recovery', exact({ command: ref('OwnerCommandRef'), conversation_id: uuid, session_id: uuid, source_context_id: uuid, source_revision: rev, kind: { const: 'outcome' }, record_id: uuid, role: { enum: ['created', 'follow_up', 'closing'] }, admitted_resource: ref('OwnerResource') }), exact({ contribution_id: uuid, revision: rev }));
definitions.OwnerSnapshot = exact({ snapshot_id: uuid, dataset: { enum: ['routing', 'conversion', 'stage', 'progress'] }, watermark: seq, digest: hash, as_of: time, row_count: { type: 'integer', minimum: 0, maximum: 20000 }, state: { enum: ['prepared', 'valid', 'changed', 'released'] } });
definitions.OwnerSnapshotRow = { oneOf: [
  exact({ kind: { const: 'session' }, id: uuid, conversation_id: uuid, sequence: rev, version: rev, status: { enum: ['active', 'closed'] }, opening_reason: str(32), close_reason: nullable(str(32)), opened_at: time, opening_occurred_at: time, closed_at: nullable(time), source_classification: { enum: ['paid', 'organic', 'unknown'] }, source_channel: nullable(str(32)), source_page_id: nullable(str(255)), source_ad_id: nullable(str(255)), source_campaign_id: nullable(str(255)), source_connection_id: nullable(uuid), source_touchpoint_id: nullable(uuid), initial_owner_id: nullable(uuid), initial_team_id: nullable(uuid), owner_principal_id: nullable(uuid), team_id: nullable(uuid), owner_revision: rev, record_version: rev, process_version: nullable(rev), stage_key: nullable(str(64)), coverage: { enum: ['full', 'partial', 'none'] }, progress_at: nullable(time) }),
  exact({ kind: { const: 'need' }, id: uuid, session_id: uuid, created_at: time }),
  exact({ kind: { const: 'stage' }, id: uuid, session_id: uuid, revision: rev, from_stage: nullable(str(64)), to_stage: str(64), recorded_at: time }),
  exact({ kind: { const: 'milestone' }, id: uuid, session_id: uuid, need_id: uuid, revision: rev, milestone_key: str(64), action: { enum: ['record', 'replace', 'retract'] }, supersedes_id: nullable(uuid), message_id: nullable(uuid), occurred_at: time, recorded_at: time }),
  exact({ kind: { const: 'process' }, version: rev, definition: await fromFile('session-progress', 'session-process-input') }),
  exact({ kind: { const: 'reply' }, id: uuid, session_id: uuid, actor_id: uuid, team_id: nullable(uuid), recorded_at: time }),
  exact({ kind: { const: 'routing-session' }, session_id: uuid, conversation_id: uuid, connection_id: uuid, opened_at: time, closed_at: nullable(time), status: { enum: ['active', 'closed'] }, owner_principal_id: nullable(uuid), team_id: nullable(uuid), owner_revision: rev, assigned_at: time })
] };
for (const name of ['snapshot-prepare', 'snapshot-validate', 'snapshot-release']) operation('chat', name, ['reporting', 'routing'], 14, name === 'snapshot-prepare' ? 'read' : 'recovery', name === 'snapshot-prepare' ? exact({ dataset: { enum: ['routing', 'conversion', 'stage', 'progress'] }, from: time, to: time, as_of: time, process_version: nullable(rev) }) : exact({ snapshot_id: uuid, digest: hash, watermark: seq }), ref('OwnerSnapshot'));
operation('chat', 'snapshot-page', ['reporting', 'routing'], 14, 'read', exact({ snapshot_id: uuid, digest: hash, page: ref('OwnerPage') }), exact({ rows: array(ref('OwnerSnapshotRow')), snapshot: ref('OwnerSnapshot'), freshness: ref('OwnerFreshness') }));
// Domain-specific fact operations use the same lossless source row representation and snapshot binding.
for (const o of operations.filter(o => ['routing-facts', 'conversion-facts', 'stage-facts', 'progress-facts'].includes(o.name))) {
  definitions[o.input].properties.payload.properties.snapshot_id = uuid;
  definitions[o.input].properties.payload.required.push('snapshot_id');
  definitions[o.output].properties.result = exact({ rows: array(ref('OwnerSnapshotRow')), snapshot: ref('OwnerSnapshot'), freshness: ref('OwnerFreshness') });
}
definitions.OwnerChildResult = exact({ child_id: uuid, parent_run_id: uuid, state: { enum: ['pending', 'completed', 'cancelled', 'failed'] }, outcome: nullable(str(64)), lead_id: nullable(uuid) });
for (const owner of ['sales']) {
  operation(owner, 'child-start', ['workflow'], 13, 'command', exact({ graph: ref('OwnerGraph'), input: exact({ lead_id: uuid, target_team_id: uuid, expected_version: rev }) }), ref('OwnerChildResult'));
  for (const name of ['child-status']) operation(owner, name, ['workflow'], 13, name === 'child-status' ? 'read' : 'command', exact({ child_id: uuid, parent_run_id: uuid, graph: ref('OwnerGraph') }), ref('OwnerChildResult'));
}
// Existing schemas are reused for actual public routes; no DTO retyping or implicit widening.
function group(path) {
  if (/needs/.test(path)) return 10;
  if (/classification|contributions|session-process|session-funnel|\/progress|acquisition-sessions/.test(path)) return 9;
  if (/notes|activity/.test(path)) return 11;
  if (/assignment|takeover|ownership-history|transition/.test(path)) return 4;
  if (/snippets|\/tags|snooze|wake/.test(path)) return 8;
  if (/chat-workspace/.test(path)) return 7;
  if (/messages-v2|outbound-intents/.test(path)) return 3;
  return 2;
}
for (const [path, methods] of Object.entries(source.paths)) {
  if (!/^\/api\/v1\/(conversations(?:\/|$)|conversation-channels$|chat-workspace\/|session-process$|session-funnel$|records\/\{id\}\/(assignment|assignment-targets|assignment-teams|ownership-history)$)/.test(path)) continue;
  for (const [method, spec] of Object.entries(methods)) {
    const props = {}, required = [];
    for (const p of spec.parameters ?? []) {
      if (!['path', 'query'].includes(p.in)) continue;
      props[p.name] = p.schema;
      if (p.required) required.push(p.name);
    }
    const body = spec.requestBody?.content?.['application/json']?.schema;
    if (body) { props.body = body.$ref ? legacy(body.$ref.split('/').at(-1)) : body; required.push('body'); }
    if (method !== 'get') { props.expected_version = nullable(seq); props.idempotency_key = str(128); required.push('expected_version', 'idempotency_key'); }
    const replies = Object.entries(spec.responses).filter(([c]) => /^2/.test(c)).map(([, r]) => r.content?.['application/json']?.schema).filter(Boolean).map(s => s.$ref ? legacy(s.$ref.split('/').at(-1)) : s);
    const unique = [...new Map(replies.map(r => [JSON.stringify(r), r])).values()];
    operation('chat', spec.operationId, ['bff', ...(method === 'get' ? ['ai-runtime', 'workflow'] : ['workflow', 'routing'])], path.endsWith('/messages') && method === 'post' ? 3 : group(path), method === 'get' ? 'read' : 'command', exact(props, required), unique.length > 1 ? { anyOf: unique } : unique[0] ?? exact({}), method.toUpperCase() + ' ' + path);
  }
}
const external = JSON.parse(await readFile('docs/developer/openapi.json', 'utf8'));
const externalRequests = [];
for (const [path, methods] of Object.entries(external.paths)) if (path.includes('/conversations')) {
  const spec = methods.get; if (!spec) continue;
  const properties = {}, required = [];
  for (const p of spec.parameters ?? []) if (['path', 'query'].includes(p.in)) { properties[p.name] = p.schema; if (p.required) required.push(p.name); }
  const s = spec.responses['200'].content['application/json'].schema;
  const response = imported({ ...external.components.schemas, [spec.operationId]: s }, spec.operationId, 'External_');
  const name='external-' + path.replace(/^.*?conversations/, 'conversations').replaceAll(/[{}]/g, '').replaceAll('/', '-');
  operation('chat', name, ['bff'], 15, 'read', exact(properties, required), response, 'GET ' + path);
  externalRequests.push(ref('Request_chat-'+name));
}
definitions.OwnerExternalReadPolicy=exact({admission:ref('OwnerAdmission'),app_id:uuid,policy_key:str(128),predicates:array(exact({all:{type:'boolean'},team_ids:array(uuid,20)}),2)});
operation('chat','external-prepare',['bff'],15,'recovery',{anyOf:externalRequests},ref('OwnerCommandRef'));
operation('identity','external-policy',['chat'],15,'recovery',ref('OwnerCommandRef'),ref('OwnerExternalReadPolicy'));
// Eight exact existing Chat payloads; envelope version does not rewrite payload schema versions.
const subscriptions = [
  ['chat.read-marker.v1', 'chat', 'chat.read_marker.updated', 'chat-workspace', 'workspace-read-event'],
  ['chat.snooze.v1', 'chat', 'chat.snooze.changed', 'chat-activity', 'snooze-event'],
  ['chat.inbox.changed.v1', 'chat', 'chat.inbox.changed', 'chat-catalogs', 'catalog-inbox-event'],
  ['chat.snippet.changed.v1', 'chat', 'chat.snippet.changed', 'chat-catalogs', 'catalog-snippet-event'],
  ['chat.tag_definition.changed.v1', 'chat', 'chat.tag_definition.changed', 'chat-catalogs', 'catalog-tag-event'],
  ['chat.conversation-tag.v1', 'chat', 'chat.conversation_tag.changed', 'chat-catalogs', 'catalog-tag-link-event'],
  ['chat.activity.note.v1', 'crm', 'crm.conversation_note.changed', 'chat-activity', 'activity-note-event'],
  ['chat.activity.automation.v1', 'workflow', 'automation.conversation_activity.v1', 'chat-activity', 'activity-automation-event'],
];
const eventBase = { event_id: uuid, tenant_id: uuid, aggregate_id: uuid, aggregate_type: str(64), aggregate_version: rev, stream_sequence: rev, occurred_at: time, correlation_id: str(128), causation_id: nullable(str(128)), actor: exact({ kind: { enum: ['human', 'ai', 'service', 'system'] }, id: uuid }) };
const chatEvents = [];
// Definition insertion order is part of reproducible artifacts; imports mutate the shared catalog.
for (const [consumer, producer, event_type, file, def] of subscriptions) chatEvents.push(exact({ ...eventBase, producer: { const: producer }, consumer: { const: consumer }, event_type: { const: event_type }, schema_version: { const: 1 }, data: await fromFile(file, def) }));
definitions.OwnerChatEvent = { oneOf: chatEvents };
definitions.OwnerEventNotice = exact({ producer: service, consumer: str(160), event_id: uuid, event_type: str(128), schema_version: { type: 'integer', minimum: 1, maximum: 3 }, aggregate_id: uuid, stream_sequence: rev, digest: hash });
definitions.OwnerEventReceipt = exact({ event_id: uuid, consumer: str(160), producer: service, digest: hash, state: { enum: ['pending', 'applied', 'duplicate', 'reconciled', 'quarantined'] }, watermark: seq });
const eventVariants = [];
function domainEvent(producer, event_type, version, data) {
  eventVariants.push(exact({ ...eventBase, producer: { const: producer }, event_type: { const: event_type }, schema_version: { const: version }, data }));
}
domainEvent('identity', 'principal.access_changed', 1, exact({ principal_id: uuid, auth_revision: rev }));
domainEvent('chat', 'conversation.created', 1, exact({ contact_id: uuid, connection_id: uuid }));
for (const event of ['acquisition_session.opened', 'acquisition_session.closed']) domainEvent('chat', event, 1, exact({ session_id: uuid, conversation_id: uuid, status: { enum: ['active', 'closed'] }, source_classification: { enum: ['paid', 'organic', 'unknown'] }, source_ad_id: nullable(str(255)), sequence: rev }));
const needData = { conversation_id: uuid, session_id: uuid, need_id: uuid, assessment_version: rev, contact_id: uuid, connection_id: uuid };
domainEvent('chat', 'need.assessed', 2, exact(needData));
const { conversation_id: oldThread, ...needRest } = needData;
domainEvent('chat', 'need.assessed', 1, exact({ thread_id: oldThread, ...needRest }));
domainEvent('chat', 'record.assigned', 1, exact({ record_id: uuid, object_type: { const: 'conversation' }, from_owner_id: nullable(uuid), to_owner_id: nullable(uuid), team_id: nullable(uuid), owner_revision: rev, reason: str(1000) }));
domainEvent('sales', 'lead.accepted', 1, exact({ lead_id: uuid, handoff_id: uuid, accepted_by: uuid, accepted_at: time }));
// Strict baseline42 history; no new subscription or effect is introduced.
domainEvent('chat','message.received',1,exact({conversation_id:uuid,message_id:uuid,connection_id:uuid}));
domainEvent('chat','message.sent',1,exact({conversation_id:uuid,message_id:uuid,outbound_intent_id:uuid}));
domainEvent('chat','message.delivery_failed',1,exact({conversation_id:uuid,outbound_intent_id:uuid,error_code:nullable(str(64))}));
domainEvent('chat','conversation.classification_changed',2,exact({conversation_id:uuid,session_id:uuid,version:rev,changed_keys:array(str(128))}));
// Retained source43 history preserves the original v1 thread_id payload.
domainEvent('chat','conversation.classification_changed',1,exact({thread_id:uuid,session_id:uuid,version:rev,changed_keys:array(str(128))}));
domainEvent('sales','sales.stage_changed',1,exact({object_kind:{enum:['lead','deal']},subject_id:uuid,sequence:rev,from_stage:nullable(str(64)),to_stage:str(64)}));
domainEvent('chat','session.progress_changed',1,exact({session_id:uuid,revision:rev,action:{enum:['enroll','stage','need','identify_need','record','replace','retract']}}));
domainEvent('crm','contact.created',1,exact({contact_id:uuid}));
domainEvent('sales','lead.created',1,exact({lead_id:uuid,contact_id:uuid,conversation_id:nullable(uuid)}));
domainEvent('sales','lead.qualified',1,exact({lead_id:uuid,qualified_at:time,source_touchpoint_id:nullable(uuid)}));
domainEvent('sales','lead.handoff_requested',1,exact({lead_id:uuid,handoff_id:uuid,target_team_id:uuid,due_at:nullable(time)}));
for(const event of ['deal.created','deal.won'])domainEvent('sales',event,1,exact({deal_id:uuid,contact_id:uuid,lead_id:nullable(uuid)}));
for(const producer of ['crm','sales'])domainEvent(producer,'record.assigned',1,exact({record_id:uuid,object_type:producer==='sales'?{enum:['lead','deal']}:str(128),from_owner_id:nullable(uuid),to_owner_id:nullable(uuid),team_id:nullable(uuid),owner_revision:rev,reason:str(1000)}));
definitions.OwnerDomainEvent = { oneOf: eventVariants };
definitions.OwnerControlEvent = await fromFile('chat-control-v1', 'ChatControlEvent');
definitions.OwnerEventPayload = { oneOf: [ref('OwnerChatEvent'), exact({ notice: ref('OwnerEventNotice') })] };
definitions.OwnerEventReadResult = { oneOf: [ref('OwnerChatEvent'), ref('OwnerDomainEvent'), ref('OwnerControlEvent')] };
for (const owner of allOwners) {
  for (const name of ['event-deliver', 'event-status']) operation(owner, name, allOwners, 16, 'recovery', name === 'event-deliver' ? ref('OwnerEventPayload') : ref('OwnerEventNotice'), ref('OwnerEventReceipt'));
  operation(owner, 'event-replay', allOwners, 16, 'recovery', exact({ consumer: str(160), aggregate_id: uuid, after_sequence: seq, limit: { type: 'integer', minimum: 1, maximum: 100 } }), exact({ events: array(ref('OwnerEventNotice')), high_watermark: seq }));
  operation(owner, 'event-read', allOwners, 16, 'recovery', ref('OwnerEventNotice'), ref('OwnerEventReadResult'));
}
const schema = { $schema: 'http://json-schema.org/draft-07/schema#', $id: 'urn:agentic-crm:chat-owner:v1', title: 'ChatOwnerProtocol', oneOf: operations.flatMap(o => [ref(o.input), ref(o.output)]).slice(0, 0), definitions };
// Reply correlation is operation-specific, so export named schemas rather than an ambiguous reply union.
delete schema.oneOf;
schema.$ref = ref('OwnerCommandBinding').$ref;
const response = name => ({ description: 'Contract only; current owner authentication and binding validation required', content: { 'application/json': { schema: { $ref: '#/components/schemas/' + name } } } });
const api = { openapi: '3.1.0', info: { title: 'Chat owner v1 — T01 contract, not deployed', version: '1.0.0' }, security: [{ workloadMTLS: [] }, { workloadLocalService: [], workloadLocalKey: [] }], paths: Object.fromEntries(operations.map(o => [`/internal/v1/owners/${o.owner}/${o.name}`, { post: { operationId: o.key, 'x-callers': o.callers, 'x-capability': o.capability, 'x-admission': o.mode, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + o.input } } } }, responses: { 200: response(o.output), ...Object.fromEntries([400, 401, 403, 404, 409, 422, 428, 503].map(c => [c, response('OwnerFailure')])) } } }])), components: { securitySchemes: { workloadLocalService: { type: 'apiKey', in: 'header', name: 'x-workload-service', description: 'Only in explicitly selected http-local development/test mode (ADR-026); no automatic TLS downgrade' }, workloadLocalKey: { type: 'apiKey', in: 'header', name: 'x-workload-key', description: 'Private configured service key; trusted local network only, paired with service and current Identity tenant admission' }, workloadMTLS: { type: 'mutualTLS' } }, schemas: JSON.parse(JSON.stringify(definitions).replaceAll('#/definitions/', '#/components/schemas/')) } };
const typeParts = [];
// Compile one root referencing every named definition, preserving exact literal request discriminants.
const typesSchema = { ...schema, anyOf: Object.keys(definitions).map(ref) };
delete typesSchema.$ref;
typeParts.push(await compile(typesSchema, 'ChatOwnerProtocol', { bannerComment: '/* Generated T01 private design contract. No runtime deployment implied. */', unreachableDefinitions: true }));
const outputs = {
  'packages/contracts/schemas/chat-owner-v1.json': JSON.stringify(schema, null, 2) + '\n',
  'packages/contracts/src/generated/chat-owner-v1.ts': typeParts.join('\n'),
  'packages/contracts/src/generated/chat-owner-v1-schema.ts': '/* Generated. Do not edit. */\nexport const chatOwnerV1Schema = ' + JSON.stringify(schema, null, 2) + ';\n',
  'docs/contracts/chat-owner.openapi.json': JSON.stringify(api, null, 2) + '\n',
  'docs/architecture/chat-owner-operations.json': JSON.stringify({ version: 1, runtimeImplemented: false, operations, subscriptions: subscriptions.map(([consumer, producer, event_type]) => ({ consumer, producer, event_type })) }, null, 2) + '\n',
  'docs/contracts/chat-owner-operations.md': '# Chat owner operation catalog v1\n\nGenerated by `scripts/generate-chat-owner-contracts.mjs`. Design only; see [normative protocol](chat-owner-v1.md), [capability policies](../architecture/chat-owner-consumers.md) and [acceptance](../quality/chat-owner-contract-acceptance.md). All private routes POST `/internal/v1/owners/{owner}/{operation}`; DTO names resolve in [OpenAPI](chat-owner.openapi.json). Public mappings preserve existing verbs/routes and typed bodies.\n\n| Capability / acceptance | Operation / owner | Callers | Admission | Exact request → response | Public adapter |\n|---|---|---|---|---|---|\n' + operations.filter(o => !(o.owner === 'chat' && ['recover-need', 'contribution-apply', 'snapshot-prepare', 'snapshot-validate', 'snapshot-page', 'snapshot-release', 'routing-facts', 'conversion-facts', 'stage-facts', 'progress-facts', 'record-batch'].includes(o.name))).map(o => `| ${o.capability} / ${o.acceptance} | ${o.name} / ${o.owner} | ${o.callers.join(', ')} | ${o.mode} | ${o.input} → ${o.output} | ${o.publicRoute ?? 'private only'} |`).join('\n') + '\n'
};
for (const [path, body] of Object.entries(outputs)) {
  if (check) { if (await readFile(path, 'utf8').catch(() => '') !== body) throw new Error('Owner contract drift: ' + path); }
  else await writeFile(path, body);
}
console.log(`PASS Chat owner v1: ${operations.length} operations, ${new Set(subscriptions.map(s => s[0])).size} Chat consumers, ${Object.keys(definitions).length} named schemas${check ? ' match source' : ' generated'}`);
