# M3 — AI Agent providers và CRM Connectors

Status: Định hướng được user chấp thuận ngày 2026-10-06; thiết kế production Draft. PLAN-002 / CHG-20261006-03. M1–M2 giữ nguyên 25 task DONE; tài liệu này không chứng nhận integration đã chạy.

## Phạm vi và ranh giới

AI Runtime là platform có vòng đời/configuration, knowledge, instructions, tools, testing và telemetry. CRM cung cấp thiết lập AI Agent với lựa chọn provider; **Meta AI Agent (Meta Business Agent)** là case study đầu tiên. Provider không bị giới hạn thành một LLM endpoint hoặc bắt buộc chạy qua synchronous `execute()` của mock M2.

Ba trách nhiệm được tách rõ:

| Thành phần | Trách nhiệm |
|---|---|
| AI Agent provider | Khả năng provider, eligibility/onboarding, liên kết external agent/entity, cấu hình knowledge/instructions/tools, test/eval, enable/disable và đồng bộ trạng thái |
| CRM Connector (MOD-03) | Tích hợp messaging platform: credential binding, webhook, normalize/dedup, send/receipt/reconcile, routing/control và capability của từng nền tảng |
| Conversation / Chat UI | Message envelope chung; owner Human/AI; render theo platform/message type/template; fallback cho nội dung chưa hỗ trợ |

Meta gọi các API kết nối hệ thống cho Agent là “Custom connectors”. Đó là tool/API integration của AI provider; không đồng nhất với CRM Connector vận chuyển messaging của MOD-03. Cùng vendor có thể cung cấp cả hai, nhưng secret, scope, lifecycle và binding riêng.

## Case study Meta đã kiểm chứng ở mức tài liệu

Nguồn local: [catalog và các điểm cần xác minh](../references/meta/README.md). Tài liệu chính thức có API knowledge/instructions, custom connectors/tools, agent settings, onboarding, test và thread control. Overview hướng dẫn trên WhatsApp; settings có field WhatsApp/Instagram và enum nhiều channel. Enum không phải bằng chứng mọi channel đã dùng được cho một tài khoản.

Messenger **Conversation Routing** định tuyến giữa các application; quyền Thread Owner ở Meta khác owner Human/AI nội bộ CRM. WhatsApp Meta Business Agent dùng **Thread Control (Cloud API)**, có action pass/release/take và escalation partner. Hai API phải có mapping riêng; không tái sử dụng endpoint Messenger cho WhatsApp.

Overview loại Health và một số ngành khỏi eligibility, đồng thời yêu cầu quốc gia/tài khoản đủ điều kiện. Giữ healthcare mock M2; case study Meta dùng dữ liệu tổng hợp catering/retail lead qualification, dựa trên guide Lead generation đã tải, và chỉ chạy trên tài khoản được eligibility API xác nhận. Việc này không triển khai Order, Appointment hay Ticket M4. Chưa gọi API thật, chưa xác nhận một tài khoản/quốc gia cụ thể đủ điều kiện.

## Luồng thiết lập AI Agent trên CRM

1. Chọn provider **Meta AI Agent**, xem platform/capability và điều kiện sử dụng được provider hỗ trợ.
2. Chọn connection/entity cùng tenant; tham chiếu credential ở server, kiểm tra access/eligibility; liên kết hoặc onboard external agent theo khả năng API.
3. Thiết lập tên agent, knowledge, instructions, tools và policy CRM. UI chỉ hiện capability có thật; không hứa RAG/tool/publish API giống nhau cho mọi provider.
4. Thiết lập Human team, escalation partner, handoff và chính sách trả quyền về AI. Phân biệt trạng thái config mong muốn với trạng thái đã xác nhận ở provider.
5. Chạy test với fixture tổng hợp, xem kết quả và lỗi đã lọc; cấu hình audience thử nghiệm trước khi bật. Không tự dùng default `EVERYONE` của Meta trong onboarding thử nghiệm.
6. Enable/disable có audit, version và operation receipt; timeout là trạng thái chưa xác nhận, cần đọc/reconcile trước khi lặp mutation. Publish/versioning của CRM phải mapping theo provider, không giả định Meta có immutable publish API.

Exact DTO, permissions, UI errors, credential rotation và state machine chốt ở PLAN-004; chưa triển khai màn hình này.

## Orchestration AI–Human

CRM giữ quyền truy cập, owner/team, audit và workflow durable. Provider điều khiển khả năng trả lời trên channel. Chỉ cho CRM dispatch khi cả live CRM authorization lẫn trạng thái control/provider policy đều cho phép. Provider không xác nhận quyền control thì UI hiển thị pending/unknown và ngăn gửi cạnh tranh.

Handoff cần durable operation ID, desired/observed control, revision và reconciliation. Webhook đến trễ/lặp hoặc response mất không được gán lại owner theo trạng thái cũ. Takeover dừng AI work do CRM điều khiển, hủy queued intents; side effect đã dispatch hoặc provider-hosted reply không thể hứa thu hồi. Đồng bộ external AI replies qua echo/standby theo từng platform, không tạo thêm một lần send trong CRM.

Meta có thể tự trả lời khi host agent. Vì thế protocol M2 proposal→CRM send chỉ áp dụng mode CRM-managed; mode provider-managed cần contract riêng và sandbox proof chống double response, human takeover, tool revocation và release back to AI. Không tạo Workflow/Chatflow lần hai cho cùng turn. Khi không map được external human về principal cụ thể, ghi external actor/attention thay vì giả danh một Human CRM.

## Message đa nền tảng

Base fields được user yêu cầu: `platform`, `message_type`, `external_msg_id`, `text`, `reply_to` JSON, `attachment` JSON. Giữ internal ID, tenant/connection/conversation, direction/status và timestamps. [Draft envelope](../contracts/messaging-platforms.md) quy định semantic, fallback và compatibility; dictionary liên kết cùng đề xuất.

Render registry chọn theo platform + message_type + template type/schema version. Messenger gallery/generic và CSAT là case study; Instagram, WhatsApp, Zalo là các adapter riêng cần provider docs/capability gate. Không coi mọi media template tương thích đa nền tảng. Hiển thị được template không có nghĩa composer có quyền gửi template đó.

## Thứ tự design gate

| Task | Deliverable | Dependency | Điều kiện hoàn tất |
|---|---|---|---|
| PLAN-002 | Định hướng, snapshot khởi đầu, impact và kế hoạch này | SRC-025 | Docs nhất quán, nguồn/checksum, không claim production Ready |
| PLAN-003 | Provider documentation dossier và capability/gap matrix Meta | PLAN-002 | Tải phần còn thiếu WhatsApp webhook/standby/handover/send/auth, eligibility/allowlist, media; pin version; phân biệt source facts và sandbox NOT_RUN; giải quyết discrepancy tài liệu hoặc ghi blocker cụ thể |
| PLAN-004 | Thiết kế chi tiết M3 và source backlog | PLAN-003 | AI setup/lifecycle, message schema, connector ports, routing state machine, API/events/DB/UX/AC, migration/compatibility và sandbox prerequisites được chốt theo phạm vi Ready |

PLAN-003 đã hoàn tất dossier nghiên cứu với [capability/gap matrix](../references/meta/capability-matrix.md); PLAN-004 còn thiết kế chi tiết. PLAN-004A đã tách và chốt legacy projection cho SRC-026; không triển khai phần Draft. Dự kiến thứ tự source sau gate: message/connector foundation → Messenger transport/routing/media → AI provider setup và WhatsApp binding cần thiết → AI–Human orchestration → UI và sandbox/regression/release. Dependency chi tiết có thể đổi sau capability review, không phải lịch cam kết.

Instagram/Zalo và các platform khác có documentation dossier riêng trước khi implement; nền móng M3 cho phép thêm adapter, không tự mở toàn bộ connector trong phiên này. M4/M5 giữ roadmap hiện tại.

## Compatibility và kiểm chứng

Không sửa migrations 1–17 hoặc protocol/schema M2 đã phát hành. Envelope read-only theo PLAN-004A không cần migration; rich/provider contract và migration mới sau gate tương ứng của PLAN-004; bảo toàn text history, receipt keys và unique tenant+connection+external identity. Xem acceptance M3 Draft trong [acceptance](../quality/acceptance.md). Doc-only verification của PLAN-002 không đóng AC sandbox/provider.

## PLAN-003 findings / PLAN-004 entry gate

CHG-20261006-04. [Version evidence](../references/meta/graph-version-observation.md) pin Graph v26.0, Agent config header2.0.0, Thread Control header1.0.0. Plural subscription fields Messenger đã xác minh bằng dedicated references; WhatsApp standby/echo shape và send-vs-explicit-take được đối chiếu guide. Budget provider là Business Manager scope, không được coi tenant-local setting.

PLAN-004 có thể thiết kế envelope/compatibility, capability-driven config UI, tenant/entity binding và durable operation ledger. Giữ live WA routing Draft tới khi có exact handover payload và host/path validation (G-04/05); hosted Agent mutable tools Draft tới khi đủ trusted callback subject/replay contract (G-08). Account eligibility và real sandbox là deployment/acceptance gate, không suy ra từ docs. Không tự tạo một source task READY bao gồm phần bị chặn. Gate chi tiết và owner tại capability matrix.


CHG-20261006-05 tách PLAN-004A legacy text envelope Ready để triển khai SRC-026; PLAN-004 còn TODO cho exact rich storage/renderer, provider setup/lifecycle/binding, connector ports/ledger/routing. G-04/05/08 giữ nguyên. Không cần đợi live Meta cho read-only projection.


PLAN-004B Ready cho [rich mock storage/renderer](../contracts/rich-messages.md); SRC-027 kế tiếp SRC-026. Không triển khai media resolver thiếu credentials/capability, không promote WA routing/tools.

ADR-017 / PLAN-005: production target là [microservices](microservices-migration.md). CRM Connector, Chat, AI Runtime, Media, Identity và Routing có data authority độc lập. PLAN-004 remaining cần remote API/saga/security gates PLAN-006; mock monolith evidence giữ nguyên, không claim full integration đã tách.

S-20261006-11: user chọn hoàn thiện/kiểm thử local trước, chưa có sandbox. PLAN-004C→SRC-029 signed Messenger capture gate [contract](../contracts/messenger-ingress.md); không mở live routing/tools hoặc bridge mock. Remaining provider lifecycle/UI, media, domain ingestion/dispatch and local release gate continue separately.

PLAN-006B / ADR-019 chốt [Connector enrichment/cache → CRM resolve → Chat required crm_contact_id](../contracts/contact-resolution.md). Canonical external identity mapping ở CRM, cache ở Connector. Both inbound/outbound inputs/events require customer Contact ID; exact schema/auth/migration and local implementation remain PLAN-006.
