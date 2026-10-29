# Marketing

Schema3, scheduler/change/snapshot store đã có evidence. SRC-051 READY sau requeue; periodic provider ingestion/API/worker và live Meta chưa hoàn tất.

## Trách nhiệm và dữ liệu sở hữu

Tenant-local Ad Account/Campaign/Ad Set/Ad/Creative/targeting replicas, provider metadata history, sync checkpoint và Insights observations theo scope được duyệt.

Đồng bộ dữ liệu Marketing từ Meta; resolve ad hierarchy trong account tenant đã authorize; cung cấp dataset/field descriptions và freshness cho Reporting.

Schema đích: `crm_marketing`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sửa immutable Lead/Deal origin, không sở hữu Messenger transport/credentials, không vận hành quảng cáo/budget optimization hoặc reporting engine riêng.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Connector/Channels | Sử dụng credential/Page authority qua contract; không thêm credential writer. |
| Reporting | Cung cấp source dataset/provenance; Reporting giữ formula/query/template. |
| CRM/Sales/Chat | Tra cứu opaque ad IDs trong đúng tenant, không PATCH source snapshot để ép khớp hierarchy. |

## Quy tắc riêng

Meta là upstream authority. Provider archived/deleted/inaccessible là trạng thái quan sát có evidence, không phải lifecycle do CRM áp đặt. Fetch lỗi không có nghĩa mọi object đã bị xóa. Insights breakdown không cho phép suy demographic từng Lead.

## Contract và evidence

- [Metadata sync](../contracts/marketing-metadata-sync.md)
- [Tenant admission](../contracts/marketing-tenant-admission.md)
- [Operating flow](../contracts/marketing-operating-flow.md)
- [Database](../contracts/marketing-database.md)
- [Source catalog](../data/marketing-source-catalog.md)

Evidence: SRC-054/056 và phần đã có của SRC-051. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
