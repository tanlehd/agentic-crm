# Cấu hình trang chi tiết và preview bản ghi

SRC-080 · 2026-10-16. [Đặc tả](../contracts/record-pages.md) · [UX](../ux/record-pages.md) · [Evidence](../tracking/details/SRC-080.md).

1. Mở [Object & Properties local](http://localhost:18080/?screen=schema), chọn đối tượng rồi chọn **Record detail page** hoặc **Record preview page**.
2. Mở **Default view**, hoặc **Tạo team view**: đặt tên, chọn team và thứ tự ưu tiên. Một team chỉ được gán một view cho mỗi đối tượng/mỗi loại trang. Người xem thuộc nhiều team dùng view có số ưu tiên nhỏ nhất, cùng số thì chọn theo mã view cố định. Người chưa có team view phù hợp dùng Default.
3. Detail có cột trái, các tab nội dung và cột phải. Preview có một cột. Nút `+` mở thư viện card; chọn Property list, Activities hoặc Association card theo nguồn dữ liệu hiện có.
4. Chỉnh tên card, thuộc tính, thứ tự, vị trí, liên kết và số bản ghi. Card Leads/Deals của Contact hỗ trợ bộ lọc bằng và sắp xếp theo metadata. Chọn bản ghi mẫu để xem dữ liệu thật trong inspector. Kéo card hoặc dùng nút lên/xuống/chọn vị trí.
5. **Áp dụng card** cập nhật bản nháp. **Lưu** ghi cả view; **Lưu & thoát** quay lại thư viện. Hoàn tác/làm lại chưa ghi database. Xung đột phiên bản giữ bản nháp và cho đóng/nạp lại rõ ràng.

Mở một record từ CRM dùng detail; **Xem nhanh** dùng preview. Contact preview hiển thị trong sidebar Inbox; **Mở Contact** mở detail. Các thao tác Thread, phiên hội thoại, phân loại và Customer 360 vẫn nằm trong phần nghiệp vụ riêng. Quyền xem record/trường và quyền cập nhật tiếp tục do API kiểm tra. View theo team chỉ quyết định cách trình bày.

Biểu mẫu tạo record và saved list view cũ vẫn ở **Thiết lập → Biểu mẫu tạo & danh sách**. Thread/Conversation/Ticket giữ màn hình nghiệp vụ riêng, chưa sử dụng page builder này. Không có card AI, file đính kèm hay Ticket giả lập.

## Vận hành và kiểm chứng

Forward migration32 chỉ tạo `record_page_view` và `record_page_team`; không sửa migration cũ hay record nghiệp vụ. Cả hai bảng có tenant_id NOT NULL, composite tenant keys và quyền runtime SELECT/INSERT/UPDATE/DELETE. Identity team là logical reference qua application port trong baseline monolith; extraction vẫn cần API của Identity. [OpenAPI](../contracts/record-pages.openapi.json) và ba JSON schema sinh từ `scripts/generate-record-pages-contracts.mjs`.

Local upgrade: build contracts/backend trước, chạy `node scripts/record-pages-local-upgrade.mjs`. Script xác minh development/local, dừng managed API/worker, backup riêng trong ignored artifacts, fingerprint tất cả bảng cũ, migration + repeat0, cấp quyền hai bảng và khởi động lại writers. Không chạy reset database/volume. Nếu lỗi trước khi mở DB, kiểm tra service monitor và khởi động lại các writer trước đó; không giả định script đã phục hồi khi chưa thấy readiness.

Native verification dùng retained `native_identity_test`, temporary test rights được phục hồi: `node scripts/record-pages-native-test.mjs`. Browser verification dùng native Alpha và synthetic object đã giữ lại từ Object Platform: `node scripts/record-pages-browser.mjs`; thay Contact preview tạm thời rồi phục hồi layout cũ. Chạy tuần tự với các native tests dùng chung fixture. Không đưa credentials, backup SQL hay dữ liệu riêng vào Git.

Giới hạn có chủ đích: max100 persisted views mỗi object/surface;20teams/view;30cards/page;6tabs;50property fields/card;5association fields/card. Hoạt động lấy tối đa100ứng viên liên quan, trả tối đa20bản ghi được phép đọc, vượt giới hạn báo lỗi. Generic associations dùng phân trang liên kết100 và target read riêng, có thể có trang không có liên kết phù hợp; không hiển thị tổng không được phép đọc. Sample picker lấy20record đầu theo API hiện có. Các lifecycle/reporting/workflow còn lại theo tracker.
