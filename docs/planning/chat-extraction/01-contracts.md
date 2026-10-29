# T01 — Chốt contract ranh giới còn thiếu

Thuộc SRC-109 / PLAN-057. Dependency SRC-108 DONE. Đây là bước design; chưa migrate DB hay đổi main traffic. [Kế hoạch chung và quy tắc bàn giao](../chat-extraction-execution.md). Trạng thái/owner/ngày ở [tracker](../../tracking/tasks.md), điểm nhận việc ở [handoff](../../tracking/chat-extraction-handoff.md).

## Đọc đúng phạm vi

- [D3 gates](../../contracts/chat-extraction-runtime.md), [authority boundary](../../contracts/chat-extraction-boundary.md).
- [Consumer/transaction matrix](../../architecture/chat-consumer-matrix.md), [data audit](../../architecture/chat-data-extraction.md).
- [Chat descriptor](../../services/chat.md), [module](../../modules/conversation.md), [ownership](../../data/service-ownership.md).
- Contract hiện có của D2, dispatch/exchange/control, native-auth và module consumer được matrix dẫn tới. Reuse phần đã Ready; không xây lại transport/registry.

## Công việc và đầu ra

1. Chốt non-send Identity admission/current session/app/service rights và target eligibility cho Chat. Chỉ ra điểm effect được admitted, revoke trước/sau điểm đó, crash/timeout/replay. Không dùng D2 send grant như quyền mutation tổng quát; không bỏ tenant-lock guarantee bằng TTL cache.
2. Hoàn chỉnh assignment/takeover/close: local owner/version CAS, Routing reservation/confirm/release/status, AI/Chatflow control và recovery. Mọi owner DB transaction kết thúc trước network I/O.
3. Cho **mỗi16nhóm capability**, liệt kê endpoint/operation hoặc event thực tế cần thay, owner/caller, DTO/version/validation, quyền/field filtering, correlation/idempotency, timeout/retry/receipt và thứ tự áp dụng. Bao gồm read/query/batch/freshness/cursor, Contact/note, metadata/custom values, inbound/outbound, Sales outcomes, Reporting và private-app; không chỉ thiết kế send.
4. Chốt event delivery/ack/inbox/replay và compatibility cho8Chat consumers cùng các consumer ngoài Chat. Không mặc định Kafka đã tồn tại; chọn transport phù hợp hạ tầng hiện có, ghi ADR nếu cần. Outbox có bền vững và phục hồi, không dùng Redis pub/sub thay receipt.
5. Viết strict machine schemas/types theo convention hiện có cho contract mới; lập bảng mapping API/public IDs/legacy receipt keys/graph versions. Tạo acceptance scenario cho race/reorder/lost ACK/revoke/unknown tương ứng, không viết cả bộ browser test tại đây.

Đầu ra là contract/spec và machine schema dùng được cho T02–T06, cùng bảng capability→operation/event→consumer→acceptance. T01 phải tự chốt technical decisions trong scope; không kết thúc bằng một list việc “cần thiết kế sau” rồi đánh DONE.

## Tiêu chí hoàn tất

- Không còn placeholder protocol cho16nhóm capability; thiếu business decision thật thì ghi BLOCKED đúng phạm vi và giữ T01 chưa DONE.
- Có đầy đủ flow thành công/thất bại/replay/revoke, định danh version và compatibility; không có shared remote SQL/UoW hoặc field-policy bypass.
- Schema/type validation và focused contract cases liên quan đạt; docs/links/whitespace đạt. Không fake remote endpoint đã chạy.
- Handoff liệt kê contract versions, consumer matrix đã hoàn thiện và bảng storage mới/phải đổi để T02 điền templates.

Gate: T01 chưa đủ D3-01 vì còn thiết kế dữ liệu T02. Báo D3 0/6 nếu chưa có evidence khác; local2/17. Dừng sau bàn giao T01, không tự chạy T02.
