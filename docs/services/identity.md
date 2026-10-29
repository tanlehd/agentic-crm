# Identity & Access

Native authentication/authorization đã có trong backend. D2 và T04 có native adapters; Identity chưa được tách toàn bộ dữ liệu thành service độc lập.

## Trách nhiệm và dữ liệu sở hữu

Account, credential/session, tenant membership, principal, team/seat/role, field policy, service workload identity, private app grants và quota.

Đăng nhập/đăng xuất; kiểm quyền hiện hành; quản lý membership và quyền; cấp/thu hồi admission cho thao tác đã có contract.

Schema đích: `crm_identity`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu Contact khách hàng, trạng thái/owner Conversation, Lead/Deal hoặc cấu hình provider AI.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Gateway, các owner services | Cung cấp session/principal/current authorization; caller vẫn kiểm điều kiện nghiệp vụ tại owner. |
| AI Runtime | Giữ principal identity; Runtime giữ provider binding và execution. |
| CRM | Cung cấp team và quyền; không ghi Contact hoặc metadata CRM. |

Workflow có thể subscribe các thay đổi User/principal/team business được cho phép và gọi named Identity commands. Identity vẫn sở hữu User/current rights; không phát password/token/session secret trong generic events và không tự cấp quyền từ một flow trigger. Capability này cần adapter thật, không được suy từ catalog CRM hiện có.

## Quy tắc riêng

Thu hồi quyền phải ngăn tác dụng mới. Receipt hoặc cached projection không tự cấp quyền. Tenant super admin chỉ áp dụng theo contract, không mở rộng sang AI/service actor.

## Contract và evidence

- [Native auth](../contracts/native-auth.md)
- [Tenant super admin](../contracts/tenant-super-admin.md)
- [Dispatch authority](../contracts/identity-dispatch-authority.md)
- [Private apps](../contracts/external-api.md)
- [Native candidate](../development/identity-owner-candidate.md)

Evidence: SRC-038, SRC-088, SRC-099…108, SRC-109/T04. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
