# Hướng dẫn làm việc trong Agentic CRM

## Trước mỗi phiên

1. Đọc [README](README.md), [build plan](docs/planning/build-plan.md), [task tracker](docs/tracking/tasks.md) và [checkpoint](docs/tracking/checkpoint.md).
2. Đọc module design, data dictionary, contract và acceptance scenario của task được chọn. Kiểm tra thay đổi hiện có trong workspace; không ghi đè công việc của người khác.
3. Chỉ bắt đầu task có dependency DONE và thiết kế đúng phạm vi Ready. Nếu có discrepancy, tạo change entry và sửa tài liệu liên quan trước khi code phần phụ thuộc.
4. Claim task bằng owner + ngày + trạng thái IN_PROGRESS. Mặc định một task triển khai đang active; không tự khởi tạo agent song song hoặc lịch chạy nền.

## Trong khi build

- Tuân [change control](docs/governance/change-control.md); technical detail không đổi nghiệp vụ có thể tự chốt bằng ADR, không hỏi lại các quyết định đã được chấp thuận.
- Không biến mock thành production integration hoặc mở rộng module Draft một cách ngầm định.
- Giữ Next.js/NestJS/TypeScript, MySQL, tenant isolation, Human/AI ownership và versioned durable workflows theo thiết kế.
- Không dùng schema auto-sync; migration đã dùng không sửa lịch sử. Thay đổi schema/event/API cần compatibility và migration note.
- Không truy cập bảng module khác trực tiếp; transaction xuyên module phải qua unit-of-work/application ports đã định nghĩa.
- Không ghi secret, token, transcript thật hoặc dữ liệu bệnh nhân vào code, log, tracker hoặc test evidence.
- Docker local không được trỏ dữ liệu production. Không chạy reset database/xóa volume như thao tác khởi động thường ngày.

## Kết thúc task hoặc phiên

- Chạy kiểm thử phù hợp với thay đổi, ghi lệnh, kết quả, môi trường và artifact/log reference; không ghi PASS nếu chưa chạy.
- Cập nhật task status, acceptance sub-scope, tài liệu có thay đổi, execution log và checkpoint cùng phiên. Nếu chưa xong thì ghi phần còn lại, không đánh dấu DONE.
- DONE đòi code/config tồn tại, test cần thiết đạt, tài liệu đồng bộ và evidence. Với task chỉ thiết kế, evidence là kiểm tra tài liệu; không tính vào tính năng đã chạy.
- Khi dừng giữa chừng, lưu file/branch/commit nếu có, working tree dirty nếu có, command đã chạy, blocker, quyết định chưa giải quyết, bước tiếp theo và services đang chạy.
- Không tự commit/push/deploy vì tracker yêu cầu evidence; nếu chưa có commit thì ghi working-tree reference thật. Không tạo commit hash hoặc báo cáo kiểm thử giả.

## Nguồn chuẩn

Task status: [tasks](docs/tracking/tasks.md). Điểm tiếp tục: [checkpoint](docs/tracking/checkpoint.md). Lịch sử: [log](docs/tracking/log.md). Nghiệp vụ: module design/contracts/data dictionary. Nếu mâu thuẫn thì sửa nguồn chuẩn và ghi change; không chỉ giải thích trong chat.

Các lệnh Docker/CI trong tài liệu kế hoạch chưa tồn tại cho đến khi task scaffold hoàn tất. Luôn kiểm tra script/file thực tế trước khi chạy.
