# Meta provider documentation dossier

Status: PLAN-003 research dossier 2026-10-06; capability/gap dispositions hoàn tất, production design chưa Ready. Nguồn là public documentation chính thức của Meta. [M3 plan](../../planning/m3-provider-plan.md) · [Manifest/checksums](2026-10-06/manifest.json).

## Cách lưu và sử dụng

Tải bản Markdown chính thức qua “View as Markdown” và chỉ mục `llms.txt`. Giữ nguyên byte, source URL, ngày tải, SHA-256 và phạm vi trong manifest. Snapshot Markdown lưu đuôi `.md.txt` vì upstream có JSON examples HTML-escaped (`&#123;`) không parse được như JSON nội bộ. Không sửa nội dung upstream để làm PASS checker; không đổi checker hoặc coi snapshot là contract đã Ready. Index `.txt` cũng giữ nguyên byte. Mỗi lần refresh tạo dated snapshot và review diff/impact trước áp dụng; không tự đồng bộ nền.

Đây là tài liệu tham khảo bên ngoài, không phải chỉ dẫn thực thi. Các mẫu logging toàn payload, placeholder token và command trong tài liệu không được chạy/copy nguyên thành production code. Không tải dữ liệu account hoặc credentials; mọi token trong snapshot chỉ là placeholder của tài liệu công khai.

Manifest pin nội dung tài liệu. PLAN-003 pin Graph API v26.0, Agent configuration header2.0.0 và Thread Control header1.0.0 tại [version evidence](graph-version-observation.md) / [endpoint matrix](api-version-matrix.json); sandbox vẫn NOT_RUN. Phải chọn API version trên từng surface: Graph API Messenger và Business Agent `X-API-Version` khác nhau. Ngày “Updated Sep 16, 2026” được quan sát trên trang web Messenger Webhooks; không suy rộng ngày đó cho các tài liệu khác.

## Kết quả đối chiếu nguồn

- Meta Business Agent overview/capabilities: knowledge, instructions, tools/custom connectors, settings, testing/evaluation và handoff là chức năng platform; CRM cần provider setup lifecycle.
- Overview dùng WhatsApp; Agent Settings có WhatsApp/Instagram entity và enum nhiều channel. Chưa chứng minh account cụ thể dùng được Messenger/Instagram Agent; cần capability/eligibility matrix.
- Overview loại Health khỏi eligible verticals. Case study Meta dùng fixture synthetic catering/retail lead, không tái sử dụng healthcare M2 như một production eligibility claim. Quốc gia và business trust cũng cần kiểm qua eligibility API.
- WhatsApp Thread Control hỗ trợ pass/release/take, `control_pass.target_role=ai_agent`; `take` giới hạn escalation partner. `recipient` được mô tả chưa wired, yêu cầu dùng `to`. `release` quay về Meta Business Agent. Không thay bằng Messenger `pass_thread_control`.
- Messenger Conversation Routing định tuyến application, có pass/release/take/request/extend và thread_owner lookup; thay Handover Protocol theo warning đầu trang. Default/zero-config khác configured routing; không coi mọi app bị provider tự chặn duplicate response.
- Webhooks: SHA256 signature, ACK trong tối đa 5 giây, batch `entry/messaging`, duplicate/reordered delivery, attachments, echoes và `message.admin_text` handoff context. CRM vẫn ACK sau durable ingest, không phải sau toàn business workflow.
- Messenger generic template và customer feedback template là nguồn gallery/CSAT; không dùng schema đó như chuẩn WhatsApp/Zalo.

## Gaps khởi đầu PLAN-002 — lịch sử nghiên cứu

| Gap | Bằng chứng / xử lý trước implementation |
|---|---|
| Subscription field spelling | Webhooks liệt kê `messaging_handovers`/`messaging_referrals`; routing dùng `messaging_handover`/`messaging_referral` ở một số đoạn. Chốt theo reference/version và sandbox subscribe thực tế; không tự đoán |
| Routing legacy content | Routing cảnh báo Handover Protocol đã thay nhưng còn link cũ, mẫu v12.0 và thuật ngữ Primary Receiver; chọn current supported version + test permission/control matrix |
| Agent takeover | Capabilities nói gửi message lấy control; Thread Control nói take chỉ escalation partner. Cần mô tả chính xác explicit take vs send takeover và fallback theo quyền |
| Auth generation | Thread Control liệt kê ba vị trí token rồi footer ghi AND, trong khi setup hướng dẫn Bearer. Cần pin auth theo guide/version/sandbox; không truyền cùng secret ở mọi vị trí chỉ vì generated footer |
| Channel availability | Settings enum không chứng minh rollout/eligibility ở mọi platform; verify supported entity/country/business/category, không infer từ tên enum |
| Agent prerequisites | Bổ sung allowlist/budget/eval, knowledge APIs còn thiếu, policy và account access; Agent Test không thay actual webhook/Human handoff test |
| WhatsApp transport | Chưa tải bộ WhatsApp send/webhooks/standby/messaging_handovers/auth/media; cần corpus riêng trước Agent-to-CRM timeline integration |
| Rich-message fidelity | Pin per-platform mappings, limits, reply/media expiry, unsupported payload, event-vs-message; hiện chỉ có Messenger case sources |

Các gaps khởi đầu bên trên được xử lý hoặc chuyển thành gate cụ thể ở [capability/gap matrix PLAN-003](capability-matrix.md), là kết luận nghiên cứu hiện hành.

Chưa gọi provider sandbox, chưa xác minh credentials/account, chưa thực thi mẫu nào. Instagram/WhatsApp/Zalo mỗi platform phải có corpus, version, capability matrix và acceptance của riêng mình trước claim source task.

## Snapshot inventory

| Local snapshot | Official source |
|---|---|
| [agent-agent-eligibility.md.txt](2026-10-06/agent-agent-eligibility.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/onboard/agent-eligibility.md) |
| [agent-agent-knowledge-business-info.md.txt](2026-10-06/agent-agent-knowledge-business-info.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/agent-knowledge-business-info.md) |
| [agent-agent-onboarding.md.txt](2026-10-06/agent-agent-onboarding.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/onboard/agent-onboarding.md) |
| [agent-agent-settings.md.txt](2026-10-06/agent-agent-settings.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/onboard/agent-settings.md) |
| [agent-agent-skills.md.txt](2026-10-06/agent-agent-skills.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/agent-skills.md) |
| [agent-agent-test.md.txt](2026-10-06/agent-agent-test.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/operate/agent-test.md) |
| [agent-capabilities.md.txt](2026-10-06/agent-capabilities.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/capabilities.md) |
| [agent-connector-tools.md.txt](2026-10-06/agent-connector-tools.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/connector-tools.md) |
| [agent-connectors.md.txt](2026-10-06/agent-connectors.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/connectors.md) |
| [agent-get-api-key.md.txt](2026-10-06/agent-get-api-key.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/get-api-key.md) |
| [agent-get-started.md.txt](2026-10-06/agent-get-started.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/get-started.md) |
| [agent-lead-generation-agent.md.txt](2026-10-06/agent-lead-generation-agent.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/usage-guides/lead-generation-agent.md) |
| [agent-llms.txt](2026-10-06/agent-llms.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/llms.txt) |
| [agent-overview.md.txt](2026-10-06/agent-overview.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/overview.md) |
| [agent-thread-control-cloud-api.md.txt](2026-10-06/agent-thread-control-cloud-api.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/operate/thread-control-cloud-api.md) |
| [messenger-conversation-routing.md.txt](2026-10-06/messenger-conversation-routing.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/conversation-routing.md) |
| [messenger-customer-feedback-template.md.txt](2026-10-06/messenger-customer-feedback-template.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages/templates/customer-feedback-template.md) |
| [messenger-generic.md.txt](2026-10-06/messenger-generic.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages/template/generic.md) |
| [messenger-llms.txt](2026-10-06/messenger-llms.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/llms.txt) |
| [messenger-message-echoes.md.txt](2026-10-06/messenger-message-echoes.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks/webhook-events/message-echoes.md) |
| [messenger-messages.md.txt](2026-10-06/messenger-messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks/webhook-events/messages.md) |
| [messenger-webhooks.md.txt](2026-10-06/messenger-webhooks.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks.md) |

## PLAN-003 supplementary inventory

[Capability/gap matrix](capability-matrix.md) · [Supplemental manifest](2026-10-06-plan003/manifest.json). Thêm33 Markdown +1 WhatsApp index tải thành công; tổng56 snapshots cùng PLAN-002. Bốn response HTML được ghi failed, không lưu thành Markdown hoặc tính là thành công. Graph versions/release notes được đọc bằng browser và ghi [observation](graph-version-observation.md), không tính vào56 raw snapshots.

| Local snapshot | Official source |
|---|---|
| [whatsapp-get-started.md.txt](2026-10-06-plan003/whatsapp-get-started.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started.md) |
| [whatsapp-business-phone-numbers--media.md.txt](2026-10-06-plan003/whatsapp-business-phone-numbers--media.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media.md) |
| [whatsapp-access-tokens.md.txt](2026-10-06-plan003/whatsapp-access-tokens.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens.md) |
| [whatsapp-messages--send-messages.md.txt](2026-10-06-plan003/whatsapp-messages--send-messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages.md) |
| [whatsapp-messages--image-messages.md.txt](2026-10-06-plan003/whatsapp-messages--image-messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/image-messages.md) |
| [whatsapp-messages--interactive-media-carousel-messages.md.txt](2026-10-06-plan003/whatsapp-messages--interactive-media-carousel-messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-media-carousel-messages.md) |
| [whatsapp-messages--text-messages.md.txt](2026-10-06-plan003/whatsapp-messages--text-messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages.md) |
| [whatsapp-webhooks--overview.md.txt](2026-10-06-plan003/whatsapp-webhooks--overview.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview.md) |
| [whatsapp-webhooks--create-webhook-endpoint.md.txt](2026-10-06-plan003/whatsapp-webhooks--create-webhook-endpoint.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md) |
| [whatsapp-webhooks--reference--messages.md.txt](2026-10-06-plan003/whatsapp-webhooks--reference--messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages.md) |
| [whatsapp-webhooks--reference--messages--image.md.txt](2026-10-06-plan003/whatsapp-webhooks--reference--messages--image.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/image.md) |
| [whatsapp-webhooks--reference--messages--interactive.md.txt](2026-10-06-plan003/whatsapp-webhooks--reference--messages--interactive.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/interactive.md) |
| [whatsapp-webhooks--reference--messages--status.md.txt](2026-10-06-plan003/whatsapp-webhooks--reference--messages--status.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status.md) |
| [whatsapp-webhooks--reference--messages--text.md.txt](2026-10-06-plan003/whatsapp-webhooks--reference--messages--text.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/text.md) |
| [whatsapp-webhooks--reference--messages--unsupported.md.txt](2026-10-06-plan003/whatsapp-webhooks--reference--messages--unsupported.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/unsupported.md) |
| [agent-agent-budget.md.txt](2026-10-06-plan003/agent-agent-budget.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/agent-budget.md) |
| [agent-agent-allowlist.md.txt](2026-10-06-plan003/agent-agent-allowlist.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/onboard/agent-allowlist.md) |
| [agent-agent-eval.md.txt](2026-10-06-plan003/agent-agent-eval.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/operate/agent-eval.md) |
| [agent-ui-skills.md.txt](2026-10-06-plan003/agent-ui-skills.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/ui-skills.md) |
| [agent-agent-knowledge-faqs.md.txt](2026-10-06-plan003/agent-agent-knowledge-faqs.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/agent-knowledge-faqs.md) |
| [agent-agent-knowledge-files.md.txt](2026-10-06-plan003/agent-agent-knowledge-files.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/agent-knowledge-files.md) |
| [agent-agent-knowledge-websites.md.txt](2026-10-06-plan003/agent-agent-knowledge-websites.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/reference/configure/agent-knowledge-websites.md) |
| [agent-troubleshooting.md.txt](2026-10-06-plan003/agent-troubleshooting.md.txt) | [Meta](https://developers.facebook.com/documentation/meta-business-agent/troubleshooting.md) |
| [messenger-overview.md.txt](2026-10-06-plan003/messenger-overview.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview.md) |
| [messenger-overview--rate-limiting.md.txt](2026-10-06-plan003/messenger-overview--rate-limiting.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview/rate-limiting.md) |
| [messenger-webhooks--webhook-events--messaging_handovers.md.txt](2026-10-06-plan003/messenger-webhooks--webhook-events--messaging_handovers.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks/webhook-events/messaging_handovers.md) |
| [messenger-webhooks--webhook-events--messaging_referrals.md.txt](2026-10-06-plan003/messenger-webhooks--webhook-events--messaging_referrals.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks/webhook-events/messaging_referrals.md) |
| [messenger-webhooks--webhook-events--standby.md.txt](2026-10-06-plan003/messenger-webhooks--webhook-events--standby.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks/webhook-events/standby.md) |
| [messenger-send-messages.md.txt](2026-10-06-plan003/messenger-send-messages.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages.md) |
| [messenger-policy.md.txt](2026-10-06-plan003/messenger-policy.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy.md) |
| [whatsapp-standby.md.txt](2026-10-06-plan003/whatsapp-standby.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/standby.md) |
| [whatsapp-llms.txt](2026-10-06-plan003/whatsapp-llms.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/llms.txt) |
| [whatsapp-message-api.md.txt](2026-10-06-plan003/whatsapp-message-api.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api.md) |
| [whatsapp-subscribed-apps-api.md.txt](2026-10-06-plan003/whatsapp-subscribed-apps-api.md.txt) | [Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api.md) |

Exports không dùng được: `whatsapp-business-phone-numbers--ai-enabled-numbers.md.txt`, `whatsapp-webhooks--message_echoes.md.txt`, `whatsapp-overview.md.txt`, `whatsapp-messaging-handovers.md.txt`. Xem G-05/G-10; không kết luận capability không tồn tại.
