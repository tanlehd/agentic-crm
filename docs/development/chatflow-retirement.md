# Chatflow retirement — execution evidence

CHG-20261021-08, Codex 2026-10-21. Completed cleanup sub-scope of SRC-109/T05 following the explicit user request to delete legacy code and data. T05 itself remains IN_PROGRESS. [Design/template](../data/chatflow-retirement.md), [current Workflow contract](../contracts/workflow-orchestration.md).

## Delivered

Removed standalone backend engine/module/ports, HTTP routes, worker tick, Chat qualification panel, editor node/options, JSON schemas and generated clients. Removed the old release demo/entrypoint; updated Human qualification and Workflow regression fixtures instead of retaining a broken demo. AI Runtime keeps an explicit unavailable automation-session port until a supported Workflow implementation exists.

Workflow retains routing, need actions, timers, conditions and Sales handoff. Retired primitives fail validation. Historical incompatible versions cannot open an executable editor; terminal run cancellation remains idempotent. No common conversational-node implementation or physical Workflow service deployment is claimed.

The version-list response accepts immutable historical node shapes for reading. Authoring and execution retain the strict supported-node schema; a regression test verifies that a retired graph can be read but fails both authoring and execution validation.

Baseline forward43 removes five Chatflow tables, Lead qualification-session FK/index/column and outbound session FK/column. It disables dependent definitions, cancels active runs/steps/waits with CHATFLOW_RETIRED, removes obsolete queue/projection data and revokes legacy workload use. Immutable Workflow versions/actions, audit, Lead qualification, Message and business records remain. Chat forward4 separately removes its outbound reference and obsolete Chatflow deliveries/projections. No cross-service SQL is introduced.

## Actual local data

| Schema | Result | Preservation |
|---|---|---|
| agentic_crm | 42 → 43, repeat no-op | Hashes unchanged for 12 business/history tables, including 40 Lead, 109 Conversation and 221 Message |
| native_identity_test | 42 → 43 with populated synthetic Chatflow/Lead and two-tenant Workflow fixtures | 12 table hashes preserved; only dependent active workflows cancelled; repeat and terminal cancel verified |
| test_crm_chat_owner | 3 → 4, repeat no-op | 7 business/receipt table hashes preserved, including 231 Conversation and 269 Message |

Frozen T03 source/restore snapshots, historical migration files, native_seed_test schema37 and failed-run test schemas remain retained evidence/fixtures. They are not serving Chatflow. No broad purge, DB reset, volume deletion, commit or push occurred. Test runs created dedicated retained schemas listed in artifacts/chatflow-retirement/regression-databases.json.

Main's first attempt stopped at the first DROP because crm_migrate lacked DROP privilege. All five tables and both reference columns were inspected as present/empty; the failed journal checksum matched forward43. Operator recovery temporarily granted DROP on exactly those five tables, resumed at the first DDL without replaying earlier DML, completed the journal and revoked temporary grants. Provisioning now grants owning-schema DDL rights to the migration role only. Initial failed evidence is preserved, not reported as PASS.

## Verification

Commands run with pinned Node24.21.0 and local pnpm tooling on Windows, MySQL8.4 Docker local. Logs below are workspace-relative under artifacts/chatflow-retirement; no credentials or message contents are stored.

| Command | Actual result / artifact |
|---|---|
| pnpm --filter @agentic-crm/contracts build; workload-transport build; backend build; chat build | PASS, backend-build.log, chat-build.log |
| pnpm --filter @agentic-crm/web build | PASS, web-build.log |
| pnpm --filter @agentic-crm/web typecheck | PASS after history-response update, web-typecheck.log |
| pnpm test:unit | 462/462 PASS, unit.log |
| node --test scripts/tests/chat-control-contract.test.mjs scripts/tests/chat-data-design.test.mjs scripts/tests/chat-owner-contract.test.mjs | 62/62 PASS, scripts.log |
| node scripts/chatflow-retirement-regression.mjs | 53/53 real MySQL cases PASS: Workflow lease/crash/replay/cancel, Chat, manual Lead, Human qualification/Sales; native-regression.log |
| node scripts/chatflow-retirement-test.mjs | 7 populated migration groups PASS; retained repeat + terminal cancellation PASS; native.json, native-repeat.json |
| node scripts/chatflow-retirement-apply.mjs --main / --chat | PASS after documented repair/assertion fix; main-apply.json, chat-apply.json; initial reports retained separately |
| node scripts/generate-contracts.mjs --check | PASS, 182 owner operations / 527 schemas; contracts.log |
| node scripts/check-chat-boundary.mjs --check | PASS, 0 added and 10 removed dependency edges; boundary.log |
| node scripts/check-docs.mjs; git diff --check | Final results recorded in docs.log and whitespace.log |
| node scripts/chatflow-retirement-verify.mjs | Main API3001, worker3002, monitor3020 HTTP200; removed /api/v1/chatflows HTTP404; final-runtime.json |

Compiled outputs belonging to deleted modules were removed using native PowerShell file operations after Node unlink returned EPERM. Historical Docker images/snapshots were not rewritten. Local API/worker and ingress/outbound writers were stopped during main maintenance and restarted; endpoint readiness was verified after recovery.

## Resume

Return to T05 D2 Human send/intent/job/claim/result on Chat-owned storage, then workspace/session hydration and capability lineage. T06 remains gated by T05; do not recreate Chatflow or its adapter/drain requirement. Conversational automation is a future action set within the one Workflow service (SRC-043), not a second module.
