# Glossary

Status: Ready for implementation.

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
| Conversation | Luồng hội thoại bền vững trên kênh, chứa Message; các lượt xử lý được phân biệt bằng session/episode theo contract Chat |
| Workflow | Định nghĩa và thực thi luồng tự động hóa nghiệp vụ trên các đối tượng CRM, User và Chat; một service điều phối chung, effect được kiểm tra tại owner |
| CTM | Click-to-message; case chuẩn là Facebook Messenger message ads |
| Touchpoint | Một tương tác nguồn marketing; không đồng nghĩa Message hoặc Lead |
| Qualification | Thu thập dữ liệu tối thiểu, xác nhận nhu cầu và đủ điều kiện bàn giao |
| Handoff | Chuyển quyền xử lý có lịch sử; cần phân biệt owner change với Sale acceptance |
| Standard object | Object platform cung cấp và có bảng nghiệp vụ riêng |
| Custom object | Object tenant định nghĩa bằng metadata, lưu trong bảng record dùng chung |
| Association | Liên kết có type/label giữa hai CRM record trong một tenant |
| Pipeline / Stage | Tiến trình có thứ tự cho object nghiệp vụ; không thay lifecycle Contact |
| Grain | Một hàng/đơn vị đếm của metric, ví dụ một Lead hoặc một Conversation |
| System design | Kiến trúc module, dữ liệu và vận hành |
| UI design system | Nguyên tắc giao diện, component, trạng thái và accessibility |

“Lead opt management” trong phạm vi dự án được hiểu là Lead/Opportunity management.
