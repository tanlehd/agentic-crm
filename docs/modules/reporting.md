# MOD-10 — Reporting & Dashboard

**Current 2026-10-14 / CHG-20261014-05:** User authorized implementation after PLAN-027 review. Dashboard/Reports local slice is implemented: Reporting-owned schema4 (six new tenant-scoped tables;13 prior business tables preserved), native APIs, atomic templates and separate UI. [Runbook](../development/dashboard-workspace.md) · [Backend evidence](../tracking/details/SRC-071.md) · [UI evidence](../tracking/details/SRC-072.md). Earlier design-only/phase statements below are historical; broad Reporting milestones remain in tracker.

**PLAN-027 / CHG-20261014-04 (design review, 2026-10-14):** [Dashboard workspace](../planning/dashboard-workspace.md) defines Report as reusable analysis, Dashboard as layout of saved report-version refs and Template as immutable creation blueprint. Separate menus/home/gallery/picker/library/viewer; [data](../data/dashboard-workspace.md) and [API](../contracts/dashboard-workspace.md) define own-service aggregates/ACL/atomic template create. No code/migration in this review-only phase; SRC-070 legacy inline dashboards remain runtime baseline, generic SRC-061 not completed. Alpha activation is DONE under SRC-070; older pending statements below are historical.

**2026-10-12 / CHG-20261012-06:** User accepted early API-backed UI. [PLAN-022H](../contracts/reporting-authoring.md) scopes source/model/fields/axes/flat filters/chart/pivot/private draft/CSV over delivered APIs. SRC-064 is the sole active source task; SRC-059 requeued READY, incomplete scope/evidence preserved. Full SRC-060 follows SRC-059 and SRC-064; no publish/dashboard/drilldown completion claim. No database changes.

SRC-059 lifecycle phase2026-10-12: [durable mock runs](../contracts/reporting-runs.md) now have native create/execute/status/cancel/result APIs,owner/current ACL,pinned snapshots and stale-attempt fences. Own schema3/run audit,24h logical result lifetime,physical synthetic retention; no background dispatcher. [Evidence](../tracking/details/SRC-059.md). Drilldown/remaining KPI semantics/UI remain open; earlier slice boundaries below are historical.

SRC-059 native phase2026-10-12: [mock query/CSV API](../contracts/reporting-query-api.md) now executes through native session/Identity and signed private Reporting transport. Dedicated run/source/export grants; current auth/session rechecked before delivery. Complete synthetic-source access is not connected CRM/Marketing row policy. Run/drilldown and UI remain pending; [evidence](../tracking/details/SRC-059.md).

SRC-059 update2026-10-12: internal mock snapshot queries now execute26metrics, exact grouping/pivot totals and aggregate CSV through trusted authorization/load ports. [Scoped contract](../contracts/reporting-query.md), [evidence](../tracking/details/SRC-059.md). Native query/source policy, durable run/drilldown and UI remain pending. Earlier slice descriptions below record their narrower boundaries.

**Current priority CHG-20261007-14:** Lead/Deal → organic Conversation→Lead→Deal won with value → organic Page report/release (SRC-045/046/052/050); then Marketing sync/campaign reports (SRC-051/049). Ticket/receipts follow separately. CHG-20261007-15: marketing reports measure conversion performance for resource, content/message and audience strategy; won value is a funnel outcome, receipts are independent. Exact scoped design: [organic Sales base](../contracts/organic-sales-base.md).


> Kiến trúc đích microservice theo ADR-017: [Reporting & Analytics](../services/reporting.md). Nội dung M2/UoW/FK dưới đây mô tả baseline monolith; không áp dụng transaction xuyên service. SRC-057 adds independent private draft storage only; no source projection extraction yet.
Status: Ready for implementation M2 metric semantics/fixtures. PLAN-022A product/semantic/UX planning Ready cho mock-first Report Builder; exact engine/API/schema/producer gate PLAN-022 còn TODO. Requirements: REQ-11. [Module plan](../planning/report-builder.md) · [Semantic model](../data/reporting-semantic-model.md) · [Builder/dashboard UX](../ux/report-builder.md) · [RB acceptance](../quality/report-builder-acceptance.md).

## Mục tiêu và phạm vi

SRC-058 adds internal mock datasource adapter and durable typed projections for25objects/120fields, immutable paged snapshots and atomic activation in schema2. [Contract](../contracts/reporting-projections.md), [evidence](../tracking/details/SRC-058.md). Original kernel catalog/metrics remain unchanged; raw fixture verification is not query engine/pivot/UI completion. Current source ACL/result delivery still gated by SRC-059.

SRC-063 first implementation slice (2026-10-10): [semantic kernel](../../services/reporting/README.md) registers19 objects/85 fields/16 relations/26 metric descriptors/4 models and validates typed definitions/access/grain/encoding. [Scoped contract](../contracts/reporting-semantic-kernel.md). SRC-057 (2026-10-12) adds persisted private drafts/immutable versions and native HTTP with Identity own/all access ([storage contract](../contracts/reporting-persistence.md)). Every stored draft is unvalidated/nonexecutable; no query, publish or builder/dashboard UI yet.

Đo acquisition → conversation → qualified Lead → accepted Lead → Deal/Customer, đồng thời đo latency và hiệu suất Human/AI. Template ngành và mục tiêu dùng cùng semantic model với custom report.

## Actor và quyền

Viewer xem dữ liệu có quyền; analyst thiết kế report khi có report.design; admin publish template. Quyền report không vượt quyền object/field; các trường bị deny không được filter/group/export. Không cache chung kết quả khác scope quyền.

## Use case và state machine

Report definition draft → published version → archived; dashboard tham chiếu version. Run queued → running → completed/failed. M2 chỉ xác nhận metric bằng fixture/query test, chưa có report execution UI production.

## Entity và invariant

Metric definition chỉ rõ grain, time basis, numerator/denominator, join path, null handling và version. M1–M2 source là DB nghiệp vụ; event projection eventual consistency phải có watermark. M5 có thể dùng read model/warehouse bằng ADR, không query SQL do người dùng gửi.

| Metric key | Grain / công thức | Time basis |
|---|---|---|
| inbound_messages | count distinct inbound message_id | received_at trong window |
| new_conversations | count distinct conversation_id | opened_at trong window |
| ctm_conversations | distinct Conversation có CTM touchpoint | cohort opened_at; touchpoint known tại as_of |
| unique_contacts | distinct contact_id từ new_conversations | cùng cohort Conversation |
| qualified_leads | distinct Lead với qualified_at non-null | qualified_at trong window |
| ctm_to_qualified | CTM cohort conversations có ≥1 Lead qualified tới as_of / CTM cohort conversations | cohort opened_at, không chia hai event count khác cohort |
| lead_acceptance_rate | Lead qualified trong window đã accepted tới as_of / Lead qualified trong window | cohort qualified_at |
| handoff_acceptance_latency | accepted_at − handoff requested_at; median/p95 | handoff cohort; pending không tính latency đã hoàn tất |
| first_response_latency | first sent outbound − first received inbound | Conversation cohort; pending báo riêng |
| customer_conversion | distinct Contact có first won Deal tới as_of / distinct qualified Contact cohort | M4; Contact grain, không Lead grain |

Denominator 0 trả null/“—”, không 0%. Window `[from,to)` UTC, UI convert theo timezone tenant. Report luôn ghi as_of; snapshot không tự thay nghĩa vì data đến trễ. First response tính tin đã sent, không tính note/queued/unknown.

Phân tổ agent cho qualification dùng owner tại qualified_at từ audit/ownership history, không dùng owner hiện tại. Acceptance phân tổ accepted_by. So sánh Human/AI kèm số lượng mẫu và pending; không tự điều chỉnh routing M2.

## API và event

Consume domain events để projection future; M2 dùng persisted state và fixtures. Report authoring contract sẽ định nghĩa measure/dimension/filter/join allowlist trước M5. Template dự kiến: Healthcare acquisition, Chat conversion, Sales follow-up, Service SLA.

## UI

Dashboard card có metric label/definition, window, timezone, as_of và freshness. Custom report builder chọn source/grain, dimensions, measures, filters; preview thể hiện join relationship và guard fan-out. Export kiểm tra quyền lại lúc chạy.

## Failure handling

Pre-aggregate theo grain trước join one-to-many; không fix fan-out bằng DISTINCT amount. Khi schema/field archived, report lỗi rõ field unavailable, không silently bỏ filter. Cache key tenant + permission fingerprint/auth_revision + definition version + params + watermark.

## Acceptance và dependency

[AC-11](../quality/acceptance.md), [healthcare fixtures](../business/healthcare.md); phụ thuộc CRM metadata, Identity, mọi module producer.

## Mở rộng còn Draft

PLAN-022A đã định hướng planner/joins/limits, version migration, viewer-scoped sharing, manual refresh và controlled CSV; exact contracts/table templates/producer coverage vẫn cần PLAN-022 trước source. Scheduling, public sharing, advanced exports, warehouse và multi-touch attribution còn Draft ngoài v1. M2 không hứa tính ROAS khi chưa có cost/revenue data.

M2 private query verification and continuous percentile/as_of rules: [healthcare fixture contract](../contracts/healthcare-fixture.md). No production report execution or cache is introduced.

## Report builder and CRM/Marketing templates — PLAN-021

[CRM base plan](../planning/crm-base-outcomes.md): PLAN-021 supersedes the planned fixed-report approach for SRC-049. Reporting owns a builder over base sources, linked objects, attribution fields and metrics; templates reuse this model. Exact implementation gate is PLAN-022. Existing organic report remains a delivered baseline, not proof of a generic builder. Mục tiêu là [hiệu suất chuyển đổi marketing](../planning/marketing-conversion-performance.md): funnel/rates và won value theo Campaign/Ad Set/Ad, creative/content/message và targeting dimensions có evidence; drilldown Deal→Lead→Conversation theo ACL. Receipts/refunds thuộc scope riêng, không là gate SRC-049. Reporting grain/cohort/date/currency, mapping version và reconciliation phải Ready ở PLAN-022; Marketing source fields/storage ở PLAN-011; không fan-out tiền qua messages/associations/Tickets, không cộng nhiều currency trực tiếp. Unknown attribution hiển thị rõ, không lấy nguồn khai báo thay thế. Không claim ROAS khi chưa có cost data; không live-provider claim từ synthetic fixture.

CHG-20261007-13: campaign grouping resolves source ad_id through [Marketing](../services/marketing.md) hierarchy Ad→Ad Set→Campaign→Ad Account synced from Facebook Marketing API. Reporting uses versioned API/event-fed dimensions, not SQL joins into crm_marketing. Late sync resolves unknown campaign groups without rewriting Lead snapshots; history joins must choose one mapping revision per fact to avoid duplicate revenue. SRC-049 now depends SRC-051.
PLAN-014: [Marketing dimension/fact mapping](../data/marketing-field-mapping.md) is the logical field merge. source_ad_id links to Ad and versioned creative/targeting dimensions via Marketing API/events. Do not fan out CRM won value into every Meta asset/age/gender/placement row. Provider-attributed actions and CRM cohort outcomes are separate datasets. Reused creatives, Insights breakdown grain, history gaps, configured/effective status and field coverage remain visible.

Target metric override CHG-20261008-03: [session funnel](../contracts/conversation-acquisition-session.md) is primary for CTM performance: Ad → acquisition Session → Lead → Deal → Won. Denominator includes sessions without Leads; Conversation/Contact distinct counts are separate measures. Keep session-origin source for every Lead/Deal; do not attribute whole thread to first ad. SRC-049 waits for SRC-053 plus SRC-051.

PLAN-019 / CHG-20261008-05: [Meta-native operating flow](../contracts/marketing-operating-flow.md) supersedes CRM taxonomy. No ad-unit tagging workflow; immutable ad_id joins CRM outcomes at Ad/Ad Set/Campaign grain. Insights breakdowns do not provide per-Lead demographic/placement/asset attribution. PLAN-011 must scope Insights ingestion before closing the complete joined report.

PLAN-020 / CHG-20261008-06: [Three report families](../contracts/marketing-operating-flow.md) separate Meta delivery/engagement by age and region, CRM conversions via Session ad_id, and joined ad-total performance. Sync age/region breakdowns for impressions/clicks/spend; no person-level demographic join, no allocation of CRM won to breakdown rows. Preserve separate datasets and recompute distinct Contact totals. Exact Insights ingestion and query/period contracts remain PLAN-011.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

## Field summaries extension — 2026-10-12

CHG-20261012-07: [bounded Ready contract](../contracts/reporting-measures.md) adds field/aggregation authoring and registered COUNT/AVG/MIN/MAX on existing numeric populations. Distinct, missing-data policy, formula dependencies and recomputed totals are explicit. Existing26 descriptors remain unchanged; no schema migration, freeform formula editor or new source grain.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.

PLAN-025 / SRC-069: [Ready session progress contract](../contracts/session-progress.md) defines six Chat-owned tables in forward29, pinned process/stage, need-scoped manual evidence/corrections and a connected behavioral session funnel. Current monolith application producer + pure Reporting reducer; no cross-service SQL or mock-builder permission activation. SP-01…07 implemented and verified in SRC-069 (345unit,13persistent MySQL,8native/browser,6healthcare); see task evidence.


PLAN-026 / SRC-070 adds the bounded [50-inbox private dashboard contract](../contracts/inbox-demo-dashboards.md): four synthetic grains and two saved operations/ad-quality dashboards, reusing existing Reporting storage and authorization with no migration. Native CRM fixture IDs are retained; timing/capacity/spend are explicitly simulated. Code and isolated tests are implemented; Alpha role activation remains pending. [Runbook](../development/inbox-demo-dashboards.md), [evidence](../tracking/details/SRC-070.md). This does not complete generic SRC-061 or connected Reporting ingestion.
