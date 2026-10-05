# Checkpoint — điểm tiếp tục

Updated 2026-10-05, S-20261005-11 (SRC-021 DONE).

## Trạng thái

SRC-001…021 DONE (21/25), M1 gate PASS. SRC-022 READY, chưa claim; không task active. [SRC-021 evidence](details/SRC-021.md) · [tracker](tasks.md).

Sales handoff/acceptance API, Contact read-only share, Human Sales routing/queue,15min durable attention, actual Workflow action/predicate implemented. Migration17 additive source; v1–16 preserved.166 MySQL tests PASS (15 Sales +1 cross-module +150 regression), final verify9/9 PASS (66 unit/contract +7 tooling), full workspace build/typecheck. Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11.

## Git và runtime

User requested commit/push before continuing: SRC-020 `69ce348` pushed successfully origin/main (from f4a6c27). SRC-021 source/docs/generated changes retained uncommitted on main; no second commit/push or deployment. No secrets/test credentials in tracked files.

Preview retains SRC-020/schema16 and existing seven services; this session did not migrate/rebuild preview, reset database or delete volumes. New schema17 exercised only in disposable project agentic-crm-src021-test, cleaned containers/network afterward. New Sales browser/OIDC E2E, preview migration17, release images/rollout and remote CI NOT_RUN. Existing SRC-020 preview evidence retained in previous task detail.

## Evidence và bước tiếp tục

Artifacts ignored `artifacts/SRC-021/`: integration-final.log (166 PASS), verify-final/summary.json and gate logs, compatibility.log, build-final.log, docs-final.log, whitespace.log, services.log, working-tree.log. Failure history in task detail; no failed result counted PASS. No running test runner, subagent or automation; no blocker or pending decision.

Next action: read SRC-022 Sale queue/detail + operations/run UI design/contracts/acceptance, claim task then implement. Coordinate local schema17 upgrade with actual preview rollout, preserving volumes and verifying migration/data retention. Full M2 gate remains SRC-022…025.
