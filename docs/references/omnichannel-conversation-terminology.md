# Thuật ngữ omnichannel: Conversation, Thread và Session

REV-20261029-02 · CHG-20261029-04 · Codex · 2026-10-29. Nghiên cứu tài liệu chính thức và chuẩn hóa cách diễn đạt theo yêu cầu người dùng. Không thử tài khoản vendor, không đổi source/API/schema. Định nghĩa nội bộ chuẩn tại [glossary](../product/glossary.md); identity/wire tiếp tục theo [Conversation identity](../contracts/conversation-identity.md).

## Kết luận đối chiếu

Không có một nghĩa chung cho Conversation hoặc Session ở mọi hệ omnichannel. Tên giống nhau không đảm bảo cùng đơn vị dữ liệu, cùng quy tắc mở/đóng hoặc cùng cách tính phễu. Salesforce tách rõ Conversation và MessagingSession; respond.io gọi lượt tương tác là Conversation; Intercom/Chatwoot dùng Conversation với quy tắc tiếp tục/mở lại riêng; HubSpot dùng Thread trong Conversations API. Dynamics Session còn có thể tăng khi chuyển agent.

| Hệ | Thuật ngữ đã xác minh | Ý nghĩa và giới hạn đối chiếu |
|---|---|---|
| Salesforce Enhanced Messaging | Conversation → MessagingSession; ConversationEntry | Conversation tập hợp một hoặc nhiều messaging sessions/voice calls theo messaging user/channel. MessagingSession là object vận hành chính. Mô hình phân lớp gần với CRM hiện tại; không suy quy tắc CTM, stage hay outcome của mình từ Salesforce. [S1](https://developer.salesforce.com/docs/service/messaging-object-model/guide/messaging-object-model.html) |
| respond.io | Contact → Conversations | Một Contact có nhiều Conversations với context khác nhau, tối đa một open trong Workspace. Report có Conversation ID, opened/closed timestamps, channel/source, category và ad attribution. Gần với ý nghĩa lượt tiếp nhận của mình, nhưng phạm vi Contact/Workspace khác Conversation theo channel của mình. [R1](https://respond.io/help/quick-start/responding-to-messages), [R2](https://respond.io/help/dashboard-reporting/reports-conversations) |
| Intercom | Conversation; Ticket là khái niệm riêng | Facebook có thể sinh Conversation mới khi khách quay lại sau hơn 5 ngày đóng; các cuộc trước vẫn tra cứu được. Không phải một Conversation vĩnh viễn cho một khách, cũng không chứng minh mọi lần close đều tạo ID mới. Trang có cả cách viết 5+ và hơn 5; equality không được kiểm thử. [I1](https://www.intercom.com/help/en/articles/326-connect-your-facebook-channel) |
| HubSpot Conversations API | Thread, Messages; associated Ticket | Route dùng `/conversations/v3/conversations/threads/{threadId}`, thread có OPEN/CLOSED và associatedTicketId. Đây là tên API, không chứng minh Thread là object nằm trên một Conversation object khác hoặc tương đương một phiên CTM của mình. [H1](https://developers.hubspot.com/docs/api-reference/legacy/conversations/conversations/threads/update-conversation) |
| Chatwoot | Contact, Inbox, Conversation | UI quản Conversation, có Open/Pending/Snoozed/Resolved và tài liệu mô tả tự reopen khi khách trả lời. Conversation không mặc nhiên là một lượt bất biến sau mỗi close. Không suy một policy duy nhất cho tất cả channel/config từ trang hướng dẫn này. [C1](https://www.chatwoot.com/hc/user-guide/articles/1677231493-lesson-2-dashboard-basics) |
| Microsoft Dynamics 365 | Conversation → Omnichannel Session | Tài liệu metrics mô tả một Conversation có nhiều Sessions, thêm session khi escalation sang agent khác. Session ở đây không tương đương lượt khách quay lại; không áp transfer→new session cho CRM. [M1](https://learn.microsoft.com/en-us/dynamics365/customer-service/develop/calculate-session-metrics) |

respond.io có closing category/summary để báo cáo kết quả. Đây là tham khảo hữu ích cho session outcome, không chứng minh có cùng pipeline hoặc Deal won semantics với CRM. [R3](https://respond.io/help/workspace-settings/conversations). Các trang respond.io cũng dùng từ reopen trong một số tình huống auto-close; review không khẳng định ID mới trong mọi nhánh mà chưa có API/runtime evidence.

## Bộ thuật ngữ dùng cho CRM

CHG-20261030-02 thay khuyến nghị tên ban đầu: người dùng chọn **Conversation Channel → Conversation**. Conversation Channel là luồng xuyên suốt của khách trên một kênh/Page; Conversation là đợt tiếp nhận có pipeline/outcome. Đây là tên sản phẩm nội bộ được chọn sau đối chiếu, không phải tên chuẩn chung của các vendor. [Mô hình và compatibility](../contracts/conversation-channel-model.md) là nguồn chuẩn; không thêm Inbox/Inquiry hoặc chat-session entity từ việc đổi tên.

| Tên chuẩn | Nhãn tiếng Việt | Định nghĩa / mapping hiện có |
|---|---|---|
| Contact | Liên hệ | Người trong CRM; có thể có nhiều hội thoại qua các danh tính/kênh đã xác minh |
| Channel Connection | Kết nối kênh | Endpoint doanh nghiệp như Page; phục vụ nhiều khách, khác luồng liên lạc của từng khách |
| Conversation Channel | Luồng hội thoại theo kênh | Luồng khách ↔ endpoint cụ thể; mapping source hiện tại là persistent conversation/conversation_id |
| Conversation | Hội thoại | Đợt tiếp nhận/tư vấn nghiệp vụ với pipeline/stage/source/outcome; mapping lượt hiện có là acquisition session/session_id/conversation_session_id |
| Message | Tin nhắn | Nội dung gửi/nhận; stream và episode membership tiếp tục theo wire/evidence hiện có, không đoán membership của tin cũ/late |
| Thread / Conversation Session | Tên cũ/kỹ thuật | Thread map sang Conversation Channel; Conversation Session cũ map sang Conversation. Provider thread vẫn giữ namespace riêng |
| Conversation outcome | Kết quả hội thoại | Kết quả đợt nghiệp vụ; structured outcome còn cần exact design/source, Deal outcome thuộc Sales khi dùng thêm Deal |

Tài liệu sản phẩm mới dùng Conversation Channel và Conversation; không dùng Thread Conversation hoặc Session làm tên business object. Khi trích source/API cũ, ghi rõ đang dùng mapping implementation để không đảo nghĩa conversation_id. Chưa đổi nhãn UI đang chạy trong task tài liệu này.

Authentication session là phiên đăng nhập; agent workspace session là phiên làm việc; provider messaging window là cửa sổ gửi tin. Chúng không quyết định thời lượng Conversation nghiệp vụ. Legacy Chatflow execution session vẫn là loại execution đã retire, không phải đợt tiếp nhận.

## Áp dụng cho bài toán CTM

Một Contact có Conversation Channel CC1 trên Page P. Conversation C1 nhận từ Ad A, kết thúc đạt mục tiêu; C2 nhận từ Ad B, kết thúc lost. Pipeline/nguồn/kết quả thuộc C1/C2. Báo cáo sản phẩm mới dùng **Phễu hội thoại**, **Kết quả hội thoại theo quảng cáo**, còn số luồng dài hạn là distinct Conversation Channel. Trong source hiện tại grain tương ứng vẫn là session_id và conversation_id; metadata/report compatibility phải mapping rõ trước khi đổi UI/API.

Đổi owner/team không tạo phiên mới. Ad/referral mới khi phiên còn active chỉ thêm touchpoint theo contract hiện tại; không đồng nhất một click với một phiên. Quy tắc segmentation không thay chỉ vì đổi thuật ngữ. Source không được suy từ last Ad trên Contact/thread; unknown giữ nguyên.

Kết thúc Conversation nghiệp vụ không xóa Conversation Channel và không đóng Deal. Runtime hiện tại vẫn dùng command close trên persistent conversation để kết thúc active session; tên mới không tự di chuyển owner/control/close authority. Nếu muốn đóng lượt chat mà tiếp tục cùng cơ hội, cần exact lifecycle design riêng.

## Phương án khác đã cân nhắc

Khuyến nghị ban đầu Conversation → Conversation Session bị thay bởi quyết định Conversation Channel → Conversation sau khi user phản hồi Session dễ hiểu thành chat ngắn. Phương án Inquiry chưa được chấp thuận và không được thêm vào model. Tên sản phẩm có thể đổi nhưng conversation_id đã công bố không được tái diễn giải âm thầm; cần exact versioned compatibility trước migration.

## Compatibility và kiểm tra

Chuẩn hóa glossary, phần diễn đạt hiện hành của Chat/identity và liên kết review; không bulk-rename migration, payload/provider keys, published graph/event/receipt hoặc evidence lịch sử. Source/table/API/DTO hiện có giữ nguyên. UI labels/board/outcome chưa được triển khai trong task nghiên cứu này; mở exact task riêng trước khi thay hành vi.

DOC-TERM-01: mở trực tiếp 8 trang official S1/R1/R2/R3/I1/H1/C1/M1 ngày 2026-10-29; đối chiếu nghĩa thay vì tên. DOC-TERM-02: glossary và mapping hiện tại không đổi Conversation UUID/session ID. DOC-TERM-03: ví dụ Ad A/Ad B, close/reopen/referral/transfer và báo cáo vẫn cùng grain. DOC-TERM-04: kiểm docs/links/whitespace, ghi execution log. Native/vendor portal/browser/runtime tests NOT_RUN. Một trang HubSpot ticket-pipeline không truy cập được và không dùng làm bằng chứng; lần tìm kiếm đầu sai tham số tool được sửa trước khi lấy nguồn.
