# Schema catalog — nơi đặt bảng mới

SRC-086 forward006 expands report_connected_catalog adapter CHECK for native_conversion_v1; no new columns/tables. Local/test Reporting6,CRM35,20old business tables preserved. Goal stays in versioned definition JSON; source facts remain request-local. [Filled table review](../contracts/conversion-reporting.md) · [Evidence](../tracking/details/SRC-086.md).

SRC-084 / forward35: [9 physical Human routing tables](../contracts/human-routing.md) now added to baseline monolith; target owner crm_routing. No target schema extraction. All tenant_id NOT NULL, own-Routing FK only, AI execution slots unchanged.104old tables preserved at local upgrade; [evidence](../tracking/details/SRC-084.md). Earlier PLAN-044 logical-only statements below remain historical.

PLAN-044: [17 logical Routing candidates and table review](conversation-routing-erd.md), all tenant-scoped, target crm_routing. Not physical tables or Ready DDL; no schema provision/migration. Human allocation is separate from AI agent_capacity_slot. Exact types/indexes/permissions/cutover require the next gate.

SRC-085 forward005: Reporting-owned report_connected_catalog and dashboard_widget dual mock-generation/connected-catalog pin. [Filled table review](../contracts/operations-reporting.md). Metadata only, no operational row persistence or cross-service FK.

PLAN-034/SRC-080: [record_page_view / record_page_team](../contracts/record-pages.md), CRM Core target crm_core, physical monolith forward32. Presentation metadata only; Identity team logical references through application port, no cross-owner FK.

PLAN-033A: [session_classification / session_contribution](../contracts/thread-conversation-implementation.md), Chat owner / target crm_chat, physical monolith; forward31, tenant-scoped episode values and immutable handling evidence. Core owns conversation_session property definitions. No cross-service FK.

PLAN-028A/SRC-073: [object_workspace_config](../contracts/object-platform-r1.md), CRM Core owner/target crm_core, physical monolith until extraction. Forward30 adds only tenant-bound object presentation/placement; no per-object table or cross-service schema access.

**Current 2026-10-14 / CHG-20261014-05:** User authorized implementation after PLAN-027 review. Dashboard/Reports local slice is implemented: Reporting-owned schema4 (six new tenant-scoped tables;13 prior business tables preserved), native APIs, atomic templates and separate UI. [Runbook](../development/dashboard-workspace.md) · [Backend evidence](../tracking/details/SRC-071.md) · [UI evidence](../tracking/details/SRC-072.md). Earlier design-only/phase statements below are historical; broad Reporting milestones remain in tracker.

PLAN-027 proposes six [Dashboard tables](dashboard-workspace.md) owned only by crm_reporting: dashboard_definition, dashboard_version, dashboard_widget, dashboard_command_receipt, dashboard_audit_entry, dashboard_outbox_event. All business tenant_id NOT NULL; same-schema report/version/generation FKs. Template catalog initially release artifacts, not system DB rows. Review-only2026-10-14; current schema3 unchanged, forward DDL gate PLAN-027A before source.

SRC-059 lifecycle update2026-10-12: local/test Reporting now v3 with13 business tables+system journal. Forward003 adds run head and immutable run event; old11 tables preserved. [Filled table dictionary](../contracts/reporting-runs.md), [evidence](../tracking/details/SRC-059.md). CRM remains27;001/002/003 applied history immutable. Previous v2 description below is historical.

**Current Reporting physical slice SRC-057/058:** crm_reporting and retained test_crm_reporting are now v2,11 business tables plus system journal:6 draft tables plus5 synthetic projection/control tables. [Draft templates](../contracts/reporting-persistence.md), [projection templates](../contracts/reporting-projections.md), [mock runbook](../development/reporting-projections.md). Connected projections/query/export remain later gates.

PLAN-007 / ADR-021, 2026-10-07. **Normative cho thiết kế mới**; không phải danh sách database đã tạo. Source hiện tại vẫn `agentic_crm` monolith và Connector private database. [Guideline](database-guidelines.md) · [Ownership hiện tại→đích](service-ownership.md) · [Lộ trình](../planning/native-identity-data-plan.md).

## Nguyên tắc phân vùng

PLAN-024 / ADR-022 thêm crm_workflow_core vào target catalog, tách authoring và execution; cả hai Workflow schemas chưa được provision/extract. Catalog hiện có 15 schema đích, gồm Marketing được bổ sung sau ADR-021 và Workflow Core mới. [Logical map](workflow-metadata.md), [architecture](../system/workflow-architecture.md). Không thay tables/grants hiện tại; table templates/DDL/migration gate PLAN-024C phải hoàn tất trước source.

Trong MySQL, schema đồng nghĩa database, không có lớp schema lồng trong một database như PostgreSQL. Một instance local có thể chứa các database dưới đây; production có thể đặt chúng ở các instance khác nhau mà contract không đổi. Không tạo database theo tenant; các tenant dùng cùng schema của owning service và tách bằng `tenant_id`.

Phân biệt tên database/schema (`crm_chat`) với **migration version**21/22 trong journal; các runbook cũ gọi “schema21” là version DDL, không phải database tên schema21.

Tên vật lý lowercase snake_case, cố định qua Windows/macOS/Linux; môi trường tách bằng instance/container/credentials. Khi cần cùng instance cho nhiều môi trường, dùng prefix môi trường thống nhất, ví dụ `test_crm_chat`, không trộn dev/prod. Config `MYSQL_DATABASE` hoặc `CONNECTOR_DB_NAME` chỉ rõ database; không tự ghép tên từ request/tenant.

Mỗi schema có đúng một service writer, migration lineage và runtime credential riêng. API và worker của cùng service dùng chung schema. Schema được tạo khi extraction/source gate Ready, không tạo rỗng toàn catalog. Gateway và frontend không có business database.

## Danh mục chuẩn

| Schema | Service owner | Dữ liệu authoritative / nhóm bảng | Không đặt ở đây |
|---|---|---|---|
| `crm_identity` | Identity & Access | tenant; account/credential/session; membership, principal, role, principal_role, team, team_member, service_actor, field_policy; authentication/security audit | Contact khách hàng, conversation owner, provider secret |
| `crm_core` | CRM Core & Metadata | Contact, Company, contact_identity, Activity; object/property/form/view definitions, custom records/indexes; association definitions/links; catalog projection của external records | Lead/Deal state, message, execution state; password đăng nhập |
| `crm_connector` | CRM Connector | channel connections, provider asset/Page bindings và encrypted credentials; OAuth attempt của Facebook; ingress/delivery/transport receipts, provider profile/resolution caches | Contact canonical, Chat ownership/message history |
| `crm_chat` | Chat | conversation/message/content/outbound intent; unread/workspace/inbox/snippet/tag/snooze/activity projection; local Conversation record metadata/owner/share/history | Nội dung CRM Activity gốc; password hoặc canonical provider credential |
| `crm_sales` | Sales | lead, lead_handoff; Deal/pipeline/stage trong scope M4 sau Ready; Sales record metadata/ownership/history; snapshot attribution của Lead | Contact master; message; tự chuyển Customer thành entity độc lập |
| `crm_ai` | AI Runtime | provider Agent config/policy, agent_execution/tool_execution, capacity slot, execution receipt/knowledge refs khi Ready | Identity principal/roles; toàn bộ message transcript sao chép mặc định |
| `crm_routing` | Routing | routing_cursor, eligibility/allocation policy/projection, routing_attention | Owner authoritative của Conversation/Lead; AI execution lease |
| `crm_workflow` | Workflow API — target ADR-022 | definition/draft/immutable version, publish request/audit/outbox; authoring authority | Runtime run/step/wait, canonical CRM metadata; Core DB access |
| `crm_workflow_core` | Workflow Core — target ADR-022 | installed artifact/deployment, Kafka inbox/enrollment, run/step/action/wait/timer/reconciliation | Mutable drafts, canonical CRM records; API DB access |
| `crm_chatflow` | Chatflow | definition/version/session/node_run/turn; qualification provenance và logical Lead refs | Canonical Lead, Contact, message hoặc tool execution |
| `crm_media` | Media | asset/rendition/scan/extraction metadata và storage refs sau gate Ready | File binary trong bảng message; public unprotected media URL |
| `crm_ticket` | Ticket | ticket/SLA/service lifecycle và local ownership sau M4 Ready | Sales opportunity; generic miscellaneous tables |
| `crm_reporting` | Reporting | tenant-authorized projections, source/link semantic catalog, metric/report/template definitions và export metadata sau gate Ready | Primary business writers; query trực tiếp mọi service DB |
| `crm_marketing` | Marketing | Meta hierarchy/Creative/targeting replicas, base/breakdown Insights observations, history và sync checkpoints sau PLAN-011 Ready | Lead origin snapshot; doanh thu Sales; Messenger transport; report SQL xuyên schema |
| `crm_operations` | Operations | sanitized audit/status projections, incident/replay request receipts sau gate Ready | Bản authoritative audit của service khác; quyền SQL toàn hệ thống |

Không thêm `crm_common`, `crm_misc`, `crm_utils` để né ownership. Module mới không tự động có schema mới: xem invariant/transaction và service owner trước. Một màn hình dùng nhiều service không phải lý do gom bảng vào cùng schema.

## Bảng kỹ thuật và quan hệ khó phân loại

Mỗi schema có journal riêng `schema_migration` và, khi cần, `audit_entry`, `outbox_event`, `consumer_inbox`, `idempotency_record`. Chúng thuộc service tạo effect, không dồn vào Operations. Mọi bảng đều có `tenant_id NOT NULL`; scope theo [quy tắc dữ liệu hệ thống](database-guidelines.md#tenant-id-không-có-ngoại-lệ-bỏ-cột).

`crm_record`, `ownership_history`, `record_team_access`, typed property projections hiện là shared monolith. Khi extraction, chia hàng theo owning aggregate: CRM/Chat/Sales/Ticket mỗi nơi giữ version/owner/share của mình cùng local transaction. `crm_core.record_catalog` chỉ là projection và không được sửa owner external record. Metadata/custom values cho external aggregate được lưu/index ở owner theo snapshot metadata version; không tạo shared write DB.

`ai_agent` hiện gộp principal/config: Identity giữ principal + external Agent ref; AI giữ provider/runtime policy/config. `agent_capacity_slot` thuộc AI execution authority; Routing chỉ đọc eligibility/capacity qua API. `touchpoint` hiện Channels: canonical acquisition observation về Connector; Sales giữ snapshot source đã chốt, late touchpoint không viết lại snapshot ngầm.

`facebook_oauth_attempt` là OAuth kết nối Facebook, **không phải Keycloak/login CRM**. Loại Keycloak không xóa Facebook OAuth. Contact identity bên CRM là provider customer identity, không phải account đăng nhập của nhân viên.

## Cây quyết định đặt bảng

1. Bảng ghi sự thật nghiệp vụ nào, service nào có quyền quyết định mutation? Chọn schema của service đó.
2. Phải commit atomically với aggregate nào? Đặt cùng owner; nếu khác service thì thiết kế API/events/saga, không shared transaction.
3. Chỉ là view/projection của dữ liệu remote? Ghi rõ source service/id/revision, rebuild và quyền đọc; schema thuộc consumer, không được làm writer thứ hai.
4. Bảng nối: hai đầu cùng owner thì composite FK có tenant; hai owner khác nhau thì logical references/API validation, không cross-database FK/join.
5. Dữ liệu cấu hình của tenant? Đặt cùng domain được cấu hình. Metadata generic của CRM về Core; security policy về Identity.
6. Chưa xác định owner hoặc thuộc module Draft? Dừng DDL, hoàn tất [table design](../templates/database-table.md) và change entry trước.

## Ví dụ cho tính năng mới

| Yêu cầu | Quyết định |
|---|---|
| Thêm priority cho Conversation | Cột/sidecar trong `crm_chat`, same tenant và version của Conversation |
| Tag cho Contact | `crm_core.contact_tag` + link tenant-bound; không reuse Chat tag table bằng cross-schema SQL |
| Lịch sử đổi stage Deal | `crm_sales.deal_stage_history`, chỉ sau scope M4 Ready |
| Note hiển thị trong Chat | Nội dung Activity ở Core, Chat chỉ activity reference projection + authorized hydration |
| Bảng export dashboard | `crm_reporting` giữ metadata/job/authorized snapshot; không đọc trực tiếp Chat DB |
| Đặt lại mật khẩu CRM | Credential/reset token trong `crm_identity`; không ở Core Contact |

Khi còn monolith, task ghi cả `physical_current=agentic_crm` và `target_schema=...`; chỉ áp dụng UoW nội bộ baseline được duyệt. Không đổi `MYSQL_DATABASE` rồi gọi đó là extraction. Phải có migration/backfill/grants/single-writer/cutover evidence trước khi chuyển schema vật lý.
## Marketing metadata — PLAN-014

[Field mapping](marketing-field-mapping.md) selects Account/Campaign/Ad Set/Ad/Creative, targeting snapshots, metadata-only audience references and provider observation history in crm_marketing. Future provider Insights observations belong to Marketing; Reporting owns its projections. Every entity/link/history/fact needs tenant_id NOT NULL and table template in PLAN-011. Logical design only; no physical schema created.

SRC-053 forward26: conversation_acquisition_session/message_acquisition_membership belong to crm_chat; Lead/Deal session reference columns belong to crm_sales. Physical baseline remains monolith agentic_crm. [Table templates and rollout](../contracts/acquisition-session-implementation.md).

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

SRC-054 / PLAN-011D now provisions independent `crm_marketing` database v1,22 business tables plus its system-scoped journal. This is new storage, not extraction of existing CRM rows; `agentic_crm` remains26. [Physical tables](marketing-physical-dictionary.md), [operator runbook](../development/marketing-database.md). Runtime sync is still deferred.

PLAN-011E proposed [control tables](../contracts/marketing-sync-tables.md): Marketing scheduler/receipts/change clock/event tables in crm_marketing v2; Channels account credentials/admission receipts in baseline agentic_crm,target crm_connector, consistent with existing Page authority. Not yet migrated; no cross-service SQL/FK.

SRC-051 foundation: local/test Marketing schema3 now has26 business tables plus journal/400 columns. Versions2/3 add the four reviewed control tables and admission/run metadata; v1 checksums preserved. Channels remains CRM schema27. Scheduler and durable change/snapshot repositories are implemented and tested; provider ingestion and HTTP API/worker still incomplete. [Progress](../tracking/details/SRC-051.md).

SRC-0682026-10-13: [Ready Customer360/session contract](../contracts/customer-360-session.md) defines forward28 session_touchpoint (Chat), sales_session_context and lead_merge (Sales), immutable origin versus actual context, active-session referral continuity and separate duplicate consolidation. Implemented and verified in SRC-068: 333unit,11 persistent MySQL,6 focused healthcare and8 native/browser groups; no stage/milestone/report completion claim. Existing physical monolith retains application ports; no external FK.

PLAN-025 / SRC-069: [Ready session progress contract](../contracts/session-progress.md) defines six Chat-owned tables in forward29, pinned process/stage, need-scoped manual evidence/corrections and a connected behavioral session funnel. Current monolith application producer + pure Reporting reducer; no cross-service SQL or mock-builder permission activation. SP-01…07 implemented and verified in SRC-069 (345unit,13persistent MySQL,8native/browser,6healthcare); see task evidence.

2026-10-16 / CHG-20261016-04: User authorized per-need AI enrichment and follow-up workflow; SRC-082 restores canonical conversation_id per CHG-20261016-05. PLAN-035/SRC-081 DONE; [runtime evidence](../tracking/details/SRC-081.md). See [contract](../contracts/need-follow-up.md). Forward34 renames four physical relationship columns; compatibility preserves immutable v1/graphs/receipts; real adapter configured explicitly; no invented provider result.

SRC-082 / CHG-20261016-05: [Conversation identity alignment](../contracts/conversation-identity.md) makes conversation_id canonical and preserves session_id episode semantics. Forward34 renames session_contribution/need_assessment/need_follow_up/sales_need_outcome.thread_id without changing IDs, grants, tenant ownership or cross-service boundaries. New need.assessed/classification events use v2; v1 artifacts stay readable. CI-01…03 validation tracked separately from SRC-081 history.
