# Ticket / Service Desk

Domain/service scope còn Draft; chưa lấy service catalog làm giấy phép triển khai state machine/SLA đầy đủ.

## Trách nhiệm và dữ liệu sở hữu

Ticket, resolution, Ticket ownership/history và SLA/escalation khi exact use case được chốt.

Quản lý yêu cầu hỗ trợ và kết quả xử lý; liên kết Contact/Conversation/Deal bằng reference có quyền.

Schema đích: `crm_ticket`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu chat message, Sales opportunity hoặc identity merge. Không sao chép lifecycle CRM record thành lifecycle Ticket.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| CRM, Chat, Sales | Đọc context được phép, giữ logical references. |
| Identity, Routing | Kiểm quyền và nhận allocation proposal; Ticket quyết định owner. |
| Workflow | Nhận command/timer theo Ticket contract được duyệt. |

## Quy tắc riêng

Chỉ định nghĩa trạng thái từ luồng xử lý Ticket thực tế. Reopen/merge/SLA pause/calendar chưa Ready không được trở thành prerequisite của service khác.

## Contract và evidence

- [Ticket module](../modules/ticket.md)
- [CRM base outcomes](../planning/crm-base-outcomes.md)

Evidence: Draft; exact implementation acceptance theo tracker. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
