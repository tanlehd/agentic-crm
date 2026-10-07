# Nghiên cứu UI/UX — app shell và Inbox

Ngày 2026-10-07, UX-003 / CHG-20261007-04. Phương pháp: desk research, kiểm source và heuristic review. Chưa phỏng vấn hoặc usability test người dùng; các chỉ tiêu ở guideline là mục tiêu cần đo, không phải kết quả nghiên cứu người dùng.

## Nguồn và cách áp dụng

| Nguồn đã đọc | Nhận xét | Quyết định cho CRM |
|---|---|---|
| [Sample người dùng](agent_workspace_chat_layout_sample.png), [UX-002](agent-chat-workspace.md) | Queue → list → conversation → context phù hợp xử lý nhiều hội thoại; rail icon khó thể hiện nhóm nghiệp vụ mới | Giữ anatomy Inbox; thay rail ứng dụng bằng grouped nav có nhãn và header chung |
| [Source workspace](../../apps/web/app/crm/workspace.tsx), [CRM UI contract](../contracts/crm-ui.md) | Shell hiện chọn CRM/Chat/Sales/Admin bằng state; chưa có work tabs hoặc global-search contract | Tách shell navigation khỏi màn hình; không coi chức năng mới đã tồn tại |
| [NN/g — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) (đọc 2026-10-07) | Trạng thái rõ, người dùng kiểm soát hành động và phục hồi lỗi | Hiện queue/send state thật; giữ draft và có đường quay lại; tránh action chỉ có icon |
| [W3C WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) (đọc 2026-10-07) | Chuẩn đánh giá accessibility: tương phản, keyboard, reflow, focus, target, status | Dùng tiêu chí đo được trong guideline; không tự tuyên bố AA từ mock |
| [WAI-ARIA APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) (đọc 2026-10-07) | Tab và panel liên kết; điều hướng bằng bàn phím; focus và selection khác nhau | Work tabs có activation thủ công khi cần tải dữ liệu; điều khiển đóng và khôi phục focus |

Carbon UI shell được thử truy cập nhưng công cụ không tải được URL; không dùng làm bằng chứng. Không sao chép assets hay thông tin người thật từ sample. Chỉ mock synthetic được lưu trong repo.

## Điều chỉnh UX-004 — 2026-10-07

Theo yêu cầu người dùng, bỏ work tab bar dưới header. Các đề xuất work tabs bên dưới là lịch sử UX-003, không áp dụng cho target hiện hành. Contact/create dùng drawer/dialog; main nằm ngay dưới header56.

## Vấn đề → phương án chọn (lịch sử UX-003)

| Vấn đề | Phương án và lý do | Trade-off / cách kiểm |
|---|---|---|
| Cần định hướng CRM + Marketing + Workflow | Nav dọc 184px, nhóm có tiêu đề, Inbox/Contacts/Leads/Deals theo business | Tốn chiều ngang: thu nav 64px trước khi ép chat dưới 480px |
| Dễ rời hội thoại để xem Contact/Lead | Work tabs giữ Inbox cùng record tab; Contact quick view vẫn ở drawer | Cần quản lý draft, dedup record và thu hồi quyền theo tenant |
| Ba loại tìm kiếm dễ nhầm | Header tìm công cụ/đối tượng khi capability có; Inbox ghi rõ “Tìm tên liên hệ” | Global record search cần contract riêng; không giả transcript full-text |
| Nhiều cấp nav gây nhiễu | App nav = feature; Inbox sidebar = saved queue; work tabs = việc đang mở | Kiểm task tìm đúng queue và quay lại chat không cần hướng dẫn |
| Mock dễ tạo kỳ vọng tính năng thật | Label “Bản mẫu” luôn thấy; chỉ simulate; Draft modules giải thích gate | Kiểm các CTA không tạo request hoặc fake persisted success |
| Rủi ro gửi sai khách/note | Tên/kênh/owner sát composer; mode note có nền/nhãn riêng | Zero critical error trong test trước release |

## Giả thuyết cần kiểm

1. Agent nhận biết đang ở tenant, queue, khách nào trong 5 giây với màn default.
2. Agent tìm conversation cần phản hồi và gửi đúng người nhanh hơn shell hiện tại; đo baseline trước, không đặt phần trăm cải thiện giả.
3. Nav label + grouping giúp người mới tìm Contacts/Leads dễ hơn rail không nhãn.
4. Work tabs giảm thao tác quay lại mà không làm thất lạc draft.

Protocol: 5–8 agent/sales/supervisor phù hợp vai trò, synthetic fixtures, task giống nhau giữa baseline và prototype; đổi thứ tự thử để giảm bias. Ghi completion, thời gian, số thao tác, lỗi, câu hỏi và mức dễ dùng 1–7. Không thu transcript thật. Mục tiêu chi tiết và release blockers nằm ở [guideline](guidelines.md).
