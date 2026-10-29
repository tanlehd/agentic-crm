# Chat writers and T09 removal inventory

SRC-109/T01–T09 DONE, Codex 2026-10-27. D3 Human-first 6/6; independent local delivery3/14 (Reporting, Connector, Chat). Legacy Conversation graph retired; main baseline46/crm_chat4, both Chat tenant gates active epoch2 after accepted post-write freeze/forward recovery. Source data and original receipts retained. Production, AI native, live-provider delivery and other-owner business consumers remain outside this acceptance. No commit/push/reset. Current pins and startup/recovery: [main runbook](../development/chat-main-local-runtime.md).

The final state deletes superseded jobs, registrations and launch paths. Stop/drain is only a transitional step protecting the final consistent copy. Historical rows, receipts and applied migrations are preserved.

Paths below are relative to services/core-baseline/src unless stated otherwise.

| Entry point | Current source disposition | Remaining verification or cleanup |
|---|---|---|
| bootstrap.ts public Chat | ConversationModule/WorkspaceModule replaced by gateway/chat-public-runtime.ts; alias moved to gateway/thread-boundary.ts | Accepted main BFF/native owner startup/public smoke; T09 evidence |
| dispatch-main.ts / dispatch-server.ts | Old Chat listener removed; Identity dispatch listener retained | Point native Identity callback at the new Chat API; verify main dispatch |
| outbound-main.ts / conversation/outbound-coordinator.ts | Deleted; independent Chat owns outbound coordinator | Old D2 Chat/coordinator/Identity containers removed; current independent image pinned in main runbook |
| compose.human-outbound.yaml | Old Chat API/coordinator launch entries deleted; Identity and Connector peers remain | Refresh only the required pinned peer configuration |
| kernel/reliability/worker.ts | Old Chat snooze/outbound/activity/workspace consumers and AI scheduler removed; native Routing jobs composed | Native startup with owner credentials; Workflow pending boundary audit |
| modules/agents/human-routing.ts, human-routing-http.ts, human-workload.ts | Deleted; native Routing config/view/dispatch/reroute replacements remain | Main capacity gates, allocation heads, actors and proofs |
| modules/agents/routing.ts / http.ts | Direct Chat assignment/capacity/sync branch and old takeover route removed; local CRM/Lead routing remains | Non-Chat native smoke; retained Conversation rows excluded from principal refresh SQL |
| modules/agents/executions.ts / runtime-consumer.ts | Unused legacy AI executor/consumer deleted; old runtime harness and registration deleted | AI native remains deferred; preserve execution/history data and pending-work preflight |
| modules/conversation/dispatch-claim.ts / dispatch-result.ts | Deleted; owning implementations are services/chat/src/dispatch-claim.ts and dispatch-result.ts | Current native outbound acceptance covers grant/claim/result; old baseline script/package commands deleted |
| modules/channels/intake.ts | Chat message effects replaced by ChannelChatIngressRelay; SQL transaction ends before RPC | Accept followed by fresh authenticated ingress-read; 22 native ingress/processor/referral groups PASS, including baseline relay and preserved unrelated fixtures |
| modules/channels/normalized.ts / contact-cache.ts | Ingress validation/cache owned by Channels; no legacy Chat domain imports | Content unit tests now exercise Channels directly; independent Chat projection uses fixed compatibility expectations. Three unit cases and one script case PASS; no old content-module test import |
| kernel/reliability/delivery.ts | Worker claims only registered event types; global receipt-purge method deleted | Native partition/expiry preservation; historical rows must remain at correct owner |
| kernel/database/cli.ts / scripts/native-local-upgrade.mjs | Old automatic Chat backfills removed; upgrade uses shared reviewed runtime/auth grants | Main grants provisioning and negative checks; do not run old main upgrade before cutover readiness |
| modules/sales/session-context.ts / modules/crm/activity-port.ts | Direct Chat contribution mirrors removed | Sales now uses its own unavailable remote boundary, preserving manual/inherited source paths. Activity binding uses own audit/events; 37/37 main diagnostic notes have evidence; native tenant checks PASS |
| modules/workflow/engine.ts / application.ts / activity-port.ts | Direct need/read/recovery SQL calls removed from Workflow; owner port reports unavailable until accepted. Activity binding uses persisted Workflow trigger, not Chat SQL. Chat assignment rejects before reading retained registry; shared worker registers only lead.accepted Workflow consumer | Native final runtime verification remains; preserve non-Chat steps and original selection/history |
| modules/crm/http.ts | Legacy Conversation archive guard removed. Generic archive outside Activity returns410 per CHG-20261021-06; archived history stays intact | Discovery and native route smoke; other CRM registry callers need audit |
| modules/external-api/service.ts | Legacy local Conversation SQL reader/fallback deleted; native external read facade composed | Main private-app/Identity/read admission smoke |
| modules/reporting/*-source.ts, modules/agents/operations-source.ts / operations-port.ts | Old conversion/stage/operations SQL adapters deleted, plus five legacy Chat source ports. AI history reader no longer imports Chat domain | Mock Reporting remains; missing connected snapshots return CONNECTED_SOURCE_UNAVAILABLE. Sales/AI adapters remain their owner backlog |
| Workspace HTTP and old workspace fixtures | workspace-http.ts, workspace-catalog-http.ts and workspace-activity-http.ts deleted; three workspace case harnesses, database suite registration, custom-inbox-native-test.mjs and old snooze fault-child modes removed | Native owner suites replace these launch paths; remaining pure-rule/caller retirement completed |
| Remaining modules/conversation source and old fixture scripts | Old http.ts and its duplicate conversation-cases harness deleted; no workspace controller remains | Entire graph and direct legacy scripts retired; retained owner replacement suites passed |

### Workspace harness replacement review — 2026-10-27

The removed harnesses instantiate the superseded baseline writer and controllers. Current acceptance is against Chat's own storage and public gateway, using retained synthetic fixtures. Historical migration assertions remain historical evidence; immutable migration files and data are preserved. No non-Chat suite registration was removed.

| Retired baseline coverage | Current owning coverage |
|---|---|
| workspace-cases.ts: unread/cohort, monotonic read markers, ACL and HTTP | scripts/lib/chat-workspace-native.mjs; query/list/sidebar in chat-list-native.mjs and chat-queue-native.mjs; T03 retained storage reconciliation |
| workspace-catalog-cases.ts and custom-inbox-native-test.mjs: tags/snippets, saved predicates, sharing, CSRF/ETag/replay | scripts/lib/chat-catalog-native.mjs and chat-inbox-native.mjs; native Identity policy and Chat public BFF |
| workspace-activity-cases.ts: snooze, deadline recovery, activity source ACL and pagination | scripts/lib/chat-workspace-native.mjs, chat-activity-native.mjs, chat-activity-notifications-native.mjs; T08 actual worker/restart/local inbox acceptance |

The old integration --workspace selector now exits before Docker startup with the owner commands. Other integration selectors and Workflow/Routing fault modes remain. Fresh replacement results are recorded in SRC-109 task evidence; T08 runtime/restart and T03 migration evidence above are historical, not rerun claims.

### Remaining graph replacement review — CHG-20261027-02

The user authorized completing cleanup then main local cutover on 2026-10-27. Current runtime has no imports into the remaining baseline Conversation graph. Retirement removes the graph and its obsolete direct-writer scripts, not historical migrations or stored rows.

| Retired caller / coverage | Retained owning check |
|---|---|
| Workflow test Conversation producer/activity consumer | Synthetic producer envelopes exercise real Workflow SQL, ledger, cancellation, timers, crash/restart and lease fencing. Assignment now targets a Sales Lead. Activity checks verify Workflow publication; Chat consumer/dedup/ACL remains in chat-activity-native.mjs and chat-activity-notifications-native.mjs. Default unconnected Workflow Chat reads fail explicitly. |
| Routing Conversation fixture/runtime | Baseline suite exercises Lead eligibility, assignment/history, CAS, capacity, round-robin, HTTP/CSRF and access events. An immutable historical Conversation fixture verifies baseline assignment rejection. Chat takeover/send/crash and Human routing remain in native ownership/outbound/routing suites. |
| Intake local Conversation effects and duplicate bridge harness | Intake retains migration/ACK/replay/auth/retry/leases and real HTTP Contact resolution/cache tests, with an explicitly synthetic remote terminal receipt. Real Chat dedup/contact binding/message/referral/relay coverage is the native ingress+processor+referral suite. Connector migration/runtime/fault coverage remains in its current local acceptance and payload/attempt suites. |
| Healthcare full monolith pipeline | Historical Chat row fixture preserves KPI window/as-of/tenant/fan-out checks; actual manual Human qualification, Sales handoff/acceptance and merge policy still run. It is no longer labeled current Chat/Workflow business E2E. Session attribution/membership is accepted by native Chat session-source/ingress. |
| acquisition-session, classification, need-follow-up, session-progress and stage-funnel scripts | Current Chat native ingress/session-source, classification/contributions, need/outcomes, session-progress and funnel suites; legacy source scripts removed. AI enrichment/recovery remains deferred, not accepted by deleting tests. |
| Legacy pure tests | Wire/Workflow graph compatibility and Reporting reducers retained; workspace grammar tests import current Chat query code. Native owner suites cover classification, catalog/shares, snooze, progress config and legacy receipt semantics; tests of deleted functions are retired. |
| inbox-e2e / inbox-runtime-fixture / test:inbox | Removed obsolete Keycloak/browser layout and direct SQL assignment launch path. Current source browser acceptance is chat-workspace-source-browser.mjs; native public/runtime owner suites cover data flows. Main browser acceptance remains pending cutover. |

Fresh evidence is under artifacts/chat-extraction/t09-20261027-02. Workflow/Routing 31, intake/Contact 8 and healthcare 6 native tests PASS on retained test schemas. Original fixture SQL failure is retained. Full rebuilt-source/unit/native replacement checks and main cutover evidence are recorded separately; these owner tests do not prove main activation.

## Evidence and limitations

CHG-20261026-02 continuation: isolated source43 copy/reconcile59tables/6,053rows passed8native checks including crash/resume and idempotent replay. Added forward46 for the reviewed owner workload vocabulary; retained test migration and unknown-service denial passed. Exact-path deletion succeeded in the 2026-10-27 session; the previous ACL denial is historical. Final export correctly refused the unfenced source. No main activation or new image acceptance.

Current checks: baseline and Reporting TypeScript builds PASS;485unit tests/73files PASS;35focused Reporting/relay/public tests PASS;22native ingress/processor/referral groups PASS;28retained native CRM notes bind correctly and reject another tenant. Source43 compatibility5 passed earlier. Lint1084 and boundary0added/105removed PASS. Final docs check is recorded in the continuation evidence. Earlier owner native External11, Routing config4/dispatch22/reroute28/view24 passed separately.

Baseline44/45 passed retained test_t09_baseline preservation, no-op and tenant constraints. Actual restricted test credentials deny36Chat-exclusive tables and the foreign main schema. Main source43 diagnostic encrypted snapshot covers122tables/7,824rows;3,202ledger rows classify with no unknown family, including696failed outbox events. This snapshot is explicitly not importable: writers were not fenced. Artifact directory: artifacts/chat-extraction/t09-20261026.

Deleting source does not delete historical migration/data evidence. On 2026-10-27, sixty stale baseline dist files whose matching TypeScript source no longer exists were removed by checked exact paths. The prior access denial and automatic approval review rejection remain historical. Hash inventory: artifacts/chat-extraction/t09-20261027/stale-output-before.json. Rebuilt output and remaining source callers require separate verification; this does not certify a new image or remove the still-running old D2 containers.

## Cutover gate

Finish all pending caller removals and native composition before changing main. Record exact tenants, epochs, image/config pins and owner grants. Quiesce/drain old writers, take the final consistent encrypted snapshot, partition/reconcile every row/reference/receipt/event, apply main44–46, revoke obsolete grants and activate one Chat owner. Remove obsolete D2 containers without removing volumes.

Verify main ingress/takeover/send/status, workspace/session, external/generic reads, non-Chat owner smoke, restart and post-write freeze/forward recovery on the same Chat database. Never send traffic back to the stale baseline copy after destination writes. Only these actual results close D3-06 and change local delivery to3/14. No production or downstream business completion is implied.
