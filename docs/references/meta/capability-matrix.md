# Meta capability và gap matrix — PLAN-003

Reviewed 2026-10-06, CHG-20261006-04. Research dossier complete for the selected M3 design scope with explicit open gates; production integration Draft, every sandbox case NOT_RUN. [Plan](../../planning/m3-provider-plan.md) · [Source catalog](README.md) · [Version matrix](api-version-matrix.json).

## Cách đọc evidence

`DOC_CONFIRMED` = tài liệu chính thức mô tả capability; không xác nhận account/region hoặc endpoint đã chạy. `CONDITIONAL` = có capability nhưng phụ thuộc quyền/entity/config. `GAP` = nguồn chưa đủ hoặc mâu thuẫn chưa giải quyết bằng evidence. Mọi operation đều cần binding tenant + credential + provider entity; user ID chỉ từ payload không đủ xác thực.

Các đường dẫn nguồn dưới trỏ snapshot giữ nguyên byte. Baseline Graph API **v26.0** được chốt từ [versions/release notes](graph-version-observation.md); Agent header versions được extract từ từng endpoint, không dùng một version chung cho cả vendor.

## AI Agent provider capabilities

| Capability / nguồn | Kết luận tài liệu | Quyết định cho CRM / gate |
|---|---|---|
| [Eligibility](2026-10-06/agent-agent-eligibility.md.txt), [overview](2026-10-06/agent-overview.md.txt) | DOC_CONFIRMED, conditional theo entity/business/category/country | Meta Agent case study WhatsApp catering/retail; onboarding fail closed khi ineligible. Không suy ra Việt Nam/account hiện có eligible. Healthcare mock giữ nguyên |
| [Onboarding](2026-10-06/agent-agent-onboarding.md.txt), [settings](2026-10-06/agent-agent-settings.md.txt) | Settings GET và partial PUT; trả agent_id/channel, rollout, handoff/followup; disable dừng mọi thread, re-enable chỉ new threads | Desired/observed config và external agent_id cùng tenant; không coi re-enable tự resume mọi thread cũ; receipt/reconcile trước lặp mutation |
| [Allowlist](2026-10-06-plan003/agent-agent-allowlist.md.txt) | WhatsApp tối đa20 consumers, Instagram20 riêng; chỉ hiệu lực với ALLOWLISTED_ONLY | Onboarding thử nghiệm phải chọn audience rõ; không default EVERYONE. Không nhập số thật vào fixture/tracker. Billing/production activation chưa thực hiện |
| [Business info](2026-10-06/agent-agent-knowledge-business-info.md.txt), [FAQ](2026-10-06-plan003/agent-agent-knowledge-faqs.md.txt), [files](2026-10-06-plan003/agent-agent-knowledge-files.md.txt), [websites](2026-10-06-plan003/agent-agent-knowledge-websites.md.txt) | CRUD/config knowledge; website recrawl; FAQ/files/websites mô tả shared1000 requests/hour/resource | Provider config resources, không tự dựng RAG engine. Ingestion/readiness phải phản ánh trạng thái provider, không coi save=knowledge usable. Scope Instagram khác nhau theo resource, cần probe riêng |
| [Instructions](2026-10-06/agent-agent-skills.md.txt), [UI skills](2026-10-06-plan003/agent-ui-skills.md.txt) | Agent behavior và interactive response configuration; UI skill có enabled/disabled, Flow cần published | Chọn capability theo entity; Flow authoring không tự mở thành builder M5. Provider template khác normalized CRM renderer |
| [Custom connectors](2026-10-06/agent-connectors.md.txt), [tools](2026-10-06/agent-connector-tools.md.txt) | Provider gọi external API base/auth + tool definitions | Chỉ cho gọi CRM application ports qua gateway xác thực; không generic SQL/credential. Callback identity/correlation/idempotency chưa đủ để Ready, xem G-08 |
| [Test](2026-10-06/agent-agent-test.md.txt), [eval](2026-10-06-plan003/agent-agent-eval.md.txt) | Test conversation riêng; eval có async job_id, QUEUED/RUNNING/COMPLETED/FAILED | Test/eval không thay real messaging handoff acceptance. Cần giới hạn theo tenant và redacted result; timeout không tạo job mới mù |
| [Budget](2026-10-06-plan003/agent-agent-budget.md.txt) | entity_id là Business Manager ID; token budget xuyên Business Manager, ai_turn budget mỗi conversation; POST thay toàn bộ; empty array bỏ mọi cap | Không map budget như field cục bộ của phone number. Nếu nhiều tenant chung Business Manager thì tenant admin không được tự sửa shared budget; model authority chốt PLAN-004, write capability tắt đến khi binding an toàn |
| [Get API key](2026-10-06/agent-get-api-key.md.txt), [setup](2026-10-06/agent-get-started.md.txt), [WA tokens](2026-10-06-plan003/whatsapp-access-tokens.md.txt) | Direct system user vs provider BISU; Bearer header; messaging/management scopes theo operation | Secret reference server-only, asset permission check cùng provider ID; không dùng một credential làm bằng chứng tenant ownership; no authenticated calls this session |

Agent references chủ yếu `https://api.facebook.com/{entity_id}/...`, `X-API-Version: 2.0.0`. Không có bằng chứng mọi resource hỗ trợ immutable publish, ETag/CAS, exactly-once, callback owner_revision, provider execution cancel hoặc CRM-compatible per-turn deadline. PLAN-004 thiết kế operation ledger/reconciliation riêng; không quảng cáo guarantee của mock lên hosted Agent.

## Messaging transport và control

| Surface / nguồn | Capability và mapping | Giới hạn / gate |
|---|---|---|
| [Messenger overview](2026-10-06-plan003/messenger-overview.md.txt), [webhooks](2026-10-06/messenger-webhooks.md.txt) | Page+PSID namespace; signature trước ingest; entry/messaging batch, durable ACK ≤5s; Standard/Advanced Access khác nhau | Tenant resolver theo app/page binding đã cấu hình; webhook content không được quyết định tenant. Verify raw bytes, Unicode case, missing/bad signature |
| [Messenger routing](2026-10-06/messenger-conversation-routing.md.txt), [handovers](2026-10-06-plan003/messenger-webhooks--webhook-events--messaging_handovers.md.txt), [referrals](2026-10-06-plan003/messenger-webhooks--webhook-events--messaging_referrals.md.txt) | DOC_CONFIRMED plural subscription fields `messaging_handovers`, `messaging_referrals`; pass/take/release/query thread_owner là app routing | Request/action names khác field subscription. Zero-config không chặn mọi app gửi; default app/take permission phải verify. Không đóng G-02 chỉ từ legacy reference |
| [Messenger send](2026-10-06-plan003/messenger-send-messages.md.txt), [policy](2026-10-06-plan003/messenger-policy.md.txt), [rate](2026-10-06-plan003/messenger-overview--rate-limiting.md.txt) | Text/media/template gửi qua versioned Graph; messaging policy/window và limits áp dụng ngoài CRM ACL | Không biến human tag thành quyền AI. Không coi timeout=failed pre-dispatch; sender unknown không resend tự động |
| [WA webhook setup](2026-10-06-plan003/whatsapp-webhooks--create-webhook-endpoint.md.txt), [overview](2026-10-06-plan003/whatsapp-webhooks--overview.md.txt), [subscribe](2026-10-06-plan003/whatsapp-subscribed-apps-api.md.txt) | HMAC-SHA256, GET challenge, WABA subscription; entry/changes; retry tới7 ngày, có batch tới1000 updates | Đây là provider upper bound, không yêu cầu xử lý toàn business synchronous. Per-item dedup và partial batch failure design; không tái dùng Messenger envelope/retry assumptions |
| [WA messages](2026-10-06-plan003/whatsapp-webhooks--reference--messages.md.txt), [standby](2026-10-06-plan003/whatsapp-standby.md.txt), [Agent setup](2026-10-06/agent-get-started.md.txt) | AI holds control → standby; CRM app holds → messages. standby.messages / message_echoes / statuses; fields subscribe messages, standby, messaging_handovers | Echo không là consumer message và không gọi runtime lần hai. Handover exact payload thiếu usable source (G-05); không dùng payload Messenger thay thế |
| [WA Thread Control](2026-10-06/agent-thread-control-cloud-api.md.txt), [setup routing section](2026-10-06/agent-get-started.md.txt) | Sending message auto-takes; explicit take chỉ escalation partner; release trở lại AI; pass có thể target ai_agent. Dùng `to`, không dùng recipient chưa wired | Design ưu tiên explicit take với escalation partner để không dùng business send làm probe. Host/path discrepancy G-04 phải qua sandbox trước live routing |
| [WA service send](2026-10-06-plan003/whatsapp-messages--send-messages.md.txt), [message API](2026-10-06-plan003/whatsapp-message-api.md.txt) | 24h service window reset bởi customer message/call; ngoài window chỉ approved template và opt-in. `POST /v26.0/{phone-number-id}/messages` design baseline | Provider acceptance/receipt không bằng delivered/read. Không suy ra send idempotency hay lookup bằng CRM intent từ message API; unknown reconciliation G-07 |

Control có bốn khái niệm riêng: CRM owner, desired provider control, observed provider control, provider messaging window. Release control không mở messaging window; observation nhận tin không tự cấp send. PLAN-004 phải định nghĩa từng transition/callback guard. Provider budget/handoff tự phát không được gán Lead/Contact owner theo Conversation.

## Message fidelity / renderer requirements

| Case | Provider shape → common envelope | Design consequence / source |
|---|---|---|
| Messenger text/media | message.mid → external_msg_id; message.text; attachments[] → attachment items | [messages](2026-10-06/messenger-messages.md.txt); giữ provider payload type và safe fallback |
| Messenger reply/gallery/CSAT | reply reference riêng; generic template elements/buttons; customer feedback template payload | [generic](2026-10-06/messenger-generic.md.txt), [CSAT](2026-10-06/messenger-customer-feedback-template.md.txt); CSAT submission là event, không customer free-text/consent |
| WA text/image/reply | messages[].id/type/text.body; image id/mime/sha256/caption; inbound context.id, outbound context.message_id | [text](2026-10-06-plan003/whatsapp-webhooks--reference--messages--text.md.txt), [image](2026-10-06-plan003/whatsapp-webhooks--reference--messages--image.md.txt), [message API](2026-10-06-plan003/whatsapp-message-api.md.txt); IDs opaque, không dùng phone string làm global CRM identity |
| WA Agent outbound echo | standby.message_echoes[].id/timestamp/message; template definition là sibling của message, còn message.template là parameters | [standby](2026-10-06-plan003/whatsapp-standby.md.txt); lưu versioned safe template structure và params để render, không ép chỉ text hoặc làm mất sibling definition |
| WA carousel | interactive media carousel2–10 cards; đồng nhất button type/count | [carousel](2026-10-06-plan003/whatsapp-messages--interactive-media-carousel-messages.md.txt); khác Messenger generic và khác pre-approved carousel template |
| WA interactive response | button_reply/list_reply trong interactive object | [interactive](2026-10-06-plan003/whatsapp-webhooks--reference--messages--interactive.md.txt); render title nhưng giữ action ID; không thực thi action khi hiển thị history |
| WA status/unsupported | statuses[].id/status/timestamp; unsupported event/message có error | [status](2026-10-06-plan003/whatsapp-webhooks--reference--messages--status.md.txt), [unsupported](2026-10-06-plan003/whatsapp-webhooks--reference--messages--unsupported.md.txt); không tạo text giả, không regress read→sent do reordered receipt |
| WA media lifecycle | URL5 phút; webhook media ID7 ngày; upload ID30 ngày; image5MB, audio/video16MB, document100MB theo MIME table | [media](2026-10-06-plan003/whatsapp-business-phone-numbers--media.md.txt); tenant-authorized media fetch/cache/expiry, không lưu ephemeral URL như permanent file. CRM có thể đặt quota thấp hơn ở PLAN-004 |

Platform=Messenger/Instagram/WhatsApp/Zalo chỉ là khả năng mở rộng envelope. Dossier này không mở quyền rollout Instagram/Zalo. Read/render và compose/send là capability riêng. CRM JSON schema phải bao payload nested với version/limits, giữ internal message ID và legacy provider_message_id semantics.

## Gap dispositions và điều kiện unblock

| ID | Kết luận / trạng thái nghiên cứu | Chặn gì / evidence cần bổ sung | Owner tiếp theo |
|---|---|---|---|
| G-01 subscription spelling | RESOLVED_DOC: dedicated Messenger reference xác nhận plural; action payload vẫn pass_thread_control/take_thread_control | Sandbox subscribe/readback đúng version vẫn NOT_RUN | PLAN-004 adapter acceptance |
| G-02 legacy routing/version | VERSION_RESOLVED v26.0; legacy Handover links không quyết định authority | Sandbox configured default app, zero-config, allowed/denied take, idle/expiry và thread_owner results trước live control | PLAN-004 routing gate |
| G-03 take vs send | RESOLVED_DOC: setup giải thích hai cơ chế riêng | Explicit take phải có escalation partner; không dùng send thử để lấy control. Race/late replies NOT_RUN | PLAN-004 control contract |
| G-04 API host/auth | AUTH_RESOLVED_DOC Bearer theo guide; ENDPOINT_GAP: reference api.facebook.com/business/whatsapp/phone_numbers/... vs guide graph.facebook.com/v21.0/...; both show header1.0.0 | Chặn bật WA control adapter. Chọn reference path làm candidate, cần official clarification hoặc authenticated sandbox đúng pinned host/header; không silent fallback qua nhiều host | PLAN-004 provider binding |
| G-05 WA handover schema | GAP: setup yêu cầu messaging_handovers nhưng WhatsApp index không có reference; candidate Markdown trả HTML, browser chỉ page shell. Standby source có các heading trống | Chặn complete WA routing state machine/payload validator Ready. Cần official full schema hoặc sanitized sandbox payload cho AI→Human→AI, ordering/correlation; không copy Messenger schema | PLAN-004 control contract |
| G-06 eligibility/platform | CONDITIONAL: overview WhatsApp; entity params/capabilities IG không đồng nhất; Health excluded | Chặn enable Meta Agent cho account thật cho tới eligibility, region/category, permissions, billing/audience được xác nhận. Instagram/Zalo chưa có design gate | Integration environment owner |
| G-07 unknown send/control | GAP: không có guarantee provider idempotency/CRM-intent lookup trong sources đã đọc; message IDs có sau acceptance | Chặn automatic resend/reconcile-success claim. Thiết kế unknown/attention, sandbox response loss, receipt before ACK và unmatched echo; không nối bằng text/time heuristic | PLAN-004 reliability |
| G-08 callback identity/tools | GAP: connector API định nghĩa tool/auth nhưng chưa chứng minh trusted per-call conversation/consumer binding và retry identity đủ cho CRM | Chặn mutable CRM tools qua hosted Agent. Cần request contract authentication, tenant/principal/subject binding, stable call ID/replay và auth revoke tests; nếu thiếu thì capability disabled | PLAN-004 agent gateway |
| G-09 shared budget | RESOLVED_DOC Business Manager scope + replace-all; authority model còn Draft | Chặn tenant-local budget write khi shared Business Manager. Define ownership/authorization/concurrency và readback trước exposing control | PLAN-004 provider config |
| G-10 missing exports | 4 requests trả HTML thay Markdown: WA overview, AI-enabled numbers, message_echoes, candidate messaging_handovers | Chưa đủ kết luận endpoint không tồn tại. Core send/auth/standby có nguồn thay thế; G-05 là blocker bắt buộc. Không giả mirror đầy đủ | PLAN-004/source follow-up |

Research DONE cho PLAN-003 vì mọi gap đã có disposition, impact, owner và evidence cần thiết. Không đóng production AC; không đánh các source-dependent sub-scopes Ready. PLAN-004 được bắt đầu phần độc lập (common envelope, config binding, capability UI, operation ledger) trong khi giữ live WA control/mutable-tool sub-scopes Draft cho đến khi G-04/05/08 được giải quyết.

## Sandbox evidence plan — chưa thực thi

Thiết bị/account test riêng được cấp quyền hợp lệ, synthetic catering/retail, allowlisted testers; secret ở store ngoài Git. Ghi opaque aliases và sanitized codes/correlation, không lưu token/transcript/phone thật. Test một scope/version mỗi lần; không tự reset volume hoặc cấu hình tài khoản thật để nghiên cứu.

1. Verify token/asset binding, eligibility denied/allowed; subscribe/readback fields và webhook version; no cross-tenant entity/config reads.
2. Signature raw-byte/Unicode, multiple-entry batch, replay/out-of-order/partial failure và crash trước/sau durable ACK; count Message/turn không tăng khi duplicate.
3. AI standby inbound + reply echo + statuses, CRM takeover, external takeover, provider handoff, release, timeout/permission loss; chứng minh một responder, không tự resume stale Workflow.
4. Synthetic text/media/reply/gallery/CSAT round-trip; unknown template, URL expiry, missing source message, tenant denied và frontend injection fallback.
5. Remote mutation mất response, send accepted mất ACK, token revoke/429, config drift, tool duplicate/revoke; unknown giữ unknown cho tới có bằng chứng đáng tin.
6. Eligibility/allowlist/test/eval và knowledge config; provider result không là CRM consent evidence. Budget tests chỉ trên Business Manager cô lập, không shared production scope.

PLAN-004 phải gắn từng source task với các cases này và M3 AC sub-scope. Chưa có task source hoặc ngày rollout cam kết.
