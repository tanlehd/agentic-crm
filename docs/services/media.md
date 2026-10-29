# Media & Content Processing

Target responsibility; independent storage/processing service chưa triển khai đầy đủ. Metadata placeholders không là production resolver.

## Trách nhiệm và dữ liệu sở hữu

Private asset/storage references, rendition/scan/extraction metadata, processing jobs và authorized download/preview.

Tiếp nhận/lấy binary từ nguồn hợp lệ; scan/transcode; OCR/transcription theo adapter được cấu hình; trả reference và kết quả versioned.

Schema đích: `crm_media`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không sở hữu chat transcript, user consent, Contact hay quyền nghiệp vụ record nguồn. Không công bố public URL thay cho kiểm quyền.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| Connector | Nhận provider media reference trong scope đã xác thực. |
| Chat | Trả asset/extraction revision; Chat quyết định content projection. |
| Identity/record owner | Kiểm current access trước download hoặc processing có quyền. |

## Quy tắc riêng

Chống SSRF, giới hạn size/MIME/redirect; không thay original text hoặc sửa đè revision mới. Retention/binary deletion cần nhu cầu và policy cụ thể, không áp archive state machine chung.

## Contract và evidence

- [Service boundaries](../contracts/service-boundaries.md)
- [Channel content](../modules/channels.md)

Evidence: Target/Draft; deployment evidence chưa có. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
