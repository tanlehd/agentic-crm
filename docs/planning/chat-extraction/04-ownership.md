# T04 — Chat registry, authorization và ownership

**DONE, Codex 2026-10-19.** [Exact Human acceptance and downstream scope](../../quality/t04-human-acceptance.md). Final25native HTTP groups + Chat5/Routing6/optional TLS12 PASS; local HTTP is explicitly selected under ADR-026. Main routing remains baseline; D3 stays2/6.

**Phạm vi hiện hành CHG-20261019-23:** [Human-first](../human-first-omni-crm.md). Human eligibility/capacity và native owner composition vẫn bắt buộc. AI Runtime capacity và successful AI assignment DEFERRED; AI request chưa hỗ trợ tiếp tục fail-closed. Identity AI contract/source đã có được giữ, không đòi hoàn tất lớp AI để đóng T04.

Thuộc SRC-109 / PLAN-057. Dependency **T03 DONE**. [Quy tắc chung](../chat-extraction-execution.md), [tracker](../../tracking/tasks.md), [handoff](../../tracking/chat-extraction-handoff.md).

## Phạm vi và đầu ra

Đọc contract T01, schema T02/T03, [assignment transaction](../../architecture/chat-consumer-matrix.md), [authority boundary](../../contracts/chat-extraction-boundary.md) và [Chat module](../../modules/conversation.md). Source trọng tâm: conversation/domain.ts/ownership-port.ts; crm/registry.ts/access.ts/records.ts; identity authority và agents/routing.ts.

1. Implement Chat-local record/version/owner/team/share/history/custom values/index dưới schema riêng; CRM giữ metadata authority. Extract shared value/protocol helpers khi cần, không import CRM/Identity domain implementation vào runtime Chat.
2. Implement owning Identity endpoints/adapters theo admission contract T01, current Human/service/app/AI rights đúng phạm vi. Nếu Identity vẫn baseline process, endpoint phải ở owner đó, với credential chỉ đọc/ghi bảng owner; Chat không giữ quyền SQL vào Identity.
3. Implement assignment/takeover và ownership phần close qua HTTP/application boundary đã định nghĩa, gồm Routing reservation endpoint tối thiểu cần thiết, receipt/status/recovery. Eligibility/capacity không được tạm bỏ để làm test xanh.
4. Trong Chat-local commit giữ version/owner_revision CAS, history/contribution/activity, snooze wake, queued cancellation, audit/receipt/control outbox. Callbacks cũ không được mutate AI/Chatflow/Routing qua shared scope; các owner consumers đầy đủ nối ở T06.
5. Nối generic Conversation record/assignment route tới owner đúng trong candidate path; giữ public IDs/receipt keys và fail-closed khi dependency unavailable. Main routing chưa chuyển.

## Tiêu chí hoàn tất

- Có candidate thật gọi Identity/Routing owner qua transport và cập nhật Chat DB; mock chỉ dùng cho focused tests, không thay boundary integration evidence.
- Native/concurrency tests kiểm version conflict, same-key replay/conflict, wrong-tenant, current rights/target revocation, capacity và loss/recovery theo exact protocol.
- Takeover trước claim chặn queued effect; in-flight không bị gắn cancelled sai. Preserve D2 dispatch semantics.
- Chat owning transaction không chứa remote SQL/UoW/network call. Evidence chỉ rõ handlers còn chờ T05/T06, không claim toàn D3-03.

Chạy focused rules/repository và actual changed-boundary integration một lần khi nối xong; chưa full browser/E2E. Lũy kế dự kiến2/6, local2/17. Handoff liệt kê API/schema versions, phần imported dependency đã bỏ và contract producer/consumer chưa nối. Dừng sau T04.
