# Chat / Conversation Server

SRC-109/T01–T09 DONE, Codex 2026-10-27. D3 Human-first 6/6; independent local delivery3/14 (Reporting, Connector, Chat). Legacy Conversation graph retired; main baseline46/crm_chat4, both Chat tenant gates active epoch2 after accepted post-write freeze/forward recovery. Source data and original receipts retained. Production, AI native, live-provider delivery and other-owner business consumers remain outside this acceptance. No commit/push/reset. [Main runtime](../development/chat-main-local-runtime.md) và [checkpoint](../tracking/checkpoint.md) ghi deployment/evidence. [T06](../quality/t06-chat-boundary-acceptance.md), [T07](../quality/t07-chat-runtime-acceptance.md), [T08](../quality/t08-chat-parity-acceptance.md) giữ nghiệm thu độc lập.

## Trách nhiệm và dữ liệu sở hữu

Thread/Conversation và episode/session, message/content/history, owner/control revisions, outbound intent/job/result, unread/coverage, inbox/tag/snippet/snooze, process/classification/contribution và activity references.

Nhận tin và chống trùng; mở/đóng phiên theo contract; đọc timeline; gửi tin qua Connector; assign/takeover/close; phục vụ workspace và context có quyền.

Chat phát durable message/session/lifecycle events cho agent xử lý và tiếp nhận authorized commands từ agent. Chat vẫn quyết định local state/owner/control khi send hoặc close; agent execution/orchestration thuộc owner bên ngoài. [Workspace source và agent boundary](../contracts/chat-sales-conversion-boundary.md#ranh-giới-chat-agent-và-workspace--chg-20261024-02) không phụ thuộc object được tạo từ màn hình nào.

Schema đích: `crm_chat`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

Chat lưu attribution theo conversation/session: Contact binding, source classification, channel/connection/Page và ad/campaign/touchpoint có evidence, cùng thời điểm mở/đóng và lịch sử. Unknown/null giữ đúng nghĩa thiếu evidence; session mới hoặc message trễ không ghi đè nguồn gốc phiên cũ. Existing session-source/domain reads và durable events là boundary chia sẻ dữ liệu.

## Ngoài phạm vi

Không sở hữu Contact master, CRM note body, Lead/Deal outcome, provider credential, Identity policy hoặc Workflow execution/follow-up/recover_need; các phần này nghiệm thu tại Workflow. Không điều phối archive Contact.

Reporting source adapters, extraction/projection/snapshot/facts, registry metadata phục vụ báo cáo, joins và metrics thuộc Reporting; không là gate Chat. Chat không phải xây report-specific snapshot/facts producer để được nghiệm thu.

CRM/Sales object tạo trên Chat workspace vẫn do CRM/Sales sở hữu. Workspace tự truyền source session đã chọn; owner xác minh và lưu lineage phục vụ Reporting, không chuyển object lifecycle/transaction sang Chat.

[Chat→Sales conversion boundary](../contracts/chat-sales-conversion-boundary.md): Sales giữ Lead/Deal source và kết quả; Reporting suy conversion theo lineage. Chat không cần contribution-apply callback hoặc đợi Deal won để đóng phiên/nghiệm thu. Giữ Chat-local contribution history và historical Sales outcome rows; fence legacy Sales direct Chat write khi cutover.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| CRM | Đọc canonical binding/metadata; tạo/đọc note qua API. |
| Connector | Nhận intake/referral evidence; gửi intent và nhận transport result. |
| Identity, Routing | Identity quyết quyền; Routing đề xuất/reserve capacity; Chat quyết định owner CAS cuối cùng. |
| Sales, Workflow, Reporting | Cung cấp authorized context/events; nhận command có version/idempotency, không cho consumer ghi Chat SQL. |

## Quy tắc riêng

Conversation/session/message, receipts và outbox lưu bền trong MySQL. Inbound mới có thể mở lại conversation và tạo session mới; message cũ đến trễ không mở lại phiên đã đóng. Close là authorized Chat command. Workflow chủ động chăm tiếp là nghiệp vụ ngoài Chat, không phải thiếu cơ chế mở/đóng do inbound.

Giữ ID/cursor/receipt và event-time history. Close Conversation là hành vi hội thoại, không lưu trữ Contact. Late/duplicate messages không sửa nguồn mở phiên. Unknown send không bị đổi thành cancelled/sent khi chưa có evidence. Contact-key mutex hiện có chỉ là cơ chế serialize ingress, không phải Contact lifecycle authority.

## Contract và evidence

- [Conversation identity](../contracts/conversation-identity.md)
- [Owner contract](../contracts/chat-owner-v1.md)
- [Need source read](../contracts/chat-need-source.md)
- [Session source read](../contracts/chat-session-source.md)
- [Durable delivery and recovery candidate](../development/chat-delivery-candidate.md)
- [Old writers and cutover disposition](../architecture/chat-writer-cutover.md)
- [Ingress](../contracts/chat-ingress-processor.md)
- [Referral](../contracts/chat-referral-saga.md)
- [Workspace](../contracts/agent-chat-workspace.md)
- [Inbox realtime and polling](../contracts/inbox-realtime-v1.md)
- [Queue/sidebar candidate](../development/chat-queue-candidate.md)
- [CRM notes candidate](../development/chat-notes-candidate.md)
- [T05](../planning/chat-extraction/05-messaging-workspace.md)

Evidence: SRC-014…087 theo tracker, SRC-109/T01–T05. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
