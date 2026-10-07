# Schema catalog — nơi đặt bảng mới

PLAN-007 / ADR-021, 2026-10-07. **Normative cho thiết kế mới**; không phải danh sách database đã tạo. Source hiện tại vẫn `agentic_crm` monolith và Connector private database. [Guideline](database-guidelines.md) · [Ownership hiện tại→đích](service-ownership.md) · [Lộ trình](../planning/native-identity-data-plan.md).

## Nguyên tắc phân vùng

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
| `crm_workflow` | Workflow | definition/version/trigger selection/run/step/action/wait; durable business orchestration | Chatflow session/turn; ghi thẳng bảng service khác |
| `crm_chatflow` | Chatflow | definition/version/session/node_run/turn; qualification provenance và logical Lead refs | Canonical Lead, Contact, message hoặc tool execution |
| `crm_media` | Media | asset/rendition/scan/extraction metadata và storage refs sau gate Ready | File binary trong bảng message; public unprotected media URL |
| `crm_ticket` | Ticket | ticket/SLA/service lifecycle và local ownership sau M4 Ready | Sales opportunity; generic miscellaneous tables |
| `crm_reporting` | Reporting | tenant-authorized event projections, metric definition/export metadata sau gate Ready | Primary business writers; query trực tiếp mọi service DB |
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
