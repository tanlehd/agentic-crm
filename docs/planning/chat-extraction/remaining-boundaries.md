# T06 — Ranh giới còn lại của Chat

SRC-109/T01–T09 DONE, Codex 2026-10-27. D3 Human-first 6/6; independent local delivery3/14 (Reporting, Connector, Chat). Legacy Conversation graph retired; main baseline46/crm_chat4, both Chat tenant gates active epoch2 after accepted post-write freeze/forward recovery. Source data and original receipts retained. Production, AI native, live-provider delivery and other-owner business consumers remain outside this acceptance. No commit/push/reset. Main app now routes to independent Chat. [Runbook](../../development/chat-main-local-runtime.md).

## Trách nhiệm Chat

Chat lưu bền conversation/session IDs, Contact binding, source attribution theo session, thời điểm/lifecycle và lịch sử thay đổi theo contract. Attribution có source classification, channel/connection/Page và ad/campaign/touchpoint khi có evidence; không bịa nguồn khi thiếu dữ liệu. Inbound mới/late/duplicate và đóng/mở phiên không làm sai nguồn gốc. Chat kiểm quyền/tenant, phục vụ domain reads/commands và phát durable events đã cam kết.

Reporting sở hữu việc lấy dữ liệu, source adapter, projection/snapshot, facts, joins và tính báo cáo. Reporting đọc domain API/events được cấp quyền; không yêu cầu Chat xây snapshot/facts riêng để đóng D3. Registry read dùng cho composite reporting thuộc cùng backlog Reporting, không phải gate khác mang tên registry compatibility.

## Nhóm catalog Chat đã hoàn tất

| Nhóm | Caller hiện có | Chat phải giữ | Ngoài scope |
|---|---|---|---|
| External Conversation/message reads | External API facade qua gateway/chat-external-read.ts; T09 wiring, main switch pending | Bốn existing list/detail Conversation/message reads, app admission, tenant/parent/field/grant/cursor semantics và public forwarding | Private-app administration, generic CRM features, Reporting extraction/metrics hoặc rollout Gateway toàn stack |

Generic Conversation GET/PATCH đã có candidate; vẫn kiểm compatibility và single-writer trong runtime/cutover. Không tạo record-batch mới chỉ vì catalog có tên. External reads cùng producer/local consumers/scanners và old-writer inventory đã được đối chiếu tại T06 acceptance; T07/T08 đã nghiệm thu; T09 cutover còn triển khai.

## Inventory disposition

84 candidate operations/88 registrations; 17 catalog entries chưa mount: 10 other-owner (9 Reporting và 1 Workflow), 1 not-required (Sales outcome mirror), 3 AI-deferred, 2 archive-removed, 1 superseded. Không còn nhóm catalog Chat OPEN; đây là source boundary coverage, không phải live runtime.

- Workflow follow-up/recover_need nghiệm thu tại Workflow.
- Reporting snapshot-prepare/validate/page/release, routing/conversion/stage/progress-facts và registry batch cho báo cáo nằm ngoài gate Chat. Các schema đã có không tạo yêu cầu implement/mount.
- Sales source/Lead/Deal lineage đủ cho conversion; contribution-apply không bắt buộc.
- routing-active đã được routing-sync-snapshot thay thế và có evidence; AI-only/archive giữ disposition hiện hành.

## Isolation và cutover

Không cho consumer đọc/ghi trực tiếp DB Chat hoặc dùng retained registry stale như dữ liệu hiện hành. Khi chuyển tenant, fence old direct access; consumer chưa nối contract thì trả unavailable rõ ràng, không báo zero hoặc giả dữ liệu fresh. Việc hoàn thiện consumer adapter/projection và nghiệm thu nghiệp vụ là backlog owner, không chặn Chat hoặc buộc deploy Reporting/Workflow/Sales. Giữ dữ liệu/receipts lịch sử, source attribution và single writer; không reset để làm sạch gate.

## Evidence của review

Scope tooling: scripts/lib/chat-scope-review.mjs. Boundary evidence: artifacts/chat-extraction/external-20261025, including 11 native external-read groups and 42 focused tests. Attribution/lifecycle and producer/local consumer evidence is linked in [T06 acceptance](../../quality/t06-chat-boundary-acceptance.md). Main routing and old-writer retirement are now accepted by [T09](../../tracking/details/SRC-109.md#t09-legacy-retirement-and-main-cutover--2026-10-27).
