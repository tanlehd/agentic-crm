# Agentic CRM

Nền tảng giúp doanh nghiệp quản trị dữ liệu khách hàng và vận hành marketing, bán hàng, customer service trong một không gian số hóa thống nhất, có kiểm soát. Nhân viên, Workflow và AI Agent cùng xử lý công việc theo dữ liệu, quyền hạn và mô hình tổ chức của doanh nghiệp.

[Tổng quan sản phẩm](docs/product/vision.md) · [Nhóm tính năng](docs/product/capability-map.md) · [Tài liệu các service](docs/services/README.md)

## Kiến trúc

Hệ thống phát triển theo ranh giới service: mỗi service sở hữu dữ liệu và quy tắc nghiệp vụ trong phạm vi của mình, giao tiếp qua API và events có phiên bản. Việc tách runtime được thực hiện từng bước từ nền modular monolith; hiện trạng triển khai nằm trong [deployment topology](docs/system/deployment-topology.md).

- **CRM, Sales, Chat, Ticket:** hồ sơ khách hàng và các nghiệp vụ tương tác, bán hàng, hỗ trợ.
- **Identity, Routing:** danh tính/quyền truy cập và phân bổ công việc.
- **Workflow, AI Runtime:** điều phối business flow và thực thi tác vụ AI. Workflow dùng chung cho thay đổi CRM và Chat; service sở hữu đối tượng vẫn kiểm quyền và điều kiện nghiệp vụ.
- **Connector, Media, Marketing, Reporting, Operations, Gateway/BFF:** tích hợp, nội dung, dữ liệu marketing, báo cáo, vận hành và truy cập ứng dụng.

Stack: Next.js, NestJS, TypeScript, MySQL và Redis/BullMQ. Dữ liệu được cô lập theo tenant; authentication/session/authorization do Identity quản lý.

[Kiến trúc hệ thống](docs/system/architecture.md) · [Ranh giới và trách nhiệm](docs/services/README.md) · [Sở hữu dữ liệu](docs/data/service-ownership.md)

## Phát triển theo service

Bắt đầu từ [service catalog](docs/services/README.md). Tài liệu của từng service xác định trách nhiệm, dữ liệu sở hữu, phần ngoài phạm vi và các contract liên quan. Chi tiết nghiệp vụ, API, dữ liệu và acceptance nằm trong tài liệu chuyên trách được service liên kết.

Khi chọn công việc:

1. Xác định service sở hữu nghiệp vụ và kết quả cần hoàn thành.
2. Đọc thiết kế, contract, dữ liệu và acceptance của phạm vi đó; xác định service cung cấp hoặc tiêu thụ liên quan.
3. Đối chiếu dependency và trạng thái Ready trong [kế hoạch](docs/planning/build-plan.md), [task tracker](docs/tracking/tasks.md) và [checkpoint](docs/tracking/checkpoint.md) trước khi triển khai.

Quy trình làm việc theo [AGENTS.md](AGENTS.md) và [change control](docs/governance/change-control.md). Phạm vi thiết kế của một service không đồng nghĩa toàn bộ tính năng đã triển khai; tiến độ và bằng chứng nghiệm thu được ghi trong tracker.

## Chạy và kiểm tra local

- [Hạ tầng local và service monitor](docs/development/service-manager.md): chuẩn bị môi trường, khởi động và quản lý từng ứng dụng.
- [Hướng dẫn chạy local](docs/development/local.md): môi trường host và lựa chọn Docker preview.
- [Verification và CI](docs/development/verification.md), [chính sách kiểm thử](docs/development/testing-policy.md): chọn và chạy kiểm tra phù hợp với thay đổi.

## Điều hướng tài liệu

| Cần tìm | Nguồn chuẩn |
|---|---|
| Mục tiêu và phạm vi sản phẩm | [Vision](docs/product/vision.md), [capability map](docs/product/capability-map.md) |
| Phạm vi phát triển từng service | [Service catalog](docs/services/README.md) |
| Bản đồ tài liệu chuyên sâu | [Documentation index](docs/index.md) |
| Source layout và ranh giới package/service | [Repository map](docs/architecture/repository-map.md) |
| Kế hoạch, tiến độ và điểm tiếp tục | [Build plan](docs/planning/build-plan.md), [tasks](docs/tracking/tasks.md), [checkpoint](docs/tracking/checkpoint.md) |
| Lịch sử thay đổi và bằng chứng triển khai | [Execution log](docs/tracking/log.md) và evidence được liên kết từ task |
| API cho ứng dụng bên ngoài | [Developer guide](docs/developer/README.md) |

README giữ tổng quan và điều hướng. Log theo phiên, kết quả kiểm thử và logic chi tiết được cập nhật tại nguồn chuyên trách ở trên.
