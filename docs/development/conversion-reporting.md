# Dashboard chuyển đổi hội thoại → Lead → Won

SRC-086 · 2026-10-17 · [Thiết kế và giới hạn](../contracts/conversion-reporting.md) · [Nghiệm thu](../quality/conversion-reporting-acceptance.md).

## Sử dụng

Mở [dashboard local](http://localhost:18080/?dashboards=1&dashboard=231b1486-4a14-588a-adb9-2dba107dea79) bằng Alpha admin. Dashboard này dùng dữ liệu synthetic được giữ lại, không phải số liệu kinh doanh thật.

Để tạo bản riêng, vào Dashboard → Tạo dashboard → **Chuyển đổi hội thoại → Lead → Won**, chọn nguồn **Chuyển đổi kinh doanh · CRM**, nhập tiền tệ cho báo cáo giá trị won rồi tạo. Template tạo 10 saved reports có thể sửa và tái sử dụng: số phiên, tỷ lệ phiên→Lead, phiên→Won, Lead canonical→Won, số Deal won, giá trị won theo ngày chốt, Page nguồn, nhánh trực tiếp/qua Lead, người nhận đầu và việc cần xem xét.

Mở report KPI → Sửa report → chọn kỳ đo, thời gian theo dõi kết quả và **Mục tiêu KPI** → Chạy preview → Lưu draft. Chỉ đặt mục tiêu khi report có một chỉ số và không nhóm chiều; không tự điền mục tiêu kinh doanh. Kết quả hiển thị actual, chênh lệch và phần trăm đạt mục tiêu. Target 0 không có tỷ lệ attainment. Khi sửa report, dashboard vẫn giữ phiên bản cũ: trong Chỉnh bố cục, chọn nâng phiên bản report, xem preview rồi lưu dashboard. Làm mới dashboard chỉ cập nhật dữ liệu, không tự đổi phiên bản report/catalog.

Danh sách **Việc cần xem xét để chuyển đổi** mở Inbox/Lead/Deal bằng liên kết Mở bản ghi. Tuổi việc tính theo ngày; người quản lý tự thêm bộ lọc tuổi theo chính sách đội. Các hàng là backlog hiện tại: phiên chưa có kết quả/ngữ cảnh liên quan, Lead chưa có Deal, Deal mở, nhu cầu chưa liên kết outcome. Một outcome được liên kết chưa chắc đã won; không suy diễn SLA quá hạn.

## Cách đọc chỉ số

- Phiên→Lead = số phiên có ít nhất một Lead / toàn bộ phiên trong cohort, kể cả phiên chưa có kết quả.
- Phiên→Won bao gồm Deal trực tiếp và Deal qua Lead. Một phiên có thể có cả hai nhánh; không cộng số phiên của hai nhánh thành tổng.
- Lead gốc gồm cả bản đã merge; Lead canonical dùng nhóm đã gộp. Deal vẫn giữ lead_id và nguồn gốc, không chuyển nguồn về phiên follow-up/closing.
- Kỳ đo chọn cohort theo ngày tạo/mở. Horizon chỉ tính subject đủ tuổi, outcome trong H ngày; hiện số chưa đủ tuổi. Không đặt horizon nghĩa là xem kết quả đến hiện tại.
- Giá trị won cộng chính xác từng Deal theo một tiền tệ, không phải tiền thực thu. Báo cáo giá trị template dùng ngày chốt, khác cohort phiên.
- Người nhận đầu chỉ có khi lịch sử ghi nhận opened đầy đủ; dữ liệu cũ không đủ lịch sử hiện trống. Owner hiện tại chỉ dùng cho xử lý công việc.

## Vận hành và kiểm tra

Reporting migration006 mở rộng CHECK của catalog metadata, không thêm bảng/cột nghiệp vụ. Dùng runner chuẩn `node scripts/reporting-db.mjs --test` và `node scripts/reporting-db.mjs`; backup/fingerprint/rerun của lượt triển khai ở evidence. Không sửa migration đã chạy hoặc reset database. CRM giữ version35, Reporting6.

Kiểm tra bằng Node24.21.0 trong `.local/node-v24.21.0-win-x64/node.exe`: `scripts/conversion-reporting-test.mjs`, `scripts/conversion-reporting-storage-test.mjs`, `scripts/conversion-reporting-browser.mjs`. Native test dùng retained native_seed_test và fixture Human Routing; browser dùng local Alpha admin/mock ingress. Các script giữ synthetic fixtures, khôi phục quyền tạm và gỡ target synthetic khỏi report hiện hành sau kiểm tra. Không chạy với production.

Nguồn cần report.run và read/all trên Conversation, Contact, Lead, Deal, cùng quyền read/filter cho field; export cần quyền riêng. Thiếu quyền thì nguồn không khả dụng, không trả tỷ lệ 0. Mỗi query đọc snapshot hiện tại qua owning-module ports; không SQL xuyên service.

Giới hạn: rolling1…365ngày, horizon1…90ngày, tối đa5000source facts (gồm metadata/link),10000projection rows. Vượt giới hạn trả lỗi, không cắt dữ liệu để tính tỷ lệ. Các widget có thời điểm đọc riêng. Chưa có lịch sử trạng thái tái dựng, cảnh báo mục tiêu tự động, generic custom-object ingestion hoặc connected durable runs. Operations workload dashboard vẫn là template riêng dùng chung core.
