# Dashboard vận hành hội thoại

SRC-085 · [Contract và data dictionary](../contracts/operations-reporting.md) · [Nghiệm thu](../quality/operations-reporting-acceptance.md).

1. Đăng nhập local bằng quản trị viên có quyền Reporting và nguồn Routing/Conversation đầy đủ. Mở **Dashboard → Tạo dashboard → Vận hành hội thoại**.
2. Chọn nguồn **Vận hành hội thoại · CRM**, chọn report cần dùng và tạo dashboard. Bảy report được lưu độc lập; template gồm workload/capacity, hàng chờ, hoàn tất/chuyển giao, thời gian xử lý, thời gian chờ, phản hồi, phân công theo ngày.
3. Bấm **Làm mới dashboard** để lấy dữ liệu mới. Mỗi widget hiển thị thời điểm quan sát. Engine phân việc tự chạy khi close giải phóng tải; dashboard cập nhật khi người xem làm mới, không tự polling.
4. **Mở report → Sửa report** để chọn model, thuộc tính nhóm/lọc, phép tổng hợp, biểu đồ và kỳ 1/7/14/30 ngày. Tổng và tỷ lệ tính lại ở executor chung. Saved report sửa thành version mới; widget cũ giữ version đến khi chủ động nâng cấp.
5. **Chỉnh bố cục**, thêm/bỏ/reorder widget rồi lưu. Thêm cùng saved report vào dashboard khác để tái sử dụng. CSV cần quyền export riêng.
6. Từ Routing chọn **Mở Dashboards** để phân tích; cấu hình kỹ năng/team/capacity, hàng chờ và phân lại vẫn tại Routing.

## Cách đọc chỉ số

Workload là số lượt đang giữ hiện tại; pending/snooze chiếm tải. Capacity là cấu hình, không đồng nghĩa agent sẵn sàng. Hoàn tất và chuyển giao là hai kết quả khác nhau. Handling là thời gian giữ việc của lượt hoàn tất, gồm cả chờ khách. Wait chỉ tính lượt đã được phân công; tuổi chờ hiện tại nằm ở report hàng chờ. Phản hồi đếm submission, không suy delivery/read. Team tại assignment/reply là lịch sử; tên agent và queue team là metadata hiện tại.

## Vận hành kỹ thuật

CRM35; Reporting5. Forward005 giữ mock generation FK, thêm report_connected_catalog và dual pin; migration/operator tách runtime SELECT/INSERT. Không sửa001…004. API3001, worker3002, Web18080, Reporting3004, MySQL13306, Redis16379, monitor3020. Backup private và fingerprint dưới artifacts/operations-reporting; không reset DB.

Producer BFF xác thực tenant/session/current source grants rồi ký envelope. Reporting chỉ đọc snapshot bounded được cấp, không đọc DB Routing/Chat. Snapshot limit5000 tổng rows, tối đa30ngày; lỗi quyền/nguồn/giới hạn trả lỗi, không giả số0. Saved definitions là draft chưa chứng nhận; mọi query vẫn compile/authorize lại. Nguồn mock tiếp tục pin immutable generation riêng.

Giới hạn: dữ liệu nghiệm thu local synthetic qua mock_messenger; không claim provider production. Chưa có ingestion tùy ý cho mọi custom object, lịch sử workload theo thời điểm, auto refresh hoặc durable connected runs. Catalog release mới cần nâng pin rõ ràng.

Chạy lại kiểm thử bằng Node24 đã ghim: scripts/operations-reporting-test.mjs (retained test tenant), scripts/operations-reporting-storage-test.mjs (rollback constraint checks), scripts/operations-reporting-browser.mjs (local synthetic; cần fixture Routing đã cấu hình). Browser giữ dashboard/reports/conversation evidence qua các lần chạy; không xóa dữ liệu.
