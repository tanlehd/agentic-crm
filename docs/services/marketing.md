# Marketing — Ad Account và cấu trúc quảng cáo

**Current implementation — SRC-054/SRC-051, 2026-10-08:** independent `crm_marketing` is at schema3 (26 business tables + system journal, 400 columns, 105 provider fields). SRC-051 scheduler/change-store foundation is tested; complete provider ingestion/API/worker remains IN_PROGRESS. [Database contract](../contracts/marketing-database.md) and [physical dictionary](../data/marketing-physical-dictionary.md) supersede the earlier proposed-DDL status below. Periodic backend/Meta ingestion is deferred to SRC-051/SRC-055; Reporting remains separate.

Status: product ownership accepted2026-10-07, PLAN-012 / CHG-20261007-13. Exact API/DDL/sync contracts thuộc PLAN-011; source SRC-051 TODO. Chưa tạo schema hoặc tích hợp live.

## Phạm vi và dữ liệu

Khi tenant tích hợp Facebook Ad Account, Marketing đồng bộ metadata và quan hệ Ad Account → Campaign → Ad Set → Ad từ Facebook Marketing API. Marketing là owner của local replica, Facebook là nguồn dữ liệu upstream. Schema logic Marketing có tên vật lý `crm_marketing` theo [catalog](../data/schema-catalog.md).

Logical entities: ad account binding, campaign, ad set, ad, object history và sync run/checkpoint. Lưu provider/account-scoped opaque IDs, parent IDs, name/status, observed_at, source revision/watermark và trạng thái archive/deleted/inaccessible khi được xác minh. Mọi application table có tenant_id NOT NULL, keys/FK nội bộ tenant-bound. Đây chưa phải bảng/DDL; PLAN-011 phải điền [table template](../templates/database-table.md) trước migration.

Marketing sở hữu Ad Account sync và cấu trúc quảng cáo; Connector tiếp tục sở hữu Messenger/Page webhook/referral và transport. Không dùng Page ID thay Ad Account ID, không suy account/campaign từ tên. Quyền kết nối Ad Account không tự cấp quyền xem doanh thu CRM. PLAN-011 chốt credential reference/owner và token refresh/revocation, tránh hai writer credential; không lưu secret trong source snapshot hoặc report.

## Hợp đồng cung cấp dữ liệu cho Reporting

Lead giữ system ad_id/channel/Page bất biến từ Conversation. Reporting liên kết nguồn Ad với dimension Marketing rồi đi Ad → Ad Set → Campaign → Ad Account để đo funnel conversion và won value phục vụ chiến lược nguồn lực/content/message/audience; thực thu thuộc scope riêng. CRM/Sales không query trực tiếp schema Marketing; dùng versioned lookup API hoặc event-fed dimension projection trong `crm_reporting`. Projection giữ tenant/provider/account scope, source revision và watermark; không cross-service SQL/FK/UoW.

Nếu snapshot chỉ có ad_id, Marketing lookup phải resolve trong tập account đã authorize của tenant. Không match được hoặc ambiguous thì unresolved, không fallback sang tenant khác, Page account giả hoặc declared source. Khi sync bổ sung được hierarchy, rebuild/reconcile report projection cho dữ liệu cũ mà không PATCH snapshot Lead/Deal. Campaign/adset có sẵn trong source snapshot chỉ là evidence lịch sử; grouping dùng hierarchy có provenance của Marketing và cảnh báo mismatch, không overwrite âm thầm.

Đổi tên/archive quảng cáo không làm mất linkage bằng ID. Giữ history/tombstone phục vụ report cũ; từng report run pin mapping revision/watermark và display-name policy để có thể đối soát. Snapshot nguồn bất biến không ngăn replica Marketing cập nhật dữ liệu upstream.

## Gate implementation và kiểm thử

PLAN-011 chốt phiên bản Graph/Marketing API, fields/permissions/eligibility từ tài liệu Meta, account authorization, pagination, initial/incremental/reconciliation strategy, rate-limit/backoff, idempotent upsert, lease/restart checkpoint và sync status UI. Không giả định endpoint/permission trước kiểm chứng. Partial/failed fetch hoặc permission revoked không được coi là đã xóa mọi object; giữ last-known data và freshness/unavailable state.

SRC-051 cần source/config, own schema/migrations/grants, sync adapter và contract tests bằng synthetic fixtures cho pagination, retry, crash/restart, duplicate/out-of-order, missing parent, rename/archive, cross-tenant denial và reconciliation. Live verification là acceptance riêng cần Ad Account/credential đủ quyền, không claim từ local tests. SRC-049 thuộc Reporting builder/template scope theo PLAN-021/022. Marketing chỉ cung cấp dataset/object fields, logical links, metrics observations và mô tả qua API/events; công thức/query/template do Reporting quản lý. Ads Insights/spend, ad editing và campaign management không nằm trong hierarchy sync scope.

[CRM base plan](../planning/crm-base-outcomes.md) · [Attribution rules](../contracts/crm-source-attribution.md).


CHG-20261007-15: [conversion performance requirements](../planning/marketing-conversion-performance.md) yêu cầu PLAN-011 chốt Meta creative/content và permitted targeting metadata/history, không chỉ hierarchy IDs. Provider fields/permissions phải xác minh trước code; không suy actual audience hoặc winning dynamic asset nếu thiếu evidence. Receipt integration không là dependency báo cáo này.

## Official Marketing field selection — PLAN-014

[Dictionary merge](../data/marketing-field-mapping.md), [103 field selections](../data/marketing-field-selection.json), [24-source dossier](../references/meta/marketing-dossier.md). SRC-051 includes creative references/content variants, selected targeting/Advantage+ metadata and history alongside hierarchy. PLAN-019 removes CRM-owned strategic taxonomy: marketers operate in Meta; dimensions come from provider metadata and Insights. Exact design remains PLAN-011. Insights delivery/spend/breakdowns have a separate gate; no ad writing or budget optimization introduced. Marketing docs candidate v25.0 is independent of Messenger v26.0; live version/field validation still required.

PLAN-016 [identity/content relationships](../data/marketing-erd.md): Marketing keeps Page/Instagram and Post/Media metadata projections for Creative relationships. Page/Instagram are not children owned by an Ad Account; observed usage goes through Creatives. Page–Instagram links require evidence/history. Credential and messaging connection authority remains with current Channels/target Connector; no duplicate credential writer or cross-service FK.

PLAN-019 / CHG-20261008-05: [Meta-native operating flow](../contracts/marketing-operating-flow.md) supersedes CRM taxonomy. No ad-unit tagging workflow; immutable ad_id joins CRM outcomes at Ad/Ad Set/Campaign grain. Insights breakdowns do not provide per-Lead demographic/placement/asset attribution. PLAN-011 must scope Insights ingestion before closing the complete joined report.

PLAN-020 / CHG-20261008-06: [Three report families](../contracts/marketing-operating-flow.md) separate Meta delivery/engagement by age and region, CRM conversions via Session ad_id, and joined ad-total performance. Sync age/region breakdowns for impressions/clicks/spend; no person-level demographic join, no allocation of CRM won to breakdown rows. Preserve separate datasets and recompute distinct Contact totals. Exact Insights ingestion and query/period contracts remain PLAN-011.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.

PLAN-011C [storage design](../data/marketing-storage-design.md) and [field dictionary](../data/marketing-storage-dictionary.md) specify105 fields:103 preserved selections plus age/region. Canonical proposed Ad Set table name is marketing_ad_set. All Marketing tables remain uncreated; exact auth/API/table templates still gate source.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

PLAN-011E / CHG-20261008-11: [Ready metadata backend contract](../contracts/marketing-metadata-sync.md), [control-table templates](../contracts/marketing-sync-tables.md), [implementation sequence](../planning/marketing-backend.md). Channels retains current credential/Page authority; SRC-056 implements its versioned ports before SRC-051 periodic metadata worker. Database v1 remains the only applied Marketing implementation; Insights/live Meta remain separate.

SRC-056 local authority implemented/schema27: [runbook](../development/marketing-authority.md), [evidence](../tracking/details/SRC-056.md). Native credential setup and private Graph/Page/admission ports exist; separate credential DB role. Live Meta remains unconfigured; periodic worker is SRC-051.

SRC-051 IN_PROGRESS: independent package now contains MySQL scheduler, operation receipts and commit-ordered change/snapshot repositories. Local Marketing schema3 includes26 business tables/400 columns, preserving v1 data/checksums. No API/worker entrypoint or Meta ingestion is enabled yet. [Progress and remaining gates](../tracking/details/SRC-051.md).
