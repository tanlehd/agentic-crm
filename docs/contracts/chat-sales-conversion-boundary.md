# Chat → Sales: bàn giao nguồn và báo cáo conversion

CHG-20261024-01, Ready. Review theo clarification của user2026-10-24, sửa kết luận CHG-20261023-25 về contribution-apply. Áp dụng cho SRC-109/T06; [nghiệm thu theo owner](../governance/service-delivery-scope.md), [source attribution](crm-source-attribution.md), [Customer360](customer-360-session.md) và [connected conversion](conversion-reporting.md).

## Ranh giới Chat, agent và workspace — CHG-20261024-02

User chốt2026-10-24: Chat quản hội thoại dù workspace kết nối CRM/Sales. Vị trí nút tạo object trong Chat workspace không đổi owning service của object.

| Thành phần | Trách nhiệm |
|---|---|
| Chat | Conversation/session, messages/history, owner/control, lifecycle và close; kiểm quyền/version/idempotency khi nhận command; phát bền vững chat/message/session-close events theo contract hiện hữu |
| Agent / Workflow | Nhận chat events/context có quyền để xử lý; gửi send/close hoặc command được cấp quyền về Chat. Runtime/inference/orchestration thuộc owner tương ứng, không nhúng vào Chat để nghiệm thu Chat |
| Workspace / BFF | Khi tạo CRM/Sales object từ một phiên đang chọn, tự truyền conversation_id và session context chính xác vào create command của owning service; hiển thị receipt thật |
| CRM / Sales | Kiểm quyền tạo object, tenant/Contact/source binding qua Chat API; lưu object cùng source/context refs và receipt trong own transaction; xử lý lifecycle nghiệp vụ của object |
| Reporting | Đọc owner facts/lineage để suy conversion, chọn rõ session hay conversation grain; không yêu cầu Chat giữ bản sao lifecycle CRM/Sales |

Workspace giữ context của thao tác đang thực hiện qua submit/retry, không lấy một session mới đang active để thay nguồn khi người dùng đổi tab/phiên hoặc retry. Context gửi từ UI không tự là authority: owner kiểm session thuộc đúng tenant/conversation/Contact và quyền hiện hành. Action từ workspace tự gán nguồn theo contract của object; create từ màn hình khác không có context vẫn giữ manual semantics, không đoán từ Contact hoặc phiên active gần nhất.

CHG-20261024-03 implementation scope ([UI verification](../development/chat-workspace-source.md), seven synthetic browser scenarios PASS; not native Sales acceptance): Customer360 pins tenant/conversation/Contact/session và selected Lead (nếu tạo Deal từ Lead) khi mở create dialog. Polling close/reopen của cùng conversation không remount draft, không đổi source hoặc mất idempotency key của request lỗi đang retry. Tenant/conversation/Contact đổi thì mở scope mới, không tái dùng draft/key cũ. Đóng dialog chủ động kết thúc draft; không tuyên bố lưu draft/retry qua reload/navigation hoặc browser restart. Historical explicit session create vẫn do owner kiểm theo contract hiện hữu; source pin không cấp quyền. Manual create ngoài workspace giữ nguyên; không thêm field cho object chưa hỗ trợ.

Phân biệt **nguồn gốc** và **context tạo/chăm tiếp**: Lead/direct Deal từ phiên dùng session nguồn đã xác minh; Deal tạo từ Lead kế thừa nguồn Lead, đồng thời có thể ghi created context của phiên hiện tại. Không ghi đè immutable origin để thỏa việc “tự gán nguồn”. Quy tắc này áp dụng các workspace actions được hỗ trợ; không suy mọi generic/Draft object đã có source fields, API hoặc runtime từ tuyên bố kiến trúc. Owner contract quyết định physical mapping, không thêm generic source table/framework trong Chat.

Chat commit close và outbox atomic, sau đó relay theo transport hiện hành; agent consumer xử lý close/cancellation ở owner của nó. Agent đến muộn vẫn phải qua owner/control fence của Chat; delivery ACK không thay receipt của command hay chứng minh consumer business đã hoàn tất. Giữ pending/unknown send đúng evidence. Human Chat không phải chờ AI runtime/inference triển khai xong; không mở lại Chatflow đã retire hoặc tự chuyển Kafka.

Workflow owns follow-up/recover_need policy, orchestration and acceptance. Chat supplies authorized lifecycle commands and durable events. A dedicated recovery endpoint or Sales-outcome recovery saga is not a Chat completion gate.

## Authority và điểm hoàn tất

- Chat cung cấp đúng tenant/Contact/conversation/session/source và xử lý lifecycle của phiên. Một kết quả bàn giao Lead/Deal đã tạo phải dựa trên receipt thành công của Sales; publish request chưa tự là Lead created. Việc đóng Chat không đợi Sales convert Lead hoặc Deal won, và không cần Sales ghi ngược outcome contribution vào Chat.
- Sales sở hữu Lead/Deal đã tạo, source refs, handoff/acceptance, liên kết context, chuyển đổi Lead→Deal và stage/won/value. Deal từ Lead giữ nguồn gốc Lead; phiên chăm tiếp/closing không thay primary origin.
- Reporting tự lấy/project dữ liệu qua authorized domain API/events và suy conversion từ Chat attribution/lifecycle cùng Sales Lead/Deal lineage. Source adapter, snapshot/facts, registry metadata cho report và joins thuộc nghiệm thu Reporting; không tạo gate Chat. `contribution-apply` không phải dữ liệu bắt buộc hay điều kiện nghiệm thu cho conversion hoặc Chat extraction. Không tạo reverse callback, source-proof saga hoặc outbox delivery mới chỉ để nhân bản kết quả Sales vào Chat.

## Bằng chứng trong source hiện tại

| Source | Hành vi đã thấy khi review |
|---|---|
| `services/core-baseline/src/modules/sales/source.ts` | Lead giữ conversation_id, conversation_session_id và immutable source_conversation_session_id |
| `services/core-baseline/src/modules/sales/deals.ts` | Deal có lead_id; Deal từ Lead sao chép sourceKeys; stage/won/amount/currency do Sales ghi |
| `services/core-baseline/src/modules/sales/conversion-port.ts` | Trả Lead/Deal/source, merge/context/need-outcome từ Sales |
| Chat domain API/events; legacy SQL port removed in T09 | Trả sessions/needs; chỉ dùng Chat contributions opened/assignment để xác định initial owner/team, không dùng kind=outcome để tính conversion |
| Reporting owner adapter integration backlog; legacy baseline source removed in T09 | Nối session với Lead/Deal theo immutable origin; tách via_lead_session_id/direct_session_id; context chỉ giúp current attention, không nhân revenue |
| `services/reporting/src/conversion-catalog.ts` | Đếm distinct origin session có Lead, distinct session có Deal won; nhánh qua Lead dùng via_lead_session_id, direct Deal là nhánh riêng |

Model đủ để suy số hội thoại có Lead và số hội thoại qua Lead có Deal won, không cần Chat nhận callback outcome. KPI đã triển khai hiện có grain **session**, không phải unique conversation: một conversation có nhiều session. Nếu report chọn grain conversation, quy về session.conversation_id rồi COUNT DISTINCT theo cùng tenant/cohort/lineage; không cộng các session rates hoặc đếm số Lead làm số hội thoại. Đây là quy tắc đọc model, không tuyên bố đã thêm report conversation-grain trong phiên review.

Close/status là lifecycle xử lý của Chat; created/won là business facts của Sales. `services/chat/src/ownership-close.ts` hiện ghi close_reason=agent_closed; chưa tìm thấy nhánh auto-close hoặc enum lead_created trong source được rà. Không tự thêm close reason, đổi state machine hoặc tuyên bố auto-close đã chạy. Dù Chat đã đóng, Sales thay đổi stage vẫn được report suy ra từ nguồn Sales mà không cập nhật lại Chat.

## Compatibility và disposition

`appendSalesContext` của baseline hiện còn gọi `contribute(kind=outcome)` trong cùng UoW. Đây là mirror cho lịch sử hoạt động, không phải nguồn chuẩn conversion. Sự tồn tại của write cũ không bắt buộc tạo API mới để duy trì mirror sau extraction.

- **Không triển khai/mount contribution-apply trong D3**; catalog/schema giữ lại như thiết kế cũ chưa triển khai, disposition `not-required`. Không còn gate source-proof cho endpoint này.
- Giữ Sales source/context/outcome authority, IDs/receipts và compatibility của thao tác bàn giao đang dùng. Giữ read-need/session-source và Chat-local opened/assignment/message/note/classification contributions; không xóa toàn bộ contribution ledger.
- Giữ các outcome rows lịch sử và ACL khi đọc; không reset/backfill giả. Nếu cần UI hiển thị kết quả Sales mới, đọc nguồn Sales có quyền hoặc lập projection như feature riêng, không dùng nó để chặn Chat/Reporting conversion acceptance.
- T09 vẫn phải fence/remove đúng `appendSalesContext → contribute` cho tenant đã chuyển; không cho Sales viết DB Chat và không fallback ghi bản Chat cũ. Giữ Sales context write, idempotency và source refs. Writer fence là việc cutover tối thiểu, không phải lý do xây reverse callback. Baseline đang chạy chưa bị sửa trong phiên review này.
- Workflow business recovery is accepted separately. Cutover fences old Workflow direct Chat SQL; unavailable integration must not fall back to the baseline writer.

Quyết định boundary không đổi DDL/migration hoặc public DTO, không yêu cầu triển khai service khác. Tiến độ thực thi hiện hành nằm tại [tracker](../tracking/tasks.md); trạng thái lịch sử của phiên review không là hướng dẫn tiếp tục.

## Evidence review2026-10-24

Windows PowerShell, pinned Node24.21.0/pnpm10.33.0 qua `scripts/dev-shell.ps1`. Logs dưới `artifacts/chat-extraction/conversion-scope-20261024`; working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 dirty, không tạo commit. Không thay runtime source; test mới kiểm source payload/query engine bằng synthetic fixtures, không phải native multi-service acceptance.

| Lệnh đã chạy | Kết quả | Artifact |
|---|---|---|
| `pnpm exec vitest run services/reporting/tests/conversion.test.ts` | PASS10, gồm closed Chat sessions giữ nguyên trong khi Sales open→won làm via-Lead won count1→2 và overall won2→3; with-Lead vẫn2 | `conversion-tests.log` |
| `node --test scripts/tests/chat-scope-review.test.mjs` | PASS6; contribution-apply không còn thuộc boundary gate, legacy fence vẫn được ghi rõ | `scope-tests.log` |
| `node scripts/chat-runtime-inventory.mjs` | PASS79candidate operations/83registrations;21unmounted gồm9boundary/5protocol-choice/1not-required/3AI/2removed/1superseded;4review groups OPEN | `inventory.log`, `runtime-inventory.json` |
| `node scripts/generate-chat-owner-contracts.mjs --check` | PASS238operations/670schemas; wire unchanged | `contracts.log` |
| `node scripts/lint.mjs` | PASS1067JS/TS files | `lint.log` |

Docs/link and scoped whitespace checks are recorded in `docs.log`/`whitespace.log`; `manifest.json` records actual source hashes, and `tracked.diff` covers tracked files only. No DB/native process/build/image/cutover tests were run in this review; no new service gate or deployed status is claimed.
