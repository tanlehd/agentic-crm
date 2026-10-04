# Glossary

Status: Ready for implementation.

| Thuật ngữ | Định nghĩa chuẩn |
|---|---|
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
| Conversation | Phiên xử lý hội thoại trên một channel account; chứa nhiều Message |
| Chatflow | Quy trình thu thập dữ liệu/đối thoại trong Conversation |
| Workflow | Quy trình điều phối nghiệp vụ xuyên object/module |
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
