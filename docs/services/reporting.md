# Reporting & Analytics

**Current 2026-10-14 / CHG-20261014-05:** User authorized implementation after PLAN-027 review. Dashboard/Reports local slice is implemented: Reporting-owned schema4 (six new tenant-scoped tables;13 prior business tables preserved), native APIs, atomic templates and separate UI. [Runbook](../development/dashboard-workspace.md) · [Backend evidence](../tracking/details/SRC-071.md) · [UI evidence](../tracking/details/SRC-072.md). Earlier design-only/phase statements below are historical; broad Reporting milestones remain in tracker.

**PLAN-027 design proposal, 2026-10-14:** Reporting remains sole writer of the [dashboard aggregate and six proposed tables](../data/dashboard-workspace.md). [API](../contracts/dashboard-workspace.md) serves dashboard/report libraries, immutable template catalog, atomic creation of report drafts + dashboard, current-viewer widget execution and explicit legacy conversion. Report versions remain existing storage; no frontend/other-service SQL. Review-only at user request; schemas/endpoints not implemented. Current source status is tracker, not historical phase entries below.

**2026-10-12 / CHG-20261012-06:** User accepted early API-backed UI. [PLAN-022H](../contracts/reporting-authoring.md) scopes source/model/fields/axes/flat filters/chart/pivot/private draft/CSV over delivered APIs. SRC-064 is the sole active source task; SRC-059 requeued READY, incomplete scope/evidence preserved. Full SRC-060 follows SRC-059 and SRC-064; no publish/dashboard/drilldown completion claim. No database changes.

SRC-059 lifecycle phase2026-10-12 adds caller-driven [durable run API/storage](../contracts/reporting-runs.md) in own schema3,owner/current native authority,pinned snapshot/executor,attempt lease/cancel fencing and result retrieval. No producer SQL,automatic worker or shared UoW. [Runbook](../development/reporting-runs.md), [evidence](../tracking/details/SRC-059.md). Drilldown/production worker/UI are subsequent scopes; prior slice descriptions below are historical.

SRC-059 native phase2026-10-12 adds [query/CSV API](../contracts/reporting-query-api.md) over own mock snapshots, signed admission and native BFF delivery fences. Only explicit tenant-complete synthetic source grants supported; connected policy/run/drilldown/UI remain pending. [Runbook](../development/reporting-query-api.md), [evidence](../tracking/details/SRC-059.md). Existing schema/migrations unchanged.

SRC-059 first phase2026-10-12 adds bounded in-memory execution of own mock snapshots,26metrics/group/pivot, exact arithmetic, explicit authority/load ports and reauthorized cache/CSV. [Contract](../contracts/reporting-query.md), [runbook](../development/reporting-query.md), [evidence](../tracking/details/SRC-059.md). No new service endpoints/tables or cross-service reads. Native query admission/source policy and durable run/drilldown remain pending; historical slice boundaries below do not describe this new core.

Status: Target architecture accepted direction — PLAN-005 / ADR-017. SRC-057 private draft API/own schema and SRC-058 internal mock projections implemented through PLAN-022C/D; query/connected producers/deployment remain pending. [Module hiện tại](../modules/reporting.md) · [Catalog](README.md) · [Cross-service rules](../contracts/service-boundaries.md).

PLAN-022A (2026-10-10): [Module delivery plan](../planning/report-builder.md) và [semantic catalog](../data/reporting-semantic-model.md) định nghĩa datasource/model/field/relation/metric registries, report/template/dashboard versions, query/grain/ACL và synthetic adapter path. SRC-057 supplies own NestJS draft API through [exact scoped contract](../contracts/reporting-persistence.md); SRC-058 adds mock projections in schema2. No cross-service SQL. SRC-059…062 need remaining exact PLAN-022 gates; SRC-049 is connected adapters/release after Marketing producers. [Local draft runbook](../development/reporting-storage.md), [draft evidence](../tracking/details/SRC-057.md).

## Phạm vi và trách nhiệm

SRC-058 adds own-schema2 mock projection storage, versioned internal SnapshotAdapter and descriptor-typed25object/120field G1 source. [Contract](../contracts/reporting-projections.md), [runbook](../development/reporting-projections.md). Atomic complete-generation activation protects readers from partial rebuild; query/public datasource/connected ACL remain pending. No service daemon automatically started.

SRC-063 adds a real TypeScript [semantic kernel package](../../services/reporting/README.md), independent of producer implementations and database. SRC-057 adds private draft persistence/native BFF, own/all permissions, immutable history and pinned catalog snapshots. Scope is unvalidated nonexecutable metadata; query/worker/publish/UI and production service deployment remain future work. PLAN-022B/C are scoped gates; broader PLAN-022 stays open.

Report builder platform: data-source catalog, linked objects, attribution/attribute fields, metrics, reusable versioned templates, event-derived read models, query execution và controlled export.

Ngoài phạm vi: Không transactional source of truth, không SELECT business databases xuyên service.

## Kiến trúc bên trong

Deploy unit đề xuất `services/reporting` gồm NestJS API và worker entrypoints theo workload. Cấu trúc `domain`, `application`, `ports`, `adapters/http`, `adapters/events`, `adapters/persistence`, `migrations`, `tests`, `docs`. Domain không import database entity hoặc implementation của service khác. API/worker chỉ truy cập MySQL database và credentials riêng của service; module kernel dùng schema-local outbox/inbox/receipt/audit. Tham chiếu remote là ID có tenant/service/type, không cross-database foreign key. Đây là source layout đích, chưa tạo directory source rỗng.

## Data model nội bộ và nguồn chuẩn

Tên entities dưới đây là logical target model, không phải danh sách bảng đã migrate. Physical schema/DDL mỗi service phải chốt tại extraction task. Mọi application table có tenant_id NOT NULL theo [DB guideline](../data/database-guidelines.md); version/timestamps/retention theo loại entity. UUID opaque được giữ khi chuyển từ monolith.

| Entity / aggregate | Fields chính / quan hệ | Invariant / authority |
|---|---|---|
| event_checkpoint / metric_projection | tenant_id,source event/revision,watermark,grain,dimensions,values | Dedup event/rebuild by revision; explicit freshness |
| report_definition / report_version | dataset,filters,grouping,columns,ACL bindings,version | Schema/query limits; no raw SQL client |
| export_job / export_object | request key,principal/ref auth revision,status,expiry | Permission recheck at export creation and download; private files |

Mỗi service có local `outbox_event`, `consumer_inbox`, `idempotency_receipt`, `audit_entry` khi phát sinh mutation; key tenant+consumer+event hoặc tenant+actor+command+idempotency. Không dùng một bảng chung có multi-service writers. Local FK tenant-bound, cross-service reference được validate bằng API hoặc reconciled projection theo policy.

## API, commands và events

Consumes minimized domain events; authorized bulk snapshot API for rebuild/backfill; QueryReport/ExportReport. Definition contract declares grain/timezone/as_of/watermark and row/field policy.

QueryReport/ExportReport/producer event interfaces remain logical proposals. Draft CRUD/history/archive now use [versioned storage JSON Schema](../contracts/reporting-storage-v1.schema.json) and [native OpenAPI](../contracts/reporting-storage.openapi.json). Internal immutable event facts report.definition.create/update/archive.v1 carry IDs/revision only; no relay/consumer contract enabled. Legacy wire types remain compatible; no shared DTO importing another service domain implementation.

## Consistency, authorization và failure handling

Projection never grants permission. Reports enforce current tenant/scope/field denial; permission outage deny/export stop. No transcript/raw secrets in generic event bus projection.

Transaction chỉ local state+audit+outbox/inbox. Network call không giữ SQL transaction; remote action phải có operation key/status/reconciliation. Trace propagation không thay tenant authorization. Read/write luôn kiểm tenant và current rights; owner/grant projections không đủ làm authority cho side effect.

## Vận hành và scale

Independent query/index/warehouse later ADR; MySQL initial read model sufficient until measured capacity. Lag alerts/replay tooling; tenant workload quotas.

Owner vận hành là team sở hữu service (chưa gán người cụ thể). Bắt buộc readiness dependency-aware, liveness process-only, metrics latency/error/saturation/backlog, redacted tracing, restore drill và graceful shutdown leases. SLO/RPO/RTO và alert thresholds phải được chốt/test theo deployment gate; chưa có số liệu production để claim đạt.

## Source mapping và lộ trình tách

M2 metric SQL fixtures remain monolith verification only; M5 report builder Draft. Extract projections after event contracts + data governance Ready.

Rollback/cutover tuân [migration plan](../planning/microservices-migration.md): single writer, shadow read/hash reconciliation, durable event watermark; không dual-write thủ công, không sửa migrations1–18. Source implementation hiện hữu chỉ được nói DONE theo [tracker](../tracking/tasks.md).

## Acceptance trước service Ready

Full-service gates include own DB isolation, API/consumer schemas, ACL, duplicate/out-of-order/lost ACK, crash/revoke, downstream outage, DLQ, migration/restore and compatibility. SRC-057 verifies only draft/native HTTP isolation, replay/CAS, current own/all grants, bounded admission expiry, warm migration and reconnect ([evidence](../tracking/details/SRC-057.md)). Producer/consumer replay, projection/query execution, restore drill and production deployment remain NOT_RUN.
PLAN-014 [dimension mapping](../data/marketing-field-mapping.md) adds versioned creative/targeting projections from Meta. Meta Insights metrics/settings remain separate from CRM conversion facts. No cross-service SQL; no per-asset/demographic attribution from ad-only evidence.

PLAN-020 / CHG-20261008-06: [Three report families](../contracts/marketing-operating-flow.md) separate Meta delivery/engagement by age and region, CRM conversions via Session ad_id, and joined ad-total performance. Sync age/region breakdowns for impressions/clicks/spend; no person-level demographic join, no allocation of CRM won to breakdown rows. Preserve separate datasets and recompute distinct Contact totals. Exact Insights ingestion and query/period contracts remain PLAN-011.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

SRC-064 adds authorized read-only authoring discovery and own-DB health, with Next.js consuming versioned HTTP only. [Contract](../contracts/reporting-authoring.md), [local runbook](../development/reporting-builder.md). No schema change.

## Field summaries extension — 2026-10-12

CHG-20261012-07: [bounded Ready contract](../contracts/reporting-measures.md) adds field/aggregation authoring and registered COUNT/AVG/MIN/MAX on existing numeric populations. Distinct, missing-data policy, formula dependencies and recomputed totals are explicit. Existing26 descriptors remain unchanged; no schema migration, freeform formula editor or new source grain.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.

SRC-069 adds a connected behavioral session funnel in the current monolith: Chat authorizes and provides bounded session/evidence facts, a pure Reporting reducer counts same-need prefixes with as_of/coverage. The independent Reporting service and mock builder are unchanged; no cross-service DB access or new Alpha grants. [Contract](../contracts/session-progress.md), [evidence](../tracking/details/SRC-069.md).


PLAN-026 / SRC-070 adds the bounded [50-inbox private dashboard contract](../contracts/inbox-demo-dashboards.md): four synthetic grains and two saved operations/ad-quality dashboards, reusing existing Reporting storage and authorization with no migration. Native CRM fixture IDs are retained; timing/capacity/spend are explicitly simulated. Code and isolated tests are implemented; Alpha role activation remains pending. [Runbook](../development/inbox-demo-dashboards.md), [evidence](../tracking/details/SRC-070.md). This does not complete generic SRC-061 or connected Reporting ingestion.
