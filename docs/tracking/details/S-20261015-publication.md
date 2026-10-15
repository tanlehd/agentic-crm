# Rà soát phạm vi và hoàn tất trước Git publication

Codex · 2026-10-15. User requested reviewing unfinished work, completing it and pushing Git after the prior broad-stage rejection. This review covers the accumulated workspace, not every future platform milestone.

## Phạm vi đưa lên Git

| Phần công việc | Trạng thái / bằng chứng |
|---|---|
| Workflow metadata/Core validation, CMS và visual canvas | SRC-065/066/067 DONE scoped; source/contracts/tests/docs present. Kafka extraction and generic actions remain separate |
| Customer360, session continuity, stage/milestone và funnel | SRC-068/069 DONE scoped; forward migrations28/29 and retained evidence; no migration rewrite |
| Report Builder, field/formula/visuals và Alpha activation | SRC-064 closed using prior semantic/browser evidence plus SRC-070 Alpha activation and current native browser regression |
|50-inbox DEMO, tenant-super-admin và saved reports | SRC-070 DONE scoped; existing data and native role policy retained, no new grants |
| Dashboard/Reports menus, templates, widget refs, editor | SRC-071/072 DONE scoped after the fixes and reruns below |
| Documentation, contracts/generated code, package lock and tooling | Included as dependencies of these slices; local credentials, databases, artifacts and build output remain ignored |

## Hoàn thiện trong lượt này

1. Report viewer now checks the existing supported-definition boundary. Future/unvalidated definitions show a safe message; run/edit are unavailable, stored bytes stay unchanged.
2. Report list uses the existing strict semantic definition schema before projecting model/chart and computing pickability. Missing or malformed binding IDs return422 before SQL; one future draft cannot break the library.
3. Dashboard-usage/target dialogs appear while loading and fence responses by request generation. Closing with Escape or switching reports prevents stale responses reopening a dialog. Focus returns to the trigger.
4. Clear stale source/modal/busy state on report change; clear dirty state when leaving the Reports editor. Adding a readable report to an owned dashboard uses dashboard design permission independently of report ownership.
5. Reconcile SRC-064's obsolete pending Alpha gate with the completed SRC-070/072 evidence; no new permission provisioning.

## Kiểm chứng thực chạy

Windows, pinned Node24.21.0/pnpm10.33.0; retained MySQL and Chrome native login.

- `node node_modules/vitest/vitest.mjs run --exclude '**/*.integration.test.ts'`: PASS362tests/49files.
- `node scripts/dashboard-native-test.mjs`: PASS12groups, including future/malformed definitions, safe listing, execution refusal and unchanged stored bytes. Artifact `artifacts/dashboard-workspace/native.json`.
- `node scripts/dashboard-browser.mjs`: PASS15groups on actual Alpha/backend. Added future-definition viewer and delayed native usage-response/Escape/focus cases. Successful responses are native; final fault cases explicitly inject503/403. Artifact `artifacts/dashboard-workspace/browser.json`.
- Reporting build, recursive workspace typecheck and isolated Next production build: PASS. Next config bytes preserved; `.next-dashboard-build` kept separate from dev cache.
- Final documentation/schema/generated-drift/lint/whitespace and publication refs are recorded in the execution log and ignored `artifacts/git-publication` evidence.

Only owned Reporting process reloaded to compiled code. MySQL/Redis and synthetic records retained; no reset, Alpha grant changes, remote deployment, subagents or schedules. Prior Git stage/commit attempt was rejected before mutation; no hidden commit occurred.

## Còn lại ngoài phạm vi đợt này

SRC-059 drilldown/remaining semantic metrics; SRC-060 advanced report authoring; SRC-061 global filters/comparison/cross-filter/sharing; SRC-062 capacity/release gates; PLAN-024B…E Kafka/distributed Workflow; SRC-051 live Marketing sync. These retain their existing status/dependencies and require their exact Ready design before source. Public response-schema hardening, version-history UI and exhaustive screen-reader/contrast/browser-zoom audit are follow-ups, not claimed complete by these local/mock slices.

No remaining blocker in the reviewed publication scope. Commit/push targets existing `origin/main`, with no force push; the resulting Git commit is the source snapshot, and the final response reports the verified remote hash.
