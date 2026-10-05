# Checkpoint — điểm tiếp tục

Updated 2026-10-05, S-20261005-09 (Git handoff SRC-019).

## Trạng thái thực tế

**SRC-001…019 DONE (19/25), M1 gate PASS. SRC-020 READY chưa claim; không task active.** [SRC-019 evidence](details/SRC-019.md) · [tracker](tasks.md).

Preview [localhost:8080](http://localhost:8080) có OIDC/Identity Admin/CRM, mock intake/inbox, routing/assignment/takeover, private deterministic Agent Runtime và Workflow API/worker. No Workflow UI/builder; operations UI SRC-022. Default Chatflow/Sales child ports fail closed tới SRC-020/021. Không public arbitrary execute/fixture endpoint, production AI/Meta hoặc full M2 claim.

Schema v13 workflow_engine applied; v1–v12 immutable. Fingerprint13 existing tables exact before/after upgrade, trước browser synthetic fixtures. Seven preview services healthy; sampled worker tail không tick error. Credentials giữ private .env.

Validation:132 MySQL integration PASS (17 Workflow +115 regression);9 canonical verify gates PASS (54 unit/contract +7 tooling); release backend build và Chrome154/OIDC Workflow API→intake→timer worker smoke PASS. Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11; host Node25 chỉ driver/diagnostic. Registry metadata stalled normal builds; cached pinned dependency image + final source fallback recorded, no network installs/lockfile changes. Artifacts local ignored `artifacts/SRC-019/`; exact commands/results tại task detail.

## Điểm nối source

- `modules/workflow/application.ts` + `http.ts`: definition/version/publish/enable, bounded lists, sanitized run detail/cancel. Current tenant/seat/role/Conversation read, CSRF, CAS and atomic audit/idempotency.
- `modules/workflow/graph.ts`: exact typed DAG, max50, acyclic/reachable/end paths, dominator refs and child-bound waits. JSON Schema/OpenAPI/generated client mirror wire shape.
- `modules/workflow/engine.ts`: durable starter selection (including disabled/no-match), pinned version/service role, run:node action key, separate transactional effect ledger/step completion, lease/fence/retry. Worker polls due steps and rotates persisted waits; predicate checked before timeout. Cancel keeps effects and queues child cancellation,5 retries/15s then attention.
- `modules/workflow/ports.ts`: SRC-020/021 implement validate/execute/result/cancel in caller UoW; child result verifies same tenant + exact parent_run_id/child ID. Test-only synthetic child table never moves to production. No network I/O in primitive transaction.
- `modules/agents/session-port.ts`: still unavailable production default. SRC-020 supplies pinned session/status and draft/proposal/complete/handoff effects, pause/cancel on Human takeover and Chatflow-authorized outbound.
- `tests/workflow-cases.ts`: durable synthetic child port, real assignment, crash gap/reclaim/fencing/early signal/timer race/retry/cancellation/ACL tests. `workflow.test.ts`: graph validation.

## Bước tiếp theo

Claim **SRC-020 — Chatflow/session/turn và Human completion** when requested; SRC-019 DONE. Read Chatflow design/runtime/Workflow contracts, dictionary and AC-07/08/16. Implement first-message persistence, pinned version/session/turn, explicit consent, paused_human retention, single Lead/session, connect actual Workflow child port and Agent Runtime session port. Một task active, không agent song song/lịch nền.

## Workspace / runtime

Branch main: snapshot SRC-019 được commit/push theo yêu cầu người dùng trong S-20261005-09 (parent a34e3bc). Commit chứa checkpoint này là snapshot bàn giao; hash/trạng thái thực kiểm tra git log/status và origin/main sau thao tác. Không deploy. Preview retained running on v13; test projects cleaned and verify/browser runners completed. Synthetic test roles remain unassigned, definitions disabled, audit/history retained. No automatic ACL seed expansion. Remote CI/native AMD64/Windows/production provider NOT_RUN. No reset database/volume. One combined preview command approval review timed out before execution; split retry succeeded, no remaining blocker/pending decision. Recovery theo [runbook](../development/migrations.md).
