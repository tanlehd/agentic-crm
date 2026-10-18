# Funnel theo stage

SRC-087 · 2026-10-18. Report Builder có chart **Funnel stage** và template **Funnel theo stage**, dùng sự kiện vào/ra stage của Conversation, Lead và Deal. [Contract](../contracts/stage-funnel-reporting.md) · [Nghiệm thu](../quality/stage-funnel-reporting-acceptance.md).

## Sử dụng

1. Mở [Dashboards local](http://localhost:18080/?dashboards=1), chọn **Tạo dashboard → Funnel theo stage**.
2. Chọn nguồn **Tiến trình stage · CRM**. Template tạo sáu saved reports: funnel và bảng vào/ra, thời gian cho mỗi đối tượng.
3. Bấm **Làm mới dashboard** để chạy. Widget giữ phiên bản report/catalog đã chọn; sửa report không tự nâng phiên bản widget.
4. Mở report → **Sửa report** để chọn process version, các stage bắt buộc và thứ tự, cách chọn kỳ, 1…365 ngày gần nhất, owner/team/current stage hoặc record ID. Chạy preview, lưu draft rồi dùng lại trên dashboard.
5. Mở số lượng ở từng bước để xem danh sách ID và đi tới bản ghi CRM; trang đích kiểm tra quyền hiện tại. CSV xuất số chính xác theo cùng định nghĩa.

## Đọc kết quả

Funnel đếm một record cho mỗi chuỗi bước đã đi qua theo đúng thứ tự. Conversation đếm từng episode; Lead/Deal dùng ID gốc. Ví dụ A→B→A→C vẫn đạt A/B/C một lần, trong khi A có hai lượt vào. A→C không đạt C trong funnel bắt buộc A/B/C; có thể bỏ B khỏi cấu hình nếu muốn đo A→C.

**Event window** yêu cầu mọi bước khớp nằm trong [from,to). **Entry cohort** nhận record vào bước đầu trong kỳ, theo dõi các bước kế đến thời điểm quan sát hiện tại. Bản local dùng cửa sổ rolling kết thúc ở hiện tại nên hai chế độ có thể cho cùng số; chưa có UI chọn cutoff lịch sử hoặc horizon.

Bảng có số đã qua, tỷ lệ từ bước trước/từ đầu, chưa qua bước kế, lượt vào/ra, thời gian visit hoàn tất trung bình và tuổi stage đang mở trung bình (giây). Entry trước kỳ có thể ghép với exit trong kỳ để đo visit hoàn tất. Won/lost/disqualified không có tuổi đang mở; Conversation đã đóng cũng không còn ở nhóm đang mở. Không cộng các stage để ra tổng record.

Lịch sử **đầy đủ / một phần / chưa có** luôn được công bố. Chỉ lịch sử đầy đủ, chuỗi hợp lệ được đưa vào mẫu số conversion. Lượt vào/ra có thể dùng chuyển trạng thái quan sát được của dữ liệu một phần. Lead/Deal cũ không được dựng lịch sử giả từ trạng thái hiện tại. “Ra stage” không đồng nghĩa lost; “chưa qua bước kế” là pending tại thời điểm quan sát.

## Vận hành và giới hạn

CRM forward36 thêm `sales_stage_event`; Reporting forward007 cho phép adapter `native_stage_v1`. Áp dụng migration trước khi chạy binary mới. Local nâng cấp có backup và so sánh dữ liệu cũ bằng `node scripts/stage-funnel-local-upgrade.mjs`; không dùng để reset. Reporting dùng migration runner hiện có. Native provisioning giữ quyền Sales ledger SELECT/INSERT; UPDATE/DELETE bị cấm. Không downgrade binary ghi Sales sau cutover.

Nguồn là snapshot hiện tại qua owner ports trong monolith. Quyền hiện tại cần read-all Conversation/Contact/Lead/Deal và quyền field read/filter; CSV cần export. Không có mock fallback khi nguồn stage bị từ chối. Không lưu business facts ở database Reporting; chỉ definition/catalog/widget metadata.

Giới hạn: tối đa 5000 CRM metadata records, 10000 tổng hàng đầu vào/đầu ra stage, transport 4MiB và query result 2MiB. Vượt giới hạn trả lỗi, không cắt bớt rồi báo số nhỏ hơn. Pipeline Sales cố định; process Conversation theo phiên bản đã ghim. Chưa có optional step, history correction/import, historical replay, configurable Sales pipeline/reopen, canonical merged journey, stage SLA/alert, opening/closing reconciliation hay stage durable runs. Drilldown giữ ID gốc kể cả record đã archive; trang đích có thể không còn cho mở.

Kiểm thử dùng Windows, Node24.21.0/pnpm10.33, MySQL/Redis local, Edge headless và synthetic fixtures được giữ lại. [Evidence chi tiết](../tracking/details/SRC-087.md).
