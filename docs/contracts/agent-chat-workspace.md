# Agent Chat Workspace contract v1 — UX-002

Status: **Ready — product/API/data specification**, 2026-10-06, CHG-20261006-19. SRC-032 foundation đã kiểm chứng; catalog SRC-033 đã kiểm chứng backend. Các phần còn lại theo tracker, không suy toàn contract đã chạy. Contract bổ sung cho [UX](../ux/agent-chat-workspace.md), [Conversation](conversation.md), [routing](routing.md) và [rich content](rich-messages.md). Người dùng cho phép mở rộng chức năng phù hợp với sample; không giới hạn thiết kế vào API đang tồn tại.

## 1. Phạm vi và authority

Thiết kế gồm per-agent unread, số đếm hàng chờ, server search/sort, custom/shared inbox, conversation tags, durable snooze, activity feed, snippets và Contact channel navigation. Không đổi Contact/Lead semantics, owner Human/AI, tenant isolation, closed terminal hoặc unknown-send reconciliation.

Chat sở hữu read state, inbox definitions/shares, tags gắn Conversation, snooze, snippets và activity projection. CRM sở hữu Contact/identity/profile/Activity note. Identity sở hữu principal/team/quyền. Workflow/Chatflow sở hữu run state và phát notification để Chat dựng activity; không copy transcript hoặc run variables. [Data model chi tiết](../data/agent-chat-workspace.md).

Trong monolith, các application port đã định nghĩa kết hợp bằng UoW hiện hữu. Khi extraction, chỉ versioned API/events: không SQL/FK/UoW xuyên service. CRM note write không phụ thuộc Chat projection; notification có thể trễ. Chat read gateway fetch note body qua CRM authorization, không lưu body trong activity index.

## 2. Protocol, quyền và version

Endpoint **mới** dưới `/api/v1/chat-workspace`; CRM endpoint ở mục 10. Session + X-Tenant-Id, Origin/CSRF và Idempotency-Key cho mutation theo [API chung](api.md). UUID strings, timestamps RFC3339 UTC, BIGINT revision/sequence/count là decimal strings; enum case-sensitive, reject unknown request keys. Default limit50, max100. 201 create; 200 read/command/update; delete logical trả200 `{data:{id,archived:true},meta}`. Collection `{data:[],next_cursor:null|string,meta}`; singleton `{data:{...},meta}`. `meta` có correlation_id, as_of; endpoint projection thêm freshness bên dưới.

Resource update/delete cần If-Match entity version, trừ mark-read là monotonic command và tag link có composite idempotency semantics riêng. Create không cần If-Match. Replay kiểm quyền hiện hành; stale409, missing428, inaccessible404, field denial403, input400/422, unavailable503; response errors theo API chung. `CAPABILITY_UNAVAILABLE`409 cho feature chưa rollout; không fallback âm thầm sang dữ liệu có nghĩa khác.

“Chat seat” dưới đây nghĩa entitlement có chat capability (bao gồm admin entitlement hiện hành), không kiểm seat name cứng. Own scope của chat_inbox là creator_principal_id; không mượn ownership của Conversation. Inbox share là quyền đọc definition riêng, không biến thành grant object/field.

| Capability | Điều kiện server |
|---|---|
| Queue/count/read marker | Human chat seat + conversation.read scoped; marker chỉ principal của session |
| Snooze/wake | conversation.read + conversation.update scoped; không đòi owner, không đổi owner |
| Tags đọc/filter | conversation.read + field read `conversation.tags`; tag catalog chỉ với cùng field read |
| Tags attach/detach | conversation.read + conversation.update + field write `conversation.tags` |
| Tag catalog create/rename/archive | chat seat + `conversation_tag.manage` tenant scope |
| Inbox create/update/delete | chat seat + `chat_inbox.manage` (own scope); creator quản lý definition |
| Inbox share | creator + `chat_inbox.share`; recipient phải active cùng tenant; không cấp Conversation read |
| Snippet read/manage | chat seat + `chat_snippet.read`; `chat_snippet.manage` cho catalog mutation |
| Activity | conversation.read; note thêm Activity read/body ACL; workflow thêm quyền read run từ source |
| Contact channels | Contact read + identity fields allowed; Conversation navigation kiểm quyền riêng |

Seed/migration không tự cấp quyền mới cho mọi role. Migration giữ chính sách cũ; task implementation thêm quyền rõ cho admin/chat role fixtures và negative tests. UI lấy `allowed_actions` từ server, không suy quyền chỉ từ role name. AI/service actors không có read marker hoặc tạo personal inbox; automation không thay unread của Human.

## 3. Unread và metrics

Mỗi Message có `inbound_seq` tăng dần trong Conversation, chỉ cho inbound đã commit. Replay không tăng; inbound trễ theo source timestamp vẫn nhận sequence mới. Mỗi Human principal có `last_read_inbound_seq`, mặc định0. `unread_message_count = latest_inbound_seq - last_read_inbound_seq`, không âm; sequence được cấp liên tục dưới Conversation lock, rollback không để lỗ. Notes, echo outbound, activity và ownership changes không tăng unread. Quyền đọc Message theo Conversation ở baseline; field body-deny vẫn có count metadata, không có content.

GET `/conversations/{id}/read-state` trả `{conversation_id,last_read_inbound_seq,latest_inbound_seq,unread_message_count}`. POST cùng route body `{through_inbound_seq}`: 0..latest tồn tại trong Conversation, update bằng max(current,submitted) để tab cũ không hạ marker. Chỉ đánh dấu phần inbound đã render khi detail active, tab visible và người dùng đã cuộn tới phần đó; mở detail/loading/preview không đánh dấu tất cả. Không gọi provider mark-seen từ command này. Không có mark-unread thủ công ở v1.

| Metric / field | Định nghĩa chính xác |
|---|---|
| `conversation_count` | Số Conversation distinct khớp predicate, ACL và lifecycle; một Conversation có nhiều tags vẫn chỉ đếm1 |
| `unread_conversation_count` | Số trong tập đó có unread_message_count>0 của người xem |
| `unread_message_count` | Số inbound chưa đọc của một card; badge hiển thị99+ nhưng API trả số thật |
| `waiting_conversation_count` | Trong tập đó, non-closed có `waiting_since != null`; snoozed chỉ tính nếu predicate bao gồm snoozed |
| `waiting_since` / `waiting_seconds` | Thời điểm inbound đầu tiên chưa có reply được xác nhận sent; duration=max(0,as_of-waiting_since), giây nguyên |

Inbound đầu của một lượt chờ mở waiting_since bằng received_at; inbound tiếp theo không reset. Khi tạo outbound intent, persist `reply_through_inbound_seq` = latest inbound đã thấy trong transaction submit. Khi sent được xác nhận, advance answered sequence bằng max, waiting_since là inbound nhỏ nhất chưa được covered. Inbound tới trong lúc sending không bị coi đã trả lời. Human hoặc AI reply đều kết thúc phần lượt chờ covered; queued/failed/unknown/cancelled/note không kết thúc. Với provider-hosted reply chưa có causal coverage được xác nhận, không tự suy ra metric, trả `waiting_metric_state=unavailable` thay vì đoán. Closed không còn waiting; historical response/SLA KPI ngoài scope.

GET `/sidebar` trả `{scopes:[{key,team_id?,conversation_count,unread_conversation_count,waiting_conversation_count}],inboxes:[{id,name,creator_principal_id,shared,version,conversation_count,unread_conversation_count}],metrics_state:"ready"|"backfilling"}`. Built-ins: `all`, `mine`, `unassigned`, `team:<id>`, `snoozed`; all/mine/unassigned/team mặc định status=open,pending và snooze=exclude; snoozed là include-only. Inbox counts theo saved predicate. Sidebar counts độc lập search/filter tạm của panel giữa; tooltip nêu rõ. Top list total theo predicate đang áp dụng; không giả tất cả các số phải bằng nhau.

Counts/list của một response dùng cùng DB read snapshot và ACL tại thời điểm xử lý. Requests khác có thể lệch vì dữ liệu thay đổi; trả as_of, refresh5s. Không trả cached count xuyên auth revision; count lỗi/backfill hiện “—”, không0. No aggregate global rồi trừ/che client-side. Đếm theo principal, tenant, predicate/version và auth revision; không theo owner/team visibility của người tạo shared inbox.

Snapshot là local Chat read snapshot, không hứa distributed snapshot xuyên CRM/Identity. Search/Contact filters cần source authorization qua application ports ở monolith, API/batched authorized resolution khi extraction; không đọc SQL CRM trực tiếp hoặc dùng cached label để né field deny. Source authorization unavailable thì query/count phụ thuộc trả503, không trả stale global aggregate. Projection snapshot/freshness phải ghi đúng source timestamps khi extraction.

`waiting_conversation_count` nullable: nếu bất kỳ record thuộc tập có waiting_metric_state=unavailable thì trả null kèm `waiting_metric_coverage:"partial"`; đủ dữ liệu là complete. Các count Conversation/unread vẫn chính xác độc lập. waiting_longest xếp ready-waiting trước, ready-not-waiting sau, unavailable cuối; không ngụ ý unavailable là chờ0.

## 4. Queue query, tìm kiếm và phân trang

GET `/conversations`: query `scope=all|mine|unassigned|team` (default all; team yêu cầu team_id); `inbox_id?`; `status=open,pending,closed` (default open,pending); `snooze=exclude|only|include` (default exclude); `unread=any|only` (default any); `channel?`, `channel_id?`, `tag_ids?` tối đa10 UUID AND; `q?` trimmed1..100 ký tự; `sort=latest_message_desc|latest_message_asc|waiting_longest` (default latest_message_desc); limit/cursor.

`q` tìm server-side **prefix tên/label Contact được phép đọc**, chuẩn hóa Unicode NFC + casefold, không bỏ dấu, escape wildcard. Không tìm body/email/phone ngầm; UI ghi “Tìm tên liên hệ”. Conversation label không được fallback từ CRM field denied để né ACL. Full-text transcript là endpoint/gate khác chưa nằm trong scope.

Response data item: `{conversation:<existing authorized detail/list projection>,latest_inbound_seq,read_state:{last_read_inbound_seq,unread_message_count},snooze:null|{until,revision},tags:[{id,name,color}],last_message_at,waiting_since:null|timestamp,waiting_seconds:null|integer,waiting_metric_state:"ready"|"unavailable"}`. `tags` omitted khi field denied; filter denied trả403. `meta` thêm conversation_count, unread_conversation_count, waiting_conversation_count, metrics_state. Reply controls vẫn từ Conversation allowed_actions; thêm workspace_allowed_actions cho snooze/wake/tags/mark_read.

Sort last_message_at là received_at của message mới nhất, fallback opened_at; notes/rename/read không bump queue. Tie-break Conversation id cùng chiều. waiting_longest: waiting_since ascending, null cuối, id ascending. Live keyset cursor signed gắn tenant/principal/auth revision/canonical filter/sort/inbox version/last tuple, TTL5phút; auth/filter/version đổi trả409 `QUERY_CHANGED`, expired400 `CURSOR_EXPIRED`. Không cam kết snapshot toàn bộ nhiều trang: message mới có thể di chuyển item giữa lúc paging; UI dedup ID và refresh trang đầu sau mutation/poll, không dùng page length làm total. Current tab refresh không tự xóa detail đang đọc chỉ vì đã mark-read làm card rời unread queue; hiện banner “Hội thoại không còn trong bộ lọc”, giữ detail đến khi người dùng chọn khác.

## 5. Custom Inbox và chia sẻ

Inbox là **saved query**, không phải queue owner/team mới, không phải bản copy Conversation. Predicate schema1 whitelist `scope,team_id,status,snooze,unread,channel,channel_id,tag_ids` với defaults/validation mục4; status/tag_ids là arrays trong JSON, CSV khi query URL. Không lưu q/cursor/limit/inbox_id/contact filters; stored sort là field riêng. `mine` evaluate theo người xem. Không arbitrary SQL, nested expressions hoặc reference inbox khác; version mới cho grammar tương lai.

Resource `{id,name,creator_principal_id,predicate_schema_version:1,predicate,sort,version,archived,shares:[{kind:"principal"|"team",id}],allowed_actions}`. name trimmed1..80; tối đa50 active inbox/creator và50 share targets/inbox. Shares list chỉ creator/manager thấy; recipient chỉ thấy shared=true. Principal/team references cùng tenant và active khi tạo/sửa; user/team được share không có Conversation quyền thì thấy0.

- GET `/inboxes?group=all|by_me|by_others`: chỉ owned hoặc shared tới principal/team membership hiện hành, không tenant directory. Shared viewer read-only, có thể Duplicate thành bản riêng bằng create.
- POST `/inboxes` body `{name,predicate_schema_version:1,predicate,sort,shares:[]}` trả201 resource; shares khác rỗng yêu cầu chat_inbox.share.
- GET `/inboxes/{id}`; PATCH body subset name/predicate/sort, predicate_schema_version khi đổi predicate; DELETE archive; creator+manage, If-Match.
- PUT `/inboxes/{id}/shares` body `{shares:[...]}` thay set atomically bằng If-Match; revocation có hiệu lực lần fetch tiếp theo, UI bỏ selection/cache nếu404. Recipient không được sửa definition.

Trong query có inbox_id, không nhận scope/team_id/status/snooze/unread/channel/channel_id/tag_ids trực tiếp; chỉ q/sort được override tạm. Muốn chỉnh filter của inbox: UI copy predicate vào local draft, gửi query không inbox_id; **Lưu thay đổi** PATCH chỉ creator được làm, **Lưu thành hộp thư mới** POST cho người có manage. Không âm thầm ghi thay đổi vào shared view. Creator bị disable: definition giữ, chỉ eligible recipients còn được đọc; admin có chat_inbox.manage all được archive/transfer creator qua PATCH `creator_principal_id` tới Human active, audit bắt buộc.

## 6. Conversation tags

Tags ở sample được chốt thành **Nhãn hội thoại**, không gắn Contact/Lead ngầm. Một Contact có nhiều Conversation không tự chia sẻ tags. Tenant tag catalog `{id,name,color,version,archived}`; name1..40 trimmed, normalized NFC/casefold unique cả archived (rename/reuse phải explicit); color enum gray|blue|green|amber|red|purple. Max20 tags/Conversation.

GET/POST `/tags` (create `{name,color}`); PATCH `/tags/{id}` subset name/color; DELETE archive bằng If-Match. Archive giữ lịch sử link nhưng ẩn khỏi chọn mới; UI existing chip hiện “đã lưu trữ”, filter saved có archived tag vẫn match link cũ và được cảnh báo. Rename không đổi filter theo ID.

PUT `/conversations/{id}/tags/{tagId}` body `{}` attach; DELETE detach. Yêu cầu rights ở mục2 và tags field read để trả kết quả `{conversation_id,tag_ids,tag_set_revision,version}`; same link đã tồn tại/đã xóa là no-op200, idempotency bảo vệ replay; không If-Match vì thao tác tập hợp độc lập, concurrent attach/detach serialize theo conversation và commit cuối thắng. Không làm bump owner_revision; activity/audit có IDs, không note/body. Closed cho phép tag editing khi có scoped update grant (không reuse closed reply/update UI gate), không reopen.

## 7. Snooze có deadline bền vững

Snooze là overlay riêng trên Conversation `open|pending`, không thêm status enum và không gọi pending là snoozed. Chỉ hoãn hiển thị trong active inbox, **không tắt AI/Workflow, không đổi owner, không hủy outbound**. UI dialog ghi rõ tác dụng; pause automation vẫn qua flow chuyên biệt. Đây là lựa chọn nghiệp vụ trong scope người dùng đã cho phép.

PUT `/conversations/{id}/snooze` body `{until,reason?}` reason plain text tối đa250, chỉ lưu trong protected resource (không đưa log/events), deadline UTC >server now và <=30ngày. If-Match Conversation version; reply `{conversation_id,until,snooze_revision,version}`. Không nhận relative duration ở API. UI có1 giờ/chiều nay/ngày mai/tùy chọn; hiển thị absolute datetime + timezone trước xác nhận, validate DST/time đã qua.

GET cùng route trả `{conversation_id,until:null|timestamp,snooze_revision,version,reason?}`; conversation.read cho deadline, reason chỉ khi có conversation.update; deadline hết hạn trả until=null theo effective state. Lần đầu chưa có schedule revision0; reason omitted sau wake/close. GET không ghi wake/event. POST read-state trả shape read-state giống GET sau max-update và read_state_revision.

POST `/conversations/{id}/wake` body `{}` với If-Match; reply `{conversation_id,until:null,snooze_revision,version}`. Snooze/wake bump Conversation version nhưng không owner_revision. PUT reschedule bump snooze revision; durable worker đọc MySQL due index, dùng revision CAS dưới Conversation lock, không phụ thuộc Redis timer. Queue/read đánh giá deadline<=as_of là không còn snoozed, không mutate trên GET; worker hoặc command kế tiếp materialize wake dưới lock, ghi event đúng một lần. Worker chậm: activity hiển thị freshness delayed tới khi có event; không giấu hội thoại quá hạn khỏi active queue.

Wake conditions: deadline; inbound mới **không trùng**; explicit wake; assignment/takeover; close thì cancel snooze. Inbound pending vẫn chuyển open theo quy tắc cũ. Auto wake giữ open/pending hiện hữu nếu do timer/manual/assignment; không reopen closed. Scheduled worker cũ sau reschedule không được wake sớm. Inbound sau reschedule wake lần mới; duplicate inbound không đổi snooze. Events ghi cause `deadline|inbound|manual|assignment|closed`; read marker và unread không tự đổi khi wake. Timeline/card hiển thị snoozed until và reason chỉ khi authorized.

## 8. Activity feed và timeline pagination

GET `/conversations/{id}/activity?before=<cursor>&limit=50` trả page mới nhất lần đầu, data ascending theo internal `activity_seq`, `older_cursor`; poll `after=<cursor>` để lấy mới với `newer_cursor`, `has_more`. before/after loại trừ nhau; cursor opaque gắn tenant/principal/conversation/auth revision, TTL5phút. Mỗi item `{id,kind,occurred_at,recorded_at,actor:null|{kind,id,display_name?},source_ref,payload}`; không expose activity_seq vì gap có thể tiết lộ item bị che. Phần payload strict union:

- message: `{message_id,envelope:<v3 authorized projection>,inbound_seq:null|string}`; status từ source hiện hành, không snapshot sent cũ.
- note: `{activity_id,body?}` từ CRM read port, field denied không có body; unread độc lập.
- assignment: `{from_principal_id:null|UUID,to_principal_id:null|UUID,owner_revision,reason}`.
- lifecycle: `{from_status,to_status}`; snooze: `{until:null|timestamp,cause}`; tags: `{tag_id,operation:"attached"|"detached"}`.
- automation: `{source_service:"workflow"|"chatflow",run_id,definition_version_id,state:"started"|"paused"|"resumed"|"completed"|"failed"|"cancelled"}`; không run variables, prompt hoặc exception.

Message/note source refs resolve qua authority, filter lại quyền ở mỗi request. Quyền run không có thì **bỏ automation item**, không lộ tên/run ID; nguồn lỗi503 thì trả projection state partial với generic section warning, không biến mất thành kết luận “không có hoạt động”. Source-derived cursor vẫn advance qua suppressed items để không loop; không trả total count hoặc sequence gap như số hidden events.

Ordering theo commit vào Chat activity index, occurred_at chỉ giải thích trễ; late provider/workflow events append với nhãn ghi nhận trễ. Unique source service/type/id/source_revision dedup, status message được hydrate live. First page mới nhất scroll bottom, load older giữ anchor. Poll sau có thể đồng thời update status các messages đang visible qua intent/envelope read; after cursor chỉ báo thêm item, không thay cơ chế cập nhật status. Activity không phải audit log đầy đủ và không dùng để điều khiển Workflow.

Projection meta `{state:"ready"|"backfilling"|"partial",as_of,sources:[{service,state:"ready"|"delayed"|"unavailable",last_observed_at:null|timestamp}]}`. Không ghi “đã dừng” khi mới yêu cầu pause/cancel; chỉ render trạng thái từ source event đã commit. Không thêm nút stop Workflow tổng quát trong phiên thiết kế này.

## 9. Snippets

Tenant catalog `{id,title,shortcut,text,version,archived}`: title1..80, shortcut regex `[a-z0-9_-]{1,32}` unique tenant, text1..4000 plain text, không template variables/executable content. GET `/snippets?q=<prefix>` tìm shortcut/title, pagination; POST `{title,shortcut,text}`, PATCH subset, DELETE archive có manage/If-Match. Không chứa dữ liệu khách hàng mặc định.

Composer gõ `/` ở đầu dòng mở menu hoặc bấm Quick reply, lọc theo shortcut, keyboard arrows/Enter chọn/Escape đóng. Chèn vào vị trí cursor, không auto-send; tổng >4000 thì báo lỗi, không cắt ngầm. Có thể dùng cả reply/note, mode giữ nguyên. Snippet bị archive sau load không tự sửa draft đã chèn; refetch trước lần chọn mới. Mock fixture templates có thể migrate idempotently thành catalog, không duplicate theo tenant+shortcut.

## 10. Contact drawer và điều hướng kênh

CRM bổ sung GET `/api/v1/contacts/{id}/channel-identities` → `{data:[{identity_id,channel_id,platform,display_label?,external_subject_masked?}],next_cursor,meta}`; Contact read + identity field read, không lộ secret/token/provider raw payload. Schema descriptor Contact có optional `address` (plain text <=500), `preferred_language` (BCP47 <=35); dùng standard property metadata/typed values hiện hữu, không thêm bảng Contact ngành. Ghi qua CRM record PATCH hiện có + field write + If-Match; Human edit không bị provider enrichment overwrite.

Chat bổ sung filter `contact_id`, `contact_identity_id` cho GET workspace conversations, chỉ khi Contact/identity read hợp lệ qua CRM application port/API; intersection với conversation.read. Filter không hợp lệ/inaccessible trả404, không xác nhận tồn tại bên tenant khác. Khi dùng inbox_id, contact filters không được override; đi qua query riêng. Drawer click channel mở những Conversation có quyền thuộc identity đó, giữ draft và owner của mỗi record. Không tạo Conversation/outbound mới khi chưa có thread, không switch connection của Conversation hiện tại. Empty ghi “Chưa có hội thoại có thể truy cập”.

Address/Language hiển thị theo descriptor; “Ẩn/hiện trường” là preference trình bày trong phiên UI, không thay field ACL. Tags section ghi rõ **Nhãn hội thoại**. External customer read receipts, media upload/preview, gọi thoại, AI rewrite và provider control là capability khác có dependency provider/media/runtime; không coi thiếu API hiện tại là lý do bỏ các flow nội bộ đã đặc tả ở đây.

## 11. Events mới và consistency

Dùng [envelope events](events.md), schema_version1 cho **tên event mới**, outbox cùng transaction owner, inbox dedup consumer. data không chứa label/name/body/reason tự do. Actor id và tenant từ trusted context. Aggregate version là version của aggregate tương ứng, không bump owner_revision cho UI read/tag/snippet.

| Event type | Producer / aggregate | Required data |
|---|---|---|
| chat.read_marker.updated | Chat / read_state | conversation_id,principal_id,through_inbound_seq,read_state_revision |
| chat.snooze.changed | Chat / conversation | conversation_id,until nullable,snooze_revision,cause (scheduled/rescheduled/deadline/inbound/manual/assignment/closed) |
| chat.conversation_tag.changed | Chat / conversation | conversation_id,tag_id,operation,tag_set_revision |
| chat.inbox.changed | Chat / inbox | inbox_id,operation(created/updated/shared/archived/transferred) |
| chat.snippet.changed | Chat / snippet | snippet_id,operation(created/updated/archived) |
| chat.tag_definition.changed | Chat / tag | tag_id,operation(created/updated/archived) |
| automation.conversation_activity.v1 | Workflow hoặc Chatflow / source run | conversation_id,run_id,definition_version_id,source_service,state,source_revision |
| crm.conversation_note.changed | CRM / Activity | conversation_id,activity_id,operation(created/updated/archived),source_revision |

Source emits automation event chỉ khi Conversation ref tồn tại và binding tenant verified; không suy mọi run đều liên quan Chat. Consumer có allowlist producer, validate binding, dedup source revision, không regress lifecycle khi out-of-order; late history giữ đúng occurred_at. Current source fetch quyết định quyền/content; event không tự cấp quyền. Note event được publish cùng CRM commit; legacy note API unchanged. Metrics được tính từ Chat commit, không chờ event relay để tăng unread; no dual-writer counts.

Chatflow event `run_id` là session ID, source_revision là session version; running lần đầu→started, paused_human→paused, tiếp tục sau pause→resumed, completed/failed/cancelled→state tương ứng. waiting_message là chờ nghiệp vụ, không emit paused. Workflow emit started khi run bắt đầu và completed/failed/cancelled khi terminal; chỉ emit paused/resumed nếu source có transition đó thật, không map wait/timer thành pause. Nếu source chưa có monotonic run revision thì SRC-034 thêm source-owned activity revision cấp cùng transaction transition; không mượn revision từ Chat.

Tag attach/detach thực sự đổi link tăng tag_set_revision và Conversation version (không owner_revision), no-op không tăng; event aggregate_version dùng Conversation version. Read marker có revision riêng; replay/lower marker không phát event mới. Snippet/tag/inbox catalog mutation tăng version riêng. Payload projection names chỉ resolve khi có quyền, không đưa name vào event để né field policy.

## 12. Compatibility, migration và rollout

SRC-034 implementation refinement: strict additive schemas live in `packages/contracts/schemas/chat-activity.json`; source references use `{service,kind,id,revision}`. Activity cursors are authenticated encrypted positions, not readable sequence tokens. Schema22 introduces tenant rollout overrides and Workflow source activity revision. Baseline source ports provide binding validation and current source ACL; no external producer can submit arbitrary activity payload through a public endpoint. Physical details and operations: [data](../data/agent-chat-workspace.md), [runbook](../development/chat-activity.md). Runtime evidence follows [SRC-034](../tracking/details/SRC-034.md).

Không thay strict legacy DTO/status/envelope; routes mới opt-in. GET `/capabilities` trả `{contract_version:1,features:{queue_v1,read_state_v1,inbox_v1,tags_v1,snooze_v1,activity_v1,snippets_v1,contact_channels_v1}}` mỗi key boolean theo tenant rollout + implementation, không thay authorization. Chưa active thì UI không dựng số liệu giả. Backend/data migrations trước, feature flags sau verification, rồi frontend. UI layout có thể build độc lập nhưng nghiệm thu scope đầy đủ đòi các feature mới hoạt động.

Append migrations mới sau schema hiện hành tại lúc implement, không sửa1–19 hoặc gán trước số migration đang có công việc khác. Backfill sequence theo received_at/id dưới watermark và lock/catch-up; legacy Human marker khởi tạo qua rollout watermark để không biến toàn lịch sử thành unread. Principal mới sau rollout mặc định0 cho Conversation đang được phép đọc; không tự kế thừa marker của owner cũ. Counts ghi backfilling đến khi reconcile; waiting metric chỉ ready khi coverage được xác minh, legacy unknown không được đoán. Backfill activity từ Messages/notes/ownership có provenance, không tạo lịch sử automation không lưu trước đây.

Rollback UI/read-only có thể tắt flags, giữ tables và data mới. **Không rollback backend writer về bản không biết snooze/read counters trong khi feature còn active**: disable new commands, quiesce writers, wake active snoozes có audit, drain timers, giữ sequence writer forward-compatible hoặc tái backfill trước enable. Không drop dữ liệu để rollback; no schema auto-sync. Cơ chế worker timer phải vẫn hoạt động khi Redis down. Schema/generated API validators và MySQL/browser tests là deliverable implementation, không tuyên bố đã tồn tại vì contract prose Ready.

## 13. Acceptance bổ sung — kết quả theo từng sub-scope

| ID | Scenario và kết quả |
|---|---|
| UX-CHAT-13 | 2 Human đọc cùng Conversation: marker riêng; 2 tab cùng Human không lùi; inbound mới/replay/late đúng count; notes/outbound không tăng |
| UX-CHAT-14 | Sidebar/list metrics với nhiều tags/teams/shared view, field deny/ACL revoke: distinct và đúng viewer, không leak; lỗi không hiển thị0 |
| UX-CHAT-15 | Search server qua nhiều trang, Unicode prefix, sort ties, live movement và expired/changed cursor: không hứa snapshot giả, refresh/dedup đúng |
| UX-CHAT-16 | Create/share/revoke/duplicate/transfer inbox; mine theo viewer; thiếu Conversation grant thấy0; recipient không sửa được definition |
| UX-CHAT-17 | Tags rename/archive/concurrent attach/detach/max20/cross-tenant: đúng ID/link/revisions/ACL; không gắn tag sang Contact khác |
| UX-CHAT-18 | Snooze→reschedule→old worker, restart/Redis outage, duplicate inbound/new inbound, takeover/close race: wake đúng một revision, closed không reopen |
| UX-CHAT-19 | New inbound trong outbound sending; failed/unknown rồi reconcile; out-of-order sent: waiting coverage không che tin chưa trả lời, unavailable không là0 |
| UX-CHAT-20 | Activity duplicate/out-of-order/CRM unavailable/run denied/notes body deny: không leak, cursor đi tiếp, source freshness và trạng thái thật |
| UX-CHAT-21 | Snippet keyboard/4000/archived/permissions và Contact channel navigation: không auto-send, giữ draft riêng, field ACL không bị vượt |
| UX-CHAT-22 | Migrate từ schema19 có dữ liệu, watermark/catch-up, old clients, feature flags/rollback: giữ lịch sử/owner, không unread explosion, không mất snooze |

Design hoàn tất không đóng AC runtime. Implementation chia tuần tự theo [build plan](../planning/agent-chat-workspace.md); kết quả backend và phần UI/release chưa chạy được ghi riêng trong [acceptance](../quality/acceptance.md).

## SRC-032 exact implementation slice — schema20

Contract schema: packages/contracts/schemas/chat-workspace.json and generated OpenAPI/client. Implement queue/read_state capabilities first; inbox/tags/snooze/activity/snippets/contact_channels false until dependent tasks pass. page_id query retained for compatibility; name normalization precisely NFC + JavaScript locale-independent lowercase, no accent stripping or wildcard interpretation. Standard non-read action semantics remain unchanged.

Schema20 DDL is apps/backend/src/kernel/database/workspace-migration.ts: Conversation/Message sidecars, per-Human read_state, immutable rollout principal cohort and Conversation inbound cutoff. No snooze/tag columns until their task migration. Operator must quiesce API/worker during DDL/cutoff capture; migration CLI runs resumable Conversation backfill after DDL, bounded200-message pages per locked Conversation. Runtime dual-writes after per-Conversation preparation; capability fails closed with WORKSPACE_BACKFILLING until all tenant rows exist. Existing schema readers/writers keep baseline behavior before schema20; never rollback to old writer after enable without reconciliation.

Query UoW uses REPEATABLE READ for local counts/page snapshot and live Identity tenant authorization lock; other UoWs retain READ COMMITTED. Counts scan bounded100-row batches through existing authorization and CRM/Channel ports, retain only limit+1 output candidates; no cross-service SQL. This is a correctness-first local implementation, not a production load/SLO claim. Cursor binds hashed authorization context and expires5min. Read-state event revision is independent of Conversation owner/version. Runtime tests/evidence tracked in SRC-032.

## SRC-033 exact catalog slice

CHG-20261006-21: forward schema21 adds inbox/share, tag/link and snippet tables plus tag_set_revision. Catalog mutations hold the existing tenant authorization exclusive lock (local monolith) to serialize quotas/unique names/share sets; Conversation tag writes also lock registry record. NFC + locale-independent lowercase applies to tag name uniqueness and snippet prefix matching. Identity owns active Human/team reference validation. All updates retain If-Match and durable idempotency, actor/tenant trusted context, current authorization replay checks. Catalog cursor is signed, viewer/auth/filter-bound, TTL5min; lists omit archived catalogs, while attached archived tags remain projected with archived=true. Catalog events are validated no-reapply notifications; activity projection follows in SRC-034. New grants only enter explicit seed fixtures, never automatic migration of existing role permissions. Exact JSON Schema and migrations are source deliverables before endpoint integration.

SRC-033 catalog collection meta adds allowed_actions (create when authorized), including empty collections, so UI does not infer create permission from role names. Predicate input permits omitted default fields; projected predicate is fully normalized. Human chat principals without Conversation grants may read shared definitions; queue evaluation returns an empty authorized set rather than granting access. Snooze-only saved predicates remain CAPABILITY_UNAVAILABLE until SRC-034.

## Current runtime compatibility — SRC-041 (target superseded by UX-006)

User decision CHG-20261007-08: `conversation.need_response` remains read-only boolean|null, but incoming customer text alone is not evidence a reply is needed. New inbound (including first inbound) sets the current assessment to null (“Chưa xác định”). A valid Workflow/Chatflow update action can set true (“Cần trả lời”) from either an Agent Assist proposal or a fixed rule. Current implementation has no suggestion-update action/producer, so pending inbound remains null. Do not infer true from waiting_since, unread, ownership, message direction or keyword rules.

Confirmed sent reply covering all current inbound sets false (“Đã phản hồi”); subsequent inbound resets null. If inbound arrives while sending, a sent result covering only older inbound leaves null. Notes and queued/sending/failed/unknown/cancelled outbound cannot mark replied. Closed projects false but renders “Đã đóng”. Missing/unsupported/unavailable coverage remains null. The current projection uses existing tenant-scoped workspace causal coverage; no stored column/migration. Optional additive schema handles older responses and durable historical replay.

Existing waiting_since/waiting_seconds/counts describe unanswered inbound coverage, not an AI decision that a response is necessary. UI uses neutral “chưa phản hồi” counts; show “Khách chờ” timer only when need_response===true. Do not silently redefine metric/sort SQL. These values remain independent of lifecycle and per-user unread.

UX-005 / CHG-20261007-09 splits provider-independent Conversation suggestion fields/update action from Workflow/Chatflow orchestration. Assist only proposes using configured skills/read permissions; the orchestrator service actor validates and writes suggestion fields. Rule-only flows use the same update action. No direct Assist CRM write/public send. Classification/Next action is a documented design extension, not a current API capability: see [Assist design](../ux/agent-assist-response.md). Must complete exact persistence, schema/auth/API and adapter design before enabling writes. No manual toggle endpoint or fabricated assessment is introduced by SRC-041.

## Target typed next action — UX-006 / CHG-20261007-10

Conversation.next_action is nullable and has a registered type: response, create_lead, create_ticket, close_chat initially. need_response is not an independent target attribute; “Cần trả lời” is the UI mapping of type=response. All types are suggestions only. Rule or Assist outputs are validated/applied by the same authorized Workflow/Chatflow update action; Assist does not directly write or publicly send.

List UI uses type, not a parallel boolean or inferred last-message direction. Null means no current suggestion/unknown, not responded; unknown future type has a neutral fallback. Sent reply is independent delivery evidence; it may resolve the current response suggestion at the matching revision, not create-lead/ticket/close suggestions. New inbound invalidates previous-turn suggestions. One current suggestion in this scope.

Exact payload, enum registration, persistence/ACL/revisions, compatibility retirement of legacy need_response and orchestrator contracts remain PLAN-008. Existing machine schema/runtime above is historical/current compatibility and not yet migrated. [Type catalog and UI mapping](../ux/agent-assist-response.md).
