# Operations & Audit

Operational tooling có trong baseline; independent aggregate service là target, không có quyền SQL toàn hệ thống.

## Trách nhiệm và dữ liệu sở hữu

Sanitized audit/status projections, incident/attention, replay request và source receipts; authoritative audit vẫn thuộc service phát sinh.

Hiển thị health/backlog/trace/operation state; nhận yêu cầu replay/repair và chuyển tới đúng owner theo quyền hiện hành.

Schema đích: `crm_operations`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sửa business tables, không cấp quyền bypass, không tự tạo lại command để gửi tin lần hai.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Mọi producer | Nhận minimized audit/operation events và watermark. |
| Owning service | Gửi replay/status request; owner reauthorize và dedup. |
| Identity | Kiểm quyền operator, tách tenant operator khỏi platform infrastructure role. |

## Quy tắc riêng

Central outage không làm mất source audit đã ghi atomic. Logs/projections không mặc định chứa transcript/secret. Infra access không tự cấp quyền nội dung khách hàng.

## Contract và evidence

- [Operations module](../modules/operations.md)
- [Service boundaries](../contracts/service-boundaries.md)

Evidence: Theo module Operations và runtime runbooks; independent aggregation còn target. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
