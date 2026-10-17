# Agent Workspace: filter, saved view và routing queue

PLAN-037 — Codex, 2026-10-17. Research/recommendation only; không thay Ready contracts, không thêm bảng/API/source. Dependency SRC-033/SRC-074/SRC-082 DONE; claim trong tracker trước authoring. Public official documentation và local source inspection, không đăng nhập/test tenant của vendor. Mô hình đề xuất dưới đây không phải physical database của respond.io/HubSpot.

## Kết luận

Saved View có thể là một đối tượng cấu hình có ID, tên, version và quyền chia sẻ, nhưng membership của danh sách vẫn tính bằng filter. Routing Queue là đối tượng điều phối: công việc vào hàng, chờ nhận, được reserve/assign, chuyển hàng hoặc rời hàng. Hai khái niệm cùng tồn tại; chữ “queue” trên UI không đủ xác định mô hình dữ liệu.

Workspace là môi trường làm việc: navigation/views → danh sách → detail/composer → customer context/actions. Nó lắp ghép các capability; không cần một business object Workspace gom và sở hữu mọi hồ sơ.

## Đối chiếu sản phẩm

| Sản phẩm | Tổ chức danh sách | Phân công/xử lý | Ý nghĩa kiến trúc |
|---|---|---|---|
| respond.io | Standard/Team Inboxes; Custom Inbox lưu điều kiện, hỗ trợ nested conditions, private/public/shared users/teams | Assignment là hành vi riêng của conversation | Custom Inbox là reusable filtered list; tài liệu không chứng minh có QueueItem độc lập |
| HubSpot Help Desk | Default/custom views trên Ticket; private/team/everyone; filter Ticket và associated Contact/Company; table/split/board | Routing theo channel, users/teams, availability, distribution; team-only có thể chưa có Ticket owner | Tách view, Ticket và routing configuration; không dùng Help Desk Ticket để suy diễn mọi legacy Conversations Inbox |
| Jira Service Management | Queue hiển thị work items đáp ứng filter; có thể dùng JQL | Công việc vẫn là Jira work item | Dù tên Queue, membership danh sách là query |
| Dynamics 365 / Dataverse | Queue và QueueItem là entity được tài liệu hóa | Queue item tham chiếu object, queue, người đang xử lý; thao tác pick/route/release | Có đối tượng runtime cho việc ở trong hàng, ngoài hồ sơ gốc |

Nguồn trực tiếp:

- [respond.io — Managing Custom Inboxes](https://respond.io/help/inbox/managing-custom-inbox).
- [HubSpot — Organize teams and views in help desk](https://knowledge.hubspot.com/help-desk/organize-teams-and-views-in-help-desk).
- [HubSpot — Route tickets in help desk](https://knowledge.hubspot.com/help-desk/route-tickets-in-help-desk).
- [Atlassian — Use queues to triage requests](https://support.atlassian.com/jira-service-management-cloud/docs/triage-customer-requests-for-your-agents-with-queues/).
- [Atlassian — Make queues for your team](https://support.atlassian.com/jira-service-management-cloud/docs/make-queues-for-your-team/).
- [Microsoft — QueueItem entity reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/queueitem).
- [Microsoft — Work with queues](https://learn.microsoft.com/en-us/dynamics365/customer-service/use/work-with-queues).

Salesforce search excerpt cũng phân biệt queue và list view, nhưng direct Help page trả CSS Error trong phiên; không dùng để kết luận chi tiết schema/runtime. Không suy đoán schema nội bộ vendor từ giao diện.

## Bốn lớp nên phân biệt

| Lớp | Ví dụ | Dữ liệu/cấu hình |
|---|---|---|
| Business record | Conversation, session, Lead, Ticket | Nội dung, trạng thái nghiệp vụ, owner/team, liên kết, revision do service nghiệp vụ quản lý |
| Filter | Chưa có owner và đang mở | Biểu thức field/operator/value; có thể chỉ tồn tại tạm trong UI/request |
| Saved View | “Facebook chưa trả lời”, “Của tôi” | ID, tên, resource type, predicate, sort, presentation, creator, share, version |
| Routing Queue | “Tư vấn tiếng Việt”, “Chuyển Human” | Admission/routing rules, eligible team/agents, ưu tiên, capacity/dispatch policy; membership runtime nếu cần |

Một Conversation có thể xuất hiện ở nhiều view cùng lúc. Xóa view không đóng/xóa Conversation, đổi filter không chuyển owner. Ngược lại, chuyển queue hoặc nhận việc là command có kiểm quyền và concurrency; không phải kéo record giữa các danh sách chỉ để đổi cách nhìn.

Team là nhóm người/quyền; Queue là nơi tổ chức công việc. Team có thể phục vụ nhiều queue; queue có thể dùng nhiều team nếu nghiệp vụ cho phép. Không đồng nhất queue membership với record ACL. “Chưa đọc”, “chưa trả lời”, “chưa có người nhận” và “snoozed” là bốn điều kiện khác nhau.

## Đề xuất cấu hình logical

Các tên dưới đây là logical candidates, không DDL/migration hoặc API Ready. Mọi cấu hình/bản ghi/link/audit nếu triển khai đều phải có tenant_id NOT NULL, version và tenant-scoped keys theo guideline hiện có.

| Thành phần | Trường chính đề xuất | Ý nghĩa |
|---|---|---|
| ViewDefinition | id, tenant_id, resource_type, name, predicate_schema_version, predicate, sort, display, created_by, version, archived_at | Lưu định nghĩa query và presentation; không lưu danh sách ID kết quả làm authority |
| ViewShare | tenant_id, view_id, subject_kind, subject_id, access | Quyền đọc/quản lý definition; không cấp quyền record |
| WorkspacePreference | tenant_id, principal_id, surface, pinned_view_ids, order, default_view_id | Sở thích navigation của từng người, tách khỏi shared definition |
| QueueDefinition | tenant_id, id, name, supported_resource_types, eligibility, priority/dispatch policy, policy_version, enabled | Cấu hình điều phối khi có nhu cầu thực |
| WorkItem | tenant_id, id, queue_id, resource_ref, episode_ref, reason, entered_at, state, priority, lease/fence, assignment_operation_ref, version | Runtime lần đưa việc vào hàng; chỉ cần khi phải ghi lịch sử chờ/offer/claim/requeue |

resource_ref gồm service/type/id; episode_ref cần khi công việc gắn với một lượt trên cùng conversation_id. Không tạo bản sao nội dung Conversation/Lead/Ticket trong WorkItem. Một session có thể phát sinh nhiều loại công việc; cần chốt uniqueness theo loại việc/lượt nhập hàng, không áp unique conversation_id toàn cục. Thực thi chỉ có một claim thắng cho cùng công việc.

Với saved list đơn thuần, chỉ cần các thành phần view/share/preference; không cần QueueDefinition/WorkItem. Với team chưa có agent nhận, dữ liệu owner/team hiện có cũng đủ tạo view. Thêm WorkItem khi cần offer/accept, reservation, retry/requeue, SLA chờ phân công hoặc thống kê lịch sử vào/ra hàng.

Filter tương lai nên là cây AND/OR có kiểu dữ liệu, giới hạn độ sâu/số điều kiện; field ID và operators lấy từ catalog đã kiểm quyền. Biến như current user/current teams được backend resolve theo người đang xem. Không lưu arbitrary SQL. Related-object filter phải dùng API/projection được service nguồn cho phép, có freshness và xử lý unavailable; không join SQL xuyên service. Đây là extension tương lai; predicate v1 hiện tại không hỗ trợ nested expressions.

Ví dụ cấu hình ở mức ý nghĩa: view “Facebook chưa có người nhận” chọn Conversation đang mở, channel Facebook, owner rỗng, loại snoozed; sort người chờ lâu trước; chia sẻ team tư vấn. Routing rule riêng quyết định gán team nào và có tự phân agent không. Mở view không kích hoạt rule. Đổi thứ tự list không tự đổi dispatch priority. Chờ phản hồi khách và chờ phân công phải dùng timestamp/KPI riêng.

## Áp dụng vào repository hiện tại

- [Workspace contract](../contracts/agent-chat-workspace.md), mục 5, đã định nghĩa Inbox là saved query; không phải owner/team mới. Predicate schema1 whitelist scope/team/status/snooze/unread/channel/channel_id/tag_ids, sort riêng. Mine theo viewer. Không lưu q/cursor/limit, không nested SQL/expressions.
- [Workspace data design](../data/agent-chat-workspace.md) có chat_inbox + chat_inbox_share, Chat sở hữu; [source catalogs](../../apps/backend/src/modules/conversation/workspace-catalogs.ts) có persistence/validation. SRC-033 DONE backend; không suy ra full UI lifecycle/share đã hoàn tất vì SRC-036/037 còn riêng trong [plan](../planning/agent-chat-workspace.md).
- [Object Platform R1](../contracts/object-platform-r1.md) có object_workspace_config cho label/navigation/enable/display property. Nó không phải routing queue. Record detail/preview view theo [record pages](../contracts/record-pages.md) là bố cục một hồ sơ; không phải saved filter của danh sách.
- [Routing service](../services/routing.md) quy định policy/reservation/assignment proposals; service sở hữu resource vẫn quyết định owner bằng CAS. Shared predicate editor/catalog có thể tái sử dụng, nhưng không tạo shared SQL hoặc service thứ hai ghi owner.
- [Conversation identity](../contracts/conversation-identity.md): giữ conversation_id canonical, session_id là episode. View list hội thoại và view lịch sử session phải khai báo grain khác nhau để tránh nhân đôi hội thoại/sai badge.

Khuyến nghị: giữ hướng saved inbox cho conversation list; thống nhất khái niệm ViewDefinition ở UI/contract khi có scoped design, tận dụng catalog; giữ Chat là owner của cấu hình Inbox hiện tại. Chỉ mở task QueueDefinition/WorkItem riêng khi cần vòng đời phân công. Không vội tạo một custom business object “Queue” trong Object & Properties.

## Cấu trúc màn hình đề xuất và nghiệm thu tương lai

Agent Workspace: sidebar các view hệ thống, view của team, view cá nhân; danh sách với filter tạm; mở detail theo resource type. “Lưu thành view” tách “Lưu thay đổi view”; sort/columns/layout và share được cấu hình trong view editor. WorkspacePreference quản lý ghim/thứ tự. Queue/routing settings dành cho người quản lý vận hành, cấu hình nơi nhận việc, người đủ điều kiện, cách phân và overflow. Record page builder giữ trong cấu hình layout.

Các scenario đề xuất, NOT_RUN: cùng record xuất hiện nhiều view nhưng không nhân đôi công việc; view share không lộ record/field/count; current-user predicate theo viewer; archive view không đổi owner; hai agent nhận việc chỉ một thắng; policy revision đổi không tự viết lại lịch sử; session mới không tái dùng claim cũ; requeue có lượt mới và lý do; capacity/revoke/takeover giữ authority và fencing. Trước code phải có scoped contract, data ownership/table templates nếu thêm bảng, compatibility/migration notes và task dependency Ready.

## Evidence và giới hạn

Đã đọc README/build plan/tracker/checkpoint, kiểm git status, local contract/data/ownership/module/service/acceptance và source catalogs/config. Working tree main base99130b2 đã dirty từ SRC-081/082; giữ nguyên source và tài liệu trước đó. Phiên này chỉ thêm research và cập nhật tracking. Commands/check results ghi trong [execution log](../tracking/log.md). Không runtime/vendor portal tests, không dịch vụ restart/DB mutation/commit/push/deploy; services không fresh-check. Không subagents/schedules.
