# Tiêu chí và UX guidelines

Status: Ready — quy chuẩn thiết kế UX, UX-003, 2026-10-07. Áp dụng mọi màn mới/redesign. Runtime accessibility/usability chưa nghiệm thu.

## 1. Nguyên tắc sản phẩm

1. **Rõ nơi làm việc:** luôn biết workspace, feature, object đang mở. App header/nav dùng chung; không nhân bản user/tenant controls bên trong feature.
2. **Ưu tiên công việc chính:** một primary action trong mỗi vùng tác vụ; ở composer là Gửi/Lưu ghi chú, ở form là Lưu. Không biến dashboard KPI thành phần bắt buộc phía trên Inbox.
3. **Ngữ cảnh liên tục:** đổi pane không mất draft, timeline anchor hoặc filter; đóng form có thay đổi phải cho chọn ở lại/bỏ nháp.
4. **Trạng thái trung thực:** unknown khác failed; queued khác sent; count chưa có dữ liệu khác 0; chờ phản hồi khác SLA.
5. **Quyền là ranh giới:** field bị cấm không xuất hiện trong tooltip/search/tab label/count; navigation không cấp quyền. Mất quyền phải purge dữ liệu, backend kiểm lại từng command.
6. **Human/AI minh bạch:** badge có chữ, owner riêng cho từng object; mở chat không tự takeover; AI không được trình bày như đồng nghiệp Human.
7. **Progressive disclosure:** tác vụ thường dùng nhìn thấy; cấu hình ít dùng ở menu/drawer; không giấu hành động phục hồi lỗi.
8. **Không gây mất dữ liệu:** trạng thái submit, retry và xung đột có đường xử lý; không tự gửi lại unknown hoặc overwrite phiên bản mới.

## 2. Design tokens

| Token | Giá trị | Cách dùng |
|---|---|---|
| surface / canvas / subtle | #FFFFFF / #F5F7FA / #F8FAFC | Vùng làm việc / nền shell / sidebar |
| text / muted | #172B4D / #526176 | Nội dung / metadata; không dùng opacity giảm contrast |
| primary / selected | #2457D6 / #EDF3FF | CTA, focus / selection có thêm border/chỉ dấu |
| line / input-line | #DCE3ED / #7A889B | Separator trang trí / boundary control cần nhận biết |
| success | #166534 trên #ECFDF3 | Hoàn tất, luôn kèm chữ/icon |
| warning / note | #854D0E trên #FFF7DD | Cảnh báo, ghi chú nội bộ |
| danger | #B42318 trên #FEF3F2 | Lỗi hoặc xác nhận destructive |
| AI | #6842A6 trên #F4EFFF | Badge AI, không dùng làm primary toàn app |
| type | System sans; 14/20 body, 12/16 meta, 16/24 region, 20/28 page | Nội dung hội thoại 14–16px; không body 10px để nhét layout |
| spacing | 4, 8, 12, 16, 24, 32px | Padding/gap theo bội 4 |
| radius | 6 control, 8 card, 12 composer, tròn avatar | Border 1px; shadow chỉ overlay |
| target | ≥36px desktop; ≥44px touch | Icon 18–20px; khoảng cách đủ tránh bấm nhầm |
| layers | base 0, sticky 10, overlay 30, dialog 50, toast 60 | Toast không đè vùng nhập hoặc CTA |

Màu là token khởi điểm phải đo khi dùng theo cặp thật. Không dùng màu hoặc hover làm tín hiệu duy nhất; trạng thái chọn có aria-current/selected, badge có text.

## 3. Patterns chung

- **Layout:** một page title theo feature; header/nav cố định trong grid viewport, từng pane cuộn riêng; `min-width:0`, `min-height:0`, `100dvh`. Không cuộn toàn trang để tìm composer.
- **Form:** label luôn hiện; required giải thích trước submit; lỗi tại field + summary cho form dài; submit pending chống double-click, thành công chỉ sau ACK. Không clear khi lỗi.
- **Dialog:** tiêu đề mô tả đối tượng/hành động, nút xác nhận có động từ; Cancel rõ; focus trap, Escape, trả focus. Không bọc mọi thao tác nhẹ bằng confirm; takeover/close có tác động phải giải thích.
- **Table/list:** phân biệt loading, empty dữ liệu, empty filter, forbidden, lỗi. Dữ liệu server paging không suy total từ số hàng tải. Selection không chỉ dùng màu.
- **Search:** label đúng phạm vi, clear, pending, no matches, server error; hủy response cũ; không hứa khả năng tìm nội dung chưa có contract.
- **Time:** hiển thị tương đối ngắn kèm thời gian đầy đủ qua focus/detail; timezone workspace trong picker deadline. Không dùng màu đỏ vì khách chờ lâu khi chưa có SLA policy.
- **Feedback:** inline cho lỗi bền vững; toast chỉ xác nhận nhẹ; screen reader live region không đọc lại transcript sau poll.
- **Copy:** tiếng Việt cho tác vụ, thuật ngữ nav ổn định theo bảng shell. “Ghi chú nội bộ — không gửi cho khách”; “Chưa xác định kết quả gửi”; “Không còn trong bộ lọc”. Không lộ stack trace/provider secret.
- **Draft:** chỉ trong bộ nhớ theo tenant/object/mode; không lưu nội dung CRM trong localStorage, URL hay analytics. Reload/close cảnh báo best effort; không cam kết khôi phục sau crash.
- **Disabled vs hidden:** không có quyền thì ẩn action từ đầu; action tạm chưa khả dụng thì hiện lý do. Module chưa có chỉ có nhãn “Sắp có” trong IA/mock; production ẩn hoặc capability-gate theo shell.

## 4. Accessibility và responsive gates

Target WCAG 2.2 AA: text thường ≥4.5:1, text lớn ≥3:1, control/focus có ý nghĩa ≥3:1; keyboard complete, focus không bị header che, không trap ngoài dialog. Target-size AA có ngưỡng 24px và ngoại lệ; nội bộ dùng 36/44px cao hơn ngưỡng tối thiểu, không tuyên bố toàn AA chỉ từ target-size.

Skip link vào main; landmark header/nav/main/aside có nhãn riêng. Dialog/sheet có focus trap và trả focus; list dùng buttons/links có accessible name, không role=listbox nếu chứa nhiều action. Tooltip có thể mở bằng focus; nội dung thiết yếu phải truy cập được trên touch. Keyboard: Tab/Shift+Tab theo visual flow; Escape đóng overlay; Ctrl/Cmd+K search khi có; Enter xuống dòng composer, Ctrl/Cmd+Enter gửi và bỏ qua IME composition.

Kiểm tại 1440×900, 1280×800, 1024×768, 768×1024, 390×844; thêm 320px CSS width (reflow, tương đương 1280 ở 400%) và browser zoom 200%. Header/nav collapse theo chiều rộng hữu dụng, không riêng user-agent. Virtual keyboard, landscape, text tăng và reduced-motion cần manual check khi build. Không toàn-page horizontal scroll.

## 5. Tiêu chí nghiệm thu đo được

| ID | Tiêu chí | Cách đo / ngưỡng mục tiêu |
|---|---|---|
| UX-G01 | Định hướng | 4/5 người thử nhận biết workspace/feature/contact trong 5 giây |
| UX-G02 | Hiệu quả Inbox | ≥90% task hoàn thành không trợ giúp; báo median/p90 thời gian so baseline |
| UX-G03 | An toàn | 0 gửi sai khách, 0 note ra ngoài, 0 leak tenant, 0 tự gửi lại unknown |
| UX-G04 | Liên tục | đổi màn/pane/quay lại giữ draft/filter/anchor trong 100% scripted cases |
| UX-G05 | Dễ dùng | Median SEQ ≥5/7 cho tìm queue, reply, note, takeover và mở Contact |
| UX-G06 | Accessibility | Keyboard end-to-end + contrast thực đo + screen reader kiểm focus/status; không critical issue |
| UX-G07 | Responsive | Không tràn trang, composer truy cập được ở mọi viewport/zoom đã nêu |
| UX-G08 | Phản hồi | Control có feedback ngay; pending rõ nếu >300ms; request chậm/lỗi không giữ success cũ |
| UX-G09 | Tài liệu | Mỗi màn có ID/spec/mock/state/API/AC và evidence trước DONE |

Các ngưỡng usability là mục tiêu đề xuất nội bộ, chưa đạt bằng chứng. Lỗi G03, không keyboard-accessible hoặc mất draft là blocker bất kể điểm trung bình. Mỗi lần review ghi severity 0 cosmetic / 1 minor / 2 major / 3 blocker, owner, fix và retest.
