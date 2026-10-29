# External API facade

Facade đang ở baseline backend, không phải service dữ liệu hoặc deployment mới.

## Trách nhiệm và dữ liệu sở hữu

Chuyển private-app requests tới owner và giữ wire compatibility; không sở hữu business database, token verifier hoặc quota ledger.

## Ngoài phạm vi

Không impersonate Human, sửa ownership hoặc tự cấp quyền từ cached metadata.

## Giao tiếp với service khác

Identity sở hữu app credentials/grants/quota. CRM/Sales/Chat sở hữu record/message reads và field filtering. Khi tách service, facade gọi versioned owner APIs thay application ports; không đọc SQL của owner.

## Contract và evidence

[Private apps](../contracts/external-api.md), [Conversation/message reads](../contracts/external-conversations.md), SRC-088/089 trong [tracker](../tracking/tasks.md). Quy tắc chung tại [catalog](README.md).
