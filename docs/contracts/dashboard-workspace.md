# Dashboard workspace — behavior và API contract đề xuất

PLAN-027 · CHG-20261014-04 · v1.0 · 2026-10-14. **Implemented bounded native API, SRC-071.** [Feature](../planning/dashboard-workspace.md), [components](../ux/dashboard-workspace.md), [data/tables](../data/dashboard-workspace.md), [acceptance](../quality/dashboard-workspace-acceptance.md). Contract này quyết định behavior; [implementation gate](dashboard-implementation.md) khóa exact executable input/private schemas và endpoint subset. Public version-history browser và full response-schema hardening chưa thuộc slice. Legacy list bổ sung optional `convertedDashboardId` chỉ khi viewer có quyền đọc dashboard đích, để mở kết quả chuyển đổi thay vì gửi lại command mới.

## 1. Transport và permissions

Prefix mới native `/api/v1/reporting`; BFF dùng native CRM cookie/session và selected tenant, không browser-signed authority. Mọi response no-store; native mutation kiểm Origin, CSRF, JSON content type và Idempotency-Key UUID. Client không được gửi owner/tenant/permission trong body. Reuse `report_definition.read` (seat read) và `report_definition.design` (seat configure), scopes own/all, áp ownership riêng của từng dashboard/report. Tenant super-admin theo contract hiện hữu; không cấp quyền mới trong rollout.

Dashboard read không cấp report read hoặc source run/export. Template/source discovery và widget query giữ native `report_definition.run/all` + `report_mock_source.read/all` hiện tại; export đòi export grant riêng. Template create dùng read/design trên new owner + current source access/compatible catalog; không được clone report của người khác bằng quyền dashboard của mình. Published/team/anonymous sharing chưa có.

BFF resolve Identity trước HTTP riêng và recheck session/auth revision trước public delivery; private Reporting request là short-lived HMAC admission theo conventions hiện có, audience mới `reporting-dashboard-v1`, bind kind+route+body+tenant/principal/scopes/source authority+expiry<=5s. Cookie/X-Tenant-Id không là authority trên private endpoint. Same5s admission-window limitation như existing storage, không hứa distributed linearizable revocation. Query/source admission và cached result dùng current viewer, không as owner. No network trong Reporting SQL transaction.

Query read refs từ saved dashboard trên server, không tin report definition client truyền. Tampered widget/report/tenant IDs fail closed. Unauthorized dashboard hoặc foreign report ID trả404 chung; resource-level forbidden trả403. Dashboard GET phải che metadata của report bị deny, kể cả title override/note có thể chứa thông tin report: trả placeholder với widget ID/layout/unavailable reason chung; designer không tự mất ref khi round-trip, phải revalidate hoặc chủ động remove trước save. Không dùng lỗi khác biệt để oracle sự tồn tại foreign records.

## 2. Read API inventory

| Method / path | Query | Response / behavior |
|---|---|---|
| GET `/dashboards` | q<=160, owner=all/me, archived=false/true (defaultfalse), limit1..50 default20, cursor? | items DashboardSummary, nextCursor; fixed updatedAt desc,id desc, no global total |
| GET `/dashboards/:id` | version? positive decimal string | current head/ETag + requested immutable version + authorized widget summaries; allowedActions |
| GET `/dashboard-templates` | q<=160, category?, limit<=50,cursor? | pinned release catalog summaries, compatibility; no binding IDs from other tenants |
| GET `/dashboard-templates/:key/versions/:version` | none | immutable manifest/hash, report recipes/source slots/layout, compatibility requirements |
| GET `/reports` | q<=160, owner=all/me, model?, chart?, archived=false/true, limit<=50,cursor? | report-only summaries, version+revision distinct, validation/pickability reason, allowedActions |
| GET `/reports/:id/dashboards` | limit<=50,cursor? | active dashboards where latest version refs report; current dashboard ACL; count semantics scope-labelled |
| GET `/definitions/:id/versions/:version` | existing contract | existing immutable report detail; validation_state unchanged |

New lists query their appropriate typed data sources, no browser N+1 hydration of every row. Report list derives kind from latest definition structural discriminator, not name; semantically invalid saved reports remain manageable with `pickable=false`. Unknown document kinds marked unsupported, never executed. List version metadata is not a grant; preview/add/save re-read exact version.

New cursor opaque and authenticated, bound to tenant/principal authority scope + canonical search/filter/sort. Changes to search/owner/model/chart/archive reset cursor. Cursor is not authorization; apply current ACL on each page. No snapshot consistency promised during concurrent edits; frontend dedups IDs, refetch resets page; never derive total from loaded rows. Escape q as literal substring, no SQL/regex/operator expression input. Existing definitions list limit/order/cursor stays compatible; no breaking replacement.

## 3. Mutations

| Method / path | Body | Atomic result |
|---|---|---|
| POST `/dashboards` | name,description,widgets? | New dashboard owned by current principal, revision/version1; omitted widgets=[] for Blank, complete validated widgets for Save as copy |
| PATCH `/dashboards/:id` | name,description,widgets[] (complete replacement) | Validate refs/layout, append version, CAS head, audit/outbox/receipt |
| POST `/dashboards/:id/archive` | archived boolean | CAS head only; restore uses same endpoint |
| POST `/dashboards/:id/duplicate` | sourceVersion,name | New owner/current caller, copy layout/notes/exact report refs/pins; report ACL recheck; no report clones |
| POST `/dashboards/from-template` | templateKey,templateVersion,templateHash,name,description,selectedRecipeKeys,sourceBindings | New dashboard + new saved reports, one local transaction; returned generated IDs |
| POST `/dashboards/convert-legacy` | legacyReportId,legacyVersion | New dashboard + one saved report per legacy widget, original unchanged; unique source lineage |

PATCH/archive require `If-Match: "revision"` for target. Duplicate requires If-Match source dashboard head; conversion If-Match legacy report head; sourceVersion/legacyVersion phải là latest edit version tại submission. No precondition header for blank/template create; template hash and generation expectations protect their inputs. Name1..160 trimmed, description<=4000. Complete widget body fields exactly as [dictionary](../data/dashboard-workspace.md); unknown fields rejected. PATCH preserves template lineage/owner/legacy provenance server-side, client cannot reassign.

Body cap96KiB, 12widgets, flat metadata, JSON depth<=12; same report query compiler/limits apply downstream. Validate UUID/version/hash/types, no duplicate widget IDs/recipe keys, supported layout sizes/no overlap, required source slots, no foreign/inaccessible/archived reports, correct model/metrics/source binding/version, active ready generations and field compatibility. Empty blank dashboard is valid; template selection empty is422. Allow duplicate report refs in distinct widget IDs; API never dedups them accidentally.

Same command replay: receipt hash includes operation/target/body/If-Match; same actor/key/body → same dashboard/report IDs/version, even after lost ACK; changed body409. Current authorization always precedes replay. 5s admission expiry rolls back uncommitted writes. If commit succeeded before BFF rejects revoked delivery, retry after renewed auth reconciles receipt, never blindly generates a fresh key.

Response `{data:{dashboardId,revision,version,createdReportIds:[],replayed:boolean}}` + ETag, then GET detail. Keys above camelCase for new API; existing report API snake_case envelope remains unchanged, frontend adapter maps explicitly. No hidden normalization of report version into dashboard revision.

### Example — add a saved report to a dashboard draft

```json
{
  "name": "Điều hành inbox",
  "description": "Dashboard minh họa, dữ liệu mô phỏng.",
  "widgets": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "reportId": "22222222-2222-4222-8222-222222222222",
      "reportVersion": "3",
      "bindingId": "33333333-3333-4333-8333-333333333333",
      "generationId": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "titleOverride": null,
      "note": "Chỉ tính tin đã sent; pending không tính là zero latency.",
      "layout": {"x": 0, "y": 0, "w": 6, "h": 4}
    }
  ]
}
```

UUID/hash trên là synthetic syntax examples, không phải seeded record IDs. Không có `definition`/results/owner trong widget payload.

## 4. Widget runtime và preview

Archived dashboard vẫn đọc metadata/history nếu có quyền, nhưng không query hoặc edit content cho đến restore. Save as copy từ conflict panel gửi local draft qua POST dashboards với command mới do người dùng chủ động chọn, revalidate tất cả report refs/pins; không dùng duplicate saved version làm thay thế bản chỉnh sửa chưa lưu.

POST `/dashboards/:id/widgets/:widgetId/query` body `{dashboardVersion}` resolves exact persisted widget/ref/pin → current dashboard/report/source ACL → compile → existing query execution → current auth recheck → `{data:{widgetId,reportId,reportVersion,generationId,result,completedAt}}`. Query format đợt đầu JSON; CSV từ report viewer qua existing export flow. Nguyên tắc fail closed/current rights giữ nguyên; không sửa run lifecycle/kpi semantics của SRC-059.

Unsaved layout preview chỉ read/query existing report version bằng POST `/reports/:id/versions/:version/preview` body `{generationId}`; server lấy definition và binding, không arbitrary definition source. It requires current report/source/run rights and returns same query envelope. Add/select does not run all choices automatically. No new persisted durable run promise; existing query bounds/cancel behavior remain. UI cancellation stops waiting and stale rendering, not a claim SQL physically cancelled.

Manual dashboard Refresh starts max2inflight widget queries per viewer; no cron/schedule/polling. First clear prior results for affected refresh epoch. Every response keyed tenant/principal/auth revision/dashboard ID/version/widget ID/report version/generation/sequence. Changing document/authority aborts and discards old results. 401/403 or authority revision change clears all sensitive metadata/results and requires reauthorization; ordinary per-widget compiler/network error is partial, not0. Concurrent version edit does not alter an in-flight pinned query; returning results must still pass current ownership/archive checks.

Refresh uses saved version. In edit mode changed/unsaved refs may use explicit report preview but cannot label results as saved dashboard version. Save success invalidates prior query results. Rename/layout-only changes may retain compatible preview in memory with unsaved marker; no persist result snapshot.

## 5. Explicit upgrade behavior

Report source sửa → latest_version tăng; dashboard stays on pinned reportVersion. Detail may return `newerVersionAvailable` only when current report accessible. Designer opens diff of metrics/filters/time/chart/source and explicit preview, selects new version, then Save dashboard. Cancel does not change widget; updating one widget doesn't mutate other dashboards/widgets using same report. No auto-refresh to latest report.

Source generation changes → pin old becomes unavailable under initial active-only execution policy. Separate “Đổi snapshot” action shows old/new source coverage/window and validates same report version; explicit confirmation adds new pin to local draft → Save. Report definition time range không tự đổi theo snapshot; incompatible coverage fails. Không ghi `SNAPSHOT_PIN_UNAVAILABLE` rồi dùng latest data làm fallback.

## 6. Errors và recoverability

| Status / code | Meaning / client action |
|---|---|
| 400 INVALID_REQUEST | Shape/type/unknown fields; show field errors, keep draft |
| 401 SESSION_REQUIRED | Clear results/metadata, native login |
| 403 FORBIDDEN / AUTHORITY_CHANGED | Clear results/metadata; reload current permissions, no automatic retry loop |
| 404 NOT_FOUND | Missing/foreign/unreadable resource; no names/owner disclosure |
| 409 VERSION_CONFLICT | If-Match stale; keep local draft, reload or save new copy |
| 409 IDEMPOTENCY_CONFLICT | Key reused with different command; do not silently retry with new key |
| 409 TEMPLATE_CHANGED / SOURCE_CHANGED | Manifest hash or selected active generation changed; reselect/preview, no partial writes |
| 409 LEGACY_ALREADY_CONVERTED | Separate command collides on lineage; return target link only if authorized |
| 422 INVALID_LAYOUT / REPORT_NOT_PICKABLE | Explain valid layout or safe report unavailable reason; no write |
| 422 SNAPSHOT_PIN_UNAVAILABLE | Pinned generation not executable; explicit change snapshot required |
| 428 PRECONDITION_REQUIRED | Missing If-Match; reload head before deliberate retry |
| 429 QUERY_LIMIT | Manual retry/backoff; preserve errors as unknown, not0 |
| 503 SERVICE_UNAVAILABLE / ADMISSION_EXPIRED | Retry same command after refreshed admission; no new command ID for uncertain commit |

Per-widget errors may be sanitized more narrowly than top-level errors. Foreign/unreadable report collapsed to `REPORT_UNAVAILABLE`; unknown source/field metadata not exposed. Safe correlation ID allowed, SQL/stack/HMAC/transcript forbidden.

## 7. Compatibility và readiness gate

Keep existing report storage/query/run/export endpoints and draft labels intact. New typed dashboard endpoints/table aggregate are additive. Legacy conversion is explicit and reversible by keeping old read surface, not destructive migration. Report usage/report-only list are new contracts; legacy definitions list remains mixed for existing clients. Template catalog registry evolves by new immutable versions/hashes, old artifacts retained for replay/provenance.

Before source: PLAN-027A must machine-check strict public/private schemas, negative examples, signed operation digest conventions, DDL/FK/checks, deterministic receipt/lock ordering, query admission/run cancellation behavior and template recipe manifests. This document does not claim these executable artifacts/tests have been created. [Acceptance](../quality/dashboard-workspace-acceptance.md) is the execution gate; no endpoint above is advertised as available now.
