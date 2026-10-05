# Checkpoint — điểm tiếp tục

Updated2026-10-06, S-20261006-02 (SRC-024 completed).

## Trạng thái thực tế

SRC-001…024 DONE (24/25), M1 gate PASS. SRC-024 regression/fault gate PASS; full M2 release gate còn mở. SRC-025 READY, chưa claim; không task active. [SRC-024 detail](details/SRC-024.md) · [tracker](tasks.md).

Four new fault cases: real Redis TCP disconnect/HTTP503, recovery200 and lost-session401 with durable bearer intake202; actual SIGKILL after assignment action commit, Workflow consumer commit and mock provider receipt. Restart/replay preserves one effect/run and pinned version; takeover/unknown/reconcile never resends. Existing races/ACL/out-of-order/runtime/Chatflow/Sales and healthcare regression all pass. No production code/schema/API/event/migration changes.

## Working tree và services

Branch main, HEAD `d4a4506`; SRC-024 tests, Compose test config, integration runner, docs/README/tracker changes are uncommitted. No commit/push/deploy in this session. Previous SRC-023 implementation was committed/pushed as `92d3ed6` at user request; current base includes subsequent docs sync.

Preview remains SRC-022/schema17. Fresh check2026-10-06:7 services healthy (`artifacts/SRC-024/services-final.log`); no preview stop/start or volume mutation. Dedicated SRC-024 MySQL/Redis/test containers and network cleaned. No background jobs, automation or subagents started.

## Evidence và giới hạn

`artifacts/SRC-024/`: integration-final.log180/180 PASS; verify-final/summary.json9/9 PASS (66 unit/contract+7 tooling, build/typecheck/smoke); build-final.log; services-final.log; docs-final.log; whitespace.log. Initial179 PASS/1 test-SQL failure retained in integration-first.log and corrected. Final docs-only closeout follows canonical verify; docs/whitespace rerun on final tree.

Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11/Redis7.4.11; host Node orchestrates only. Offline cache image builds current test source; commands in [detail](details/SRC-024.md). Standard runner: `pnpm test:integration`, now compiles backend and provisions ephemeral Redis as well as MySQL.

Redis fault is an actual TCP cut, not container restart. Process tests run compiled application services, not Nest worker bootstrap. Lease expiry is accelerated using test SQL; OIDC exchange/account resolution synthetic, session service/Redis/HTTP real. No BullMQ or Meta/LLM production evidence claimed. Remote CI/native AMD64/Windows and SRC-025 release/upgrade/demo NOT_RUN. No blocker or unresolved decision.

Next action: read SRC-025 release/upgrade requirements and claim SRC-025 for release images, M1→M2 smoke and M2 demo/handoff.
