# Schema catalog — nơi đặt bảng mới

Current T09 placement (2026-10-27): main baseline agentic_crm46 and Chat crm_chat4, active epoch2. Final fenced source43 copy6,053rows/59tables and owner bootstrap367rows reconciled; main scoped grants and same-DB recovery accepted. Baseline retained Chat copies are historical and inaccessible to runtime. [Runbook/evidence](../development/chat-main-local-runtime.md). Earlier dated rehearsal entries below retain their original scope.

T09 CHG-20261026-02: retained test_t09_chat_import rehearses the existing59-table Chat001/002 dictionary against authenticated main43 diagnostic data (no new model, no source mutation).6,053rows reconcile after committed-chunk interruption and replay; no test reset. At that rehearsal, main destination crm_chat was untouched; current main placement is recorded above. Baseline forward46 only expands the four Identity workload service CHECKs per the [existing filled template delta](identity-workload-registry.md); applied on retained test_t09_baseline, preserving rows and journals1–45. Main46 was NOT_RUN at that rehearsal; final T09 applied/verified46. Failed first CHECK-rendering assertion and successful normalized/no-op rerun are retained in T09 evidence.

CHG-20261023-10 verified candidate: [Connector connection barrier](connector-connection-barrier.md), additive forward6 applied only to retained native_connector_test, old data/journal hashes preserved. Native17/outbound12groups PASS; main Connector5/Chat4 unchanged. Preserves in-flight/unknown attempts; no receipt purge.

CHG-20261023-07 candidate only: reviewed sales_owner_command installed in retained native_identity_test for [Human need outcome saga](../contracts/chat-need-outcome-candidate.md). Exact DDL/installed hashes pinned, existing sales_need_outcome rows preserved; no historical migration, main schema or Chat schema change. Native acceptance in progress.

T05 CHG-20261023-01: [CRM note candidate storage](chat-note-candidate.md) applied only in retained native_identity_test: reviewed crm_owner_command plus exact activity_ibfk_1 detachment, preserving Activity rows and the own-registry FK. Private checksum stamp guards repeated use. Read8/write10 native groups PASS; additional recovery acceptance13groups PASS including real CRM outage and native account barrier recovery. Main43/Chat4 journals and applied migrations unchanged; no CRM or Chat main extraction claim.

CHG-20261021-08: [Chatflow retirement](chatflow-retirement.md), baseline schema43 and Chat candidate schema4. Five tables and obsolete Lead/outbound references removed; owning business data preserved. Frozen T03 snapshots and historical migration checksums remain unchanged.

T05 CHG-20261021-02: [channel_ingress_touchpoint](channel-ingress-touchpoint.md), owner Channels/CRM Connector, target crm_connector with retained native_identity_test candidate mapping. Additive evidence/terminal ledger; no main/legacy/Chat migration edit.

T05 CHG-20261020-02: [filled ingress templates](chat-ingress-storage.md) add four Chat-owned tables in forward003: contact mutex, inbox, delivery alias and operation-scoped request ledger. Applied only to retained test_crm_chat_owner (63tables, journal3);001–002/frozen T03/main42 unchanged. Local composite FKs and tenant checks; append-only aliases/requests have SELECT/INSERT only. [Native candidate/evidence](../development/chat-ingress-candidate.md).

T05 CHG-20261020-01: [canonical references](../contracts/chat-ingress-references.md) provisions only the reviewed T02 connector_reference_gate/reservation pair plus local FK in retained native_identity_test. DDL checksum pinned at .local/chat-ownership/reference-schema.json; existing CRM pair reused. Dedicated CRM/Channels runtime credentials have own-table SELECT and own-reference-ledger DML only. No main42, Chat001–002 or historical migration changes; baseline test mapping does not extract Channels/CRM.

T04 CHG-20261019-24: retained native_identity_test adds reviewed T02 crm_reference_gate/reservation and their tenant/resource composite FK for the [CRM metadata candidate](../development/crm-owner-candidate.md). Separate CRM runtime has metadata SELECT and its two ledgers' DML only. Fixture DDL/digest pinned; main42, T03 frozen stores and historical migrations unchanged. This baseline test mapping does not claim CRM service extraction.

T04 Identity fixture CHG-20261019-05: retained `native_identity_test` adds exactly three already-reviewed T02 tables, identity_owner_admission/gate/barrier, for the [Human candidate](../development/identity-owner-candidate.md). Fixture DDL is extracted from immutable owner-additions-v1.sql and pinned in private fixture metadata. This is not baseline043 or main migration. Separate runtime grants exclude Chat/CRM/password/dispatch-grant SQL and DDL; tenant UPDATE(version) exists only for MySQL's required exclusive lock privilege. Existing native test tenants/rows remain; new reusable4101/4102 are shared logical IDs with the separate Chat test fixture.

T04 retained native fixture CHG-20261019-04: `test_crm_chat_owner` contains the same reviewed59Chat tables/immutable001–002 lineage, with separate `chat_owner_test_operator` and restricted `chat_owner_test_runtime` credentials. It uses explicit reusable synthetic business tenants, never main/T03 source/destination/restore. No new table design. Committed ownership/concurrency tests retain rows; operator creates fixture records and writer gates, runtime has only existing Chat API table grants. T03 final candidates remain frozen evidence.

T03 final retained candidate (CHG-20261019-02,2026-10-19): hardcoded `final` test profile reserves `test_chat_source_final` for identical synthetic baseline42 and `test_crm_chat_final`/`test_crm_chat_final_restore` for the same59reviewed Chat tables/001–002 lineage. Separate credentials and private artifact directory; original three rehearsal schemas remain unchanged. No new table design or historical DDL change; final native acceptance passed:59tables/43localFKs/journal2 and2,136rows in both Chat targets; D3-02 accepted.

Historical first rehearsal, T03/SRC-1092026-10-18: `test_crm_chat` and `test_crm_chat_restore` contain the reviewed59Chat tables, own lineage `chat-owner-v1` journal2 and43localFKs; source is separate retained synthetic `test_chat_source`42. [Runbook and remaining acceptance](../development/chat-storage.md). Main unchanged; no new table design beyond T02; D3-02 not accepted. The five T02 SQL files remain design artifacts; immutable service-owned copies under `services/chat/migrations` are the executed inputs.

T02/SRC-109: [physical target dictionary](chat-extraction-tables.md) and [migration manifest](chat-extraction/manifest-v1.json) complete D3-01 design1/6. Target crm_chat has59tables;58support additions belong to their existing owners with explicit baseline/private-schema mapping. No database provision/extraction occurred; runtime remains2/17.

SRC-108 complete: [chat_outbound_job and remote intent status template](chat-outbound-job.md), owner Chat/crm_chat, current baseline. Forward42 applied native_identity_test and main agentic_crm preserving old data/journal. Identity enrollment uses its existing own delegation table; no Chat credential/session SQL or remote FK. [Evidence](../tracking/details/SRC-108.md).

SRC-107: current Connector schema5 is now provisioned in the dedicated local project's `connector_local` database and serves mock ingress. Backend agentic_crm stays37; no table ownership move/new DDL definition. Old schema2 acceptance volume retained. [Delivery evidence](../tracking/details/SRC-107.md). Earlier test-only notes below are historical.

SRC-104: [Workload registry templates](identity-workload-registry.md) assign identity_workload_service/certificate/event to system scope and identity_workload_admission to explicit business scope in crm_identity (baseline backend). Forward41 only in retained native_identity_test; no main cutover.

SRC-103: [chat_result_request](chat-dispatch-result.md) belongs to Chat/crm_chat, current baseline; forward40 in native_identity_test only. Append-only request digest links same-tenant Chat claim; no remote receipt FK. Main migration/physical extraction not performed.

SRC-101: [Chat claim/request](chat-dispatch-claim.md) target crm_chat, current Chat-owned partition in baseline agentic_crm; forward39 tested only in native_identity_test. Same-owner intent FK, no remote Identity/Connector FK. Full physical extraction remains gated.

PLAN-007C5/SRC-100: [Identity dispatch tables](identity-dispatch-ledger.md) own delegation/grant/request/event in target crm_identity, physical baseline agentic_crm. Forward38 first applied only to retained native_identity_test; main runtime upgrade/cutover remains gated. Native authority and ledger require the same Identity transaction; no separate ledger DB/shared cross-service UoW.

SRC-098 forward5: [attempt dictionary](connector-attempt-ledger.md) extends Connector guard with grant/claim/fence/deadline/provider result and lifecycle CHECKs, extends request operation allowlist, adds immutable `connector_attempt_event`. Tenant-bound FK and recovery index, no remote SQL. Actual populated native_connector_test4→5 preserves10old tables/old values; migration1…4 definitions/checksums unchanged. Only local test schema upgraded, no image/production rollout.

SRC-097 forward4 adds Connector-owned `connector_dispatch_guard` and `connector_dispatch_request`; [filled dictionary/templates](connector-preparation-ledger.md). Same-tenant intent/attempt keys and guard FK; backfill from own payload table only. Retained native_connector_test upgraded from populated3 to4, previous tables/checksums preserved. Main remains unconfigured and retained image/schema2 unchanged; no monolith/Identity/Chat data move.

SRC-096 forward3 in Connector: `connector_dispatch_payload` and `connector_payload_request`, business tenant immutable source/replay ledgers. [Exact dictionary and filled templates](connector-payload-ledger.md). Applied only to retained native_connector_test for acceptance; main Connector remains unconfigured and prior container schema2 is unchanged. No monolith table move or cross-schema FK; journal retains registered system tenant. Remaining dispatch/control ledgers under PLAN-007C are not implemented.

SRC-087 forward36 adds `sales_stage_event`, Sales-owned in baseline agentic_crm / target crm_sales, tenant-scoped append-only with unique tenant/kind/subject/sequence and no remote FK. Reporting007 expands adapter CHECK for native_stage_v1, no new business columns. CRM113old tables and Reporting20old business tables preserved. [Filled table review](../contracts/stage-funnel-reporting.md) · [Evidence](../tracking/details/SRC-087.md). This bounded ledger now supplies Lead/Deal stage history; configurable Sales pipeline remains separately gated.

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

ADR-027 / CHG-20261021-07: một Workflow service/schema crm_workflow sở hữu authoring và execution, gồm conversational flows. crm_workflow_core và crm_chatflow không còn schema đích. Forward43 gỡ legacy Chatflow storage; applied historical migrations vẫn bất biến.

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
| `crm_sales` | Sales | lead, lead_handoff, Deal/outcome/stage history đã có baseline; configurable pipeline cần scope riêng; Sales record metadata/ownership/history; snapshot attribution của Lead | Contact master; message; tự chuyển Customer thành entity độc lập |
| `crm_ai` | AI Runtime | provider Agent config/policy, agent_execution/tool_execution, capacity slot, execution receipt/knowledge refs khi Ready | Identity principal/roles; toàn bộ message transcript sao chép mặc định |
| `crm_routing` | Routing | routing_cursor, eligibility/allocation policy/projection, routing_attention | Owner authoritative của Conversation/Lead; AI execution lease |
| `crm_workflow` | Workflow — ADR-027 | definition/draft/version/activation, trigger/enrollment/run/step/wait/timer, conversational variables/provenance/Human tasks và action receipts | Canonical CRM/Sales/Ticket/Identity/Chat records; không business SQL xuyên service |
| `crm_media` | Media | asset/rendition/scan/extraction metadata và storage refs sau gate Ready | File binary trong bảng message; public unprotected media URL |
| `crm_ticket` | Ticket | ticket/SLA/service lifecycle và local ownership sau M4 Ready | Sales opportunity; generic miscellaneous tables |
| `crm_reporting` | Reporting | tenant-authorized projections, source/link semantic catalog, metric/report/template definitions và export metadata theo delivered Reporting contracts | Primary business writers; query trực tiếp mọi service DB |
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
| Lịch sử đổi stage Lead/Deal | `crm_sales.sales_stage_event`; SRC-087 forward36 trong baseline monolith. Configurable pipeline/reopen M4 vẫn có gate riêng |
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

## External API private apps — SRC-088
[Exact contract and filled table design](../contracts/external-api.md): Identity owns external_app configuration, explicit object/property/team grants, token verifier/expiry and durable quota; target crm_identity, baseline monolith forward37. CRM/Sales own record reads through authorized application ports. No Human impersonation, record ownership change or cross-service SQL/FK. [Developer guide](../developer/README.md) and [evidence](../tracking/details/SRC-088.md).
