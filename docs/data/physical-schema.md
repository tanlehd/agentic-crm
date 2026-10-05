# Physical schema baseline M1

Status: Ready for implementation; source migration tạo dần từ SRC-004. Quy tắc dưới bổ sung [dictionary](dictionary.md), không thay lifecycle.

## Types và defaults chuẩn

InnoDB, utf8mb4, default collation utf8mb4_0900_as_cs; strict SQL mode; session timezone +00:00. Identifier/opaque key dùng ASCII binary khi được quy định. TypeORM synchronize=false, migrationsRun=false; one-shot runner quản lý DDL.

| Field family | Physical type / default |
|---|---|
| id, tenant_id và `*_id` FK | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin, không default; nullable chỉ khi dictionary có ? |
| created_at, updated_at | DATETIME(6) NOT NULL, service ghi UTC; không phụ thuộc session local timezone |
| `*_at`, `*_until` khác | DATETIME(6), nullable theo dictionary; không tự default thời gian business |
| version, auth_revision, owner_revision, schema_version | BIGINT UNSIGNED NOT NULL DEFAULT 1, CHECK >=1 |
| attempts, invalid_attempts, fencing_token | BIGINT UNSIGNED NOT NULL DEFAULT 0 |
| kind, status, seat_code, purpose, outcome, type | VARCHAR(32) ascii_bin, CHECK enum chính xác theo module/dictionary |
| key, property_key, capability_key, node_key | VARCHAR(64) ascii_bin, pattern `[a-z][a-z0-9_]{0,63}` validation backend |
| name, label, display_name, subject | VARCHAR(255) utf8mb4; subject của Account riêng theo hàng bên dưới |
| issuer (Account) | VARCHAR(512) ascii_bin; chuẩn URI từ configured provider, không trim/normalize để gộp khác issuer |
| subject (Account) | VARCHAR(255) ascii_bin; unique issuer+subject |
| email, normalized_email | VARCHAR(254) utf8mb4; phone VARCHAR(32) ascii_bin; domain VARCHAR(253) ascii_bin |
| timezone / locale | VARCHAR(64) / VARCHAR(35) ascii_bin; tenant default Asia/Ho_Chi_Minh / vi-VN |
| reason, body, text | TEXT utf8mb4; API reason tối đa 1000, note/body/message tối đa 4000 ký tự M1–M2 |
| integer_value / decimal_value | BIGINT signed / DECIMAL(20,6); decimal truyền qua JSON dạng string |
| boolean fields | TINYINT UNSIGNED NOT NULL DEFAULT 0, CHECK IN (0,1); active mặc định 1 |
| hash / credential_hash | CHAR(64) ascii_bin SHA-256 hex; secret_ref VARCHAR(255), không plaintext secret |
| route_key / consumer_name / event_type | VARCHAR(512) / VARCHAR(128) / VARCHAR(128) ascii_bin |
| idempotency key / action_key / call_id | VARCHAR(128) / VARCHAR(255) / VARCHAR(128) ascii_bin |
| correlation_id, causation_id | VARCHAR(128) ascii_bin; opaque identifier, không chứa PII |
| JSON fields | JSON, value đúng schema; custom_values/config/variables/qualification mặc định JSON_OBJECT(); danh sách mặc định JSON_ARRAY() |

Các field như policy_id là FK UUID, policy_version là positive integer. Mọi cột field-specific trong dictionary vượt family table phải được khai báo explicit trong migration và schema test; không suy đoán field chưa có trong design.

## Constraints và indexes

- Global Account PK(id); Tenant PK(id). Tenant-scoped table có PK(id) + UNIQUE(tenant_id,id) + FK tenant_id→Tenant; subtype/junction dùng composite PK như dictionary và không thêm surrogate ID nếu đã quy định composite.
- Same-tenant relationship dùng composite FK `(tenant_id,ref_id)`. ON UPDATE RESTRICT và ON DELETE RESTRICT mặc định, không CASCADE xóa audit/history. Bảng join chỉ xóa explicit trong command có quyền.
- Human principal CHECK kind=human + membership_id NOT NULL + ai_agent_id NULL, AI ngược lại; unique tenant+membership và tenant+ai_agent. Role/team assignment không gộp cross-tenant qua account global.
- Agent policy UNIQUE(tenant_id,key,version); config mutable version optimistic lock. Agent max_concurrency >0; policy timeout_ms 1…30000, max_tool_calls 1…5 M2.
- Field policy UNIQUE(tenant_id,role_id,object_type_id,property_key). Form/view UNIQUE(tenant_id,object_type_id,key). Membership UNIQUE(tenant_id,account_id). Các unique khác giữ như dictionary.
- Property index: đúng một value column non-null bằng CHECK; dùng typed `value_kind` để CHECK cột đúng loại. Không index text; string_value VARCHAR(255) utf8mb4; kiểm tra property type/record object type bằng service trong transaction. NULL custom value thì không có projection row.
- Index tenant+property_id+typed_value+record_id trên từng cột truy vấn; unique registry subtype; tên constraint/index ngắn hơn 64 ký tự, prefix fk_/uq_/ck_/ix_ + table + purpose.
- JSON không dùng làm FK/unique. Association cardinality và registry subtype consistency là transaction/application invariants có integration test riêng; FK đơn lẻ không đủ bảo vệ.
- Actor trong audit/history là typed ref có service/human/ai kind; bảo vệ bằng application validation trong cùng tenant. Không tạo FK polymorphic chỉ vào Human principal.

## Migration order và boundaries

1. SRC-004: migration journal, Account, Tenant và repository/transaction test fixtures; chưa bootstrap dữ liệu ngành.
2. SRC-007: membership, role, team, policy, ai_agent, principal, junction và service_actor theo FK order; field_policy chờ object_type.
3. SRC-007 B/C tạo audit/idempotency/outbox storage; SRC-008 thêm inbox/relay/leases và audit table grants không cấp UPDATE/DELETE cho app user.
4. SRC-010: object_type → crm_record → association_type/association → ownership_history/record_team_access; field_policy sau object_type.
5. SRC-011: property_definition/custom_record/property_index_value/form/view; không tạo bảng Appointment riêng.
6. SRC-012: Contact/Company/Activity/Lead. Các Lead FK chỉ có ở M2 (conversation/session/touchpoint) chưa thêm tại M1; cột nullable bị CHECK IS NULL và API chưa nhận giá trị tới khi migration M2 thêm FK rồi bỏ CHECK.
7. M2: connection/identity/conversation/message/outbound trước execution tables; các FK vòng (message↔outbound, session↔message) thêm bằng ALTER sau khi hai bảng tồn tại. Graph definition active_version nullable lúc create, FK thêm sau version table.

MySQL DDL implicit commit: runner có advisory lock và journal started/applied/failed; không bọc nhiều DDL rồi tuyên bố rollback được. Failure partial giữ dấu vết, không auto-mark applied; preflight kiểm tra schema hiện hữu trước resume/forward repair. App startup kiểm tra expected schema version, không tự migrate trong replica.

Migration đã dùng không được sửa; thêm migration mới. Cold start, repeat no-op, interrupted migration và upgrade giữ dữ liệu là acceptance; planned SQL không được gọi là đã kiểm thử trước SRC-004.

## SRC-004 runner/kernel detail

Journal `schema_migration`: version INT PK, name VARCHAR(128), checksum CHAR(64), state started/applied/failed, started_at/applied_at DATETIME(6), error_code VARCHAR(64) nullable. SHA-256 từ tên + ordered SQL; drift hoặc unknown version chặn runner/readiness. GET_LOCK theo database trên cùng connection giữ suốt DDL; journal bootstrap cũng nằm trong lock. Preflight cold từ chối bảng account/tenant tồn tại ngoài journal. Failed/started không tự resume: operator kiểm tra journal + SHOW CREATE TABLE, backup và forward repair theo runbook; không giả rollback DDL.

Account có created_at/updated_at, Tenant có created_at/updated_at/version; không thêm account version khi chưa có contract yêu cầu. Readiness giữ shape health hiện có, `checks.mysql=up` đòi journal khớp toàn bộ manifest applied; stage=scaffold vẫn đúng vì chưa có auth/CRM.

UnitOfWork cấp transaction scope cho application ports, cùng QueryRunner, READ COMMITTED; lỗi callback rollback toàn bộ DML, scope hết hiệu lực khi kết thúc. TenantContext là context nội bộ đã xác thực (auth adapter SRC-006/007), không phải giá trị header tự tin cậy. Repository kernel luôn ràng buộc tenant_id trong find/insert/update/delete; optimistic version kiểm tra trong UPDATE. SQL/table metadata chỉ do module code đăng ký, không nhận từ request. Quyền field/role vẫn phải được application kiểm tra ở task sau.

## SRC-007 A — Identity schema v2

Migration additive `identity_authorization` tạo membership/role/team/agent_policy/ai_agent/principal/principal_role/team_member/service_actor theo thứ tự FK; v1 giữ nguyên. Các enum seat/status/kind/availability/purpose, positive version/revision/concurrency, policy limits và JSON array shape có CHECK. Junction chỉ composite PK, không surrogate ID. Chưa tạo field_policy hoặc seed. Mốc A chỉ thử isolated MySQL; B/C sau đó đã nối admin HTTP và apply preview local cùng migration v3/v4.

Authorization Human dùng shared lock tenant, đọc active membership/principal và role/team trong UoW. Mọi identity writer phải lấy exclusive lock cùng tenant trước thay ACL/revision; giữ lock tới commit để không có cửa sổ check-then-write. Đây là lựa chọn serialize config theo tenant M1, không giữ lock khi gọi provider ngoài DB. Side effect ngoài DB cần dispatch/revision protocol của M2.

## SRC-007 B/C — Reliability transaction storage v3

CHG-20261003-06: migration v3 additive tạo audit_entry/idempotency_record/outbox_event theo dictionary trước admin writes. Storage/API port thuộc kernel, Identity gọi port trong cùng UoW; không truy cập bảng reliability trực tiếp. SRC-008 thêm inbox/relay/leases và audit privilege hardening. Không sửa v1/v2. Idempotency status pending/completed, outbox pending/processing/dispatched/failed, actor human/ai/service/system; audit outcome accepted/denied. Revision/event version dùng decimal string ở Identity API để không mất BIGINT.

Migration v4 `outbox_positive_versions` bổ sung CHECK schema_version/aggregate_version >=1, sửa omission phát hiện khi review SRC-007. V3 đã áp dụng nên giữ nguyên checksum; v4 là forward-only additive constraint, được thử cold và upgrade cùng manifest.

CHG-20261003-07 / SRC-008: migration v5 additive tạo consumer_inbox với PK `(tenant_id,consumer_name,event_id)`, consumer_name VARCHAR(128) ascii_bin, event_id UUID, composite FK tới outbox_event, status processing/completed và processed_at nullable CHECK theo status. Không purge tombstone. Thêm idempotency_record.expires_at DATETIME(6) nullable (backfill completed = updated_at + 7 ngày), index expires_at và outbox lease_until/status. V1–v4 checksum giữ nguyên. App table grants áp dụng sau migration (SELECT/INSERT audit, SELECT schema journal, DML bảng còn lại); không cấp wildcard database DML.

## SRC-010 — registry v6

CHG-20261004-02: object_type, crm_record, association_type, association, ownership_history, record_team_access, field_policy additive; custom/subtype tables giữ task sau. Association type có version; association immutable có created_at, version source tăng khi thêm link. History có created_at, không updated_at, UNIQUE tenant+record+owner_revision. Actor human/ai/service/system typed UUID kiểm ở application port. All object/record/owner/team/history refs composite FK. History runtime grants chỉ SELECT/INSERT như audit. Key pattern kiểm tại API và CHECK; JSON custom_values object, denied_actions array. Queue và association lookup indexes tenant-first. Xem [registry contract](../contracts/registry.md).

SRC-011 v7 additive theo [CRM records](../contracts/crm-records.md): property/form/view mutable version, custom subtype, typed indexes; v1–v6 immutable.

SRC-012 v8 additive contact/company/activity/lead; immutable v1–v7. Standard query indexes tenant-first; M2 refs fail closed CHECK IS NULL. [Exact core contract](../contracts/crm-core.md).

## v9 — SRC-014 Conversation text

Additive sau v8. channel_connection: tenant+id, external_account_id varchar255 unique theo tenant/provider, provider chỉ mock_messenger, status active/disabled, team_id cùng tenant. contact_identity: tenant+id, connection/contact composite FK, external_subject_id varchar255 unique tenant+connection+subject; tuple tenant+id+contact+connection unique để Conversation FK bảo đảm coherence.

conversation subtype: contact/identity/connection tuple FK; active_identity_key generated identity khi open/pending, NULL khi closed; unique tenant+active_identity_key. status check, opened/closed datetime6, closed consistency check. message: UUID PK, tenant FK qua Conversation+connection tuple; text max4000 application+CHECK, direction/status checks, occurred/received datetime6, index tenant+conversation+received_at+id; provider ID varchar255 unique tenant+connection+provider; outbound_intent nullable unique tenant+intent. outbound_intent: actor principal/account refs qua tenant, owner_revision bigint, text, status check, idempotency_key varchar128 ascii, unique tenant+actor+key, dispatch_token UUID nullable, sending_at datetime6 nullable, sanitized error_code varchar64/provider ID varchar255. message→intent FK sau khi intent table tồn tại; intent→message tham chiếu bằng message unique intent lookup (không cột vòng dư). mock_outbound_receipt tenant+intent PK FK, provider ID unique tenant+provider; chỉ synthetic provider persistence. Không token/payload thật.

CRM Contact archive guard chặn active Conversation qua module port; v8 Lead reference CHECK giữ nguyên tới task Sales M2. Upgrade không rewrite M1 data; rollback ứng dụng cần version tương thích v9, không drop dữ liệu để downgrade.

## v10 — SRC-015 inbound

Additive sau v9. channel_connection thêm service_actor_id nullable composite FK, credential_hash CHAR64 ascii_bin nullable unique; CHECK hai cột đồng thời null/non-null, không auto provision. contact_identity thêm display_label varchar255 nullable. inbound_delivery: UUID PK/tenant+id unique, connection FK, provider_event_id varchar255 unique tenant+connection+event, payload_hash char64, payload JSON OBJECT, status received/processed/failed, attempts unsigned default0, next_attempt_at/lease_until datetime6 nullable, fencing_token bigint unsigned default0, last_error_code varchar64, conversation_id/message_id nullable composite FK, duplicate bool, attribution unknown/ctm, received_at default timestamp khi ACK, processed_at nullable. Index work(status,next_attempt_at,lease_until,received_at,id).

Touchpoint: tenant+id, connection/delivery/contact/conversation composite FK; unique tenant+delivery, source=ctm/channel=mock_messenger, nullable ad/campaign varchar255, occurred_at/received_at datetime6, metadata JSON OBJECT mặc định empty. Cross-reference coherence validated application UoW; FK chặn cross-tenant. Lead source_touchpoint_id CHECK NULL giữ nguyên. Credential không đưa vào receipt/audit/event/API.

## SRC-017 — v11 routing

Additive, v1–v10 immutable. `routing_cursor`: PK (tenant_id,team_id,capability_key VARCHAR(32) ascii), capability chat/sales, last_principal_id nullable, composite team/principal FKs. `agent_capacity_slot`: PK (tenant_id,execution_id UUID), principal_id FK, expires_at DATETIME(6), released_at nullable; index tenant/principal/released_at/expires_at. Execution FK deferred to SRC-018; port is internal only, no public reserve API. `routing_attention`: PK tenant+record, record FK, reason enum no_eligible_principal/owner_ineligible, active boolean, updated_at; no transcript. Migration preserves records/owners. Runtime grants rerun normally; no down/reset. Tenant lock → record → cursor → principal capacity lock; reserve also locks tenant first. See [routing contract](../contracts/routing.md).

## SRC-018 — v12 agent runtime

Additive agent_execution: id UUID PK; tenant UUID; session_id UUID (port-validated, FK deferred SRC-020); conversation_id/principal_id/service_actor_id composite tenant FKs; action_key ascii VARCHAR128 unique tenant/session/key; request_hash SHA256; owner_revision/auth_revision/service_revision BIGINT; policy_id/version/digest; status checked queued/running/completed/failed/timed_out/cancelled; request/result JSON; queued_until/expires_at DATETIME6; dispatch_token nullable UUID; error_code nullable ascii64; attention BOOL; cancel_attempts unsigned; cancel_ack BOOL; created_at/updated_at. Index status/deadlines and tenant/conversation/status. tool_execution PK tenant/execution/call_id ascii64; tool ascii64, args_hash SHA256, result JSON nullable, status pending/completed/cancelled, created_at; same-tenant execution FK. Capacity ledger v11 retained unchanged; execution linking enforced by application UoW, old standalone synthetic reservations do not need fake executions. Runtime tables own private content and are never exposed as raw logs/status. V1–v11 immutable; migration/grants forward only.

## SRC-019 v13 Workflow

Add workflow_definition/version/run/step_run/wait/action/trigger_selection. UUID tenant composite FK throughout; version definition/number unique, run version/event and definition/event unique, step/wait/action keyed tenant/run/node. Definition active_version FK includes definition; immutable snapshots enforced by application. Run pins actor, version and current node; JSON only validated graph/IDs/scalars. Step leases/token and next_attempt_at indexed; waits resume_at indexed; trigger selection retained without TTL. Role/actor FK same tenant; parent run owns child references verified via ports. No historical migration edits or schema auto-sync.

## SRC-020 v14–v16 Chatflow

V14 adds definition/version/session/node_run/turn and session-bound outbound intent FK. Tenant composite FKs, immutable graph snapshots, unique active Conversation and start key; node lease/token and prompt attempt, turn session/message dedup; variables/draft/provenance JSON. Lead null-only v8 guards lifted for Conversation/session/touchpoint and replaced with tenant FKs; unique session Lead retained. V15 CHECK prevents null conversation bypassing the composite session FK. V16 stores a private proposed reply on node; only successful runtime completion creates outbound. Source SQL files are separate immutable migrations; v1–v13 unchanged. Details: [dictionary](dictionary.md), [Chatflow contract](../contracts/chatflow.md). Runtime execution session is an application-port-bound reference; private legacy runtime harness rows are not retroactively converted into production sessions.

SRC-021 migration17: additive lead_handoff as specified in [Sales contract](../contracts/sales-handoff.md); v1–16 preserved.
