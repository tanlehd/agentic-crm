# PLAN-003 — Meta provider dossier và capability/gap matrix

Owner Codex, 2026-10-06; dependency PLAN-002 DONE. Research/documentation scope only. [Deliverable](../../references/meta/capability-matrix.md) · [Source catalog](../../references/meta/README.md) · [Version evidence](../../references/meta/graph-version-observation.md).

## Kết quả

Thêm33 official Markdown +1 WhatsApp index, tổng56 downloaded snapshots gồm PLAN-002. Bốn request trả HTTP200 HTML thay usable Markdown được ghi failed trong manifest, không tính thành công. Snapshot cũ giữ checksum; không ghi đè nguồn cũ. New source manifest: `docs/references/meta/2026-10-06-plan003/manifest.json`.

Dossier có Agent knowledge/allowlist/budget/eval, WhatsApp send/auth/media/webhook/standby/subscription, Messenger field references/routing/policy. Pin Graph v26.0 theo official browser versions/release notes; config X-API-Version2.0.0, Thread Control1.0.0 theo16 endpoint entries. Graph notes là analyst transcription, không giả raw export.

G-01 subscription spelling và G-03 send-vs-take resolved at documentation level. G-04 host/path mismatch, G-05 WhatsApp handover exact schema, G-08 trusted tool callback binding vẫn chặn production sub-scope Ready. Other gates cover account eligibility, unknown send, shared Business Manager budget authority and failed exports. Mỗi gap có owner/impact/unblock evidence; không phải blocker cho research completion hoặc phần thiết kế độc lập PLAN-004.

## Verification evidence

Environment: macOS ARM64, host Node25.9.0 cho documentation checker, Python3 cho downloader/hash/extraction; không chạy app runtime tests trên host. Public source reads only, no authenticated Meta calls.

| Command/check | Result | Artifact |
|---|---|---|
| `node scripts/check-docs.mjs` | PASS; final count theo log | `artifacts/PLAN-003/docs-check.log` |
| `git diff --check` | PASS | `artifacts/PLAN-003/whitespace.log` |
| Python hashlib/byte/provenance checks trên cả2 manifest | PASS56 downloaded sources;4 failed exports không có snapshot giả | `artifacts/PLAN-003/sources-check.log` |
| Python source extraction comparison | PASS16 Agent endpoint URLs/header versions/methods; Graph evidence reviewed separately | cùng sources-check.log |
| Read-only `docker ps --format '{{.Names}}\t{{.Status}}'` | Seven preview services healthy | `artifacts/PLAN-003/services-observation.log` |

Download commands: `curl -fL --max-time 30` WhatsApp llms index; Python urllib25s/request with4 concurrent download workers for index-selected public URLs,3 workers for targeted reference follow-up. URL/file/checksum/error inventory stored in manifest. Parallel downloads are not subagents; no background job left running. An initial URL-selector IndexError from a cross-product index link was corrected with prefix guard before downloading. Four non-Markdown responses remained after diagnostic read and were not called PASS. Browser v26 link was ambiguous; direct observed href navigation succeeded. Candidate WA handover page displayed no article; it is a documented source gap, not a claim Meta has no such webhook.

Docs check validates local links/fences/JSON examples/source-task graph; Mermaid headers only, no rendered proof. Separate final planning dependency review confirms PLAN-002→003→004 and only one active task before closeout. All provider sandbox, tenant account eligibility, real signature/delivery/control/CRM tool cases NOT_RUN. No new runtime or M3 AC PASS.

## Files và handoff

Updated dossier/catalog/version matrix, plan, runtime/message drafts, Agents/Channels, dictionary, ADR-016, acceptance and README/index/tracker/log/checkpoint. No source/schema/event/API/migration change. Existing PLAN-002 dirty work preserved on main HEAD1111839; no commit/push/deploy/reset. Services only inspected, no lifecycle mutation.

Next action PLAN-004: author exact independent contracts/UX/data/compatibility and source backlog; keep live WA control and mutable hosted tools Draft until G-04/05/08 have evidence. Do not ask again for the provider/connector direction already approved by user.
