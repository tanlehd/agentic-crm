# Agent Chat Workspace — đặc tả UX rebuild

Status: **Ready — thiết kế UX và product contract mở rộng**, UX-002, 2026-10-06, CHG-20261006-19; kế thừa layout UX-001. [Contract mới](../contracts/agent-chat-workspace.md) bổ sung metrics, đối tượng và flow phù hợp từ sample. Đây là thiết kế đích; giao diện chưa rebuild, backend đang triển khai tuần tự theo tracker; [build plan](../planning/agent-chat-workspace.md) quy định thứ tự triển khai và gate.

## 1. Mục tiêu và nguồn tham chiếu

Tổ chức lại Inbox để agent chọn hàng chờ, đọc hội thoại, trả lời và xem hồ sơ khách hàng trong cùng một màn hình. Vùng chat là vùng làm việc chính; Contact/qualification là ngữ cảnh phụ có thể đóng mà không làm mất hội thoại.

Ảnh người dùng gọi `agent_workspace_chat_sample` được lưu tại [agent_workspace_chat_layout_sample.png](agent_workspace_chat_layout_sample.png). Dùng cấu trúc và tỷ lệ thị giác của ảnh; khung đỏ, mũi tên và nhãn đen là chú thích, không đưa vào sản phẩm. Không sao chép tên, avatar, email, điện thoại hoặc nội dung hội thoại trong ảnh làm fixture.

Nguồn hành vi: [Conversation](../modules/conversation.md), [Conversation API](../contracts/conversation.md), [routing](../contracts/routing.md), [rich messages](../contracts/rich-messages.md), [contact-bound compatibility](../contracts/contact-resolution-local.md), [channel configuration](../contracts/facebook-configuration.md), [Chatflow](../contracts/chatflow.md). Dữ liệu theo [dictionary](../data/dictionary.md), [ownership](../data/service-ownership.md) và [Chat service](../services/chat.md). UX không thay state machine, quyền, ownership hay service boundary.

## 2. Cấu trúc màn hình

```text
┌──────┬──────────────┬────────────────┬───────────────────────────────────────┐
│ App  │ Inbox        │ Search/filter  │ Conversation actions                  │
│ rail │ sidebar      │                ├────────────────────┬────────────┬─────┤
│      │              ├────────────────┤ Messaging console  │ Context    │Tool │
│      │ All/Mine/    │ Conversation   │                    │ drawer     │rail │
│      │ Unassigned   │ list           │ Timeline           │ Contact /  │     │
│      │ Team         │                │                    │ Qualify /  │     │
│      │              │                │                    │ History    │     │
│      │              │                ├────────────────────┤            │     │
│      │              │                │ Reply / Note       │            │     │
│      │              │                │ Composer           │            │     │
└──────┴──────────────┴────────────────┴────────────────────┴────────────┴─────┘
```

Header hội thoại chạy ngang toàn vùng bên phải danh sách, gồm cả drawer/rail như ảnh. Search/filter nằm trên danh sách, không đặt ngang toàn ứng dụng. Không bọc toàn bộ workspace trong các card có margin lớn; chia cột bằng border 1px.

### Kích thước và responsive

Các kích thước dưới đây là quyết định triển khai, không phải đo pixel tuyệt đối từ ảnh. Dùng CSS Grid/Flex với `min-width:0`, `min-height:0`; chiều cao workspace bằng phần viewport còn lại dưới shell, dựa trên `100dvh`. Chỉ có một bộ tenant/user controls trong shell.

| Vùng | Desktop >=1440px | Quy tắc |
|---|---|---|
| App rail | 56px | Cố định; icon 20px, vùng bấm tối thiểu 40px |
| Inbox sidebar | 220px | Thu gọn hoàn toàn bằng nút trong header danh sách; không sinh rail icon thứ ba |
| Conversation list | 300px | Filter cố định phía trên, list cuộn riêng |
| Conversation body | Phần còn lại, tối thiểu 480px | Header 64px; timeline co giãn; composer neo dưới |
| Context drawer | 280px | Mặc định mở Contact trên desktop; đóng trả diện tích cho chat |
| Tool rail | 44px | Luôn sát phải vùng detail; chỉ có công cụ khả dụng |

Ở 1440px, tổng các cột cố định là 900px, chat còn 540px. Không dùng tỷ lệ khiến composer bị ép hẹp khi drawer mở.

- 1280–1439px: sidebar 200px, list 280px; drawer mặc định đóng và mở dạng overlay rộng 320px, không ép chat.
- 1024–1279px: sidebar mặc định thu gọn; list 280px và chat song song; sidebar mở dạng overlay 240px, context overlay 320px.
- 768–1023px: sidebar ẩn; list 260px và chat phần còn lại; context overlay tối đa 360px. Header actions ít dùng vào menu, không tràn ngang.
- <768px: một pane tại một thời điểm: list → chọn hội thoại → detail; nút Quay lại giữ filter và vị trí list. Context mở sheet toàn chiều rộng. App navigation thu gọn, không chiếm thêm cột. Composer nằm trên bàn phím ảo, không che tin cuối.
- Overlay có backdrop, focus trap, Escape/Đóng và trả focus về nút mở. Desktop drawer docked không trap focus. Không kéo resize trong lần rebuild này.
- Kiểm layout tại 1440×900, 1280×800, 1024×768, 768×1024, 390×844; zoom 200% phải reflow, không có thanh cuộn ngang toàn trang.

## 3. App rail và Inbox sidebar

App rail: logo/tenant ở trên, Chat/Sales/CRM/Admin/Operations theo quyền ở giữa, tài khoản ở dưới. Dùng route hiện có; icon Chat có nền xanh nhạt và chỉ dấu active. Icon luôn có accessible name và tooltip. Không đưa campaign, report builder, notification count hoặc online presence vào chỉ để giống ảnh.

Sidebar có tiêu đề **Hộp thư**, nút thu gọn và các lựa chọn **Tất cả / Của tôi / Chưa phân công**. “Tất cả” nghĩa là mọi hội thoại trong quyền đọc hiện tại và filter trạng thái đang chọn. “Của tôi” map principal hiện tại, không map account ID. Nhóm **Theo nhóm** dùng team mà người dùng được phép đọc; khi chưa lấy được nhãn team, giữ bộ lọc team ID hiện có trong Bộ lọc, không suy đoán tên/quyền.

Một scope active tại một thời điểm. Đổi scope/filter reset cursor và selection; giữ draft theo hội thoại trong bộ nhớ. Sidebar hiển thị conversation_count, chấm unread khi unread_conversation_count>0; tooltip nêu cả hai số và phạm vi. Số đếm đến từ `/chat-workspace/sidebar`, không tính số dòng đã tải. Thêm mục **Đang tạm ẩn** (Snoozed). Custom Inbox có nút **+**, nhóm **Tất cả / Của tôi / Được chia sẻ**; icon khóa cho cá nhân, icon nhóm cho shared. Count của shared inbox tính theo quyền người xem.

Tạo Inbox: đặt tên → chọn trạng thái/owner/team/kênh/tags/unread/snooze và sort → xem preview số khớp → chọn cá nhân hoặc chia sẻ với principal/team → lưu. Creator được sửa/chia sẻ/xóa; recipient được xem/nhân bản nếu có quyền tạo, không sửa definition. Filter tạm có nhãn **Chưa lưu**, CTA **Lưu thay đổi / Lưu thành mới**; không ghi ngầm vào shared inbox. Thu hồi share đóng view và xóa cache; không làm mất draft của Conversation vẫn được phép đọc.

## 4. Search/filter và Conversation list

Header danh sách gồm chọn kênh **Tất cả kênh**, nút tìm kiếm và nút **Bộ lọc**. Input **Tìm tên liên hệ** tìm prefix phía server trên toàn bộ tập có quyền, debounce300ms, clear và không khớp riêng; abort request cũ. Không tìm body/email/phone ngầm. Kết quả có tổng số từ server và as_of; không dùng kết quả của request trước khi query đã đổi.

Bộ lọc có trạng thái `open/pending/closed`, owner scope, team, channel/Page, tags (khớp tất cả), **Chỉ chưa đọc** và snooze. Mặc định `open,pending`, Tất cả, Tất cả kênh, loại snoozed. Thay channel xóa Page selection không hợp lệ; options có quyền. Hiện chip filter và **Xóa bộ lọc**; giữ nhập Page ID ở nâng cao. SLA không gộp với thời gian chờ.

Dòng sort có **Tin mới nhất / Tin cũ nhất / Chờ phản hồi lâu nhất**, dùng sort server/keyset theo contract. Bên cạnh hiển thị số Conversation khớp và số đang chờ; thời gian chờ trên card ghi **Khách chờ 12 phút**, cập nhật từ waiting_since/as_of. Đây là đồng hồ chờ phản hồi, không cam kết SLA. Metric chưa xác minh hiện “Chưa có dữ liệu”, không0.

Mỗi conversation card: padding 12px, gap 8px, cao tối thiểu 104px (tự tăng nếu zoom); avatar initials 32px + platform icon, tên một dòng, giờ, preview tối đa hai dòng, trạng thái và owner Human/AI/team. Selected dùng nền xanh nhạt + viền xanh + `aria-current`; hover nhạt hơn. Không dựa vào màu để phân biệt chọn hay trạng thái.

Preview dùng `latest_message` có quyền. Không có tin: “Chưa có tin nhắn”; field denied: “Nội dung bị giới hạn”; rich có text projection thì dùng projection, không tự suy ra nội dung từ payload bị che. Tên fallback “Liên hệ chưa có tên”; avatar không tự fetch URL provider. Card unread dùng tên semibold + badge số inbound chưa đọc (99+ nếu lớn), accessible label số thật; marker theo agent, không phải khách đã đọc. Chip Snoozed ghi hạn thức dậy; tags tối đa2 chip + số còn lại mở tooltip/pane.

Chọn card tải đúng detail; list giữ vị trí cuộn và selection qua poll. Tải thêm dùng cursor API và nút **Tải thêm**; loading không nhân đôi card. Record rời filter vì mark-read/snooze/assignment: giữ detail có quyền đang đọc, hiện banner **Không còn trong bộ lọc**; card rời list, draft giữ. Nếu mất quyền thì xóa detail ngay. Không tự mở record đầu tiên hoặc tự nhận ownership. Cursor expired/query changed: tải trang đầu và thông báo, không mất draft.

## 5. Conversation actions

Trái: avatar, tên Contact/label có quyền, kênh + Page, badge trạng thái. Phải: owner selector với badge **Human/AI**, team, **Tiếp quản** khi được phép, menu trạng thái và **Đóng hội thoại**. Tooltip không chứa thông tin bị field-deny.

- Owner selector tải assignment-targets; chỉ submit target hợp lệ qua assignment command. Dialog hiển thị owner hiện tại → owner mới, team và hành động xác nhận; reason theo enum contract, không tự thêm free text.
- Tiếp quản chỉ có khi `allowed_actions` cho phép. Không tự takeover khi focus composer hoặc bấm Gửi. Sau thành công, refresh detail, controls và history; Lead owner không đổi.
- Đóng/Pending/Open dùng transition command, phiên bản If-Match và lý do bắt buộc. Dialog Đóng nêu queued sẽ bị hủy, sending có thể vẫn hoàn tất. Closed là terminal, không có nút reopen; inbound mới là conversation mới theo domain.
- Nút đồng hồ **Tạm ẩn** mở dialog1 giờ/chiều nay/ngày mai/tùy chọn, hiển thị deadline và timezone; lưu bằng snooze command. Banner **Tạm ẩn đến…** có **Đánh thức ngay**. Dialog nói rõ chỉ hoãn khỏi hàng chờ, AI/Workflow vẫn chạy. Tin inbound mới, đổi owner/takeover hoặc đến hạn đánh thức; close hủy deadline. Snoozed là overlay, không thay `pending`. Nút gọi và SLA là capability riêng.
- Header vẫn nhìn thấy khi cuộn timeline. Mobile giữ tên + status + menu; actions trong menu vẫn ghi nhãn rõ, không chỉ icon.

## 6. Messaging console

Timeline nền trắng, padding 20px desktop/12px mobile. Tin inbound bên trái, nền trung tính; outbound bên phải, nền xanh rất nhạt; max-width bubble 78%, giới hạn 640px. Nội dung xuống dòng, wrap URL dài, không render HTML. Date separator và timestamp theo locale/timezone UI nhất quán; tooltip thời gian đầy đủ. Thứ tự authoritative theo `received_at/id`, không đảo theo `occurred_at` khi tin tới trễ.

Trạng thái ghi bằng text/icon theo dữ liệu: received, queued, sending, sent, failed, unknown, cancelled. `sent` không có nghĩa khách đã đọc/đã nhận; không dùng dấu tick kép xanh của ảnh làm read receipt. Tin chờ phải đối chiếu bằng message/intent ID, không append trùng sau poll.

Activity endpoint mới trả trang gần nhất, display ascending và scroll bottom; **Tải lịch sử trước** dùng older cursor, giữ anchor. Poll after cursor thêm item mới và refresh delivery status các tin đang thấy. Khi ở cuối, bám cuối; đang đọc phía trên thì giữ scroll và hiện **Có tin mới**. Sau render inbound khi detail active/tab visible, gửi marker tới inbound sequence đã thấy; marker monotonic giữa nhiều tab. Mở preview hoặc tab hidden không đánh dấu đã đọc. Marker thể hiện đã xem tới vị trí đó, bao gồm lịch sử trước vị trí; không phát provider read receipt.

Rich renderer giữ envelope v3: metadata media với nhãn chưa có preview, gallery/card và CSAT ở chế độ đọc, reply resolved/unresolved/inaccessible đúng contract, unknown có fallback an toàn. Không bật download/remote preview/CSAT action bằng URL trong payload.

Ghi chú nội bộ nền vàng nhạt, icon khóa và nhãn **Ghi chú nội bộ — không gửi cho khách**. Activity feed mới hợp nhất message/note/assignment/lifecycle/snooze/tag/automation theo thứ tự ghi nhận; body note vẫn lấy từ CRM với Activity ACL. Dòng workflow started/paused/completed chỉ từ event đã commit và quyền source run; dữ liệu nguồn chậm có banner **Hoạt động tự động có thể cập nhật chậm**. Không hiển thị body/variables/prompt của run. Ownership history drawer giữ chức năng tra cứu chuyên biệt. Legacy notes/messages APIs giữ compatibility, không làm cursor giả ở client.

## 7. Composer: Trả lời và Ghi chú

Composer cố định dưới timeline, border 1px, radius 12px, padding 12px; textarea tối thiểu 88px, tăng tối đa 200px rồi cuộn bên trong. Hai mode **Trả lời / Ghi chú nội bộ** có draft riêng; chuyển mode không gửi hay xóa draft. Nút primary ghi **Gửi** hoặc **Lưu ghi chú** theo mode.

Mode Trả lời hiển thị kênh/Page gắn với Conversation. Bấm kênh mở **Hội thoại trên kênh khác** từ Contact identities được phép đọc; chọn kênh điều hướng tới Conversation tương ứng, không đổi connection của draft hiện tại hoặc gửi sang kênh mới ngầm. Chưa có thread thì hiện empty, không tạo thread/outbound. Toolbar có **Mẫu trả lời**, hỗ trợ `/shortcut` và keyboard picker từ snippet catalog; chèn text có thể sửa, không auto-send. Attachment/microphone/AI rewrite chỉ hiện khi capability provider/media/runtime được triển khai, không là nút rỗng.

- Text tối đa 4000 ký tự, không gửi blank; hiển thị counter khi gần giới hạn và lỗi tại field. Enter xuống dòng, Ctrl/Cmd+Enter gửi khi hợp lệ; có gợi ý phím tắt, không gửi khi IME đang composition.
- Reply dựa vào `allowed_actions.reply`, current owner và revision đã review; note dựa vào `allowed_actions.note`, không yêu cầu current owner. Closed chỉ đọc theo baseline UI.
- Không phải owner: hiển thị lý do và Tiếp quản nếu được phép, giữ draft nhưng khóa send. Owner revision thay đổi: banner “Phân công đã thay đổi”, refresh và yêu cầu **Đã xem phân công mới** trước khi dùng draft; không tự mở lại send sau poll.
- Gửi pending khóa submit lặp; 202 hiển thị queued, không báo sent. Mất ACK giữ nguyên payload + idempotency key; chỉ cho kiểm tra lại cùng yêu cầu. Không sửa payload rồi gửi lại bằng key cũ. `unknown` cần kiểm tra delivery, không có auto-resend.
- Draft và pending request chỉ ở bộ nhớ, phân tách tenant/conversation/mode. Đổi conversation giữ draft trong cùng tenant; reload/tab close có thể mất và phải có cảnh báo rời trang khi còn draft. Đổi tenant/logout xóa dữ liệu tenant cũ theo chính sách, không lưu transcript vào localStorage.

## 8. Context drawer và tool rail

Rail phải có **Liên hệ / Qualification / Lịch sử phân công** khi có dữ liệu/quyền tương ứng. Chỉ một pane mở; bấm icon đang active đóng drawer. Đổi pane không đổi hội thoại, không reset timeline/draft. Đổi hội thoại reset nội dung drawer và scroll về đầu, không để dữ liệu Contact trước xuất hiện trong lúc tải.

**Liên hệ:** avatar initials, tên, Contact ID, kênh/Page; email/phone/address/preferred_language theo CRM descriptor và field ACL; attribution CTM/ad source; **Kênh liên hệ** mở identities có quyền. Thiếu dữ liệu hiện “Chưa có thông tin”; field denied không biến thành editable empty. **Quản lý** mở CRM editor có phiên bản/quyền; fields optional mới address/language được thiết kế trong contract. **Ẩn/hiện trường** chỉ đổi trình bày, không thay quyền.

Phần **Nhãn hội thoại** dưới drawer: chip màu + tên, nút **+** tìm/chọn catalog; người có manage được tạo nhãn với tên/màu. Nút x gỡ link sau explicit click, undo là attach lại có quyền; không xóa catalog. Rename/archive ở màn quản lý nhãn, có version conflict. Tags thuộc Conversation hiện tại, không tự áp dụng mọi cuộc trò chuyện cùng Contact; filter và chip cùng dùng tag ID.

**Qualification:** chuyển form/session có sẵn vào drawer; giữ service/need, suggested so với validated, consent evidence, Lead status và Hoàn tất/Mở Lead theo contract. Consent không tự checked từ quảng cáo. Không mất form nháp khi đổi pane; completion có validation/CAS và trạng thái submit; đổi conversation không đưa draft qualification sang Contact khác.

**Lịch sử phân công:** API history được phép đọc, owner/revision/reason/thời gian; empty/loading/forbidden riêng. Nếu không có quyền, ẩn công cụ hoặc thay bằng thông báo quyền khi quyền vừa bị thu hồi. Đây không phải activity history đầy đủ hoặc workflow log.

## 9. Data/API binding và giới hạn scope

Các API hiện hữu bên dưới là compatibility baseline. Rebuild đầy đủ dùng [workspace contract mới](../contracts/agent-chat-workspace.md): `/chat-workspace/sidebar`, `/conversations`, read-state, inboxes/shares, tags, snooze/wake, activity, snippets và CRM channel-identities. Quyền/session/CSRF/idempotency vẫn bắt buộc; frontend không gọi DB/provider trực tiếp. Backend/data đi trước frontend; source hiện tại vẫn monolith tới extraction DONE.

| Vùng/action | Binding hiện có / authority | Điều kiện |
|---|---|---|
| Queue/detail | GET `/api/v1/conversations`, `/conversations/{id}`; Chat | Scoped read, filters/cursor, latest_message/allowed_actions |
| Channel/Page options | GET `/api/v1/conversation-channels`; Channels | Tenant/field ACL, phân biệt mock và configured Page |
| Timeline | GET `/api/v1/conversations/{id}/message-envelopes-v3`; Chat | Envelope v3 theo rich contract; không đổi wire fields |
| Reply | POST `/api/v1/conversations/{id}/messages`; Chat | Giữ transport UI hiện tại `{text,owner_revision}`; Contact binding từ conversation, actor riêng |
| Delivery | GET `/api/v1/conversations/{id}/outbound-intents/{intentId}` | Status thật, không suy ra từ HTTP submit |
| Notes | GET/POST `/api/v1/conversations/{id}/notes`; CRM Activity qua Chat | Conversation + Activity ACL riêng |
| Assignment/history | `/api/v1/records/{id}/assignment-targets`, `/assignment`, `/ownership-history` | Theo routing contract; không PATCH owner tùy ý |
| Takeover/transition | POST `/api/v1/conversations/{id}/takeover`, `/transition` | If-Match, quyền hiện hành và reason đúng contract |
| Contact/qualification | Detail summary, CRM metadata editor, component Chatflow và channel-identities mới | Giữ session/consent semantics; address/language theo descriptor |

Backend đã có `/messages-v2` yêu cầu `crm_contact_id` theo SRC-030 nhưng UI hiện dùng `/messages`. Rebuild giữ route cũ, kể cả replay pending request; chuyển UI sang v2 cần compatibility task riêng, không đổi endpoint giữa một yêu cầu và retry của nó.

Backend vẫn kiểm quyền mỗi mutation dù UI đã bật nút. Poll 5 giây khi tab visible, ngừng khi hidden; resume refetch. Tenant-keyed cache, abort request cũ và chống response trễ ghi đè selection mới. 401 yêu cầu đăng nhập; 403/404 xóa nội dung không còn được đọc; lỗi mạng có banner và Retry, giữ draft, không hiển thị trạng thái thành công giả. Không trộn lỗi notes/context với kết luận toàn hội thoại rỗng.

**Đã thiết kế và thuộc scope rebuild đầy đủ:** per-agent unread/counts/waiting metrics, server name search/sort, personal/shared inbox, snooze, conversation tags, unified activity, snippets và điều hướng kênh liên hệ. Thiếu API hiện tại được giải quyết bằng contract/data design mới, không tự loại chức năng khỏi sản phẩm.

**Capability riêng chưa mở rộng ở UX-002:** customer read/delivery receipts từ provider, full-text transcript search, SLA calendar/escalation, media upload/resolver, voice/call, AI rewrite, provider thread-control, live socket/typing/presence và tạo outbound mới trên kênh khác. Các phần này cần semantics/provider evidence khác; layout dành chỗ nhưng không hiện control giả. Read marker của agent không thay customer receipt.

Compatibility/migration: contract mới additive, forward migrations cho sidecars/read/inbox/tag/snooze/activity/snippet; không sửa strict API/state enum cũ. Có event family và quyền mới, backfill/watermark/feature flags/rollback trong contract. Source schema/client phải sinh và kiểm khi implementation; thiết kế Ready không có nghĩa migration đã chạy. Không coi Facebook configuration là real send/capture→Chat đã hoàn tất.

## 10. Visual system và accessibility

Font system sans; body 14/20px, metadata 12/16px, tiêu đề vùng 16/24px semibold. Spacing 4/8/12/16/24; nền chính trắng, rail/sidebar trung tính nhẹ; border `#D8DEE8`, text chính `#1F2937`, text phụ `#64748B`; selected/bubble outbound `#EFF6FF`, action/focus `#2563EB`. Màu cần được đo contrast khi build; không tự ghi đạt AA chỉ từ palette.

Button/control tối thiểu 36px desktop, target 44px touch; focus ring 2px rõ. Mỗi scroll pane có accessible label; keyboard đi theo app nav → sidebar → filters → list → header → timeline → composer → context. Nút mở pane có expanded/controls. Error liên kết input; trạng thái gửi dùng live region polite, không đọc lại toàn transcript mỗi 5 giây. Giảm animation theo reduced-motion. Tên dài bị truncate có cách xem đầy đủ bằng focus/tooltip; không overflow hoặc chỉ dựa tooltip hover.

## 11. Acceptance cho task build tiếp theo

Các case dưới đây là yêu cầu kiểm thử, **NOT_RUN cho giao diện rebuild**. Không thay bằng chứng SRC-016/031 cũ.

| ID | Scenario | Kết quả bắt buộc |
|---|---|---|
| UX-CHAT-01 | Mở desktop 1440×900 | Đúng các vùng ảnh, header trên chat+context; timeline/list/context cuộn độc lập; composer luôn thấy |
| UX-CHAT-02 | 1280,1024,768,390 và zoom 200% | Collapse/overlay theo breakpoint, không tràn ngang; back giữ list; keyboard không che composer |
| UX-CHAT-03 | Đổi scope/channel/Page/search, tải nhiều trang | Server prefix/sort đúng, metrics/read badge có dữ liệu và ACL, cursor/reset đúng |
| UX-CHAT-04 | Human owner gửi, ghi note, dùng quick reply | Message/note tách biệt, template chỉ chèn text; status thực, không duplicate sau poll |
| UX-CHAT-05 | AI→Human takeover, owner đổi giữa lúc soạn | Revision review, draft giữ, quyền send kiểm lại; Lead owner giữ nguyên; queued/sending hiển thị thật (AC-06/18) |
| UX-CHAT-06 | Mất ACK/409/unknown/failed | Retry đúng key/payload, không blind resend, không ghi sent giả; lỗi field/version rõ |
| UX-CHAT-07 | Close/pending/open và inbound sau close | Reason/If-Match, closed read-only, không reopen/snooze ngầm |
| UX-CHAT-08 | Alpha/Beta switch, response trễ, 403/field deny | Không lộ draft/name/preview/count/media/contact tenant cũ; quyền context/note độc lập (AC-01/02) |
| UX-CHAT-09 | Rich/unsupported/reply inaccessible | Passive renderer/fallback đúng; không fetch URL ngoài hoặc kích hoạt CSAT |
| UX-CHAT-10 | Cuộn đọc lịch sử khi poll, tải thêm | Activity cursor, source ACL và status hydrate đúng; giữ anchor/dedup, mark-read sau render |
| UX-CHAT-11 | Đóng/mở Contact/Qualification/History | Đúng selection, dữ liệu/quyền, giữ draft; consent và completion không đổi (AC-09) |
| UX-CHAT-12 | Loading/empty/network/hidden tab/keyboard | Skeleton không lộ tenant trước, retry đúng pane, polling dừng/resume, focus/labels/contrast được kiểm |

Evidence build cần screenshot synthetic cho các breakpoint, browser interaction cho reply/note/takeover/tenant/error và flow mới, regression thích hợp với code đổi và command/log references. UX-CHAT-13…22 tại [contract](../contracts/agent-chat-workspace.md) bổ sung counts/unread/inbox/tags/snooze/activity/migration cases; tất cả là runtime NOT_RUN. UX-001/002 chỉ nghiệm thu thiết kế, không đóng các runtime case này.
