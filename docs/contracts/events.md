# Domain events và delivery semantics

Status: Ready for implementation — M1–M2.

## Envelope v1

```json
{
  "event_id": "0199aa00-0000-7000-8000-000000000001",
  "tenant_id": "0199aa00-0000-7000-8000-000000000002",
  "event_type": "conversation.created",
  "schema_version": 1,
  "aggregate_type": "conversation",
  "aggregate_id": "0199aa00-0000-7000-8000-000000000003",
  "aggregate_version": "1",
  "occurred_at": "2026-10-02T03:00:00Z",
  "correlation_id": "intake-fixture-001",
  "causation_id": "delivery-fixture-001",
  "actor": {"kind": "service", "id": "0199aa00-0000-7000-8000-000000000006"},
  "data": {"contact_id": "0199aa00-0000-7000-8000-000000000004", "connection_id": "0199aa00-0000-7000-8000-000000000005"}
}
```

Mọi field bắt buộc trừ `causation_id` nullable. Actor id là UUID typed identity; correlation/causation là opaque trace reference. `aggregate_version` tăng đơn điệu trên registry record/config aggregate; không cam kết event tới consumer theo thứ tự.

## Catalog

| Event | Producer | data bắt buộc | Consumer chính |
|---|---|---|---|
| contact.created | CRM | contact_id | reporting projection |
| conversation.created | Conversation | contact_id,connection_id | workflow starter |
| message.received | Conversation | conversation_id,message_id,connection_id | chatflow inbox/router |
| message.sent | Conversation | conversation_id,message_id,outbound_intent_id | activity metrics |
| message.delivery_failed | Channels | conversation_id,outbound_intent_id,error_code | inbox attention/operations |
| record.assigned | Ownership service | record_id,object_type,from_owner_id?,to_owner_id?,team_id?,owner_revision,reason | execution cancellation, queue projection |
| lead.created | Sales | lead_id,contact_id,conversation_id? | reporting |
| lead.qualified | Sales | lead_id,qualified_at,source_touchpoint_id? | reporting; workflow wait tùy definition |
| lead.handoff_requested | Sales | lead_id,handoff_id,target_team_id,due_at | Sales queue/operations |
| lead.accepted | Sales | lead_id,handoff_id,accepted_by,accepted_at | workflow wait/reporting |
| chatflow.completed | Chatflow | session_id,conversation_id,lead_id?,outcome | parent workflow wait |
| chatflow.handoff_required | Chatflow | session_id,conversation_id,reason | routing Human queue |
| workflow.completed | Workflow | run_id,version_id | operations |
| execution.failed | Workflow/Chatflow | execution_type,execution_id,error_code | operations |
| principal.access_changed | Identity | principal_id,auth_revision | cancellation/cache invalidation |

Payload không chứa message body, phone hoặc raw runtime prompt. Consumer cần nội dung phải fetch qua authorized tenant-scoped interface. Nullable field liệt kê `?` vẫn có thể xuất hiện với null; không suy ra record đã xóa.

## Delivery, ordering và compatibility

- Domain transaction commit state + audit + outbox. Relay claim rows có lease; publish thành công rồi mark dispatched, crash ở giữa có thể publish lặp.
- Consumer idempotency key tenant+consumer+event; dedup retention phải bao phủ toàn bộ thời gian replay. M1–M2 không purge inbox tombstone/domain key.
- Aggregate version dùng chống regression cho projection; không bỏ event nghiệp vụ chỉ vì nhận version mới trước. Projection rebuild từ source hoặc ordered per-aggregate backlog nếu phát hiện gap.
- Workflow starter unique version+trigger event; pinned version được chọn và persist trong transaction nhận trigger. Definition đổi active version không tái xử lý event cũ.
- Message đến trước chatflow start không mất: session đọc message chưa được `chatflow_turn` nhận theo thứ tự received_at/id. Signal chỉ đánh thức, message table là nguồn chuẩn.
- Wait registration và predicate check nằm trong transaction; khi signal đến trước subscription, runner kiểm tra persisted child/session/lead state trước khi ngủ. Timer due và event cùng lúc dùng CAS terminal state, chỉ một transition thắng.
- Retry transient: tối đa 5 lần, delay 1s/5s/30s/2m/10m; sau đó failed/dead-letter. Validation/permission không retry. Retry thủ công giữ event/action key, không tạo ID mới để né dedup.
- Mở rộng additive optional field giữ schema_version; thay nghĩa/required field tạo version mới và hỗ trợ consumer cũ trong migration. Không sửa payload event đã lưu.

M4 bổ sung `deal.won`, `appointment.booked`, `ticket.sla_breached` sau khi module contract được chốt; chưa là event implementable của M2.

SRC-007 sản xuất `principal.access_changed` trong MySQL outbox cùng admin transaction. Payload chỉ `{principal_id,auth_revision}`; revision là decimal string positive để giữ BIGINT chính xác. Aggregate version lưu BIGINT, envelope wire serializer cần giữ precision. Chưa có relay/consumer trước SRC-008.

CHG-20261003-07: relay wire `aggregate_version` là positive decimal string (không JSON number) để bảo toàn BIGINT; `schema_version` number an toàn. Queue/wakeup chỉ truyền tenant_id/event_id; envelope fetch từ immutable outbox. Consumer registry nội bộ M1; unknown type/schema terminal failed, errors chỉ mã allowlisted, không lưu exception/raw payload.

SRC-010 internal ownership port ghi `record.assigned` cùng history/CAS/audit trong một UoW; reason hiện là mã `assigned`, không free text. Chưa có production subtype adapter hoặc public assignment, nên preview chưa phát event này. Consumers cancellation/queue và provider effects nối ở SRC-017 trở đi; registry không đăng ký consumer giả chỉ để ACK event nghiệp vụ. Initial create history revision1 không tự phát event domain; module subtype phải ghi creation event qua reliability port trong cùng transaction.
