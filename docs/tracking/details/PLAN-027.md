# PLAN-027 — Dashboard / Reports design review

Owner Codex · 2026-10-14 · CHG-20261014-04 · DONE design-only. User explicitly selected **complete specifications for review before code**. Scope is documentation only; no source task claimed or feature completion inferred.

## Deliverables

[Feature/flow plan](../../planning/dashboard-workspace.md), [screen/component specification](../../ux/dashboard-workspace.md), [data/table designs](../../data/dashboard-workspace.md), [behavior/API contract](../../contracts/dashboard-workspace.md), [DW-AC01…14](../../quality/dashboard-workspace-acceptance.md). Reviewed current Reporting module/service/ownership/storage/query/UX, actual workspace/builder/dashboard source and four user-provided HubSpot references. Six proposed Reporting tables, private authority/version/snapshot/atomic template creation and explicit legacy conversion; no physical schema changes.

## Verification

Executed in Windows PowerShell, pinned Node24.21.0:

- `.local/node-v24.21.0-win-x64/node.exe scripts/check-docs.mjs`: final PASS270 Markdown files,2347 local links,6 JSON examples,24 Mermaid headers (not rendered),72 acyclic source tasks. Artifact artifacts/dashboard-design/docs-check.txt (first check had2340 links before evidence/checkpoint sync).
- PowerShell `[IO.File]::ReadAllText` scan of24 scoped Markdown files: PASS no trailing spaces or Unicode replacement characters. Final scan includes checkpoint (25 files) in artifacts/dashboard-design/scoped-check.txt.
- `git diff --check -- <explicit changed tracked documentation paths>`: PASS; only Git LF→CRLF notices, no whitespace errors. Existing unrelated source changes not included in this scoped check.
- A verification attempt with per-command `core.autocrlf=false` incorrectly treated existing CRLF line endings as trailing whitespace (exit2); no files were changed by that check. Rerun with the repository's actual line-ending configuration PASS (exit0), artifacts/dashboard-design/git-diff-check.txt. No repository Git configuration changed.
- Manual design cross-check resolved ambiguous blank-create versus Save-as-copy payload (POST supports optional validated widgets), distinguished source report version from head revision, removed illustrative hardcoded dashboard counts, and specified archived-dashboard behavior. No user decision was silently treated as approval to implement.

Runtime tests, actual new UI/screenshots, EXPLAIN, OpenAPI/DDL executable schemas and migration checks are NOT_RUN/NOT_CREATED in this design phase. Mermaid diagram is source specification, not rendered evidence. No app build/test needed for documentation-only changes; previous runtime PASS results are not reused as redesign evidence.

## Workspace and next action

Working tree `main` at existing base `1cfa300`, dirty before session with prior source/docs work preserved. No new commit/push/deploy, DB/user/grant change/reset, service restart, subagent or scheduled work. Service status last recorded by SRC-070; not freshly probed in this docs-only task. Exact next action is user review of the linked specification; after review PLAN-027A finalizes executable contract artifacts before any implementation. Proposed SRC-071/072 TODO; broad SRC-061 remains incomplete.
