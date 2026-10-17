# Phân bổ hội thoại và workload Human

**Cập nhật SRC-085:** Tab Hiệu suất chuyển sang [Dashboard vận hành](operations-reporting.md), dùng Report Builder chung. Màn hình Routing giữ workload, cấu hình và phân lại; dữ liệu API hiệu suất còn để tương thích/đối soát. Các hướng dẫn tab/ảnh cũ bên dưới là evidence SRC-084.

SRC-084 · 2026-10-17 · [Contract](../contracts/human-routing.md) · [Biên bản nghiệm thu](../quality/human-routing-acceptance.md) · [Ảnh](../quality/human-routing-gallery.html).

## Quản trị viên

Mở [Phân bổ hội thoại local](http://localhost:18080/?screen=routing), chọn **Cấu hình**.

1. Tạo kỹ năng có mã dùng chung, ví dụ `product.water_filter` và tên “Tư vấn máy lọc nước”.
2. Đánh dấu kỹ năng trên team rồi lưu. Thành viên hiện tại của team được dùng kỹ năng này khi định tuyến; vẫn phải có chat seat, quyền đọc/trả lời và availability phù hợp.
3. Chọn agent, capacity và bật nhận tự động. Mỗi phiên đang mở do agent xử lý chiếm1 slot, kể cả pending hoặc snooze. Capacity0 hoặc tắt nhận chặn việc mới, không tước việc đang giữ.
4. Tạo queue: team đích, kênh nguồn hoặc mọi kênh, kỹ năng cần có và mức ưu tiên (số nhỏ trước). Bật queue để nhận việc. Mỗi lần lưu tạo phiên bản mới; backlog giữ cấu hình lúc vào hàng chờ. Muốn áp cấu hình mới cho một việc, dùng Phân lại.

Tab **Workload & hàng chờ** hiển thị tải từng agent, số agent còn slot, công việc đang xử lý/chờ và lý do chờ. **Phân lại** chọn queue và agent cụ thể hoặc để engine tự chọn. Khi agent đích đầy tải/thiếu quyền/không đủ điều kiện, yêu cầu thất bại và owner cũ được giữ nguyên. Không có override capacity ngầm.

Quyền: `routing.read/manage:all`, configure và conversation.read/assign all. Tenant admin có các quyền này intrinsically. Việc bật queue tạo service actor Identity riêng với conversation.read/assign; revoke actor hoặc role chặn dispatch mới, không tự cấp lại quyền.

## Nhân viên

Trong **Inbox**, vùng Workload hiển thị tải và hội thoại mới được phân công. Bấm **Mở** để tư vấn bằng composer hiện có. Sau khi giải quyết, bấm **Đóng Thread** trong ngữ cảnh hội thoại để kết thúc phiên hiện tại. Engine nhận sự kiện đóng, giải phóng tải rồi phân việc đủ điều kiện tiếp theo từ hàng chờ. Đóng tab trình duyệt không giải phóng workload.

Thông báo hiện tại dùng các allocation được xác nhận và trạng thái ẩn trong phiên giao diện; chưa có notification center/read receipt lưu qua logout. Agent chỉ thấy workload/công việc của mình trong phạm vi quyền hiện tại. Không cần tenant tự dựng Flow Close→Pull; Workflow/manual/takeover dùng cùng capacity guard khi gán Human.

## Hiệu suất

Tab **Hiệu suất** đọc dữ liệu vận hành thật của30ngày gần nhất: được gán, hoàn tất, chuyển giao, phản hồi đã gửi yêu cầu, thời gian giữ việc trung bình của các lượt hoàn tất. Queue wait trung bình ở hàng chỉ số trên cùng. “Hoàn tất” chỉ ghi cho allocation còn active lúc phiên đóng; transfer không tạo completion thứ hai. Thời gian gồm chờ khách/pending/snooze, không phải thời gian thao tác bàn phím. Phản hồi là submission đã nhận, không tự coi là delivery thành công.

Báo cáo này gắn trực tiếp với Routing ledger và Chat contribution; không phải một datasource đã tích hợp vào generic Report Builder. Các phiên synthetic được giữ qua nhiều lần nghiệm thu nên tổng30ngày cộng dồn, không reset về0.

## Vận hành và giới hạn

Worker hiện dùng event consumer trên tick1s và recovery sweep30s. Snapshot UI5s không điều khiển phân công. Thời gian đo local trong biên bản là quan sát, không cam kết SLO. Admin có thể pause queue; backlog vẫn giữ, active work vẫn xử lý/close. Giảm capacity dưới tải hiện tại chỉ chặn nhận mới.

Scope triển khai: team skills, least-loaded, kênh nguồn và priority. Page/ad/post/custom-field AST, visual routing policy builder, overflow, offer/accept, weighted capacity và distributed service extraction vẫn ngoài slice này. Source mapping R1 dùng connection đang hỗ trợ của hệ thống; demo dùng mock_messenger, không gửi tin thật ra provider.

Forward35 thêm9bảng trong monolith, target owner crm_routing. Không sửa lịch sử migration. Local upgrade có backup, dừng API/worker, kiểm preservation, cấp DML đúng bảng rồi restart. Không chạy script upgrade vào production hoặc reset DB. Role read-only catalog/version/attempt chỉ được SELECT/INSERT; mutable ledger/config thêm UPDATE, không purge runtime.

Lệnh từ workspace với Node24.21.0: `node scripts/human-routing-local-upgrade.mjs` (local opt-in upgrade); `node scripts/human-routing-test.mjs` (retained native_seed_test); `node scripts/human-routing-browser.mjs` (actual local native sessions/Edge). Fixture dành riêng `Routing Demo · Tư vấn`, `routing_lan`, `routing_minh`, mock channel `synthetic-human-routing-page`; credentials nằm trong private .local, không trong tài liệu/ảnh/log. Các lần chạy chỉ close phiên cũ của fixture này, không reset dữ liệu chung.
