# REST API contract — M1–M2

Status: Ready for implementation. Health/auth và Identity admin API đã có source; registry metadata/association API đã có SRC-010 ([exact contract](registry.md)); record CRUD còn thiết kế. Exact Identity DTO tại [admin contract](identity-admin.md); OpenAPI/schema/generated TS trong packages/contracts.

## Quy ước chung

Base `/api/v1`. Human dùng session OIDC + `X-Tenant-Id`; integration/service credential khóa tenant. Tất cả endpoint tenant-scoped kiểm tra tenant active và permission. Không nhận `tenant_id` từ body để ghi đè context.

JSON UTF-8, UUID string, time RFC3339 UTC, decimal string. Success một record: `{ "data": {...}, "meta": {"correlation_id":"..."} }`; collection thêm `next_cursor` nullable. Trang mặc định 50, tối đa 100. Sort mặc định `(created_at,id)` ascending, cursor opaque signed chứa tenant/filter/sort/position; cursor sai context trả 400. Message timeline sort `(received_at,id)`; UI hiển thị thêm `occurred_at`.

POST tạo resource trả 201; command hoàn tất trả 200; nhận xử lý async trả 202 cùng resource/status URL. GET trả 200. Mutation cần `Idempotency-Key` (UUID/string tối đa 128) và CSRF với Human session. UPDATE/transition/assignment record hiện hữu còn cần `If-Match: "<version>"`; thiếu trả 428, stale trả 409. Create trả `version`; GET có ETag tương ứng.

Idempotency scope `(tenant,actor,method+canonical_path,key)`, hash canonical JSON body + If-Match. Cùng key/hash trả nguyên response cũ trước kiểm tra stale version nhưng vẫn xác thực quyền đọc response hiện hành; khác hash trả 409. Pending request trả 409 `REQUEST_IN_PROGRESS` + Retry-After. Lưu command/domain state/outbox/idempotency response cùng transaction; quyền bị thu hồi thì không replay nội dung response nhạy cảm.

Error shape:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Record đã thay đổi; tải lại trước khi cập nhật.",
    "fields": [],
    "retryable": false
  },
  "meta": {"correlation_id": "request-correlation-id"}
}
```

| HTTP | Code | Nghĩa |
|---|---|---|
| 400 | INVALID_REQUEST / INVALID_CURSOR | Shape/filter/cursor không hợp lệ |
| 401 | UNAUTHENTICATED | Chưa xác thực |
| 403 | FORBIDDEN / FIELD_FORBIDDEN | Có tenant membership nhưng thiếu action/field permission |
| 404 | NOT_FOUND | Record không tồn tại, khác tenant hoặc ngoài read scope |
| 409 | VERSION_CONFLICT / IDEMPOTENCY_CONFLICT / INVALID_TRANSITION / OWNER_CHANGED / REQUEST_IN_PROGRESS | Xung đột phải xử lý theo code |
| 422 | VALIDATION_FAILED / FIELD_NOT_QUERYABLE / NO_ELIGIBLE_OWNER | Input đúng shape nhưng sai business rule |
| 428 | PRECONDITION_REQUIRED | Thiếu If-Match |
| 429 | RATE_LIMITED | Retry theo Retry-After |
| 503 | TEMPORARILY_UNAVAILABLE | Hạ tầng chưa nhận được command bền vững |

## Identity/admin API

| Method + path | Input → output | Permission |
|---|---|---|
| GET `/me/memberships` | Membership của chính account; không body CRM | authenticated account |
| GET `/admin/memberships` | status filter → membership list | membership.read/all |
| POST `/admin/memberships` | account_id đã tồn tại, seat_code, role_ids, team_ids → membership + human principal | membership.create/all |
| PATCH `/admin/memberships/{id}` | seat_code?, status?, role_ids?, team_ids? → versioned membership | membership.update/all |
| GET/POST `/admin/teams` | list / name,purpose → team | team.read/create/all |
| PATCH `/admin/teams/{id}` | name?,active? → versioned team | team.update/all |
| GET/POST `/admin/roles` | list / key,name,permissions → role | role.read/create/all |
| PATCH `/admin/roles/{id}` | name?,permissions? → versioned role + auth revision invalidation | role.update/all |
| GET/POST `/admin/ai-agents` | list / name,policy_id,runtime_adapter,max_concurrency,role_ids,team_ids → AI + principal | agent.read/create/all |
| PATCH `/admin/ai-agents/{id}` | name?,policy_id?,max_concurrency?,role_ids?,team_ids? → versioned AI | agent.update/all |
| PATCH `/admin/principals/{id}` | availability?, status? → principal; status chỉ AI, Human suspend qua membership | agent.update/all hoặc membership.update/all theo kind |

Tenant bootstrap là operator command nội bộ ([local Identity bootstrap](bootstrap.md)), không public sign-up M1: tạo tenant, standard registry, roles, teams, service actors và admin membership liên kết OIDC account trong một transaction. SRC-009 tạo phần Identity; standard registry được extension v2 ở SRC-010, không reset Identity ACL. Không tự gán admin từ domain email. Không được suspend/demote human tenant admin cuối cùng. Membership invite bằng email và email delivery chưa thuộc M1.

Các config entity mutable có `version` và If-Match như record. M1 provision channel credential, workflow service actor, field policies, availability và AI policy qua bootstrap/config fixture; không có UI secret editor. Policy assignment phải tham chiếu policy đã tồn tại cùng tenant.

## Metadata và record API

| Method + path | Input → output | Permission |
|---|---|---|
| GET/POST `/object-types` | list / key,label → custom object type | schema.read/create/all |
| POST `/object-types/{key}/properties` | key,label,type,required,default_value?,options?,indexed,sensitive → property | schema.update/all |
| PATCH `/object-types/{key}/properties/{propertyKey}` | label only M1 → property | schema.update/all |
| GET/POST `/association-types` | list / key,source_type,target_type,label,cardinality → type | schema.read/update/all |
| POST `/associations` | type_key,source_record_id,target_record_id → association | association.create + read cả hai record + update source |
| GET `/records/{id}/associations` | visible associated records | association.read + read cả hai đầu |
| GET `/objects/{key}/records` | cursor,limit,filter?,sort? → record list | `{key}.read` scoped |
| GET `/objects/{key}/records/{id}` | field-redacted record | `{key}.read` scoped |
| POST `/objects/{key}/records` | fields,custom_values,team_id? → record | `{key}.create`; generic create chỉ contact/company/activity/custom |
| PATCH `/objects/{key}/records/{id}` | fields?,custom_values? → record | `{key}.update`; chỉ editable fields |
| POST `/objects/{key}/records/{id}/archive` | reason → archived record | `{key}.archive` |
| GET/PUT `/object-types/{key}/forms/{formKey}` | fields ordered → form definition | schema.read/update/all |
| GET/PUT `/object-types/{key}/views/{viewKey}` | columns,filter,sort → view definition | schema.read/update/all |

Create field bắt buộc: Contact `display_name`; Company `name`; Activity `kind,subject,related_record_id`; custom record theo property required/default. Owner không được gán qua generic API; default owner là principal caller nếu có, hoặc NULL với service. Team phải caller được phép create vào; scope own không cho tự chọn team ngoài membership.

PATCH `custom_values` là merge theo key; explicit null xóa giá trị optional, required field không được null. Field không khai báo bị reject, không bỏ qua. `status`, `owner`, `tenant`, `version`, lifecycle Customer và source attribution không nằm trong editable fields. Archive chỉ hỗ trợ Contact/Company/Activity/custom ở M1, reject nếu còn active conversation/lead hoặc run tham chiếu; unarchive/merge là backlog.

Filter M1 là AND của tối đa 10 predicate `{field,op,value}`; op `eq,in,gte,lte`, `in` tối đa 50 giá trị. Standard field allowlist và indexed custom field mới được dùng; type phải khớp; datetime UTC. Sort tối đa một field + ID tie-breaker. Enum/string eq case-sensitive; không full-text, relation traversal hoặc arbitrary SQL.

## Channels và Conversation

Mock inbound endpoint `POST /integrations/mock-messenger/deliveries` dùng credential connection, không human session. Payload dưới là **normalized fixture**, không phải payload chính thức của Meta:

```json
{
  "provider_event_id": "evt-mock-001",
  "provider_message_id": "msg-mock-001",
  "external_subject_id": "psid-fixture-001",
  "display_label": "Khách thử nghiệm A",
  "occurred_at": "2026-10-02T03:00:00Z",
  "message": {"type": "text", "text": "Tôi muốn đặt lịch tư vấn dịch vụ A"},
  "referral": {"source": "ctm", "ad_id": "ad-fixture-01", "campaign_id": "campaign-fixture-01"}
}
```

`provider_event_id`, `provider_message_id`, `external_subject_id`, `occurred_at`, `message` bắt buộc; `display_label`, `referral` optional. Chỉ text, nonblank tối đa 4.000 ký tự; ID provider tối đa 255; metadata ngoài allowlist không forward cho runtime. Nhận trả 202 `{delivery_id,status:"received"}`; replay cùng key/hash trả cùng ID; cùng key khác payload trả 409. Worker nhận message ID trùng qua event khác thì không tạo message, conversation, touchpoint hoặc qualification mới; đánh dấu delivery processed với duplicate reference.

| Method + path | Input → output | Permission |
|---|---|---|
| GET `/integrations/deliveries/{id}` | status,error_code? | integration.read/all; mock credential chỉ connection mình |
| GET `/conversations` | state,owner/team filters,cursor → queue | conversation.read scoped |
| GET `/conversations/{id}` | conversation + permitted Contact summary | conversation.read |
| GET `/conversations/{id}/messages` | cursor → timeline | conversation.read |
| POST `/conversations/{id}/messages` | text,owner_revision → outbound intent + status URL | conversation.reply + current owner |
| GET `/conversations/{id}/outbound-intents/{intentId}` | queued/sending/sent/failed/unknown/cancelled + sanitized error | conversation.read; intent phải thuộc Conversation |
| POST `/conversations/{id}/notes` | text → internal Activity | conversation.note |
| POST `/conversations/{id}/transition` | target_status,reason → conversation | conversation.update |
| POST `/records/{id}/assignment` | owner_principal_id?,team_id?,reason → record + owner_revision | `{object}.assign` + target eligibility |
| POST `/conversations/{id}/takeover` | reason → assignment to caller + pause AI | conversation.takeover |

Owner-only send bảo đảm một người/AI xử lý outbound; supervisor cần takeover trước khi gửi. Manual assignment cần target active, đúng capability/role, thuộc target team. Assign NULL owner cho queue là hợp lệ. Team omitted nghĩa giữ nguyên, explicit null chỉ tenant admin được xóa team. Transition `open ↔ pending`, `open/pending → closed`; closed không reopen M2. Close pause/cancel active chatflow và outbound queued trong transaction.

## Lead và handoff

| Method + path | Input → output | Permission |
|---|---|---|
| POST `/leads` | contact_id,conversation_id?,qualification_session_id?,qualification → Lead new/qualifying | lead.create + Contact read |
| GET `/leads` và `/leads/{id}` | status,team,owner filter → Lead | lead.read scoped |
| POST `/leads/{id}/qualification` | qualification object có consent_evidence → qualified | lead.qualify |
| POST `/leads/{id}/disqualify` | reason → disqualified | lead.qualify |
| POST `/leads/{id}/handoffs` | target_team_id → handoff pending + Lead handed_off | lead.handoff + share Contact vào target team |
| POST `/leads/{id}/handoffs/{handoffId}/accept` | owner_revision → accepted handoff/Lead, caller làm owner | lead.accept + target team membership |

Qualification thiếu field trả 422, không tự qualified một phần; để lưu nháp dùng generic Lead PATCH allowlist `qualification` khi new/qualifying, permission lead.qualify. Create có qualification draft thì status qualifying, rỗng thì new. Qualified là terminal cho qualification M2; reopen/disqualify sau handoff thuộc backlog. Handoff pending không tạo Deal. Handoff tự phân Lead cho sale đủ điều kiện bằng routing, không có người phù hợp thì owner NULL trong Sales queue. Người khác nhận Lead phải có lead.assign hoặc là owner hiện tại/record unassigned; accept dùng CAS để chỉ một người thành công.

`qualification_session_id` chỉ service actor của Chatflow được truyền; Human tạo Lead thủ công không được tùy ý chiếm session ID. Nếu có Conversation thì contact_id phải đúng Contact của Conversation và caller có quyền đọc cả hai. Lead tạo từ session gán owner=session current owner, team=intake; owner assignment được audit trong cùng transaction. Direct Lead command với session đang active không được bỏ qua session orchestration.

Contact team access được grant cùng transaction handoff; service actor chỉ được share vào target sales team cấu hình. API response trả version mới. Handoff pending >15 phút sinh cảnh báo; không tự reassign M2.

## Automation API

| Method + path | Input → output | Permission |
|---|---|---|
| POST `/workflows` và `/chatflows` | key,name → definition | automation.design/all |
| POST `/workflows/{id}/versions` và `/chatflows/{id}/versions` | graph → draft version | automation.design/all |
| POST `/workflows/{id}/versions/{version}/publish` và tương tự chatflows | validated graph → immutable version | automation.publish/all |
| GET `/workflow-runs/{id}` và `/chatflow-sessions/{id}` | status, sanitized steps/variables | automation.read scoped theo related record |
| POST `/chatflow-sessions/{id}/complete-qualification` | qualification,consent_message_id,owner_revision → qualified Lead + completed session | current Human Conversation owner + lead.create/qualify; If-Match là session version |
| POST `/workflow-runs/{id}/cancel` | reason → cancelled | automation.operate/all |
| POST `/operations/deliveries/{id}/retry` | reason → retry scheduled | integration.retry/all |

M2 graph schema và primitive nằm trong [Workflow](../modules/workflow.md), [Chatflow](../modules/chatflow.md). Workflow enable/pause qua `PATCH /workflows/{id}` `{enabled:boolean}`; cần automation.publish và If-Match. Pause definition chỉ chặn run mới, cancel run là command riêng. Khởi chạy từ event, không có arbitrary execute endpoint M2. Deal/Ticket/report builder API sẽ đặc tả trước M4–M5, không coi endpoint generic là đường vòng.

`GET /operations/audit` và `/operations/failed-deliveries` dùng pagination chung; quyền lần lượt audit.read/all và integration.read/all. Chat agent đọc qualification panel/session liên quan qua conversation.read và field permissions; quyền automation.read dành cho chi tiết engine, không bắt chat agent có quyền quản trị automation.

Auth login/callback/session/CSRF/logout theo [auth transport](auth.md); đã triển khai ở SRC-006; OpenAPI gồm health/auth và Identity admin; registry routes theo [contract SRC-010](registry.md); CRM record CRUD vẫn ở task tiếp theo.
