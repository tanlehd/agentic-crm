# Reporting & Analytics

Reporting chạy container local độc lập, schema7 theo SRC-090/091. Builder/dashboard, connected operations/conversion/stage funnel có scoped evidence; không đồng nghĩa mọi pipeline/provider đều hoàn tất.

## Trách nhiệm và dữ liệu sở hữu

Source/model catalog và pins, report/dashboard/template definitions, query/run/result/export metadata và derived projections khi contract yêu cầu.

Reporting sở hữu source adapters, việc lấy dữ liệu qua owner API/events, projections/snapshots/facts và registry metadata dùng cho báo cáo; nghiệm thu các phần này tại Reporting. Chat chỉ cần giữ đúng attribution/lifecycle và domain contract của mình, không chờ Reporting hoàn tất hoặc deploy.

Khám phá nguồn có quyền; compile/query/group/pivot/chart; render dashboard và CSV; đo funnel/conversion/workload từ facts của owner.

Schema đích: `crm_reporting`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu Contact/Lead/Deal/Conversation facts hoặc Marketing upstream. Không query database business service khác, không đặt lifecycle lên record nguồn.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| CRM, Chat, Sales, Routing, Identity | Nhận domain API/events được cấp quyền; Reporting xây source adapters/projections/snapshots theo contract của mình. Không buộc Chat có dedicated reporting snapshot hoặc đọc SQL xuyên service. |
| Marketing | Nhận hierarchy/metadata/Insights dataset với grain và coverage rõ. |
| Gateway/UI | Cung cấp definitions/results theo current viewer; metadata quyền đọc không thay data access. |

## Quy tắc riêng

Giữ grain, distinct counts và provenance; không chia doanh thu CRM vào demographic breakdown thiếu evidence. Data unavailable/partial phải hiển thị rõ; không trả zero giả. Archive report/dashboard là thao tác quản lý tài liệu riêng, không archive Contact.

## Contract và evidence

- [Report authoring](../contracts/reporting-authoring.md)
- [Dashboard](../contracts/dashboard-workspace.md)
- [Connected conversion](../contracts/conversion-reporting.md)
- [Stage funnel](../contracts/stage-funnel-reporting.md)
- [Container runbook](../development/reporting-container.md)

Evidence: SRC-057…072 theo tracker, SRC-085/086/087/090/091. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
