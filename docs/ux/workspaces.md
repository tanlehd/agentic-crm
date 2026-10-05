# Workspaces và UI design system

Status: Ready for implementation wireframe M2; Sale nâng cao/Admin builder/Report builder Draft.

## Nguyên tắc chung

Ứng dụng desktop-first, desktop chính từ 1280px; màn hình nhỏ chuyển detail panel thành drawer. Shell gồm tenant switcher, workspace navigation, search theo module và user menu. Tenant switch phải xóa selection/cache tenant cũ trước fetch mới; không giữ dữ liệu tenant trước trong màn hình mới.

Typography dùng system sans-serif, body 14px, heading 20/24px; spacing scale 4/8/12/16/24/32px. Màu semantic success/warning/error/info kèm icon/text, không chỉ dựa màu. Button primary cho hành động tiếp theo; destructive/ownership change hiển thị đối tượng và lý do. Focus keyboard rõ, label input đầy đủ, error liên kết field; contrast mục tiêu WCAG AA khi chọn theme triển khai.

Record cards dùng cùng pattern cho standard/custom object: header identity + owner/team + status, property sections, associations và activity timeline. Hiển thị Human/AI bằng badge có text, không giả AI thành tài khoản người thật.

## Chat Workspace — M2

```text
┌ Tenant / Chat / Sales / Admin ───────────────────────────────┐
│ Queue 280px      │ Conversation linh hoạt │ Context 340px   │
│ Mine / Team     │ Contact label / owner  │ Contact summary │
│ Unassigned      │ CTM/ad source          │ Qualification   │
│ Needs attention │ Timeline + notes       │ Service / Need  │
│ Open / Pending  │ AI/Human handoff trail │ Consent evidence│
│ Search label    │ Composer + quick reply │ Lead status     │
│ Queue items     │ Send / internal note   │ Complete / link │
└─────────────────┴────────────────────────┴─────────────────┘
```

- Queue item: display label, tin gần nhất nếu có quyền, owner, trạng thái, thời điểm nhận, badge attention. M2 tìm theo label prefix trong queue hiện hành; full-text message chưa hỗ trợ.
- Composer chỉ enabled cho current owner; supervisor có Take over. Text draft giữ khi lỗi network; send dùng lại idempotency key khi retry cùng nội dung.
- Qualification phân biệt model-suggested draft và field đã validate; consent hiển thị message tham chiếu. Không tự đánh dấu consent từ ad click.
- “Hoàn tất qualification” gọi session command, tạo/qualify Lead và để Workflow bàn giao; “Mở Lead” dùng quyền đọc riêng.
- AI timeout/handoff tạo banner; sent/failed/unknown khác nhau. Không ghi “đã gửi” cho queued hoặc unknown.
- Closed Conversation chỉ đọc; tin inbound mới xuất hiện thành phiên mới có link lịch sử Contact.

## Sale Workspace

M2 gồm Lead queue pending handoff và accepted, bộ lọc owner/team/source, cột nhu cầu/qualified_at/age và detail drawer. “Nhận Lead” là explicit command; mở màn hình không tự nhận. Hiển thị ai đã nhận nếu race xảy ra.

M4 thêm board Deal theo pipeline, task timeline, lịch hẹn, amount/currency, stage transition và lost reason. Record layout tham khảo cách đặt property/activity/association của HubSpot, không sao chép assets hoặc giả định cùng internal model.

## Admin Workspace

M1: member table (seat, role, team), role permission matrix, team roster, AI policy summary, object/property editor đơn giản. Giải thích “seat cho công cụ, role cho thao tác/phạm vi”. Metadata form/view edit theo field list; không drag-and-drop M1.

Workflow/Chatflow M2 có definition/version/run detail read-only; authoring JSON fixture/admin API. Publish hiển thị validation error node/path. Builder canvas là M5.

## Report Workspace

Blueprint: dashboard template gallery theo ngành/mục tiêu, card định nghĩa metric/time window, report detail, drill-down có quyền. M5 builder chọn object/grain → measure/dimension → filter → chart → save. Empty data khác no permission; không hiển thị global total rồi che chi tiết.

## Trạng thái bắt buộc

| Trạng thái | UI |
|---|---|
| Loading | Skeleton; chưa hiển thị dữ liệu tenant cũ |
| Empty | Nêu rõ chưa có record phù hợp; CTA chỉ khi có quyền |
| Forbidden | Giải thích thiếu capability/action; không lộ nội dung record |
| Validation | Error tại field, giữ giá trị đã nhập |
| Stale version / owner | Banner thay đổi và tải bản mới; không overwrite im lặng |
| Integration delayed | Hiển thị queued/processing; không báo thất bại khi đã persist |
| Unknown send | Cảnh báo cần kiểm tra delivery; không tự bật nút resend |

Wireframe là đặc tả hành vi, chưa phải prototype có thể bấm hoặc giao diện đã dựng. Tham chiếu nguồn ở [references](../references.md).

SRC-007 foundation UI có selector tổ chức từ `/me/memberships`, loading/empty/error và tải thêm. Đổi lựa chọn gửi X-Tenant-Id ở request mới; request cũ được abort để không ghi đè kết quả tổ chức vừa chọn. Admin team read kiểm quyền thật; 403 hiển thị thiếu quyền quản trị. Đây chưa phải full Admin UI SRC-013.

SRC-013 exact UI/API additions theo [M1 UI contract](../contracts/crm-ui.md); record descriptors dùng field ACL, tenant keyed cache, explicit Lead consent và stale reload.

## SRC-016 implementation scope

Queue state/all/mine/unassigned and explicit team-ID filter use Conversation API; prefix search applies to loaded pages. Detail shows real Contact summary, attribution, Human/AI owner kind, team and message delivery status. Notes read via Conversation notes endpoint with Activity ACL; quick replies insert editable text only. Loaded cursor pages refetch every 5 seconds, including pending outbound status; no hidden-tab polling. Forbidden reads replace cached content. Draft/idempotency keys are memory-only and isolated by tenant/conversation; tenant switch clears cache. Owner revision change blocks send until explicit review; retry ambiguous network result uses original payload/key. Closed detail read-only. On narrow screens Contact context opens in a disclosure panel. Routing/takeover, attention queue and session qualification remain later tasks; no dummy buttons or fabricated Lead status.

SRC-022 adds API-backed Sales and Operations tabs in the CRM shell. Sales queue filters/paging, qualified age, consent/Contact detail and explicit accept/retry-CAS; authorized links open existing CRM/Chat views. Operations separates inbound failures with reason-coded retry, Workflow run timeline, Agent Runtime attention and read-only definition versions. Existing tenant-keyed QueryClient unmount clears selected data. Polling every5s while visible; errors replace cached detail. Exact contract at [M2 workspaces](../contracts/workspaces-m2.md).
