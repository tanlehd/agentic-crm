# Routing & Allocation

Human routing R1 có trong monolith; T04 native configuration/capacity và T06 reconciliation/dispatch, reply facts, public admin/mine read và reroute candidates đã kiểm thử. Operational consumer/scanner wiring và main cutover còn theo SRC-109; AI execution capacity là scope riêng.

## Trách nhiệm và dữ liệu sở hữu

Routing configuration, skill/eligibility matching, queue/rules/cursor, Human capacity reservation/allocation, attention và decision history.

Chọn candidate, reserve workload, đề xuất assignment, xác nhận/release allocation từ terminal owner proof; cung cấp cấu hình và hành động điều phối.

Schema đích: `crm_routing`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu Conversation/Lead owner cuối cùng, không ghi database Chat/Sales. Không gộp Human workload với AI Runtime execution slot.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Identity | Đọc principal/team/role eligibility hiện hành. |
| Chat hoặc resource owner | Gửi assignment proposal; nhận authoritative owner revision/terminal proof. |
| AI Runtime | Chỉ dùng capacity API khi scope AI đã triển khai. |
| Reporting | Cung cấp workload/decision facts, không tạo reporting engine riêng. |

Business triggers/branch/follow-up thuộc [Workflow](workflow.md). Routing giữ thuật toán matching, queue/capacity và reconciliation; không vận hành một configurable business flow engine khác. Legacy automatic starters phải được chuyển quyền enrollment theo từng flow để tránh hai lần phân công.

## Quy tắc riêng

Chỉ owner service thắng CAS mới đổi owner. Reservation chưa xác nhận không là assignment thành công; stale release/confirm không ghi đè revision mới. Queue disable là cấu hình Routing, không tạo lifecycle cho Contact.

## Contract và evidence

- [Human routing](../contracts/human-routing.md)
- [Native configuration](../contracts/routing-configuration-candidate.md)
- [Human acceptance](../quality/t04-human-acceptance.md)
- [Native dispatch evidence](../development/chat-routing-dispatch-candidate.md)
- [Native public Routing reads](../development/routing-view-candidate.md)
- [Native Human reroute](../development/routing-reroute-candidate.md)
- [Operations reporting](../contracts/operations-reporting.md)

Evidence: SRC-084/085, SRC-109/T04. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
