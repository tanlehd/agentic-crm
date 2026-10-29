# Workflow shared metadata and validation kernel — PLAN-024A

2026-10-13 · Ready for scoped implementation SRC-065 after design checks. CHG-20261013-02. Implements first step of [Workflow plan](../planning/workflow-platform.md), not independent service persistence/execution. No new tables, events, migrations, authorization grants or changes to legacy graph wire.

## Native catalog

GET `/api/v1/automation/catalog` requires native session, valid X-Tenant-Id, configure capability + automation.design/all and at least schema.read/all or explicit object read grant. No query parameters. Cache-Control no-store. Object visibility is schema.read or read grant; field read deny always removes field and its defaults/options. This is design metadata, never record access or runtime permission authority. Relation only visible when both endpoint objects visible. No record values, defaults, policy bodies, credentials or contact PII in payload.

Catalog v1 response `{data:{schema_version:1,tenant_id,principal_id,authorization_revision,revision,objects,relations},meta:{correlation_id}}`. `revision` SHA256 canonical descriptor payload including authorization scope/revision; presentation label changes invalidate revision but never identifiers. No server cache. In one native authorized transaction load tenant-scoped object_type, property_definition and association_type; limits 100 visible objects, 200 properties/object, 500 visible relations. Overflow returns422 CATALOG_LIMIT_EXCEEDED, never truncated binding catalogs; invisible objects/relations do not consume visible limits. Internal scan bounds1000 object definitions,1000 properties/object,5000 relations; oversized tenant returns422 rather than unbounded query. Metadata load shares native tenant lock with schema/policy mutations.

Object fields: id UUID, key, label, kind standard/custom, version/schema_version decimal strings, owner_service crm/sales/chat/ticket, properties, capabilities. Property fields: id (`standard:<key>` scoped by object, or canonical custom UUID), key/label, type string/text/integer/decimal/boolean/date/datetime/enum/reference/opaque, required, nullable, options array|null, indexed, readable=true, writable, filter_operators, version. Standard structured preference/qualification are opaque and cannot bind to scalar actions. No flattening arbitrary JSON. Existing canonical CRM standard queries/descriptors and property_definition are source; no Workflow metadata database.

Capabilities distinguish existing owner APIs from Workflow integration: record_read/query/update flags, workflow_actions false, object_change_events false, change_images false, relation_traversal false. Contact/Company/Activity/custom generic read/query available; Lead/Deal read/query exist, business writes require named owner commands. Conversation/Ticket generic records unavailable. Custom values on Deal disabled per current domain. Search operators only existing indexed fields and field filter rights; writable only actual patch fields + caller write policy + relevant write capability/grant (own/team still checked per record). Lifecycle/status/owner/system attribution/Activity kind+related ref immutable in generic patch. Catalog never claims ready-to-execute actions or Kafka producers from legacy events.

No universal immutable before/after/change sequence API exists yet: PLAN-024B required. Association metadata provides directional cardinality, but traversal data query remains unavailable; do not treat display relation as query implementation. Runtime must obtain trusted catalog/current rights independently; accepting client-supplied catalog as authority is forbidden.

## Pure authoring validator v1 (Workflow internal library)

Existing `packages/workflow-definition` internal Workflow library takes unknown definition and a trusted catalog snapshot as library input. It never persists, executes actions, enrolls or publishes. Output `{valid,executable:false,issues:[{code,path}],node_count,catalog_revision}`; draft-validation success is not publish acceptance. Snapshot is tenant/actor scoped; expected tenant input must match. Old M2 validator unchanged.

Definition exact `{schema_version:1,catalog_revision,root_object_id,trigger:{operation:created|updated,changed_property_ids:[]},entry_node,nodes}`; max50 nodes, unique safe keys, acyclic, all reachable, every path terminates. Registry node types v1:

- `end`: config outcome safe code, no next.
- `delay.duration`: seconds integer1…31536000, next. `delay.until`: datetime binding + offset_seconds ±31536000, next. Durability only future runtime.
- `branch.if_else`: left binding, op eq/ne/exists/gt/gte/lt/lte/in, optional right literal, on_true/on_false; default false edge required. Numeric/date comparison typed; ordered compare for strings/enum rejected. No arbitrary expressions. Nullable values require exists guard at runtime; authorization failure never becomes null.
- `data.get_record`: object_id + target binding, next; output record type.
- `data.find_related`: source binding, relation_path1…3 steps `{association_id,direction:outgoing|incoming}`, limit1…100, next; output collection type; no implicit scalar coercion.
- `data.update_record`: target binding, nonempty fields1…50 `{property_id,value:binding}`; next. Target must scalar record, current metadata writable and value type/nullability/enum rules. Generic status transitions not allowed.
- `routing.assign_owner`: target scalar record binding, team_id UUID, preference human/ai/any, next; Team existence/eligibility remains runtime gate.
- `communication.send_message`, `communication.send_email`, `communication.notify`: target scalar record binding, template_id UUID, next; template/recipient permissions/consent remain runtime gate.

Binding exact either `{literal:<scalar|null>}`, `{ref:'root'}`, `{ref:'property',property_id}`, `{ref:'output',node_key}` or `{ref:'output_property',node_key,property_id}`. Ref root returns enrolled record; property returns root property type; get_record returns record; find_related returns collection. Output node must dominate consumer on every path. Unsupported scalar values/unknown refs/extra config keys fail. `data.get_record` requires input target object match, so cannot reinterpret a string as UUID/record. Related path resolves canonical IDs/direction through catalog; cycle across relation path rejected; no implicit unrelated search.

Named node registry returns metadata-only descriptors with execution_available=false and code EXECUTION_NOT_IMPLEMENTED. Pure validator can inspect draft structure for unavailable capabilities but always returns executable=false; no publish/run endpoint wired to it. This scoped source establishes contracts without enabling provider mock, Kafka or tenant role escalation. Next gates progressively register real adapters and add exact action/trigger publishing validation.

## Acceptance and compatibility

WF-01/02/07/13 sub-scope: canonical IDs/custom types, reversed association cardinality, malformed/oversized/cyclic graph, non-dominating ref, record/collection mismatch, invalid enum/date/decimal and field write/filter deny; native session/cross-tenant/current revoke and metadata revision changes; no values/default leaks. Persistent isolated synthetic fixture, repeat keeps records/metadata. Contract JSON Schema/OpenAPI/generation, focused unit/native MySQL/HTTP tests, existing legacy Workflow tests plus workspace types/build required. Full graph runtime/Kafka/canvas/physical storage NOT_RUN and not delivered by SRC-065.
