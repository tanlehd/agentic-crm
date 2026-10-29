# Chat D3 — phân trách nhiệm và backlog consumer

**Review CHG-20261023-25:** [Caller, invariant và scope của các boundary còn lại](remaining-boundaries.md). Các tên private operation là lựa chọn protocol, không tự là feature/deployment gates. Runtime inventory phải disposition rõ từng entry chưa mount; downstream backlog trong bảng này không được kéo trở lại Chat acceptance.

CHG-20261023-19 / ADR-029. Nguồn phạm vi hiện hành cho [T06](06-consumers.md), [T08](08-parity.md) và [D3-03/05](../../contracts/chat-extraction-runtime.md); áp dụng [quy tắc chung](../../governance/service-delivery-scope.md). Đây là phân scope, không phải nghiệm thu runtime mới hoặc task triển khai thứ hai.

## Phân loại 16 nhóm contract

Giữ nguyên operations, subscriptions và policy trong [matrix](../../architecture/chat-owner-consumers.md). Mỗi case T08 phải ghi Chat-owned, required compatibility hoặc other-owner; AI-only vẫn DEFERRED theo [Human-first](../human-first-omni-crm.md).

| Nhóm CO | Chat phải bàn giao | Trách nhiệm ngoài Chat |
|---|---|---|
| 01–04 | Ingress/dedup/history/send/ownership API, Chat receipts và local effects; adapter tới Identity/CRM/Connector/Routing cần cho command hiện có | Extract dependency hoặc thêm nghiệp vụ Connector/CRM/Routing |
| 05 | Chat routing facts/active/assignment/proofs/events; tương thích reservation/confirmation cho assignment | Matching, work/capacity/attention, public Routing views/config/reroute thuộc Routing |
| 06 | Giữ state/receipt/control fences hiện có; không có writer cũ vượt fence | AI execution/prompt/capacity DEFERRED, không xây lại Chatflow đã retire |
| 07–09 | Inbox/workspace/catalog/session/classification/metadata values và local notifications/scanners; gọi CRM metadata/Identity đã có | Hoàn thiện CRM metadata hoặc Identity như service độc lập |
| 10–11 | Chat need API/receipt, notes/activity facade, local activity inbox; adapter cần cho kết quả đã công bố | Sales outcomes/CRM Activity/Workflow business execution do owner tương ứng; không mở rộng các nghiệp vụ đó |
| 12 | Chat session-source, source policy và compatibility bàn giao hiện hữu; giữ history/ACL và fence legacy direct write. Không có contribution-apply gate theo [CHG-20261024-01](../../contracts/chat-sales-conversion-boundary.md) | Sales source/context/merge/outcome/receipts và CRM association; conversion suy từ Sales lineage, không yêu cầu callback mirror vào Chat |
| 13 | Chat authorized commands/read/status/events; tenant/version/idempotency and local state invariants; fence old direct Chat SQL at cutover | Workflow starter/wait/follow-up/recover_need policy, orchestration and acceptance. No dedicated recover-need endpoint is a Chat gate |
| 14 | Persist conversation/session attribution and lifecycle accurately; authorized domain reads/events already in Chat contract | Reporting source adapters, extraction/projection/snapshot/facts, registry metadata for reports, joins/metric/drilldown and their acceptance; no dedicated reporting endpoint gate on Chat |
| 15 | Existing generic Conversation read/custom write and four external Conversation/message reads, tenant/field/app/cursor policy | Generic CRM/private-app features and batch framework; registry batch for composite reporting belongs to Reporting |
| 16 | Chat outbox/relay/inbox/receipt/replay/scanners, capability lineage và old Chat writer fences | Consumer inbox/effect/recovery của từng owner khác |

## Backlog đã bàn giao về owner

Trạng thái dưới đây là **phần nghiệm thu nghiệp vụ của owner chưa đóng**, không phủ nhận candidate evidence đã có. Owner là service chịu trách nhiệm; execution owner **unassigned**, chưa mở task source active. Khi chọn triển khai, claim task riêng có dependency/spec Ready theo tracker. Không thêm các dòng này làm dependency của T06/T08/T09.

| Ref | Owner | Phần còn theo dõi | Trạng thái và bằng chứng hiện có |
|---|---|---|---|
| H-Routing | [Routing](../../services/routing.md) | Work/capacity/attention/config/views/reroute và consumer reconciliation trong runtime Routing | TODO nghiệm thu owner; các candidate CHG-20261023-14…18 giữ nguyên, không tự coi Routing deployed/DONE |
| H-Workflow | [Workflow](../../services/workflow.md) | Event enrollment/starter/wait, follow-up/recover_need, child orchestration và source activity producer | TODO nghiệm thu owner; giữ M2 evidence, không mở Kafka object-change PLAN-024B trong Chat |
| H-Sales | [Sales](../../services/sales.md) | Source/context/merge/outcome và own receipts; không yêu cầu reverse contribution callback | TODO nghiệm thu owner; candidate need outcome/history visibility không đồng nghĩa Sales extraction DONE |
| H-CRM | [CRM](../../services/crm.md) | Metadata/Activity/association, generic record integration và registry projections của CRM | TODO nghiệm thu owner; giữ metadata writer/note/generic candidate evidence, chỉ adapter/fence trực tiếp cần cho Chat nằm trong D3 |
| H-Reporting | [Reporting](../../services/reporting.md) | Source adapters from authorized Chat domain API/events, extraction/projections/snapshots/facts and registry metadata for reporting, joins/metrics/drilldown and unavailable handling | TODO owner integration acceptance; not a T06/T08/T09 dependency; no cross-DB SQL or silent stale-source fallback |
| H-Gateway | [Gateway/BFF](../../services/gateway.md) | Private-app/generic CRM orchestration và UI ngoài Chat | TODO nghiệm thu owner; route forwarding cần giữ public Chat contract là compatibility trong D3 |
| H-AI | [AI Runtime](../../services/ai-runtime.md) | AI native execution/capacity/prompt integration | DEFERRED; retained state/drain/fences vẫn thuộc migration safety |

## Còn chặn Chat và không chặn Chat

T06 còn phải chứng minh Chat producer/relay, Chat-owned inbox/scanners/recovery, domain endpoints còn thiếu và exact old Chat writer removal/fence. Outbox/retention/replay và backlogs phải giữ thật. Consumer khác chưa làm xong nghiệp vụ không chặn Chat; không cần chạy hoặc deploy tất cả owner để kiểm producer.

Compatibility cho public Chat command đang phục vụ và single writer vẫn bắt buộc. Nếu phát hiện blocker, ghi operation, invariant, owner, minimal adapter/fence và evidence cần; không ghi chung “Workflow/Sales/Reporting chưa xong”. T09 không được để old shared worker tiếp tục ghi Chat-owned tables hoặc làm mất pending effects. Chỉ sửa/tắt đúng registration/route/job bị ảnh hưởng, giữ công việc khác của baseline.

Hiện tại T01–T05 DONE, T06 IN_PROGRESS (Codex 2026-10-23), T07–T09 TODO; D3 **2/6**, local **2/14**. Thay scope chưa phải evidence D3-03. Next action: review four external Conversation/message reads, then reconcile T06 boundary evidence. No Reporting pipeline implementation.
