# T07 — independent Chat runtime acceptance

SRC-109/T07 DONE, Codex 2026-10-25; D3-04 accepted at this step. Chat API and worker run from an independent package/image against retained owning storage. Subsequent [T08 composed acceptance](t08-chat-parity-acceptance.md) is DONE; current D3 5/6, local 2/14. Main traffic remains baseline until T09 single-writer cutover.

## Delivered runtime

`services/chat/src/composition.ts` mounts 82 owner routes, two ingress exchange routes and four dispatch routes without overrides. API and worker entrypoints validate explicit tenant/epoch, restricted own-schema grants, immutable migration lineage and retained cursor keys. Runtime never migrates. Operator migration status/upgrade commands are separate. Six worker jobs use durable Chat state; in-memory cursors/counters are disposable.

[Runbook](../../services/chat/README.md), [composition contract](../contracts/chat-runtime-composition.md), Docker target `chat` and `compose.chat.yaml` contain the runnable commands/configuration. Compose defines only Chat API/worker, separate credential inputs, read-only non-root execution, resource/log bounds and graceful drain.

Final tested image: `sha256:e8bc62a2b2faa06ecdafd5c42a2cf0a9378a536cc973a2d449cf19e1db021b4b` (`agentic-crm-chat:candidate-20261025` at verification). Package inspection: uid1000, `@agentic-crm/chat`, 70 emitted JavaScript files, no baseline/other-domain import. Compose configuration validated quietly; native tests used isolated `docker run` containers, not a persistent Compose deployment.

## Executed evidence

Environment: Windows PowerShell, Docker Desktop Linux containers, project Node24.21.0/pnpm10.33.0. Retained synthetic tenants4101/4102, Chat `test_crm_chat_owner` schema4, Identity/CRM/Routing fixtures `native_identity_test`, Connector dispatch `native_connector_test`. Secrets/config remain under `.local/chat-runtime-native`; no reset or main changes.

Artifacts: `artifacts/chat-extraction/t07-20261025`.

| Command / scope | Result and artifact |
|---|---|
| `pnpm build:chat`; Docker build target `chat` | PASS; `chat-build-6.log`, `image-build-5.log` |
| `CHAT_TEST_IMAGE=agentic-crm-chat:candidate-20261025 node scripts/identity-owner-native-test.mjs '--focus=Chat ingress' --with-processor --with-runtime --runtime-only` | PASS; `ingress-container-final.log`. Real native peer readiness200 → Routing fixture outage503 with liveness200 → recovery200; accept → API restart exact receipt; ingress worker persists message/session; worker restart retains receipt and exactly one message; all six default jobs complete a round and worker ready200 |
| Same image, `node scripts/identity-owner-native-test.mjs '--focus=Chat outbound' --with-runtime --runtime-only` | PASS; `outbound-container-1.log`. Public session/CSRF send → standalone Chat API → standalone outbound worker → native Identity/Connector synthetic sent; public idempotent replay, worker restart and one Connector attempt; foreign-schema access denied |
| Runtime config/composition/lineage tests | 9 PASS; `focused-tests-final-2.log`; exact route coverage, grant/URL/key rejection, tenant scope, lineage and scanner failure isolation |
| Workload HTTP/exchange regression tests | 28 PASS; `transport-regression.log`; composed ingress succeeds after2s while ordinary owner deadlines still reject; authentication/protocol/body bounds and exchange contracts retained |
| Package/container inspection + Compose config validation | PASS; `package-final.json` |
| AST lint / boundary / runtime inventory | PASS1083files; no new boundary edges; 84operations/88registrations/80recovery handlers, no open Chat boundary group; `lint-final.log`, `boundary-final.log`, `inventory-final.log` |

All test Chat containers stopped gracefully with exit0 and were removed by the fixture helper, including restart cycles. Native owner listeners were ephemeral test processes using actual implementations and restricted fixtures. No dependent service was rebuilt or deployed. Full worker readiness proves composition/scheduling; it does not turn unavailable optional consumer work into completed business outcomes.

Earlier evidence: host read/tenant denial/restart/missing-dependency tests (`runtime-native-4.log`), host ingress/send and initial image builds. These are historical checks, not substitutes for the final image runs. Failed container ingress attempts1/2 exposed the2s outer deadline; CHG-20261025-03 changed only accept/read to bounded10s with current authorization and exact retry unchanged. Attempt3 passed on image4; final rerun uses image5 with smaller scheduler batches. Other failed host fixtures/build attempts remain in the artifact directory and are not counted as PASS.

## Remaining acceptance

T08 has accepted Chat public feature families and producer/local consumer recovery through the final image pinned in its acceptance document, with real compatible synchronous owner APIs and explicitly synthetic provider/receiver boundaries. Post-write recovery follows T02 freeze + forward recovery against the same owning database. T09 remains responsible for exact old-writer fences and main routing. Reporting, Workflow and Sales business completion/deployment are not Chat gates.
