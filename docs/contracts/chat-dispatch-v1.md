# Chat dispatch v1 — PLAN-006F / SRC-093

SRC-106: [Dedicated stable claim proof](chat-claim-proof.md) resolves the full binding/grant/resource wire shape with an additive eighth route. Existing seven DispatchRequest/DispatchReply shapes and generic receipt-read allowlist remain unchanged. Native Chat wire reader and Identity strict inspector are implemented; endpoint registration/remote registry still pending.

SRC-104/105: [Native current registry](../data/identity-workload-registry.md) and [TLS boundary](workload-tls-boundary.md) implement prerequisites with retained MySQL and real TLS loopback probe. Business routes below remain unwired. Remote registry bootstrap and stable full Chat claim proof wire shape must be specified before distributed owner adapters; the probe is not a deployed dispatch endpoint.

SRC-099/100: [Native Human Identity ledger](../data/identity-dispatch-ledger.md) now implements local session/ACL locks, delegation/grant/consume/revoke/request/event persistence. Test schema38 only; Chat claim proof injected, AI denied, no wire endpoint deployed. This scoped PLAN-007C gate does not close full PLAN-007B/PLAN-006 extraction.

SRC-098 / CHG-20261018-13: [PLAN-007C3 physical attempt ledger](../data/connector-attempt-ledger.md) and injectable executor implement the local begin/start/result/recovery slice in retained MySQL. Live continuations are opaque WeakMap objects, not returned over wire or reconstructed from SQL. Every executor reply remains correlated to its original begin request. Native Identity/Chat/mTLS and result transport/provider adapters remain absent; routes below still are not deployed.

SRC-097 scoped physical progress: [preparation/cancellation ledger](../data/connector-preparation-ledger.md) implements prepare storage and shared payload guard only. Begin/consume/start/result fencing, native authority and network/provider execution still require subsequent implementation; the full protocol below remains the target.

Additive follow-up PLAN-006G/SRC-094: [exchange v1](chat-exchange-v1.md) supplies the authenticated payload port, ingress and cancellation proof DTOs. Stage content before prepare; verify digest again before invocation. The seven dispatch DTOs below remain unchanged; all routes remain contract-only.

2026-10-18 / CHG-20261018-08. Ready for machine contracts and executable reference scenarios; **no HTTP server, DB migration, production grant or provider send is activated by this task**. [Boundary](chat-extraction-boundary.md), [native Identity](native-auth.md), [service rules](service-boundaries.md). Current monolith outbound behavior remains unchanged. Wire v1 is a new private protocol, not a replacement for existing public messages-v2.

[ADR-024](../decisions/README.md#adr-024--independent-dispatch-admission-and-conservative-unknown-recovery) records the protocol choice and safety/liveness tradeoff. [JSON Schema](../../packages/contracts/schemas/chat-dispatch-v1.json), [OpenAPI](chat-dispatch.openapi.json), [kit/runbook](../development/dispatch-contract.md).

## Decision: admission, not cached permission

Identity grant issuance is only a prepared reference. Each attempt requires a synchronous **consume** at Identity serialized with current revocation/security/role changes. A consumed admission is one operation already in flight, never a reusable permission token. Chat independently serializes its dispatch claim with takeover/close. Connector independently checks its current active binding before starting transport. No global transaction or total ordering across these three authorities is claimed.

The precise boundaries are: takeover before Chat claim prevents that claim; takeover after claim leaves it in flight. Identity revoke before consume prevents consumption; revoke after consume cannot recall that already admitted operation. Connector binding disable before local start prevents I/O; disable after start may be too late. An attempt must win all three. This explicitly refines PLAN-006E's pending in-flight semantics; **no TTL-cached authorization is introduced**. UI may report pending/in-flight/unknown after takeover and must not promise a message was recalled. No distributed zero-time revocation guarantee is made.

Issuance TTL is10000ms, checked using Identity's clock (`now >= expires_at` rejects). Consume checks current native session/account security revision, membership, principal, chat seat, effective reply/read permissions and text read/write policy, including the existing tenant-super-admin exception for eligible Humans only. AI uses a registered active execution delegation, same tenant/principal, not a Human session or service-owner impersonation. An authorization revision change since issue rejects the unconsumed grant even if permissions later appear similar. Service actors authenticate the caller; only human/ai principals can own/send. External private apps remain read-only for Conversation in this v1 scope.

## Binding and workload authentication

All operations carry schema_version1, UUID request_id and an exact immutable binding: tenant_id, conversation_id, crm_contact_id, connection_id, intent_id, attempt_id, principal_id, actor_kind, delegation_id, owner_revision, record_version and payload_digest. UUIDs are lowercase; revisions are positive decimal strings up to20digits; payload_digest is SHA256 of the exact UTF-8 canonical payload produced by the Chat owner (existing canonical object-key ordering, no Unicode normalization). Request replay key is `(tenant, authenticated caller, operation, request_id)` and stores digest of the entire validated request. Same key/different request is409 before any transition. Tenant must be active business scope; system tenant is never a wildcard. Conversation/contact/connection/delegation bindings are checked at their owning authority, not inferred from matching UUID syntax.

Identity issue additionally receives `resource_context` from the authenticated Chat owner: object_key=conversation, owner_principal_id, owner_revision, record_version, nullable team_id and unique shared_team_ids (max200). Owner/revisions must match the binding. The grant stores this snapshot; Chat claim verifies it against its live local record under the same CAS, including team/shares. Grant inspection returns that snapshot over owner-authorized receipt-read. Identity consume evaluates **current** role own/team/all scopes and team membership against this immutable Chat-admitted snapshot, with current seat/field policy; it does not infer scope from principal ID alone. Share/team changes after claim follow the explicit resource in-flight boundary; they cannot invalidate a pre-claim comparison silently. No remote policy lists or session credentials are stored by Chat/Connector as a second authority.

Private transport profile: TLS1.3 with mutual TLS; certificate SAN URI `spiffe://agentic-crm/service/{identity|chat|connector}` is checked against an operator-configured CA and current workload registry. Peer identity comes from the TLS connection, never X-Service/forwarded headers or body. Cert lifetime at most24h, planned rotation overlap at most1h, accept old/new key IDs only while registered active; disable/revoke checked per request including keepalive. A registry/Identity outage fails closed503. No custom signed bearer token/JWT, cookie, password or provider secret crosses this protocol. Opaque grant_id/claim_id are references, not bearer capabilities. Local future HTTP harness must be explicitly test-only; its mock identity context is not mTLS evidence.

Request body max16KiB, JSON object only/no unknown fields, no query parameters; no raw message text or provider credentials in these control DTOs. Chat/Connector transfer content via a separately authorized payload port whose content digest must match; that port and provider transport remain later runtime gates. Timeout per RPC2s, no automatic provider retry. Error codes/status: INVALID_REQUEST400, UNAUTHENTICATED401, FORBIDDEN403, NOT_FOUND404 (foreign tenant/resource), CONFLICT409, STALE_OWNER409, REVOKED403, EXPIRED409, INVALID_TRANSITION409, DEPENDENCY_UNAVAILABLE503. Bodies contain only code and request_id, no grants/payload/stack. Status replay still checks current read rights; consumed grant replay is not permission to start again.

## Machine operations (routes specified, not deployed)

POST only under `/internal/v1/dispatch/{operation}`; operation path uses `identity-issue`, `identity-consume`, `chat-claim`, `connector-prepare`, `connector-begin`, `connector-result`, `receipt-read`. One schema definition per operation; path/body operation must agree. Authenticated caller + target allowlist:

| Operation | Caller → target | Required input beyond common binding | Result / durable behavior |
|---|---|---|---|
| identity-issue | chat → identity | resource_context |201 grant_id/expires_at/resource_context; current delegation check, exact binding; receipt replay200 |
| connector-prepare | chat → connector | grant_id |202 prepared receipt; verifies registered binding and content digest; no I/O |
| chat-claim | connector → chat | grant_id |200 claim_id; issued grant inspected over authenticated Identity API, then local owner/version/open-state CAS + intent/message/outbox. One attempt per intent in v1 |
| connector-begin | chat → connector | grant_id, claim_id |202 admitting/started/unknown/status receipt. Persists admitting + local fence before RPC, invokes identity-consume internally, then local binding/fence CAS to started. Only winning live handler may invoke provider once |
| identity-consume | connector → identity | grant_id, claim_id, fence_id |200 consumed receipt; verifies stable Chat claim via owner API before local Identity transaction, current delegation/auth revision + issue TTL. Same grant cannot be consumed for another fence/claim/attempt |
| connector-result | connector → chat | outcome, optional provider_message_id/error_code |200 status receipt; authenticated Connector result applied only to exact binding/attempt, late sent can resolve unknown. Source Connector must first commit its own transport receipt |
| receipt-read | chat or connector → owning authority | receipt_id |200 minimized state; live read authorization, exact binding; no state mutation and never returns a send capability |

Grant inspection and claim inspection use receipt-read against their owner. Issued grant replies include resource_context, consumed replies retain grant/claim IDs and resource_context; other reply shapes carry version, request_id, receipt_id, state and appropriate claim_id/provider_message_id. No actor session or message content. An HTTP success only acknowledges the indicated state. Receipt shape validation does not validate its authority; consumers bind TLS peer, request ID, binding and expected receipt IDs through request context.

## Durable transitions and crash handling

Identity: issued→consumed or revoked/expired. Revoke does not rewrite consumed to unconsumed. Chat: queued→claimed or cancelled; claimed stays in flight on later takeover. Connector: absent→prepared→admitting→started→sent/unknown; prepared/admitting may reject before start. Each service commits its own receipt/state/audit/outbox together; network outside SQL transactions. No shared UoW, FK or domain implementation import.

Begin first CASes prepared→admitting with fresh fence_id. A second handler sees the receipt and never calls consume/provider. Identity consumption uses that fence. If consume returns a first accepted response within the same live handler, Connector rechecks active binding, fence and deadline then CASes admitting→started. The local monotonic attempt deadline is5s from reserve; check it before start and before I/O. Deadline exceeded, lost consume response, lease loss or process restart clears local permission to invoke. Restoring admitting/started maps to unknown conservatively; it never replays the provider call. Persisted consumed/started receipts alone cannot reconstruct the lost local invocation permission.

Crash after started commit but before I/O may leave unknown even if nothing was sent. Crash after provider success but before receipt is also unknown. Prefer missed/unknown delivery requiring reconciliation over duplicate delivery. Once the external call is in flight, no hard wall-clock recall bound can be guaranteed; process suspension/network/provider may delay it. Deadline is a normal execution guard, not a claim of atomic clock+network fencing.

Only known sent receipt can change unknown→sent; negative/missing/timeout lookup leaves unknown. A stale attempt cannot change another attempt's state. V1 does not rearm consumed grants, reset unknown, or auto-create a second attempt for the same intent. Explicit retry of proven pre-dispatch failures and multiple attempts need a later protocol version; existing monolith internal mock retry remains unchanged. Terminal sent cannot downgrade. Duplicate callbacks must retain the same provider_message_id; conflicting evidence returns409/quarantine.

Retention: bindings/request digests/consumption and result tombstones persist for at least the entire lifetime of the owning intent plus restore/replay horizon, and are not TTL-deleted with the10s unconsumed grant. This local design has no automatic purge. Production retention duration, backup and key revocation propagation need deployment evidence. No payload or raw credentials in tombstones/audit.

## Persistence implementation gate

Logical ledgers belong to Identity (grant/replay/consume), Chat (claim + existing intent metadata/owner receipt), Connector (attempt/fence/provider receipt). All business tenant scoped, unique tenant+intent attempt and tenant+caller+operation+request_id, no cross-service FK. Identity account/session references use owning-service validation; credential rows remain system-scoped Identity only. No table is created here. PLAN-007B must fill physical table templates and forward lineage/grants/backup reconciliation before any durable server implementation; an in-memory reference model cannot satisfy that gate.

## Executable acceptance DSP-01…08

1. Strict JSON Schema + generated TypeScript/OpenAPI for requests/replies/errors; malformed fields/version/foreign extras/actor/service-owner rejected structurally. Cross-field/current-authority checks are semantic, not implied by schema.
2. Authenticated caller/target, business tenant, all binding fields and same-key digest conflict; duplicate issue/prepare/claim/consume/begin/result never add an effect.
3. Revoke before/after consume and owner takeover before/after claim demonstrate the exact two authority orderings. Current permission/delegation denial and revision changes block consumption.
4. Issue TTL and local deadline exact boundaries; DB/authority outage produces no dispatch; expired/unavailable grant never refreshed silently.
5. Begin fence race and duplicate request, crash before I/O and lost consume ACK; restored receipt grants no invocation; at most one simulated effect for each intent/attempt.
6. Crash after simulated effect/lost receipt→unknown; late authentic sent resolves; unknown timeout/missing/negative result never retries; foreign/stale/conflicting result rejected.
7. Generated outputs drift-check, contracts package build, focused scenarios and dependency guard/static checks; every test names model versus real runtime evidence.
8. Service/ownership/roadmap/tracker/log/checkpoint updated; no app restart/data reset, no real transport/DB/mTLS/provider acceptance claim.

SRC-093 implements this contract kit and reference model only. Full PLAN-006 still includes ingress, cancel/control/read/broker/replay compatibility; PLAN-007B and authenticated durable adapters remain necessary for extraction. These gates may reuse this v1 protocol without inventing a new permission authority.
