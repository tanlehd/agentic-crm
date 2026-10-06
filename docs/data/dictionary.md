# Data dictionary

> Baseline monolith hiện có, không phải physical schema của các microservice đích. Xem [data ownership ADR-017](service-ownership.md); FK/UoW cross-module dưới đây chỉ áp dụng trong DB hiện tại. Extraction không sửa applied migrations1–18.
Status: Ready for implementation cho bảng M1–M2; phần bổ sung M3 và mục M4–M5 là Draft.

## Quy ước vật lý

Theo [model](model.md): mọi bảng bên dưới trừ `account` có `tenant_id`; mọi FK nội bộ tenant dùng cặp `(tenant_id,target_id)`. `tenant` có `id` là tenant root. Bảng nối dùng composite PK như ghi trong constraint; bảng còn lại có `id CHAR(36)`. Audit/event có `created_at`; mutable entity có `updated_at`. String key phân biệt hoa thường; email không dùng làm account key.

Ký hiệu `?` là nullable; `JSON` là dữ liệu có schema ở service; `ref` là UUID FK. Mặc định trường không có `?` bắt buộc. ID fields được index cùng tenant; `version BIGINT` bắt đầu 1. Các config mutable (tenant, membership, principal, ai_agent, team, role, object_type, property_definition, connection, form/view, workflow/chatflow definition) đều có version dù bảng dưới chỉ liệt kê field đặc thù. Status dùng VARCHAR + application enum validation. Money/decimal lưu `DECIMAL(20,6)`, datetime UTC microsecond, bool `TINYINT(1)`.

## Identity và policy — M1

| Table | Fields chính | Constraint / hành vi |
|---|---|---|
| account | issuer VARCHAR(512), subject VARCHAR(255), display_name, email? | Unique issuer+subject; account toàn platform |
| tenant | name, status(active/suspended), timezone, locale | timezone default Asia/Ho_Chi_Minh; không cấp quyền CRM cho operator |
| membership | account_id ref, status(invited/active/suspended), seat_code, auth_revision | Unique tenant+account; account FK global là ngoại lệ chủ đích |
| principal | kind(human/ai), membership_id? ref, ai_agent_id? ref, status, availability(available/unavailable), auth_revision | Đúng một trong hai ref theo kind; mỗi membership/ai_agent một principal |
| ai_agent | name, runtime_adapter, policy_id ref, max_concurrency INT | Cấu hình credential qua secret reference ngoài context |
| agent_policy | key, version, allowed_tools JSON, allowed_actions JSON, timeout_ms, max_tool_calls | Immutable policy version; M2 timeout 30s, tối đa 5 tool calls/turn |
| team | name, purpose(chat/sales/service/general), active | Team chỉ chứa principal cùng tenant |
| team_member | team_id ref, principal_id ref, active | PK tenant+team+principal |
| role | key, name, permissions JSON | Unique tenant+key; permission dạng resource/action/scope |
| principal_role | principal_id ref, role_id ref | PK tenant+principal+role |
| service_actor | key, active, role_id ref, auth_revision | Workflow/integration actor; không thể làm owner |
| field_policy | role_id ref, object_type_id ref, property_key, denied_actions JSON | Deny read/write/filter/export; deny thắng allow |

## Object platform — M1

| Table | Fields chính | Constraint / hành vi |
|---|---|---|
| object_type | key, label, kind(standard/custom), schema_version, archived_at? | Unique tenant+key, key bất biến |
| property_definition | object_type_id ref, key, label, type, required BOOL, default_value? JSON, options? JSON, indexed BOOL, sensitive BOOL, archived_at? | Unique tenant+object_type+key; type immutable M1 |
| crm_record | object_type_id ref, owner_principal_id? ref, team_id? ref, version, owner_revision, custom_values JSON, archived_at? | Unique tenant+id; subtype bắt buộc; revision tăng khi sửa |
| record_team_access | record_id ref, team_id ref | PK tenant+record+team; chỉ grant scope team, không tự cấp action |
| custom_record | record_id ref | PK tenant+record; object type phải custom |
| property_index_value | record_id ref, property_id ref, value_kind, string_value?, integer_value? BIGINT, decimal_value? DECIMAL, boolean_value?, date_value? DATE, datetime_value? DATETIME | PK tenant+record+property; đúng một cột non-null theo value_kind/type; text không indexed M1; index tenant+property+typed_value+record |
| association_type | key, source_object_type_id ref, target_object_type_id ref, label, cardinality(many_to_many/one_to_many/one_to_one) | Unique tenant+key; direction có nghĩa; kiểm tra giới hạn trong transaction |
| association | association_type_id ref, source_record_id ref, target_record_id ref | Unique tenant+type+source+target; same tenant; lock source/target theo ID order để kiểm tra cardinality |
| form_definition | object_type_id ref, key, fields JSON, version | Fields tham chiếu property key, không vượt field permission |
| view_definition | object_type_id ref, key, columns JSON, filter JSON, sort JSON, version | Filter dùng contract typed; không lưu SQL tùy ý |
| ownership_history | record_id ref, from_owner_id? ref, to_owner_id? ref, from_team_id? ref, to_team_id? ref, owner_revision, reason, actor_kind, actor_id | Append-only; snapshot assignment tại thời điểm thay đổi |

## CRM nghiệp vụ — M1–M2

| Table | Fields chính | Constraint / hành vi |
|---|---|---|
| contact | record_id ref, display_name, normalized_phone?, normalized_email?, lifecycle(prospect/customer), customer_since?, contact_preference JSON | PK tenant+record; phone/email không unique; initial prospect |
| company | record_id ref, name, domain? | PK tenant+record; schema nền móng, UI nâng cao sau |
| lead | record_id ref, contact_id ref, conversation_id? ref, qualification_session_id? ref, source_touchpoint_id? ref, status, qualification JSON, qualified_at?, accepted_at? | Unique tenant+qualification_session khi non-null; Contact ref đến contact subtype |
| lead_handoff | lead_id ref, target_team_id ref, requested_by_kind, requested_by_id, status(pending/accepted/cancelled), active_lead_key?, accepted_by_principal_id? ref, due_at, accepted_at? | Unique tenant+active_lead_key; bằng lead ID khi pending, NULL khi terminal |
| activity | record_id ref, kind(note/task/call), subject, body?, due_at?, status(open/done/cancelled), related_record_id ref | Note nội bộ không gửi ra channel; dùng association để liên kết thêm |
| channel_connection | provider(mock_messenger/messenger/google_ads), external_account_id, secret_ref?, credential_hash?, status, config JSON | Unique tenant+provider+external_account; mock token hash riêng; không expose secret |
| contact_identity | connection_id ref, contact_id ref, external_subject_id, display_label? | Unique tenant+connection+external_subject |
| inbound_delivery | connection_id ref, provider_event_id, payload_hash, payload JSON, status(received/processed/failed), attempts, next_attempt_at?, last_error_code?, lease_until?, fencing_token, conversation_id?, message_id?, duplicate, attribution, received_at, processed_at? | Unique tenant+connection+provider_event; different payload cùng key → conflict |
| conversation | record_id ref, contact_id ref, contact_identity_id ref, connection_id ref, status(open/pending/closed), active_identity_key?, opened_at, closed_at? | Unique tenant+active_identity_key; identity phải cùng contact/connection |
| message | conversation_id ref, connection_id ref, provider_message_id?, outbound_intent_id? ref, direction(inbound/outbound), text, occurred_at, received_at, status(received/queued/sending/sent/failed/unknown/cancelled) | Unique tenant+connection+provider_message khi có; unique tenant+outbound_intent khi có |
| outbound_intent | conversation_id ref, actor_kind, actor_id, account_id? ref, owner_revision, text, status, idempotency_key, provider_message_id?, error_code?, dispatch_token?, sending_at?, created_at | Unique tenant+actor+idempotency_key; kiểm tra quyền lại trước dispatch |
| touchpoint | connection_id ref, delivery_id ref, contact_id ref, conversation_id ref, channel, source, campaign_id?, ad_id?, occurred_at, received_at, metadata JSON | Unique tenant+delivery; một touchpoint CTM cho một normalized event có referral |

SRC-014 physical v9 triển khai `channel_connection.provider=mock_messenger`, status active/disabled và team_id FK; SRC-015 v10 thêm service_actor_id/credential_hash nullable, display_label, inbound_delivery và touchpoint CTM. Credential là mock SHA256, không token provider thật; unconfigured connection vẫn fail closed. `mock_outbound_receipt` (tenant_id+intent_id PK, provider_message_id) lưu receipt synthetic durable phục vụ idempotent sender/reconcile. Xem [physical v9](physical-schema.md) và [Conversation contract](../contracts/conversation.md).

`lead.qualification` M2: `service_interest`, `need_summary`, `contact_permission` boolean, `preferred_contact_method` enum(messenger/phone), `phone?`, `consent_evidence`. Với Conversation, evidence là `{kind:"message", message_id}` thuộc Conversation và chứa xác nhận rõ; với Lead thủ công không Conversation, `{kind:"manual", note, recorded_by_principal_id, recorded_at}` chỉ Human có lead.qualify được ghi. Chỉ qualify khi service_interest/need_summary nonblank, contact_permission=true và evidence hợp lệ; nếu method=phone thì normalized phone phải hợp lệ. Không bắt buộc phone nếu khách chọn Messenger. Service/model không được tự tạo manual consent evidence.

## Execution — M2

| Table | Fields chính | Constraint / hành vi |
|---|---|---|
| workflow_definition | key, name, active_version_id? ref, enabled BOOL | Unique tenant+key |
| workflow_version | definition_id ref, number INT, graph JSON, execution_role_id ref, state(draft/published), published_at? | Unique tenant+definition+number; published immutable |
| workflow_run | version_id ref, trigger_event_id, service_actor_id ref, context JSON, status, started_at, finished_at? | Unique tenant+version+trigger_event; workflow trigger M2 chỉ conversation.created |
| workflow_step_run | run_id ref, node_key, status, attempt, input JSON, output? JSON, action_key, lease_until?, fencing_token BIGINT, error_code? | Unique tenant+run+node_key; no loop M2; action_key ổn định qua retry |
| workflow_wait | run_id ref, node_key, kind(event/timer), match_key, resume_at?, status(waiting/resumed/timed_out) | Unique tenant+run+node; event subscription + condition persisted |
| chatflow_definition | key, name, active_version_id? ref | Unique tenant+key |
| chatflow_version | definition_id ref, number, graph JSON, state(draft/published) | Unique tenant+definition+number; published immutable |
| chatflow_session | version_id ref, parent_run_id ref, start_action_key, conversation_id ref, active_conversation_key?, node_key, variables JSON, status, version, owner_revision, last_message_id? ref | Unique tenant+active_conversation_key khi running/waiting_message/paused_human; unique tenant+start_action_key; version pinned |
| chatflow_node_run | session_id ref, node_key, status, input JSON, output? JSON, invalid_attempts INT, lease_until?, fencing_token BIGINT | Unique tenant+session+node; prompt keys lấy session/node/invalid_attempts; recovery giống workflow step |
| chatflow_turn | session_id ref, message_id ref, status, result? JSON | Unique tenant+session+message; một inbound xử lý một lần |
| agent_execution | session_id ref, principal_id ref, owner_revision, auth_revision, policy_version, status, request JSON, result? JSON, expires_at | id chính là runtime execution_id; policy snapshot không thay live auth |
| tool_execution | agent_execution_id ref, call_id, tool, args_hash, result? JSON, status | Unique tenant+execution+call; cùng call_id khác args → conflict |
| routing_cursor | team_id ref, capability_key, last_principal_id? ref | Unique tenant+team+capability; lock khi round-robin |

## Reliability — M1–M2

| Table | Fields chính | Constraint / hành vi |
|---|---|---|
| idempotency_record | actor_kind, actor_id, route_key, key, request_hash, status, response_status?, response_body? JSON, expires_at? | Unique tenant+actor+route+key; giữ 7 ngày; domain unique bảo vệ dài hạn |
| audit_entry | actor_kind, actor_id, action, resource_type, resource_id?, outcome, changed_fields JSON, reason?, correlation_id, occurred_at | Append-only; payload redact; actor system có typed identity riêng |
| outbox_event | event_type, schema_version, aggregate_type, aggregate_id, aggregate_version, payload JSON, correlation_id, causation_id?, actor_kind, actor_id, occurred_at, status, attempts, next_attempt_at?, lease_until?, fencing_token BIGINT | ID là event_id bất biến; index status+next_attempt_at |
| consumer_inbox | consumer_name, event_id, status, processed_at? | PK tenant+consumer+event; tombstone không purge khi còn khả năng replay |

## Mô hình đích — Draft M4–M5

| Table / object | Fields / quan hệ dự kiến | Phần phải chi tiết hóa |
|---|---|---|
| deal | record_id, contact_id, lead_id?, pipeline_id, stage_id, amount, currency, closed_at? | Transition/reopen, validation stage, customer correction |
| ticket | record_id, contact_id, conversation_id?, pipeline_id, stage_id, priority, sla_policy_id? | SLA calendar, pause, escalation và reopen |
| pipeline / pipeline_stage | object_type_id, key, stage category/order | Publish/version, migration record đang chạy |
| report_definition | data source, grain, measures, filters, dimensions, version | Query planner, quotas, permissions, joins |
| dashboard / widget | report refs, layout, parameter mapping | Sharing, cache, scheduling |
| metric_definition | key, grain, aggregation, timestamp basis, version | Semantic compiler và backward compatibility |
| Appointment (custom) | start_at, end_at, status, location; Contact/Deal/ServiceOffering associations | Slot conflict, timezone UI, cancellation |
| ServiceOffering (custom) | name, category, duration_minutes, list_price, currency | Giá hiệu lực và lịch sử thay đổi |

M1 có thể tạo hai custom object healthcare để kiểm tra generic persistence/association, nhưng không triển khai engine lịch hẹn hoặc doanh thu trước M4.

Quy tắc physical type/default/index/FK/migration bổ sung ở [physical schema](physical-schema.md).

## Infrastructure control plane — SRC-004

`schema_migration` không tenant-scoped; journal kỹ thuật version/name/checksum/state/started_at/applied_at/error_code theo [physical schema](physical-schema.md). Không exposed qua public API, không chứa dữ liệu người dùng. Account/Tenant migration hiện đã có; các bảng còn lại theo task gate.

SRC-007 CHG-20261003-06 triển khai Identity v2 và storage reliability v3 (`audit_entry`, `idempotency_record`, `outbox_event`) phục vụ admin transaction. SRC-008 nối inbox/relay/leases. V1/v2 giữ immutable; không thêm schema field_policy tới SRC-010. API Identity version/revision truyền string decimal để không mất BIGINT.

SRC-010 migration v6 triển khai object_type/crm_record/association_type/association/ownership_history/record_team_access/field_policy. association_type có version; association immutable chỉ created_at. ownership_history UNIQUE tenant+record+owner_revision và chỉ created_at; runtime SELECT/INSERT. Standard/custom subtype và property/index/form/view chưa có tới SRC-011/012. [Registry contract](../contracts/registry.md) làm rõ cardinality, CAS source và application ports.

SRC-011: property/form/view có created_at/updated_at/version; custom_record và property_index_value dùng composite PK không surrogate ID. Exact validation và wire shapes theo [CRM records](../contracts/crm-records.md).

SRC-012 v8 Contact/Company/Activity/Lead theo [CRM core](../contracts/crm-core.md); M2 refs nullable CHECK IS NULL, future FK forward migration.

SRC-016 không thêm persisted field/migration. Conversation `owner_kind` là projection từ Identity; `allowed_actions` tính live theo seat/scope/field/owner. Internal notes vẫn là Activity và GET notes tuân quyền Activity riêng.

SRC-017 v11 adds `routing_cursor`, `agent_capacity_slot` (execution_id,principal_id,expires_at,released_at) and `routing_attention` (record_id,reason,active,updated_at). Capacity reservations are internal runtime ports, not Conversation ownership counts. [Routing contract](../contracts/routing.md) defines exact eligibility, locks, wire DTOs and future engine integration.

SRC-018 v12 adds agent_execution (session/action key, owner/auth/service/policy stamps, dispatch token, queue/execution deadlines, terminal error/attention/cancellation state) and tool_execution (execution/call ID, tool, argument hash, result/status). Execution request stores trusted metadata only; no transcript/draft snapshot. Session FK awaits SRC-020; trusted session port validates binding. See [physical schema](physical-schema.md) and [runtime contract](../contracts/agent-runtime.md).

SRC-019 v13: workflow_definition additionally service_actor_id; workflow_run definition_id/current_node/correlation_id/error_code/attention/cancel_pending/cancel_attempts/cancel_retry_at/last_checked_at; workflow_step_run next_attempt_at; workflow_wait event_type/result; workflow_action durable effect result per run/node; workflow_trigger_selection tenant+definition+event tombstone. See [contract](../contracts/workflow.md).

## SRC-020 physical refinement (CHG-20261005-06)

V14 adds Chatflow definition/version/session/node_run/turn. Session stores service_actor_id/execution_role_id pinned from parent, owner_revision, draft/variables/provenance JSON objects, lead_id nullable, outcome/error_code, last_message_id and checked_at. Active Conversation key generated from running/waiting_message/paused_human. Node_run stores status pending/running/waiting/succeeded/cancelled, invalid_attempts0..3, prompt_attempt (last emitted attempt), execution_id nullable, lease_until and monotonic fencing_token. Turn stores node_key and validated/invalid/runtime status, no transcript copy. All IDs tenant-bound; terminal rows retained. Version/turn/node references use tenant composite FK.

V14 drops the v8 null-only checks for Lead conversation/session/source_touchpoint and adds tenant FKs; existing null data unchanged. Lead.session uniqueness remains. Session.lead_id references Lead after table creation. Agent execution session IDs remain validated through owning session port (legacy private runtime test adapters have no production Chatflow row); no change to historical migrations. Each synchronous node effect and progress commits atomically; async runtime callbacks use execution ID plus current node/owner guard. Claim lease60s with fence; waiting-message polling rotates checked_at. Three invalid answers route Human; draft-only runtime data cannot create consent evidence. Direct Lead updates/qualification/disqualification are blocked while its session active via injected Sales session guard.

V15 follow-up (same CHG): MySQL skips composite FK when any member is NULL; `ck_lead_session_conversation` requires non-null conversation whenever qualification_session_id is non-null. V14 preserved after first disposable application. Outbound v14 adds nullable chatflow_session_id composite FK including conversation; AI dispatcher requires this session binding and checks live owner, service role and AI policy immediately before send. Lead source touchpoint is the earliest Conversation touchpoint via Channels port.

V16 follow-up preserves applied v14/v15 and adds private `chatflow_node_run.proposed_reply TEXT NULL` bounded4000. Runtime proposal/tool only stores text there; no outbound intent until the exact execution completes successfully under live guards. Takeover/failed/cancelled executions leave proposals inert; session read projections exclude this field.

SRC-021: lead_handoff exact fields and state/parent/action constraints follow [Sales handoff contract](../contracts/sales-handoff.md); attention persists no eligible/15-minute alert.

## M3 proposed additions — Draft, chưa là migration

CHG-20261006-03. [Message envelope](../contracts/messaging-platforms.md) bổ sung `platform`, `message_type`, `external_msg_id`, `reply_to` JSON và `attachment` JSON; text cho media-only cần nullable ở contract mới. `external_msg_id` map cùng semantic với `provider_message_id` hiện có, giữ namespace tenant+connection; chưa rename/drop cột hoặc sửa unique key đã dùng.

AI provider binding cần provider key, external agent/entity reference, tenant-bound connection, secret reference, capability/config version và desired/observed sync status. Provider routing cần external control state, operation/revision, confirmation/error/attention để reconcile độc lập CRM owner. Tên bảng, FK/index/check, retention, migration/backfill và field-level access chốt PLAN-004 trước code; không coi đề xuất này là bảng đã tồn tại.

PLAN-003 refinement: provider entity reference phải có loại asset (phone number, agent, Business Manager...), không dùng một external ID không phân loại. Budget token scope Business Manager có thể chứa nhiều tenant; design PLAN-004 cần authority mapping riêng, không mutate qua tenant-local config mặc định. Desired/observed control và message template definition/parameters cần versioned schema theo [source matrix](../references/meta/capability-matrix.md); chưa thêm cột hay bảng.


SRC-026 không thêm persisted field: external_msg_id alias provider_message_id; platform qua Channels; reply_to/attachment null-only; field ACL bỏ toàn bộ content khi deny. [Exact projection](../contracts/message-envelope-v2.md).


SRC-027 / schema18 Ready: message_content(tenant_id,message_id,content JSON) lưu normalized v1; reply external-only, resolution là projection. [Exact fields](../contracts/rich-messages.md).

## Connector Messenger capture — PLAN-004C

Independent service owns connector_meta_page/event/audit (schema2); exact fields/keys/retention at [Messenger ingress contract](../contracts/messenger-ingress.md). Tenant/Page authority local; no monolith table or FK change. Captured is not a Chat message.

## ADR-019 target identity and cache ownership

Canonical contact_identity moves to CRM Core at future extraction: tenant_id, platform, connection_id, external_subject_id, crm_contact_id, mapping_revision. Connector owns provider_profile_cache (name/avatar provenance/expiry) and contact_resolution_cache (confirmed CRM refs/revision/expiry); no second master. Chat message context has required crm_contact_id for both directions. [Fields, policy and migration](../contracts/contact-resolution.md). These are logical target entities; existing SQL contact_id/identity rows and migrations unchanged.

PLAN-006C: contact_resolution_cache exists logically at both Chat and Connector; lookup DB before create, keep mapping_revision/status/expiry, hydrate only from authorized DB read or successful CRM receipt. Lookup errors are not not_found. [Semantics](../contracts/contact-resolution.md).

## SRC-030 scoped implementation

Existing contact_identity remains canonical CRM-owned identity mapping in schema18. SRC-030 reuses idempotency_record with service actor and connection-scoped route. inbound_delivery.payload accepts an additive internal version2 wrapper containing crm_contact_id, crm_identity_id and legacy intake. No applied migration changes; mapping_revision is fixed at 1 while mapping mutation is disabled. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.
