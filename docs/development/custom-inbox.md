# Hộp thư tùy biến trong Agent Chat Workspace

SRC-083 · [Contract và phạm vi](../contracts/custom-inbox-builder.md) · [Evidence](../tracking/details/SRC-083.md).

Mở [Inbox local](http://localhost:18080/). Trong sidebar **Hộp thư tùy biến**, bấm **+**. Trên điện thoại, bấm **Chọn hàng chờ** để mở sidebar. Đặt tên, chọn phạm vi/trạng thái/kênh/Page/nhãn/chưa đọc/tạm ẩn và sắp xếp, bấm **Xem trước kết quả**, rồi **Lưu hộp thư**. Tạo từ danh sách hiện tại kế thừa các bộ lọc đang chọn; tên tìm kiếm không được lưu.

Các điều kiện khác nhau kết hợp VÀ. Các trạng thái được chọn kết hợp HOẶC; tất cả nhãn được chọn phải cùng khớp. Của người đang xem/chưa đọc được tính theo từng agent. Sắp xếp khách chờ lâu không tự đổi phân công. Chưa có người phụ trách khác chưa đọc hoặc chưa phản hồi.

Dấu **⋯** cạnh hộp thư mở thiết kế. **Lưu thay đổi** sửa định nghĩa có quyền; **Lưu thành hộp thư mới** tạo bản riêng, không sao chép quyền chia sẻ. **Chia sẻ** chọn các thành viên/nhóm đang hoạt động, **Chuyển về cá nhân** xóa share set. Người nhận chỉ được đọc định nghĩa và các hội thoại họ vốn có quyền xem. **Lưu trữ** bỏ hộp thư khỏi danh sách, giữ Conversation nguyên vẹn. Các nhóm Tất cả/Của tôi/Được chia sẻ giúp tìm định nghĩa.

Khi phiên bản đổi, bản nhập được giữ; đóng bản nhập và tải lại hoặc lưu thành bản mới. Nếu mất phản hồi sau khi gửi lệnh, form khóa thay đổi và **Kiểm tra lại yêu cầu** gửi lại đúng payload/idempotency key. Không tự tạo bản khác vì chưa nhận được ACK. Filter preview vô hiệu khi đổi điều kiện, không hiển thị count cũ thành kết quả mới.

Quyền: chat seat/capability và chat_inbox.manage own/all cho tạo/quản lý; chat_inbox.share cho chia sẻ định nghĩa mình sở hữu. Không tự thêm quyền cho user/role. Người được chia sẻ có chat capability vẫn đọc được định nghĩa dù không có quyền tạo; danh sách Conversation luôn kiểm ACL riêng. Option discovery chỉ trả tên/ID cần thiết từ Identity; không dùng màn admin hoặc nhập UUID thủ công.

Không migration. `chat_inbox`/`chat_inbox_share` schema21 đã có. API mới GET `/api/v1/chat-workspace/inbox-options`; các API tạo/sửa/share/archive/query giữ nguyên v1. Chạy API mới theo service manager, Web dev cập nhật source. Bản build kiểm tra dùng NEXT_BUILD_DIR riêng và khôi phục next-env/tsconfig nguyên bản, không tác động cache dev.

Kiểm thử giữ synthetic dữ liệu:

- `node scripts/custom-inbox-native-test.mjs`: native_identity_test trên loopback13306; tái sử dụng private fixture, khôi phục quyền thử nghiệm, không reset/migrate DB.
- `node scripts/custom-inbox-browser.mjs`: local Alpha admin/chat_anna, mock Messenger fixture riêng và tag CIB DEMO; lưu giữ các inbox/record, archive chỉ các inbox QA theo tên cố định ở đầu rerun. Không cấu hình provider thật hoặc gửi tin ra ngoài.

Chỉ predicate v1 hiện có: chưa có custom/related properties, nested AND/OR, filter “chưa phản hồi” độc lập hoặc columns builder. Cách sắp xếp chờ phản hồi đã có. Generalized Queue/WorkItem/routing vẫn gate khác; full SRC-036/037 không được coi hoàn tất bởi builder này.
