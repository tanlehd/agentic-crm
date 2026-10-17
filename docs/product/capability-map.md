# Bản đồ tính năng theo mục tiêu và người sử dụng

2026-10-17 · PLAN-039 · CHG-20261017-02. Quy ước tổ chức tài liệu và trình bày sản phẩm đã được người dùng chấp thuận. Phân nhóm này dùng cho tài liệu tính năng, UX, hướng dẫn, demo và presentation; không phải chứng nhận runtime hoặc exact contract cho các chức năng tương lai. Trạng thái triển khai lấy từ [task tracker](../tracking/tasks.md) và evidence của từng phạm vi.

## Trục tổ chức thống nhất

Mỗi nhóm bắt đầu từ **người sử dụng → mục tiêu công việc → năng lực/tính năng → kết quả quan sát được**. Giữ mã nhóm ổn định; thứ tự trình bày có thể thay đổi theo người nghe. Module/service là lớp truy vết kỹ thuật, không phải mục lục chính của presentation sản phẩm.

Mỗi tính năng có một nhóm chính theo mục tiêu, có thể tham chiếu sang nhóm liên quan. Người sử dụng, người cấu hình, người quản lý và người được chia sẻ phải ghi riêng khi khác nhau. Một người có thể đảm nhiệm nhiều vai trò; persona không tự cấp permission, seat hoặc quyền dữ liệu.

## Các nhóm mục tiêu

| Nhóm | Người sử dụng chính | Mục tiêu và tính năng thuộc nhóm | Kết quả cần minh họa | Hiện trạng và nguồn đối chiếu |
|---|---|---|---|---|
| G01 — Xử lý hội thoại và nhu cầu | Chat agent, nhân viên tư vấn | Inbox, lịch sử hội thoại, phân loại nhu cầu theo phiên, thông tin liên quan, hỗ trợ Human/AI, view cá nhân để chọn việc tiếp theo | Tìm đúng hội thoại, hiểu ngữ cảnh, phản hồi và ghi nhận nhu cầu | Custom Inbox SRC-083, phân loại/related Lead–Deal SRC-078, need enrichment SRC-081 có local evidence; AI provider thật còn gate. [Inbox](../development/custom-inbox.md), [Conversation](../development/thread-conversation.md), [Need](../development/need-follow-up.md) |
| G02 — Chuyển nhu cầu thành cơ hội bán hàng | Sales agent, sales manager | Lead qualification, bàn giao/nhận Lead, follow-up, liên kết Contact, tạo Deal và cập nhật giai đoạn/giá trị | Lead có đầu mối xử lý, bàn giao liên tục, theo dõi cơ hội đến won/lost | Organic Lead/Deal base đã có phạm vi local; won value khác tiền đã thu; thư viện nhiều list view Lead/Deal chưa đồng nhất với Inbox. [Phạm vi Sales](../contracts/organic-sales-base.md), [Kế hoạch kết quả CRM](../planning/crm-base-outcomes.md) |
| G03 — Giải quyết yêu cầu hỗ trợ | Service agent, service supervisor | Ticket, pipeline xử lý, SLA và escalation, liên kết hội thoại/CRM | Yêu cầu có người phụ trách và theo dõi đến giải quyết | Phạm vi đích; runtime Ticket và saved views còn gate riêng. [Module Ticket](../modules/ticket.md) |
| G04 — Tổ chức và điều phối công việc đội ngũ | Team lead, supervisor, sales/service manager | View chung, hướng dẫn ưu tiên, phân công/chuyển owner/team, Human takeover, theo dõi việc chờ/bàn giao | Đội ngũ biết việc cần xử lý và ai chịu trách nhiệm | Inbox share user/team đã có; team-owned views, quyền cùng sửa, bộ view và công bố toàn workspace chưa có. Routing/lifecycle khác saved view. [View/queue](../references/agent-workspace-queues-views.md), [Workspace contract](../contracts/agent-chat-workspace.md) |
| G05 — Thiết kế dữ liệu và không gian làm việc | Tenant admin, CRM administrator | Object & Properties, associations/ERD, form, record detail/preview, hiển thị object trong workspace, users/seats/roles/teams | Dữ liệu và giao diện phù hợp công việc, phạm vi truy cập rõ ràng | Object Platform SRC-073/074 và record pages SRC-080 có phạm vi local; lifecycle nâng cao/connected consumers còn gate. [Object Platform](../development/object-platform.md), [Record pages](../development/record-pages.md), [Identity](../modules/identity.md) |
| G06 — Tự động hóa và hỗ trợ Human/AI | Người thiết kế quy trình, automation admin, người quản lý AI | Workflow/Chatflow, điều kiện/nhánh/delay, follow-up, cấu hình AI/tool/policy và bàn giao Human | Quy trình lặp lại được thực hiện có kiểm soát, có khả năng phục hồi | M2 engine/CMS và need follow-up có scoped evidence; provider thật, generic CRM/Kafka/custom-object execution còn gate tương ứng. [Workflow CMS](../development/workflow-cms.md), [Workflow plan](../planning/workflow-platform.md), [Agents](../modules/agents.md) |
| G07 — Đo lường và cải thiện kết quả | Business analyst, business manager, marketing/sales manager | Report Builder, saved reports, dashboards, funnel/attribution và báo cáo organic | Đọc kết quả đúng metric/grain/phạm vi để quyết định cải thiện | Dashboard/Report Builder có local/mock evidence, organic Sales có phạm vi riêng; connected Reporting và Marketing không được suy từ mock. [Dashboard](../development/dashboard-workspace.md), [Reporting](../planning/report-builder.md), [CRM outcomes](../planning/crm-base-outcomes.md) |
| G08 — Vận hành và bảo đảm hệ thống | Platform operator, integration administrator | Cấu hình kết nối, health, delivery/retry, audit/trace, phục hồi và quản lý runtime | Phát hiện/điều tra lỗi, khôi phục xử lý và giữ dữ liệu | Local service manager và reliability có runbook; kết nối/provider thật và service extraction phải theo gate. [Vận hành local](../development/service-manager.md), [Security/operations](../system/security-operations.md), [Services](../services/README.md) |

Đây là nhóm năng lực, không phải tám menu bắt buộc và không thay đổi owning service. Các năng lực xuyên suốt như tenant isolation, authorization, audit và accessibility phải nêu tại luồng liên quan; mô tả quản trị/vận hành chi tiết ở G05/G08.

## Áp dụng cho Filter / Saved View / Agent Workspace

Filter là điều kiện chọn bản ghi. Saved list view lưu định nghĩa danh sách, gồm filter/sort và presentation khi consumer hỗ trợ. Record page view là layout của một bản ghi. Routing queue quản lý nhận/phân công công việc khi có lifecycle tương ứng. Không dùng chung từ “view” mà bỏ qua loại và mục tiêu.

| Nhu cầu | Nhóm chính | Nơi cấu hình theo định hướng | Phạm vi hiện tại |
|---|---|---|---|
| Agent chọn việc của mình | G01; G02/G03 khi có consumer | Tạo/sửa view ngay workspace; agent preference chứa ghim/ẩn/thứ tự/view mặc định cá nhân | Inbox có tạo/sửa/nhân bản; preference đầy đủ và shared library Lead/Deal/Ticket chưa triển khai |
| Team lead định hướng việc chung | G04 | Agent Workspace → Views, lọc theo team; trang Team liên kết tới cùng cấu hình | Share từng Inbox cho user/team đã có; chưa có team ownership/co-edit/publishing |
| Admin định nghĩa workspace | G05 | Agent Workspace: object, view chuẩn, phạm vi sử dụng và quyền quản lý | Tab hiện tại cấu hình hiển thị object; chưa có thư viện view tập trung |
| Admin thiết kế thông tin một bản ghi | G05 | Object & Properties → Record detail page / Record preview page | Default và layout theo team đã có cho consumer được hỗ trợ; không phải list filter |

Định hướng chia sẻ theo **từng view**; tách người sử dụng và người quản lý. Ghim/ẩn/thứ tự cá nhân không sửa định nghĩa của team. Chia sẻ không mở rộng quyền dữ liệu. Hiện chỉ có owner cá nhân + chia sẻ user/team; phạm vi toàn workspace/team ownership và quyền đồng biên tập cần exact contract trước code. Cấu hình dùng chung chỉ có một nguồn, nhiều điểm truy cập; không tạo bản sao độc lập tại Agent setting và Team management.

Định hướng điều hướng: chọn object/workspace, sau đó chọn view từ danh sách dọc theo nhóm cá nhân/team/dùng chung; tab ngang dành cho nội dung chi tiết, hoặc số ít view đã ghim nếu đặc tả UX sau này chọn. Đây là định hướng thiết kế, không đổi app shell hay triển khai menu mới trong PLAN-039.

Hiện tại: Inbox có danh sách saved inbox dọc; Lead có Sales queue filters và CRM list; Deal có dropdown stage; Ticket chưa có workspace hoàn chỉnh. Generic CRM có một default list view tại Object & Properties → Thiết lập → Biểu mẫu tạo & danh sách. Các nút ngang chọn object và tab record detail không phải thư viện list views. [Inbox contract](../contracts/custom-inbox-builder.md), [Record-page contract](../contracts/record-pages.md).

## Quy tắc tài liệu, demo và presentation

Mục lục sản phẩm dùng G01…G08 hoặc tập con phù hợp người nghe. Mỗi phần đi theo thứ tự: người dùng và vấn đề → mục tiêu → luồng thao tác → kết quả → phạm vi đã có/còn kế hoạch. API, bảng dữ liệu, service và task IDs đặt trong tham chiếu/phụ lục kỹ thuật. Roadmap giữ dependency kỹ thuật; presentation giữ trục mục tiêu, không lấy thứ tự commit hoặc lịch sử build làm câu chuyện chính.

Mẫu tối thiểu cho một mục tính năng hoặc cụm slide:

| Trường | Nội dung cần ghi |
|---|---|
| Nhóm chính / nhóm liên quan | Gxx; tham chiếu nhóm khác thay vì mô tả hai bản mâu thuẫn |
| Người dùng / người cấu hình | Ai thao tác hàng ngày; ai thiết lập, quản lý/chia sẻ |
| Mục tiêu | Công việc cần hoàn thành và tình huống bắt đầu |
| Luồng / tính năng | Chuỗi thao tác cụ thể, vị trí trong workspace |
| Kết quả | Bằng chứng người dùng thấy được; không cam kết KPI chưa đo |
| Phạm vi và trạng thái | Đã triển khai với evidence; thiết kế; hoặc kế hoạch/chưa hỗ trợ; ghi local/mock/live và giới hạn |
| Nguồn chuẩn | Contract/module, acceptance/evidence, task; ngày rà soát |

Ví dụ G04: “Team lead chia sẻ Inbox ‘Chờ tiếp nhận’ cho nhóm tư vấn; agent mở view để thấy hội thoại phù hợp trong quyền hiện tại.” Demo được dùng phần share user/team đã có SRC-083. Team-owned view, bộ view và ghim mặc định cho cả team phải nằm ở phần kế hoạch, không trình bày như chức năng đã chạy.

Tài liệu module/service/contract hiện hữu giữ cấu trúc chuyên môn và nguồn chuẩn. Khi bổ sung hoặc sửa tài liệu sản phẩm/UX/hướng dẫn, gắn nhóm chính và người dùng theo bản đồ này. Presentation tương lai phải đối chiếu tracker/evidence ở thời điểm tạo; bản đồ không thay thế nguồn trạng thái. Không có deck hoặc thay đổi runtime được tạo trong task này.

## Acceptance tài liệu PLAN-039

- DOC-G01: các nhóm có persona, mục tiêu, tính năng, kết quả và nguồn; phân biệt current/future.
- DOC-G02: Filter/list view/record layout/routing có ranh giới; agent/team/admin và sharing có phạm vi rõ.
- DOC-G03: README, vision, doc index, UX hub và quy tắc thay đổi dẫn tới cùng bản đồ; mẫu presentation dùng cùng mã nhóm.
- DOC-G04: kiểm tra liên kết/Markdown và whitespace; ghi evidence trong execution log. Runtime NOT_RUN vì chỉ sửa tài liệu.
