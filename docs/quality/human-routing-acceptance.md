# Biên bản nghiệm thu — Conversation routing / workload

**Sau SRC-085:** Kết quả hiệu suất hiện xem trong [Dashboard/Report Builder chung](operations-reporting-acceptance.md). Ảnh tab Hiệu suất bên dưới ghi nhận phiên bản SRC-084, được giữ làm lịch sử nghiệm thu.

SRC-084 · 2026-10-17 · [Contract HR-01…10](../contracts/human-routing.md) · [Bộ ảnh nghiệm thu](human-routing-gallery.html) · [Hướng dẫn](../development/human-routing.md).

Kịch bản người dùng yêu cầu: admin gán kỹ năng nhận hội thoại cho team → agent nhận và tư vấn → close → nhận việc tiếp khi workload được giải phóng → admin theo dõi/phân lại → báo cáo ghi nhận hiệu suất.

Môi trường Windows, Node24.21.0, Next.js/NestJS local, MySQL/Redis giữ dữ liệu, Edge headless và native CRM login. Hai nhân viên synthetic thuộc team Routing Demo, mỗi người capacity1, ba hội thoại từ kênh mock riêng. Đây là thao tác ứng dụng/API thật và mock transport có chủ đích; không phải ảnh preview hoặc xác nhận tích hợp provider thật.

| Bước / AC | Thao tác và kết quả đã xác minh | Ảnh |
|---|---|---|
| HR-01 | Admin tạo kỹ năng, gán team, lưu profile và queue từ UI; reload/API giữ cấu hình, phiên bản và references | [01](assets/human-routing/01-admin-team-skills-capacity.png) |
| HR-02 | Ba inbound qua intake/worker: hai agent mỗi người1việc, việc thứ3 chờ với lý do tất cả agent đầy tải | [02](assets/human-routing/02-admin-workload-waitlist.png) |
| HR-03 nhận | Agent login riêng thấy Workload1/1, thông báo được phân công và mở hội thoại được phép trả lời | [03](assets/human-routing/03-agent-new-assignment.png) |
| HR-03 tư vấn | Nhập/gửi phản hồi bằng composer; kiểm message đạt sent trên mock transport trước close | [04](assets/human-routing/04-agent-consultation-sent.png) |
| HR-03 close | Bấm Đóng Thread; phiên cũ closed, worker tự phân việc chờ cho cùng agent. Không gọi API dispatch trong browser test | [05](assets/human-routing/05-agent-close-next-assignment.png) |
| HR-03 nhận tiếp | Agent mở việc tiếp qua thông báo, composer có quyền gửi; workload giữ1/1 vì slot vừa giải phóng đã được dùng lại | [06](assets/human-routing/06-agent-next-conversation.png) |
| HR-05 | Phân sang agent đầy tải bị409, owner cũ giữ nguyên. Admin tăng capacity rồi chọn agent đích và xác nhận qua UI | [07](assets/human-routing/07-admin-reroute-review.png), [08](assets/human-routing/08-admin-rerouted-workload.png) |
| HR-06 | Report ghi completion cho agent đóng, transfer riêng, replies từ Chat actor và thời gian giữ việc. Đối chiếu API/ledger | [09](assets/human-routing/09-performance-report.png) |
| HR-09 | Desktop1600×1100 và mobile390×844 không tràn ngang trang; bảng report cuộn ngang trong vùng riêng | [10](assets/human-routing/10-mobile-performance.png) |

## Kiểm thử bổ sung

12 nhóm MySQL/native application PASS: forward35 + repeat/preservation/tenant columns; team skill CAS/replay/config; concurrent dispatch/cap1; reply/pending/**snooze** giữ tải rồi close-event phân tiếp; transfer đầy tải rollback; hiệu suất; tenant/agent admin boundaries và own workload; required skills/pause/resume; interruption trước commit rollback rồi instance mới retry một allocation; availability/field-denied candidate; manual cap và service actor revoke; chat seat và field deny của own workload. EXPLAIN dùng `ix_rha_load` và `ix_rqe_wait` trên fixture. Không benchmark production.

Browser còn kiểm native CSRF, missing If-Match, strict unknown field, agent bị403 khi đọc admin snapshot; response theo strict schema. Mất ACK sau commit được mô phỏng: UI khóa draft, retry đúng payload/key, config version tăng đúng1lần. Không dùng automatic dispatch helper trong journey browser.

393 unit tests/56files PASS; backend TypeScript/build PASS; Web TypeScript và isolated production Next build PASS.11nhóm regression Thread/Conversation PASS, gồm lịch sử owner/team, late reply actor attribution, close race và phiên mới.36JSON schemas/contract generation checks/AST lint PASS; final counts trong [evidence](../tracking/details/SRC-084.md).

Forward local34→35 thêm9bảng,104bảng cũ fingerprint không đổi, repeat migrate0; backup private trong artifacts/human-routing. API/worker khởi động lại và dữ liệu/queue/history giữ qua restart. Không reset DB, không commit/push/deploy. Test interruption là rollback trước commit + khởi tạo engine mới; không tuyên bố đã kiểm distributed network saga hoặc kill-process ở mọi instruction boundary.

## Bằng chứng lưu

Ảnh bản cuối và `browser.json`, `mysql.json`, `upgrade.json` được sao chép vào `docs/quality/assets/human-routing/`; gallery liên kết từng ảnh. Backup SQL và failure screenshots/log của lần đầu giữ trong ignored artifacts, không đưa secret/account hash vào tài liệu. Lần browser đầu phát hiện label select chưa có accessible name chính xác; đã thêm aria-label rồi chạy lại đầy đủ. Rà ảnh phát hiện header mobile kế thừa chiều cao cố định; đã sửa và chụp lại.

Các tổng trong ảnh là30ngày cộng dồn từ fixture được tái sử dụng; không suy mỗi lần chạy bắt đầu bằng0. Thời gian close→gán tiếp của lần chạy cuối nằm trong browser.json; không phải SLO hay polling interval của vendor.
