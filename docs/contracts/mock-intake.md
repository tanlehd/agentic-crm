# Mock Messenger intake — SRC-015

Status: Ready. Normalized text fixture; không payload/signature Meta thật. Bổ sung [API](api.md), [Channels](../modules/channels.md).

## Authentication và endpoints

`POST /api/v1/integrations/mock-messenger/deliveries`: Authorization Bearer token64hex ngẫu nhiên và X-Connection-Id UUID. Không session/CSRF/Idempotency-Key; key là provider_event_id. Tenant lấy từ connection đã xác thực; cấm X-Tenant-Id, cookie hoặc Origin để không lẫn human route. Credential lookup không log/token trong URL; SHA256 constant-time compare với hash DB. Tenant active, connection active/mock_messenger, service actor active và role có integration.deliver/all kiểm trực tiếp trong transaction. Config writers giữ tenant exclusive lock. Payload reject unknown fields tại mọi cấp.

Request: provider_event_id/provider_message_id/external_subject_id nonblank string max255; occurred_at UTC RFC3339 (millisecond precision), message={type:"text",text nonblank max4000}; display_label optional nonblank max255; referral optional {source:"ctm",ad_id?: string|null max255,campaign_id?: string|null max255}. Không referral → attribution unknown, không touchpoint. Không giả suy campaign từ ad. Normalize timestamp thành ISO millisecond; canonical SHA256 payload includes display/referral.

202 envelope `{data:{delivery_id,status:"received"},meta:{correlation_id}}` chỉ sau commit received. Replay cùng event/hash trả cùng ID/ACK kể cả đã processed/failed; khác hash409 IDEMPOTENCY_CONFLICT, không overwrite payload. Hash conflict ghi audit sanitized. Bad auth401; tenant/header/scope403; invalid payload400/422; DB503 không ACK.

`GET /api/v1/integrations/deliveries/{id}`: mock credential chỉ connection mình (cấm tenant override), hoặc session+X-Tenant-Id với admin seat và integration.read/all. Response data={id,connection_id,status(received/processed/failed),attempts,error_code,conversation_id,message_id,duplicate,attribution(unknown/ctm),received_at,processed_at}. Không expose payload/hash/credential/external subject. Inaccessible404.

`POST /api/v1/integrations/deliveries/{id}/retry`: Human session, tenant, CSRF/Origin, Idempotency-Key và admin seat+integration.read/retry all. Chỉ failed→received, clear next_attempt/error, reset retry attempts cho explicit operator decision; giữ delivery ID/payload/hash, tăng fencing token và bỏ lease. Replay kiểm live quyền. 200 status response. Mock credential không có quyền retry.

## Worker và ports

Claim received (lease NULL/expired), hoặc failed có next_attempt_at due; token++, lease60s, attempts++. Transaction process lock tenant→connection→delivery; check live service access, token/lease trước và sau side effects. Connection lock serialize identity creation/duplicate message check, không giữ transaction qua network. Crash rollback transaction, expired claim được reclaim; old token không có side effect.

Kiểm provider_message_id qua Conversation port trước resolve identity: event mới lặp message ID → processed duplicate=true, giữ reference gốc, không tạo Contact/Conversation/Message/Touchpoint/Lead/Run (kể cả display/referral khác). New identity tạo Contact ownerNULL/team connection qua CRM port, không merge phone/name; insert ContactIdentity. Conversation.receive cùng UoW. Referral CTM sinh một Touchpoint/delivery; missing referral vẫn tạo message. Display label dùng khi tạo Contact, không tự rename existing Contact.

Transient DB failures → failed với next_attempt delay1/5/30/120/600s, max6 attempts, sanitized INTAKE_TEMPORARY_FAILURE; terminal permission/config/validation → failed không auto-retry. Operator có thể retry sau sửa cấu hình. Terminal auth error chỉ generic INTAKE_FORBIDDEN, không role/tenant details.

Seed CLI development/test only theo bootstrap guard; Alpha/Beta mỗi channel/ingress role+service actor và operator role gắn admin riêng. Token random trong .env mode0600, stdin tới container, DB chỉ hash. Rerun không reset status/permissions/credential; hash khác/config thiếu fail closed. Connection v9 chưa config credential/actor không nhận intake.

## Compatibility

V10 additive config columns, inbound_delivery, touchpoint và identity display_label. Không mở Lead M2 refs hoặc tạo Workflow/Chatflow. Events contact.created/conversation.created/message.received actor service ingress, metadata không body/label. Conversation detail thêm attribution optional do composition port; query phải có conversation.read; source=unknown/ad/campaign null nếu không touchpoint.
