# Acceptance và traceability

Status: Ready for implementation như thiết kế test. Source có foundation/kernel tests; acceptance nghiệp vụ vẫn chờ task tương ứng. SRC-004 chỉ kiểm AC-01 tầng repository/composite FK/transaction, chưa đóng toàn AC-01; xem [evidence](../tracking/details/SRC-004.md).

SRC-005 kiểm AC-14 phần automated local links/fences/JSON/task dependency; Mermaid chỉ kiểm header, chưa render; không đóng toàn AC-14 hoặc business gate. [Evidence SRC-005](../tracking/details/SRC-005.md).

SRC-006 kiểm auth prerequisite của AC-01/02: OIDC/state/nonce/PKCE/CSRF, session expiry/logout/refresh/revocation, public issuer/private backchannel. Không đóng AC-01/02 tenant/permission; [evidence](../tracking/details/SRC-006.md).

## Ma trận truy vết

| Requirement | Thiết kế | Contract / interface | Acceptance |
|---|---|---|---|
| REQ-01 | [Security](../system/security-operations.md), [Identity](../modules/identity.md) | [REST context](../contracts/api.md) | AC-01 |
| REQ-02 | [Identity](../modules/identity.md) | [Admin/record API](../contracts/api.md) | AC-02 |
| REQ-03 | [CRM](../modules/crm.md), [Sales](../modules/sales.md) | [Lead API](../contracts/api.md) | AC-03 |
| REQ-04 | [Data model](../data/model.md), [CRM](../modules/crm.md) | [Metadata API](../contracts/api.md) | AC-04 |
| REQ-05 | [Channels](../modules/channels.md), [Operations](../modules/operations.md) | [API](../contracts/api.md), [Events](../contracts/events.md) | AC-05, AC-15 |
| REQ-06 | [Agents](../modules/agents.md) | [Assignment API](../contracts/api.md) | AC-06 |
| REQ-07 | [Agents](../modules/agents.md), [Chatflow](../modules/chatflow.md) | [Agent Runtime](../contracts/agent-runtime.md) | AC-07, AC-18 |
| REQ-08 | [Workflow](../modules/workflow.md), [Chatflow](../modules/chatflow.md) | [Events](../contracts/events.md) | AC-08, AC-16, AC-17 |
| REQ-09 | [First slice](../business/first-slice.md) | [Conversation/Lead API](../contracts/api.md) | AC-09 |
| REQ-10 | [Ticket](../modules/ticket.md) | Draft M4: transition/SLA contract | AC-10 |
| REQ-11 | [Reporting](../modules/reporting.md) | Metric definitions; report API Draft M5 | AC-11 |
| REQ-12 | [Operations](../modules/operations.md) | [Events](../contracts/events.md) | AC-12, AC-17 |
| REQ-13 | [Healthcare](../business/healthcare.md) | [Custom object API](../contracts/api.md) | AC-13 |
| REQ-14 | [Development](../governance/development.md) | Module template + readiness gate | AC-14 |

## Scenarios

| ID / gate | Given / When | Then |
|---|---|---|
| AC-01 / M1 | Alpha/Beta có cùng label, provider subject và object key; Alpha dùng Beta record ID/association target/cursor/job context | Không đọc/sửa/liên kết được; 404 hoặc rejected context; không lộ count/label; composite FK chặn cross-tenant; không có side effect Beta |
| AC-02 / M1 | Viewer seat mang edit role; Chat seat thiếu reply role; scope own/team/all; field deny và record team share | Entitlement và role đều bắt buộc; own không đọc unassigned; team chỉ primary/shared team; field deny áp dụng filter/export; không suspend admin cuối |
| AC-03 / M1–M4 | Cùng Contact có hai nhu cầu khác nhau | Hai Lead hợp lệ, không duplicate Contact; M4 một Deal won làm Contact customer, appointment đơn thuần không làm customer |
| AC-04 / M1 + M5 | Tạo indexed enum property/custom record/association/form/view; thử sai type, required, cardinality và property thiếu index | CRUD/render/filter theo metadata đúng, transaction index không lệch; M5 workflow/report dùng cùng schema và ACL |
| AC-05 / M2 | Replay cùng delivery, khác event cùng message, cùng event khác payload | Hai replay đầu no-op; payload conflict 409; không thêm Message/Conversation/Lead/Touchpoint/Run |
| AC-06 / M2 | Supervisor chuyển Conversation AI→Human, Lead giữ Sales owner; thử gán inactive/cross-tenant principal | Conversation revision/history cập nhật riêng; Lead không đổi; target sai bị từ chối; owner NULL vẫn ở đúng team queue |
| AC-07 / M2 | Runtime gọi tool ngoài allowlist, dùng field denied, trả kết quả sau takeover hoặc bị disable | Không side effect; audit sanitized; late output rejected; queued outbound cancelled; Human nhận draft |
| AC-08 / M2 | Crash sau action commit trước step success, restart rồi publish graph version mới | Cùng action key không lặp tác dụng; run tiếp version cũ; consumer replay không tạo run mới |
| AC-09 / M2 | Chạy fixture A từ mock inbound đến Sales accept | Một Contact/Conversation/Lead, nguồn giữ đúng, consent có evidence, Lead accepted, Conversation owner độc lập; thiếu consent thì không qualify |
| AC-10 / M4 | Ticket pause/resume/reopen/escalate và lỗi retry | Sau khi spec SLA Ready: deadline đúng calendar, escalation một lần, ownership/audit không mất |
| AC-11 / M2 semantics + M5 engine | Dataset 4 conversations, nhiều message, nhiều association; chạy metric theo cohort | Đúng KPI fixture 12/4/3 và 2/3; không fan-out count; denom=0 null; cache không lộ tenant/scope; owner history dùng đúng thời điểm |
| AC-12 / M1 | Mutation thành công, permission denied, external failure | Audit actor/action/tenant/correlation đúng; secret/PII/message body không xuất hiện ở log; outbox atomic với business state |
| AC-13 / M1 + M4 | Tạo Appointment/ServiceOffering bằng metadata | M1 không có bảng ngành riêng, association và form hoạt động; M4 validates lịch và won/customer continuation |
| AC-14 / M0 | Rà toàn bộ tài liệu, link, Mermaid, REQ→design→contract→AC | Không link nội bộ hỏng, ID duy nhất, bảng dictionary khớp ERD, Draft không gắn Implemented; ghi rõ phần chỉ kiểm tra tài liệu |
| AC-15 / M2 | 2 inbound worker cùng identity, 2 qualifies cùng session, 2 sales cùng accept một handoff unassigned | Một active Conversation, một Lead/session, một accept thắng CAS; caller còn lại nhận response replay hoặc conflict |
| AC-16 / M2 | message/event tới trước session/wait; timer và event đồng thời | Session đọc được tin đầu; wait kiểm tra persisted result; chỉ một terminal transition; không mất signal |
| AC-17 / M2 | Redis outage, outbox publish rồi crash, lease hết hạn, worker cũ quay lại | Intake durable không mất; duplicate event an toàn; fencing từ chối worker cũ; queue phục hồi theo outbox |
| AC-18 / M2 | Outbound queued khi takeover và outbound đã sending khi takeover | Queued bị cancel; sending có thể sent/unknown và reconcile, không claim thu hồi được; không auto-resend unknown |

## Thứ tự kiểm thử khi implement

1. Unit tests cho permission evaluator, state transitions, metadata validation và metric formulas; không chỉ test mirror implementation.
2. Integration tests MySQL thật cho unique/FK/transaction/CAS/fencing, có hai tenant và concurrency thật.
3. Contract tests mock inbound/runtime và outbox consumer; fault injection crash/retry/out-of-order.
4. End-to-end UI/API với fixture A, Human takeover và Sales race; kiểm tra persisted state, audit và event counts.
5. M3 thêm provider sandbox, signature, permission window, rate limit, token expiry, outbound unknown/reconciliation; không đánh đồng mock pass với provider production pass.

## Kiểm tra tài liệu M0

Kiểm tra mọi relative link trỏ file tồn tại, fenced blocks đóng đúng, Mermaid parse được khi có renderer, module đủ mục theo template, ID không trùng và readiness có scope. Rà thủ công chéo state enum, endpoint inventory, ERD/dictionary và KPI arithmetic. Báo cáo kiểm tra đặt tại [validation](validation.md).

SRC-007 đạt sub-scope Identity của AC-01/02: seat+role own/team/all và field deny primitives (unit), tenant-scoped schema/API, live revision, team activation, last-admin guard với concurrent self-demotion, signed cursor, OIDC browser tenant switching. Chưa đóng toàn AC-01/02: CRM record/association/job isolation, persisted field_policy/query/export tiếp tục ở SRC-010…013/024. Admin transaction rollback/replay có evidence sơ bộ AC-12; relay/inbox/fencing vẫn SRC-008. [Evidence SRC-007](../tracking/details/SRC-007.md).

SRC-008 đạt AC-05 foundation (consumer duplicate) và AC-12 foundation (transaction audit/outbox, receipt replay quyền hiện hành, audit DB append-only); AC-17 sub-scope relay crash/reclaim/fencing/retry bằng MySQL integration và worker thật qua E2E. Không đóng AC-05 Messenger intake hoặc toàn AC-17/18: provider unknown, workflow/Redis outage recovery end-to-end và cancellation còn M2 tasks sau. [Evidence SRC-008](../tracking/details/SRC-008.md).

SRC-009 đạt bootstrap sub-scope AC-01/02/12: Alpha/Beta Identity fixtures, sáu OIDC users, shared viewer không có admin permission, cross-tenant context/reference denied, seed atomic/repeat-safe, system audit + Identity outbox/inbox. Không đóng CRM object/record/provider subject/association/job portions của AC-01 hoặc M1 release gate; các phần đó tiếp tục SRC-010…013/024. [Evidence SRC-009](../tracking/details/SRC-009.md).

SRC-010 kiểm registry/association sub-scope AC-01/02/04/12: FK và tenant isolation hai đầu, cardinality/CAS/race, scoped reads/shares, field-policy loader, subtype atomicity bằng test-only adapter, ownership history/outbox và receipt rollback. Chưa đóng full AC-04/13, query/index/form/view, CRM UI, runtime business subtypes hoặc public assignment/routing AC-06. [Evidence SRC-010](../tracking/details/SRC-010.md).

SRC-011 đạt backend AC-04/13 M1 và record ACL/query/replay phần AC-01/02/12; [evidence](../tracking/details/SRC-011.md). UI/render và gate M1 chờ SRC-013.

SRC-012 backend AC-03/M1, qualification sub-scope AC-09 và standard ACL/transaction đã kiểm; [evidence](../tracking/details/SRC-012.md). Handoff/acceptance và Customer M4 chưa đóng.

SRC-013 đóng **M1 release gate**: Admin/CRM UI real OIDC, tenant/permission negative, standard/custom CRUD, association, typed query/form/view; cold tmpfs migration+seed và warm restart giữ dữ liệu PASS. AC-03/04/13 chỉ phạm vi M1; AC-09 chỉ qualification, handoff/acceptance vẫn M2. Regression 53 MySQL và40 unit/contract; [evidence SRC-013](../tracking/details/SRC-013.md).

## SRC-014 — sub-scope M2

Evidence [SRC-014](../tracking/details/SRC-014.md): AC-05 business-message dedup/transaction port (chưa durable ACK/referral); AC-15 race một active Conversation/identity; AC-18 queued cancellation hook/close, sending giữ kết quả, unknown không resend và mock reconcile; AC-01/02 tenant/owner/field policy; AC-12 audit/outbox sanitized. Không đóng toàn AC-05/06/07/09/15/18 hoặc M2 release gate: intake, actual takeover/routing/AI, workflow/chatflow và Sales vẫn thuộc các task tiếp theo.

## SRC-015 — AC-05 mock inbound

[Evidence SRC-015](../tracking/details/SRC-015.md): durable ACK trước business processing, same event/hash replay cùng ID, payload conflict409 không overwrite, different event/same message no-op cả Contact/identity/Conversation/Message/touchpoint; missing referral vẫn xử lý unknown. Credential gắn tenant/connection/service role, live revocation, cross-tenant404/credential401; AC-15 identity race và AC-17 claim/crash/reclaim/fencing/rollback/backoff sub-scope. HTTP→worker local E2E dùng Alpha/Beta thật. Không đóng M2 full slice/Lead/Workflow KPI hoặc provider Meta acceptance.

## SRC-016 — Inbox UI sub-scope

[Evidence SRC-016](../tracking/details/SRC-016.md): queue/detail/Contact/CTM, real timeline and Activity notes, quick reply insertion, 5-second polling with cursor pagination, owner-revision review, lost-ACK retry same payload/key with exactly one Message, read-only and tenant switch. Chrome154 E2E PASS; 403 detail cache removal and unknown delivery display tested by explicit browser fault injection. Backend note scope/field/tenant and latest-message receipt replay regressions included in 82 MySQL tests. AC-01/02/05/18 UI sub-scopes only; no public assignment/takeover/AI/session qualification or M2 full gate.

## SRC-017 sub-scope

AC-06 routing/assignment/takeover: live target eligibility, atomic round-robin cursor, queue fallback/attention, independent Lead owner, CAS/history/audit/outbox. AC-18 actual queued cancellation and in-flight completion after takeover. AC-01/02 tenant/seat/role/team/policy/field negative checks and receipt replay revocation. Capacity reservation concurrency and disable attention tested through MySQL ports/durable inbox. Runtime execution/queued30s, session pause and tools remain SRC-018/020; full AC-07/08 and M2 gate are not closed. [Evidence SRC-017](../tracking/details/SRC-017.md).
