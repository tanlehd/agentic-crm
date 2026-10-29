# API Gateway & Workspace BFF

Public routing/BFF đang ở backend/web. Không bắt buộc tách deployment nếu chưa có nhu cầu vận hành.

## Trách nhiệm và dữ liệu sở hữu

Public route mapping, authenticated request context, bounded read composition và response compatibility; không có business database.

Route public request tới owner; compose workspace reads; bảo toàn session/tenant/CSRF/correlation và DTO compatibility.

Chat workspace create actions tự truyền conversation/session context đang chọn tới owning CRM/Sales command, giữ nguyên context qua retry. Owner xác minh source và lưu object/lineage; BFF không tự cấp quyền hoặc ghi business state. Deal từ Lead vẫn kế thừa origin Lead, current session là creation context riêng theo [workspace source boundary](../contracts/chat-sales-conversion-boundary.md).

Không tạo business schema cho thành phần này.

## Ngoài phạm vi

Không sở hữu business state, receipt/audit của mutation, không là nơi duy nhất kiểm quyền và không điều phối generic lifecycle saga.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Identity | Resolve authenticated context và current session. |
| Owning services | Gọi versioned API; owner kiểm quyền và invariant lại. |
| Connector | Route webhook riêng theo provider authentication, không dùng Human session giả. |

## Quy tắc riêng

Bỏ client-supplied actor/internal headers. Read composition không hứa distributed snapshot nếu contract không có; partial/unavailable phải rõ. Không tạo database/worker chỉ để khớp template service.

## Contract và evidence

- [Service boundaries](../contracts/service-boundaries.md)
- [External API](external-api.md)
- [Chat history BFF](../contracts/chat-history-candidate.md)

Evidence: Baseline gateway/BFF và SRC-109 candidate adapters. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
