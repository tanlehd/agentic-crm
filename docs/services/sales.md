# Sales

Manual/session Lead, manual/from-Lead Deal, won/lost, Customer transition và session context đã có trong monolith. Sales chưa tách service; configurable pipeline/thực thu không được suy từ scope hiện có.

Định hướng sản phẩm CHG-20261030-01, tên mới theo CHG-20261030-02: doanh nghiệp có thể dùng thêm Lead hoặc Deal với pipeline riêng, trong khi Omnichannel dùng Conversation nghiệp vụ cùng pipeline cho phạm vi tiếp nhận. Không bắt buộc chuỗi Conversation → Lead → Deal; source hiện tại vẫn dùng session refs cho lượt tiếp nhận. Configurable Lead/Deal pipelines cần exact design/source riêng. [Định nghĩa pipeline/stage](../product/glossary.md).

## Trách nhiệm và dữ liệu sở hữu

Lead/draft/qualification, handoff/acceptance, Lead/Deal ownership, Deal stages/outcomes/value/currency, immutable source, sales session context/merge/contribution và stage history.

Tạo/qualify/bàn giao Lead; tạo Deal trực tiếp hoặc từ Lead; cập nhật stage và kết quả bán hàng; cung cấp outcome cho Chat/Reporting.

Schema đích: `crm_sales`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu Contact master, chat message hoặc Conversation owner. Nhận Lead không tự chuyển owner hội thoại. Không chặn Contact bằng generic archive dependency.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| CRM | Đọc Contact, yêu cầu share/Customer update theo owner contract. |
| Chat, Workflow | Nhận context/source/consent evidence; Sales giữ source refs và outcome/receipt. Không bắt Chat nhận contribution callback để tính conversion hoặc đóng phiên; xem [conversion boundary](../contracts/chat-sales-conversion-boundary.md). |
| Identity, Routing | Kiểm quyền và nhận đề xuất phân công; Sales quyết định CAS trên record Sales. |
| Reporting | Cung cấp facts/stage history có quyền; không tính lại doanh thu trong Chat. |

## Quy tắc riêng

Giữ nguồn ban đầu bất biến; context follow-up/closing tách riêng. Một acquisition session có thể có nhiều Lead; uniqueness qualification_session_id chỉ áp dụng legacy qualification (migration vào Workflow). Won value không đồng nghĩa tiền thực thu.

## Contract và evidence

- [Organic Sales](../contracts/organic-sales-base.md)
- [Customer360/session](../contracts/customer-360-session.md)
- [Attribution](../contracts/crm-source-attribution.md)
- [Stage funnel](../contracts/stage-funnel-reporting.md)

Evidence: SRC-045/046/053/068/087. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
