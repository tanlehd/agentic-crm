# CRM Core & Metadata

Contact/Company/Activity, custom records và metadata chạy trong baseline backend. Metadata/reference adapters phục vụ Chat extraction đã có candidate; chưa tách toàn bộ CRM.

## Trách nhiệm và dữ liệu sở hữu

Contact/Company, canonical external identity→Contact mapping, profile observations, Activity/note body, custom records, object/property/association metadata, form/view/page layout và catalog tham chiếu.

Resolve/create Contact theo identity key; đọc/sửa hồ sơ có quyền; ghi/đọc note; cung cấp metadata và canonical reference APIs; điều phối generic UI tới đúng owner.

Schema đích: `crm_core`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu owner/version/state của Conversation, Lead, Deal hoặc Ticket. Không gọi provider để gửi tin, không giữ Page token. Không đặt state machine archive chung cho mọi record.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Connector | Nhận identity/profile observations; trả canonical Contact/mapping. Provider lookup và credentials thuộc Connector. |
| Chat | Cung cấp Contact/metadata/note APIs. Chat giữ message, episode và reference tới note; không sao chép note body thành nguồn chuẩn. |
| Sales | Sales giữ Lead/Deal và kết quả won; CRM áp dụng Customer semantics qua contract của mình. |
| Reporting, Workflow | Cung cấp metadata và authorized records; consumer không ghi metadata master hoặc truy cập CRM SQL. |

## Quy tắc riêng

Contact resolution retry phải trả cùng mapping; owner outage không được coi là absence để tạo Contact khác. Contact lifecycle prospect/customer tách khỏi trạng thái lưu trữ kỹ thuật. Không yêu cầu Chat/Sales tham gia một saga archive Contact. Dữ liệu/API archive cũ chỉ được mô tả trong compatibility note.

## Contract và evidence

- [CRM module](../modules/crm.md)
- [Contact resolution](../contracts/contact-resolution.md)
- [Object Platform hiện có](../contracts/object-platform-r1.md)
- [Record pages](../contracts/record-pages.md)
- [Metadata candidate](../development/crm-owner-candidate.md)
- [Legacy record archive](../contracts/legacy-record-archive.md)

Evidence: SRC-012/013, SRC-030, SRC-073/074, SRC-080, SRC-109. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
