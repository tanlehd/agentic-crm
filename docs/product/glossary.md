# Glossary

Status: tên sản phẩm theo CHG-20261030-02; implementation readiness theo contract/task cụ thể. CHG-20261030-03 đối chiếu Product Truth, làm rõ giới hạn session mapping và phạm vi nhu cầu xuyên kênh cần exact design; chưa đổi source/API/schema.

| Thuật ngữ | Định nghĩa chuẩn |
|---|---|
| Agentic CRM | Nền tảng quản trị dữ liệu khách hàng và hoạt động Marketing/Sales/Customer Service, với nhân viên, Workflow và AI Agent phối hợp trong phạm vi quyền và quy trình doanh nghiệp |
| Tương tác khách hàng | Đơn vị dữ liệu về tiếp xúc/phản hồi như hội thoại, cuộc gọi hoặc form submission; gắn với hồ sơ và công việc liên quan, có trạng thái xử lý theo từng nghiệp vụ; không bắt buộc là Conversation |
| Gói nghiệp vụ | Tập năng lực, dữ liệu, workspace và quy tắc phối hợp/phân bổ phù hợp mô hình vận hành team; không mặc định là gói giá hoặc một service riêng |
| Tenant | Doanh nghiệp sử dụng platform, đơn vị cô lập dữ liệu/cấu hình |
| Account | Danh tính người đăng nhập toàn platform; có thể tham gia nhiều tenant |
| Membership | Quan hệ Account–Tenant, trạng thái active/invited/suspended |
| Seat | Entitlement công cụ của một membership, không tự cấp quyền dữ liệu |
| Role | Tập permission object/action/scope; gán cho principal trong tenant |
| Team | Nhóm principal của tenant, phục vụ quyền, queue và routing |
| Principal | Chủ thể Human hoặc AI có thể giữ owner; Human trỏ Membership, AI trỏ AiAgent |
| Actor | Chủ thể thực hiện command; principal hoặc service actor của workflow/platform |
| Owner | Principal chịu trách nhiệm record; nullable; một owner hiện hành |
| Account vs Company | Account dùng cho đăng nhập; Company là tổ chức khách hàng CRM |
| Contact | Danh tính CRM của người quan tâm/khách hàng |
| Lead | Một nhu cầu của Contact đang được qualify; không phải bản sao Contact |
| Opportunity / Deal | Cùng một khái niệm; dùng tên chuẩn Deal |
| Customer | Trạng thái lifecycle của Contact sau khi có Deal thắng |
| Channel / Channel Connection | Kênh/kết nối doanh nghiệp, ví dụ Messenger của một Page; phục vụ nhiều khách, không phải luồng riêng của một khách |
| Conversation Channel — Luồng hội thoại theo kênh | Luồng liên lạc xuyên suốt giữa danh tính khách và một kênh/đầu kết nối/Page cụ thể trong tenant; chứa tương tác của nhiều Conversations. Không mặc định sở hữu độc quyền hồ sơ nhu cầu. Mapping source cũ: persistent conversation/conversation_id; không tự đổi wire |
| Conversation — Hội thoại | Hồ sơ tiếp nhận/tư vấn có nguồn, pipeline/stage và outcome riêng. Theo Product Truth, hồ sơ theo nhu cầu/phạm vi công việc có thể tiếp nối qua nhiều tương tác và kênh. Acquisition session/session_id chỉ là mapping tạm cho inventory; aggregate/lifecycle đích cần exact design |
| Thread / Conversation Session | Tên cũ hoặc tên kỹ thuật trong tài liệu/source lịch sử: Thread/persistent Conversation map sang Conversation Channel; Conversation Session là episode hiện tại, chưa khẳng định 1:1 với Conversation nghiệp vụ đích. Chưa thêm entity thứ ba; auth/provider sessions có nghĩa riêng |
| Conversation outcome — Kết quả hội thoại | Kết quả riêng của đợt tiếp nhận, khác trạng thái xử lý và Deal outcome; structured outcome là yêu cầu sản phẩm chưa triển khai |
| Workflow | Định nghĩa và thực thi luồng tự động hóa nghiệp vụ trên các đối tượng CRM, User và Chat; một service điều phối chung, effect được kiểm tra tại owner |
| CTM | Click-to-message; case chuẩn là Facebook Messenger message ads |
| Touchpoint | Một tương tác nguồn marketing; không đồng nghĩa Message hoặc Lead |
| Qualification | Thu thập dữ liệu tối thiểu, xác nhận nhu cầu và đủ điều kiện bàn giao |
| Handoff | Chuyển quyền xử lý có lịch sử; cần phân biệt owner change với Sale acceptance |
| Standard object | Object platform cung cấp và có bảng nghiệp vụ riêng |
| Custom object | Object tenant định nghĩa bằng metadata, lưu trong bảng record dùng chung |
| Association | Liên kết có type/label giữa hai CRM record trong một tenant |
| Pipeline / Stage | Pipeline là tiến trình có thứ tự được thiết lập cho object sở hữu, có thể là Conversation, Lead hoặc Deal. Stage là một giai đoạn nằm trong pipeline. Doanh nghiệp chọn object và pipeline theo nhu cầu; không bắt buộc chuỗi Conversation → Lead → Deal |
| Grain | Một hàng/đơn vị đếm của metric, ví dụ một Lead hoặc một Conversation |
| System design | Kiến trúc module, dữ liệu và vận hành |
| UI design system | Nguyên tắc giao diện, component, trạng thái và accessibility |

“Lead opt management” trong phạm vi dự án được hiểu là Lead/Opportunity management.

CHG-20261030-01, tên mới theo CHG-20261030-02: doanh nghiệp chỉ dùng Omnichannel có thể quản lý trọn đợt tiếp nhận, tiến trình và kết quả bằng **Conversation cùng pipeline của nó**. Khi cần thì bổ sung Lead hoặc Deal với pipeline riêng; các object liên kết nhưng stage/outcome không tự đồng bộ hoặc ghi đè. Configurable Lead/Deal pipelines và structured Conversation outcome còn cần exact design/implementation.

Tên **Conversation Channel / Conversation** thay đề xuất tên CHG-20261029-04; dấu mũi tên trong mô hình trước không áp đặt quan hệ sở hữu độc quyền. [Review Product Truth](../planning/inbox-center-product-truth-review.md) ghi rõ nhu cầu xuyên kênh và phạm vi thiết kế tiếp. [Mô hình và mapping compatibility](../contracts/conversation-channel-model.md) phân biệt tên sản phẩm với ID/API đang chạy; [đối chiếu vendor](../references/omnichannel-conversation-terminology.md) là nguồn nghiên cứu, không phải chuẩn chung bắt buộc. Inbox là nơi xử lý; không thêm object Inquiry. Chưa đổi UI/API/schema hoặc chính sách kết thúc nghiệp vụ.
