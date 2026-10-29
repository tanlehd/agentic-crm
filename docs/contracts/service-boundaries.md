# Cross-service contract rules

ADR-027: Workflow is the sole configurable business orchestration service, including conversational flows and routing rules. API/engine/worker are internal components under crm_workflow. Identity User/team, CRM/custom objects, Sales Lead/Deal, Ticket and Chat Conversation remain owning authorities. Routing supplies allocation/capacity; the owner commits assignment. Historical Chatflow wire references below are compatibility only; [current orchestration](workflow-orchestration.md).


PLAN-006H/SRC-095 adds the scoped [Chat registry/control recovery contract](chat-control-v1.md): owner-resolved notices, cumulative pause/cancel generation watermarks and current reference checks. A broker notice or catalog projection never authorizes a mutation. Schema/model kit only; scoped PLAN-007C persistence design follows while full PLAN-006/007B feature/migration gates remain pending.

PLAN-005 / ADR-017: architecture rules accepted, exact machine protocols not Ready (PLAN-006). Current generated contracts remain monolith API baseline; logical names below are not implemented routes/events.

PLAN-006E/SRC-092 adds [reviewed Chat authority/revocation/dispatch and registry boundary](chat-extraction-boundary.md) plus an [executable dependency inventory](../architecture/chat-extraction.md). Only the preparation/CI scope is Ready. PLAN-006F must specify exact remote transport/grant/revocation semantics; synchronous permission RPC alone does not retain the monolith tenant-lock atomicity. Parent PLAN-006 remains incomplete.

PLAN-006F/SRC-093 completes the scoped [dispatch v1 machine protocol](chat-dispatch-v1.md): mTLS workload profile, issued reference/current consume, immutable resource context, independent claim/revoke/start linearization, bounded begin handler and unknown reconciliation. Generated schemas/reference tests are implemented; durable server/DDL/mTLS verification still pending. The earlier issue/consume gap below is resolved only for this specified v1 flow, not every privileged action or full extraction.

## Query / command envelope

Query uses authenticated tenant context, actor/service identity, audience, correlation/trace, pagination and field ACL at owner service. Command carries command_id, idempotency_key, tenant_id, actor delegation reference, target resource/service, expected_version/owner_revision when needed, schema_version, deadline and typed payload. Producer derives tenant from auth, not arbitrary client body. Consumer verifies trust/audience/scope and tenant/resource bindings; payload tenant alone is never authority.

Same idempotency key + different canonical digest is conflict. Same request replay returns durable receipt with current output authorization; command state accepted/running/succeeded/rejected/unknown/requires_attention has stable operation_id/status lookup. 202 accepted is not business completion. Timeout after send means outcome unknown: query operation receipt before retry with same key. Do not echo entire command/transcript into receipt or telemetry.

## Event envelope and transport

Proposed v1 event envelope: event_id, event_type, schema_version, producer, tenant_id, aggregate_type/id/version, occurred_at, correlation_id, causation_id, traceparent, operation_id (nullable), minimized typed payload. Identity account-global events must use dedicated control-plane contract; no fake tenant UUID. No bearer/provider token, phone/transcript/media bytes in generic bus events. Authorized read APIs supply content on demand.

Broker baseline: publish after outbox commit, mark dispatched only after broker ACK; publish duplicates possible. Consumer durable ACK only after inbox+local effect commit. Dedup key includes tenant+producer+consumer+event_id; producer retry must keep event_id. Broker duplicate window never replaces DB dedup. ADR-022 selects Kafka for CRM object-change → Workflow Core; commit contiguous offsets only after inbox/evaluation work or quarantine is durable. [Workflow semantics](../system/workflow-architecture.md) and PLAN-024B own exact topics/schema/retention/ACL/gap/replay. Other streams retain JetStream proposal/PLAN-006; neither broker is claimed installed by these documents. Retention must cover recovery windows and durable tombstones.

Ordering is per aggregate/source key, not global/tenant-wide. Consumer CAS checks aggregate revision; gaps request snapshot/replay, stale events ignored with receipt, no downgrade. Event may precede waiter: save inbox for correlation. Additive schema evolves compatible; breaking payload needs new version and overlap drain. Pin workflow versions and compatible consumer handlers until retained runs finish. Unknown schema enters sanitized DLQ, no silently successful ACK.

## Ownership and authorization fence

Identity owns auth revision; resource service owns owner/resource revision. Commands combine delegated actor privileges with local record policy; service actor cannot own a record. Cached projections are hints only. Each privileged action must validate current authority or a formally specified short-lived authorization grant whose residual revocation window is explicit and accepted/tested. Default before such protocol exists: synchronous authoritative check, fail closed on outage.

No claim global atomicity between Identity revoke and downstream external call. PLAN-006 must define dispatch grant issue/consume/revoke, expiration, replay protection, stale policy and in-flight boundary for Chat/Connector/AI tools. Until then remote dispatch/extraction tasks remain not Ready. Chat takeover atomically fences local queued effects and outbox cancellation, does not promise external effect recall.

## Required sagas

| Saga | Owning coordinator | Steps / success boundary | Compensation / unknown |
|---|---|---|---|
| Inbound resolution | Connector ingestion operation | Durable webhook → normalize → Connector profile cache/provider enrichment → CRM canonical resolve → cache confirmed crm_contact_id → Chat ingest with required contact context → persist receipt | Keep delivery pending on failure; no delete Contact to undo delivery; retry same keys |
| AI principal provisioning | AI Runtime | Create draft Agent → Identity principal provisioning receipt → bind provider/config → activate if all required checks confirmed | Disable pending principal/config; never eligible before confirmation; shared Meta assets not deleted automatically |
| Conversation takeover | Chat | Local owner CAS + invalidate local intents → durable cancel/control commands → observed remote state | Local owner effective immediately, remote control pending; block competing send until confirmed; reconcile unknown |
| Lead handoff/share | Sales | Persist pending handoff → CRM ensure share receipt → eligible Sales accept CAS → accepted event | Pending/attention until required share; cannot rollback accepted sale by deleting share blindly |
| Qualification completion | Chatflow | Pin session/action → Sales validate/upsert/qualify receipt → session completion/outbox → Workflow wait resume | Lost receipt recover action key; qualified Lead never duplicated; no invented transactional rollback |
| Media extraction | Media → Chat | Fetch/scan/extract versioned asset → result ref → Chat conditional apply to expected content revision | Stale extraction ignored; retain original data/provenance; late result cannot overwrite original text |

Every saga operation has tenant/action key/status/attempt/fence/deadline/error code and authorized repair endpoint at owner. Compensation choices per action version, no generic SQL rollback across services.

## Consumer/access tests and promotion gate

Contract fixtures include malformed/unknown schema, foreign tenant, spoofed actor/audience, duplicate/same-key conflict, out-of-order/gap, stale owner, auth revoked, timeout after remote commit, early signal, replay after retention, broker unavailable, lost receipt and poison DLQ. No production source task READY until exact schema, auth/delegation, state transitions, timeout/idempotency/retention, error mappings and compatibility tests are specified. No external action merely on a message from an untrusted broker subject; producer authorization must be enforced and tested.

PLAN-006B / ADR-019 refines [Contact resolution and message context](contact-resolution.md): CRM owns canonical identity mapping, Connector owns rebuildable profile/resolution caches; new inbound/outbound Chat message interfaces require crm_contact_id. Auth/dispatch physical implementation gates remain PLAN-006.

PLAN-006C separates identity lookup from privileged authorization: valid mapping cache need not trigger per-message CRM RPC. On miss, read persisted CRM mapping through owning-module read port or service API; only authoritative absence invokes ResolveContact. This does not relax Identity/owner/provider dispatch gates. [Contract](contact-resolution.md).

## ADR-021 scope refinement

Account/control-plane events vẫn là protocol riêng, nhưng target envelope có tenant_id của registered system tenant, không NULL/fake customer tenant. Business event phải có business tenant và bị từ chối nếu mang system tenant; không coi system ID là all-tenants permission. Identity sở hữu native account/session/authorization trong MySQL. [Scope standard](../data/database-guidelines.md) supersedes omission of tenant_id in account-global target entities; exact event/auth contracts vẫn cần PLAN-006/007A trước implementation.
