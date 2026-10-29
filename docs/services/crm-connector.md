# CRM Connector / Messaging Platforms

Connector mock ingress và synthetic outbound đã phục vụ local qua D1/D2. Provider thật chưa được chứng minh bởi các test synthetic.

## Trách nhiệm và dữ liệu sở hữu

Channel connection, Page/provider binding, encrypted credentials, webhook delivery, normalized intake, transport attempt/receipt, resolution/profile cache, provider control và referral evidence.

Xác thực webhook, bind tenant, normalize/dedup intake; resolve Contact qua CRM; giao tin cho Chat; gửi provider theo Chat intent đã được cấp quyền và đối soát receipt.

Schema đích: `crm_connector`, theo [schema catalog](../data/schema-catalog.md). Physical baseline/candidate được ghi trong contract và migration tương ứng.

## Ngoài phạm vi

Không giữ canonical Contact, message timeline, Conversation owner hoặc quyết định phân công. Không thực thi AI tools. Không sở hữu báo cáo Marketing.

## Giao tiếp với service khác

| Bên liên quan | Hợp đồng trách nhiệm |
|---|---|
| CRM | Lookup/resolve identity và cập nhật profile qua owner API; cache chỉ chứa kết quả đã xác nhận. |
| Chat | Giao normalized message; nhận outbound intent, trả transport outcome và referral evidence. |
| Identity | Kiểm workload/service actor và dispatch authority hiện hành. |
| Marketing | Cung cấp credential/Page authority đã có contract; Marketing giữ Ad Account hierarchy/Insights replica. |

## Quy tắc riêng

Durable intake trước ACK; dedup bằng identity đã định nghĩa, không bằng text/time. Send unknown phải reconcile, không tự gửi lại. Disable connection/thu hồi token là thao tác vận hành kênh có nghĩa riêng, không phải lifecycle chung của Contact.

## Contract và evidence

- [Channel module](../modules/channels.md)
- [Contact resolution](../contracts/contact-resolution.md)
- [D1 local](../development/connector-local.md)
- [D2 outbound](../development/human-outbound-local.md)
- [Referral saga](../contracts/chat-referral-saga.md)

Evidence: SRC-028/030/031, SRC-096…108, SRC-109/T05. Trạng thái chuẩn ở [task tracker](../tracking/tasks.md); triển khai hiện tại ở [topology](../system/deployment-topology.md). Áp dụng [ranh giới chung](README.md#ranh-giới-chung); không suy feature hoặc migration mới từ tên entity trong catalog.
