# T08 — Chat independent composed acceptance

SRC-109/T08 DONE, Codex 2026-10-25; D3-05 accepted, D3 5/6, local2/14. Candidate validation below is against independent Chat API/worker containers and retained MySQL. Main traffic and old writers have not switched; T09 owns that activation. Reporting, Sales and Workflow business completion are separate owner gates.

Candidate image: `sha256:e83d39c787cb8ea4d56060bcef112a38d87c5185dec8c7b82c039e0c99759992`. Chat schema4, retained `test_crm_chat_owner`; native synchronous owners use their existing implementations in ephemeral HTTP listeners against `native_identity_test` and `native_connector_test`. Authenticated HTTP-local is explicit test configuration. Provider delivery and the external event receipt receiver are synthetic. No provider or consumer business E2E claim.

CHG-20261025-05 gives composed Chat command envelopes a bounded10s outer deadline. Nested registry/ordinary owner calls retain their budgets. Actual container detail/history exposed the old2s budget mismatch. Schema, authorization, idempotency, business state and migrations are unchanged. [Composition contract](../contracts/chat-runtime-composition.md), [scope](../planning/chat-extraction/consumer-handoff.md).

## Capability and owner matrix

Artifacts are under `artifacts/chat-extraction/t08-20261025`. Unless marked historical, each listed runtime case uses the candidate image above. Public cases use existing BFF/controllers and actual owner HTTP; callbacks for proofs return to the independent Chat API.

| CO | Chat-owned / directly required compatibility | Evidence | Outside this acceptance |
|---|---|---|---|
| 01 | Durable ingress, dedup, session/message persistence | `ingress-runtime-proofs.log`: actual owner callbacks, message/session, restart/dedup and all six jobs | Provider production activation, Connector extraction |
| 02 | History/envelopes, cursor and acquisition membership | `messaging-runtime-2.log` | Media/provider feature expansion |
| 03 | Public Human send, own job/receipt, Connector result | `outbound-runtime-proofs.log`: public send, native Identity/Connector, original receipt and one attempt after restart | Real sender/provider acceptance |
| 04 | Assignment, takeover, CAS, close and ownership history | `ownership-runtime-3.log`, `transition-runtime-1.log` | Identity/Routing independent deployment |
| 05 | Routing capacity reservation/confirmation and close release | Same ownership runtime; T04/T06 historical directory/facts/sync contracts | Routing matching/configuration/business completion |
| 06 | Retained owner/control fences | T04/T05 historical current-authority, revoke and unknown-send proofs | AI execution/capacity DEFERRED |
| 07 | Unread/read-marker, snooze and deadline worker | `workspace-runtime-final.log` | Other-owner scheduling |
| 08 | Tags/snippets/inboxes/shares, queue/sidebar | `inbox-runtime-1.log`, `queue-runtime-1.log`; `catalog-runtime-final.log` | Generic CRM features |
| 09 | Session process/progress, need and classification values | `session-runtime-1.log`, `classification-runtime-1.log`, `need-runtime-1.log` | CRM metadata service extraction |
| 10 | Need assessment API and original legacy alias receipt | `need-runtime-1.log`; T06 historical read-need policy/recovery | Sales outcomes and Workflow recovery policy |
| 11 | Notes/activity facade and both remote activity inboxes | `notes-recovery-runtime-1.log`, `activity-inbox-runtime-1.log` | CRM note lifecycle and Workflow execution |
| 12 | Authorized session-source for Human/service callers | `source-runtime-2.log`: closed attribution survives API crash; Contact mismatch and ambiguous source rejected | Lead/Deal conversion, contribution-apply mirror |
| 13 | Existing commands, lifecycle events and local fences | Lifecycle/producer evidence in this matrix | Workflow starter/follow-up/recover_need |
| 14 | Persisted attribution and domain source reads | Session/source cases; T05 historical late/duplicate inbound source invariants | Reporting adapters/snapshots/facts/registry/metrics |
| 15 | Generic Conversation GET/PATCH and four external reads | `records-runtime-2.log`, `external-runtime-2.log`: native app admission, selected fields, parent/tenant guards, cursor across crash | Other object/private-app feature work |
| 16 | Durable producer, local inboxes, scanners and recovery | `delivery-runtime-3.log`, `activity-inbox-runtime-1.log`: ACK-loss/crash, local gap/dedup and original-command scanner | Downstream consumer effects/deployment |

Historical boundary evidence is [T04](t04-human-acceptance.md), [T05](t05-human-acceptance.md) and [T06](t06-chat-boundary-acceptance.md). It covers detailed auth/revoke/interleaving, unknown→matching-proof sent, retained legacy receipts, all six local workspace consumers and both activity consumers. These unchanged lower-level cases are not relabelled as newly executed container tests. [T03 storage evidence](../tracking/details/SRC-109.md#t03--retained-storage-complete) remains the migration/restore evidence; no migration changed in T08.

## Recovery actually exercised

- Notes: commit CRM note and Chat receipt/contribution; freeze Chat writer; reject a new write; SIGKILL API; reactivate the same epoch/database; replay the exact original receipt; SIGKILL/restart again. The original CRM reference, one note activity and one session contribution survive. No baseline switch or reverse copier.
- Producer: isolated registered synthetic tenant4104, transactional Chat outbox/staging, real authenticated receiver with an atomically retained receipt file. Receiver persists then loses ACK; worker is SIGKILLed. Receiver and worker restart; status reconciles the original digest without a second publication. This receiver proves transport delivery only.
- Local inbox: deliver sequence2 before1; restart API; apply predecessor and duplicate; worker resumes and acknowledges contiguous sequence2. Both inbox rows remain singular and applied across worker restart. CRM/Workflow activity inboxes independently verify native source references, reject wrong producer/version and preserve effects across API crash.
- Workspace scanner wakes a persisted snooze deadline. Ingress/outbound and default six-job scheduling passed on the final candidate with owner callbacks forwarded to its API. The command recovery scanner discovers an aged synthetic interruption, aborts it without admission/effect, releases its recovery entry and retains terminal proof across worker crash.

Failed attempts are retained. Notes originally reused a session already closed by earlier tests; the runtime round now retains a fresh session without rewriting history. Generic forwarding initially used the BFF workload instead of the required CRM workload. External negative request initially supplied an unsupported nested query property. Interrupted ownership rounds consumed synthetic capacity; reruns close those exact retained rounds through Chat/Routing commands rather than modifying allocations. These are harness corrections, not relaxed assertions or business changes.

## Release handoff

[Minimal cutover units and recovery](../development/chat-cutover-handoff.md) identifies only the runtime/config changes necessary for T09. The immutable Chat image, retained cursor keys, own-schema grants and explicit tenant/epoch are required inputs. Runtime startup does not migrate. T09 must separately prove old-writer fencing, final source/destination reconciliation and main-route activation. Independent candidate acceptance does not mean main Chat cutover or SRC-109 DONE.

## Final verification

All ten portable verification scopes were executed locally on pinned Node24.21.0/pnpm10.33.0: lint, docs/links/DAG, architecture boundary, schemas, deterministic contracts,169script tests (including runtime/transport),483unit tests, package builds, workspace typecheck and scaffold API smoke. See verify/summary.json and completion-checks.json. This is local evidence, not a GitHub CI run; separate unrelated service packaging/kernel CI jobs were not rerun.

The root build failed on EPERM deleting an existing Web .next artifact. All preceding package builds passed; Web then built successfully with the supported NEXT_BUILD_DIR=.next-t08-20261025 (verify/web-build-isolated.log). Original next-env.d.ts and tsconfig.json were preserved; no shared output deletion or running-app restart. Subsequent workspace typecheck and API smoke passed. The initial failure remains recorded.

image-build-match.json verifies the immutable candidate matches emitted Chat/transport/contracts byte-for-byte and runs uid1000. Final source hashes, clean test-container inventory and scoped whitespace/docs checks are in source-manifest.json and completion-checks.json. Native fixtures and receiver receipts remain retained. Main HEAD21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 working tree is dirty with inherited work; no commit/push or broad deployment.
