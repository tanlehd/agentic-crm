# Checkpoint — điểm tiếp tục

Updated 2026-10-05, S-20261005-07 (Git handoff SRC-018).

## Trạng thái thực tế

**SRC-001…018 DONE (18/25), M1 gate PASS. SRC-019 dependency READY, chưa claim; không task active.** [SRC-018 evidence](details/SRC-018.md) · [tracker](tasks.md).

Preview [localhost:8080](http://localhost:8080) có OIDC/Identity Admin/CRM, mock intake/inbox và routing/assignment/takeover. Private deterministic Agent Runtime đã triển khai; production session port fail closed tới SRC-020. Không public runtime execution/fixture endpoint, không production AI/Meta hoặc full M2.

Schema v12 agent_runtime applied; v1–v11 immutable. Fingerprint13 existing tables exact before/after migration, trước browser synthetic intake. Seven preview services healthy; worker sampled tail không tick error. Credentials giữ private .env.

Validation:115 MySQL integration PASS;9 canonical gates PASS (50 unit/contract +7 tooling); release preview build và Chrome154/OIDC routing regression PASS. Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11; host Node25 chỉ driver/diagnostic. Artifacts local ignored `artifacts/SRC-018/`; chi tiết lệnh/evidence tại task detail.

## Điểm nối source

- `modules/agents/executions.ts`: private start/claim/run/accept/fail, durable action/tool replay, live owner/auth/service/policy, capacity/deadline/token guard, bounded in-flight worker, timeout recovery and postcommit cancel.
- `modules/agents/protocol.ts` + private contracts schema: deterministic mock, exact request/result validation, four tool schemas, qualification draft whitelist excludes consent/status/evidence. Context reloaded/redacted through owning Conversation/CRM/Identity ports each dispatch.
- `modules/agents/session-port.ts`: unavailable default; SRC-020 supplies real pinned session snapshot/status plus same-UoW draft/proposal/complete/handoff effects. Test-only durable harness proves boundary; do not copy fixture tables into production.
- `modules/agents/cancellation.ts`: assignment/takeover/close cancel queued/running execution/tools and release slots in same transaction. Session pause hook remains SRC-020. Runtime access consumer handles principal.access_changed from current permissions.
- Routing/ownership and existing inbox UI unchanged in behavior; browser regression verifies new cancellation table integration. Runtime suggestions do not dispatch messages; authorized Chatflow outbound remains SRC-020.

## Bước tiếp theo

Claim **SRC-019 — Workflow graph/version/run/step/wait engine** when requested; SRC-018 DONE. Read Workflow module, contracts, dictionary, AC-08/16 and change control. Implement publish validation/version pinning/action key/fencing/lost-signal prevention; Chatflow port test fake only, actual engine SRC-020. Một task active, không agent song song/lịch nền.

## Workspace / runtime

Branch main: SRC-018 snapshot được commit/push theo yêu cầu người dùng trong S-20261005-07 (parent a8462e8). Commit chứa checkpoint này là snapshot bàn giao; hash/trạng thái thực kiểm tra git log/status và origin/main sau thao tác. Không deploy, blocker hoặc pending decision. Preview services retained; disposable tests cleaned and browser/verify runners completed. Remote CI/native AMD64/Windows/production provider NOT_RUN. No reset database/volume; recovery theo [runbook](../development/migrations.md).
