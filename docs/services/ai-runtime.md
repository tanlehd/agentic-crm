# AI Runtime Platform

Agent/execution adapters có trong baseline. Native AI composition được deferred trong Human-first scope; không suy service độc lập từ catalog.

## Trách nhiệm và dữ liệu sở hữu

Provider agent binding/config versions, instructions/knowledge/tool definitions, executions/tool runs, evaluation và execution capacity.

Chạy agent theo config/version và quyền được cấp; gọi owning service tools; hủy/đối soát execution và trả kết quả có provenance.

Schema đích: `crm_ai`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu Identity principal/roles, provider channel credentials, Conversation/Lead owner hoặc Routing Human allocation.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Identity | Principal và quyền hiện hành. |
| Chat, Workflow | Nhận execution context; gửi đề xuất qua Chat intent API. |
| Owning services | Mọi tool effect đi qua owner command, không truy cập SQL bên khác. |
| Connector | Provider-managed echo chỉ nhập kết quả, không tạo lần gửi thứ hai. |

## Quy tắc riêng

Execution/tool state phục vụ retry/cancellation thực tế. Mất quyền hoặc owner revision thay đổi ngăn effect mới; không hứa thu hồi effect ngoài hệ thống đã thực hiện. Provider secrets/transcript không vào audit chung.

## Contract và evidence

- [Agents module](../modules/agents.md)
- [Human-first scope](../planning/human-first-omni-crm.md)
- [Dispatch](../contracts/chat-dispatch-v1.md)

Evidence: Theo module Agents và SRC-109 Human-first scope. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
