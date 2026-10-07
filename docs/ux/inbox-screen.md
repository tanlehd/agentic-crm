# INBOX-01 — Quản lý hội thoại

Status: Ready UX design, UX-003, 2026-10-07. Kế thừa toàn bộ nghiệp vụ [Agent Chat UX](agent-chat-workspace.md), [contract](../contracts/agent-chat-workspace.md), [Chat service](../services/chat.md), [ownership](../data/service-ownership.md). Tài liệu này là screen entrypoint; UX-003 thay layout app rail, không thay state machine hoặc API.

## Người dùng và mục tiêu

Human chat agent xử lý hội thoại được phân công; supervisor điều phối/takeover theo quyền; Sales đọc ngữ cảnh/Lead khi có seat và grant. AI là owner/collaborator hiển thị trong workspace, không user login giả. Công việc chính: chọn đúng queue → đọc đủ ngữ cảnh → reply/note/takeover → cập nhật trạng thái → chuyển sang hội thoại tiếp theo.

Entry từ nav Inbox, authorized deep link. Khi chưa chọn conversation, detail có empty “Chọn một hội thoại để bắt đầu”; không auto-select/auto-takeover. Mock mặc định preselected synthetic để review bố cục, không thay entry rule production.

## Anatomy và kích thước

```text
App header 56px: workspace / search / create / settings / user
App nav 184px | Nội dung Inbox ngay dưới header
             | Queue 176 | List 280 | Conversation header ───────────
             |           | Search   | Timeline flex | Context 264 |40
             |           | Filter   |               |             |rail
             |           | Cards    | Composer      |             |
```

Desktop 1440: 184+176+280+496+264+40=1440px. Chat còn 496px; header hội thoại chạy ngang chat+context+tool rail. Không cộng thêm page margin/card ngoài workspace. Tại ≥1440 context mặc định docked; ≥1600 có thể nới list304/context288 nhưng chat tối thiểu480. Chiều cao main `100dvh - 56px`.

| Viewport | Nav / queues / list / context |
|---|---|
| 1280–1439 | Nav64, queue176, list280; context overlay320, không ép chat |
| 1024–1279 | Nav64, queue ẩn (mở dialog), list280; context overlay320 |
| 768–1023 | Nav drawer, queue dialog, list260 + chat; context overlay tối đa360 |
| <768 | Một pane: list → detail; quay lại giữ scroll/filter; context sheet toàn chiều ngang |

Mở overlay có focus trap/Escape/return focus. Desktop docked pane không trap. Thu nhỏ khi đang mở context chuyển thành overlay, không nhảy dữ liệu/selection. Composer textarea 88–200px; khi viewport thấp, timeline co trước; keyboard dùng dynamic viewport và safe-area padding. Không bật resize kéo ở release này.

## Thành phần và content

| Vùng | Thông tin / hành động | State quan trọng |
|---|---|---|
| Inbox sidebar | Tất cả, Của tôi, Chưa phân công, Tạm ẩn; Theo nhóm; Hộp thư đã lưu, + | Count authoritative, unread dot theo principal; không đếm list local |
| List header | Tên queue, tổng/chờ, search tên liên hệ, kênh, bộ lọc, sort | Prefix server/debounce300ms; filter chips, as_of; no matches khác network error |
| Card | Initials, tên, giờ, preview2 dòng, channel, Human/AI, unread, chờ, tags≤2 | Selected/unread độc lập; field denied không fallback lấy payload thô |
| Detail header | Contact, kênh/Page, lifecycle, owner/team, takeover/snooze/close | allowed_actions; close terminal và lý do, pending/unknown không success giả |
| Timeline | Message, internal note, assignment/lifecycle/automation, date | Received ordering, source ACL, preserved anchor, new-message button |
| Composer | Reply / Note, kênh, textarea, snippets, send | Mode riêng, owner revision, max4000, draft memory, IME và pending guards |
| Context + rail | Contact, Qualification, Ownership history; tags | Field ACL, CRM editor/link; một pane; consent explicit; Contact channels cần SRC-035 |

Không customer read tick, live online dot, SLA countdown, media upload, call hoặc AI rewrite khi chưa capability. Mock dùng Messenger (mock), tên giả và nội dung tư vấn phần mềm; không giả provider send đã được kiểm chứng.

## Luồng chính

1. **Chọn và phản hồi:** queue → card → render inbound/mark-read khi visible → kiểm owner/revision → soạn → send → queued → status server. Nếu card rời unread filter vẫn giữ detail + banner. Draft không mất khi poll.
2. **AI sang Human:** card AI → xem owner → explicit Tiếp quản + confirm → refresh assignment/allowed actions → soạn. Không đổi Lead owner; sending có thể hoàn tất sau takeover, không diễn giải là hủy thành công.
3. **Ghi chú nội bộ:** đổi mode → nền vàng/nhãn khóa → draft note riêng → lưu Activity → hiện note có ACL. Chuyển mode không gửi. Quyền note độc lập quyền reply.
4. **Mở Contact:** quick context → “Mở Contact” mở drawer hồ sơ → quay Inbox giữ draft/scroll. Update record xong re-fetch context theo version; không sửa Contact qua Chat DB.
5. **Tạm ẩn:** dialog deadline/timezone + giải thích automation tiếp tục → confirm → card rời queue → detail giữ banner. Inbound/assignment/deadline đánh thức theo contract. Không biến snooze thành pending hoặc close.
6. **Saved Inbox:** chọn filters → preview server → lưu cá nhân/chia sẻ; recipient chỉ duplicate, không ghi đè definition. Hủy/revoke view không grant/revoke quyền Conversation ngầm.
7. **Close:** xem đối tượng/lý do/tác động queued vs sending → confirm đúng revision → read-only. Tin mới sau close tạo Conversation mới; không nút reopen.

## State matrix bắt buộc

| State | Hiển thị / hành động tiếp |
|---|---|
| Initial loading | Skeleton từng pane, không giữ Contact cũ trong detail mới |
| Empty queue | “Chưa có hội thoại”; giải thích nguồn inbox, không CTA gửi mới trên kênh chưa hỗ trợ |
| Empty filter | “Không có hội thoại phù hợp”; Xóa bộ lọc; không xóa saved definition |
| No selection | Empty detail với hướng dẫn chọn card; context không hiện người trước |
| 401 | Khóa mutation, login lại theo native auth; không auto replay |
| 403/404 | Xóa detail/labels/draft không còn quyền; không lộ record tồn tại qua thông báo |
| Field denied | “Nội dung bị giới hạn” khi contract cho phép; không render editable empty |
| Offline/request failed | Banner “Không thể cập nhật”; giữ draft, Retry đúng pane; không gửi khi chưa xác minh |
| Owner/version conflict | “Phân công đã thay đổi”; xem lại rồi mới mở send; không tự takeover |
| Submit pending/lost ACK | Giữ payload/key, chặn double-submit; kiểm tra lại cùng request |
| Delivery unknown | “Chưa xác định kết quả gửi”; xem delivery/reconcile, không auto-resend |
| Closed | Timeline đọc; composer khóa theo baseline; không reopen |
| Snoozed | Hạn/timezone + Đánh thức; cảnh báo AI/Workflow vẫn chạy |
| Source/context unavailable | Lỗi riêng pane, không xóa timeline hoặc kết luận Contact không có dữ liệu |

## API và readiness

Queue/sidebar/read-state, saved inbox, tags/snippets, snooze/activity theo workspace contract (SRC-032/033/034 DONE backend); API read/mutation có authority Chat, source note thuộc CRM. CRM Contact metadata/channels là SRC-035 TODO. Reply/takeover/transition giữ routes, idempotency và revision từ UX-002. Mọi count/query áp viewer ACL; capabilities khác permissions. Identity session native theo SRC-038, không OIDC mới. Frontend không đọc database hoặc gọi provider trực tiếp.

Header/menu chỉ client state trong SRC-036; global CRM search/module Draft có gate riêng ở shell. Không migration/API/event mới trong UX-003. UI release chỉ sau SRC-037; mock không đáp ứng integration acceptance.

## Mock và acceptance

[Mock tương tác](mockups/inbox.html) có queue/card selection, search synthetic, context toggle, Reply/Note drafts, preview send local, mở form nháp Contact/Lead, shell menu và state selector (loading/empty/error/forbidden/owner changed/unknown/closed). Nút nghiệp vụ ngoài subset mở giải thích, không request API. “Gửi thử” chỉ thêm fixture trên trang, không lưu qua reload. Mock context chỉ minh họa Contact; Qualification/history đầy đủ vẫn được quy định ở UX-002, chưa simulate backend.

Acceptance: UX-CHAT-01/02 dùng kích thước/layout mới của tài liệu này; UX-CHAT-03…22 giữ nguyên. Bổ sung UX-APP-01…08 trong shell, UX-G01…09 trong guideline. Cần browser evidence đủ các states, keyboard, responsive, tenant/owner race, lost ACK và real contract trước source DONE. Design review phải có screenshot default desktop/mobile và kiểm các mock interactions đã nêu; full usability/AA/runtime ghi NOT_RUN cho tới có evidence.

Implementation status2026-10-07: SRC-039 đã giao presentation sub-scope trên API hiện có; [evidence](../tracking/details/SRC-039.md) ghi chi tiết phần đã kiểm thử và phần SRC-035/036/037 còn lại. Không suy toàn bộ đặc tả đã triển khai.

Current runtime SRC-041 (superseded target by UX-006 below): API conversation.need_response true = “Cần trả lời” (amber, valid Workflow/Chatflow action from rule or Assist proposal), false = “Đã phản hồi” (green, confirmed sent coverage), null = “Chưa xác định” (neutral). New inbound resets null; notes do not assess it. Closed uses “Đã đóng”. Text accompanies color. [Contract](../contracts/agent-chat-workspace.md) · [Assist and Next action design](agent-assist-response.md). Suggestion update/orchestration integration remains Draft; no fabricated classifier/next action. Assist is suggestion-only; workflow/chatflow owns the authorized write.

UX-006 target list item: use next_action.type as the single suggestion classification, replacing independent need_response. response→“Cần trả lời”; create_lead→“Cần tạo Lead”; create_ticket→“Cần tạo Ticket”; close_chat→“Đề xuất đóng hội thoại”. next_action=null→“Chưa xác định”; unknown future type→“Có gợi ý hành động”. Display text/icon, not color alone. One current suggestion; source/detail in context. Sent/closed status stays separate. Labels never execute actions or imply permission/module availability. [Catalog and compatibility](agent-assist-response.md). Runtime/mock SRC-041 visuals remain historical until PLAN-008/source cutover; UX-006 updates design only.
