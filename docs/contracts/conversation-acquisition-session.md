# Conversation Session — acquisition và CRM lineage

**Current SRC-068:** [Customer360/session contract](customer-360-session.md) implements session-preserving Ad touches, actual Lead/Deal context and duplicate consolidation in forward28. [Final ERD](../data/chat-sales-erd.md) remains the target for configurable stage/history and milestone evidence, which are not included in this slice. Historical rules below do not override the SRC-068 writer.

**Accepted direction CHG-20261013-07,2026-10-13:** Ad mới trong một session chưa close không mở session mới. SRC-068 now implements this; connected funnel/attribution reporting remains separate.

**Historical SRC-053 baseline:** [v1 implementation contract](acquisition-session-implementation.md) records the original lifecycle/API/DDL. Physical names remain status, source_classification, source_touchpoint_id, policy_version and source_conversation_session_id on Deal. Session Contact resolves through Conversation. SRC-068 keeps one active session/thread, explicit close with no timeout, and qualifying inbound reopens the same thread; it removes referral-driven splitting. Late reconciliation and full cohort reporting remain pending.

PLAN-018 / CHG-20261008-03, 2026-10-08. Product model accepted theo người dùng; exact segmentation/API/DDL/migration còn PLAN-011. Supersedes Conversation-level attribution as the target for subsequent acquisition reporting; runtime organic baseline remains as implemented until SRC-053 cutover.

## Quan hệ và ownership

Facebook Page → nhiều Conversations → mỗi Conversation nhiều Conversation Sessions. Conversation là luồng trao đổi dài hạn với khách hàng trên channel identity đó; Session là một đợt tương tác có nguồn và outcome riêng, đặc biệt lượt quay lại qua CTM. Với Instagram DM, identity tương ứng là Instagram Account; không ép Page ID giả. Business parent là channel identity phù hợp, không đồng thời bắt buộc Page và Instagram.

- Connector owns inbound/referral evidence; Chat owns Conversation, Conversation Session và message membership.
- CRM Core owns Contact/customer identity và associations/context; Sales owns Lead/Deal. Conversation và Session đều có contact_id reference đã validate; session contact phải nhất quán với Conversation tại thời điểm tạo. Contact merge/correction cần policy riêng.
- Marketing owns Ad/Campaign/creative metadata; Reporting nối acquisition evidence tới Marketing dimensions và CRM outcomes qua API/events. Không cross-service SQL/FK.
- Conversation Session không phải chatflow_session, qualification_session_id, AI execution hoặc auth_session. Một acquisition session có thể được Human xử lý mà không chạy Chatflow. Orchestration sessions cần binding riêng nếu tích hợp.

## Fields logical

| Entity | Fields cần cho target | Ý nghĩa |
|---|---|---|
| Conversation | tenant_id, id, channel_identity_ref, provider_thread_key?, crm_contact_id | Thread/context xuyên nhiều lần tương tác; không dùng một ad_id làm nguồn cho toàn bộ đời thread |
| Conversation Session | tenant_id, id, conversation_id, crm_contact_id, sequence, opened_at, closed_at?, state, opening_reason, segmentation_policy_version | Đợt tương tác có ranh giới tái lập được |
| Session source | source_channel, source_page_id?, source_instagram_account_id?, source_ad_id?, source_referral_id?, source_kind, captured_at, evidence_ref, attribution_policy_version | Nguồn backend xác định từ evidence của đợt đó; paid/organic/unknown phân biệt rõ |
| Message membership | tenant_id, message_id, conversation_session_id, membership_policy_version | Một message thuộc tối đa một session canonical; late/unresolved có trạng thái rõ, không double count |
| Lead origin | contact_id, conversation_id?, conversation_session_id?, source snapshot | Lead tạo từ session pin nguồn session; không lấy first/latest ad của cả Conversation |
| Deal origin | lead_id?, origin_conversation_session_id?, origin snapshot | Deal từ Lead giữ lineage; Deal thủ công giữ manual khi không có evidence |

Đây là logical fields, chưa là physical columns; mọi bảng sau này phải tenant_id NOT NULL và table template. FK chỉ nội bộ cùng owning service; remote refs qua authorized ports/API.

## Vòng đời và ranh giới cần chốt

Session CTM ghi nhận một đợt tương tác phát sinh từ evidence quảng cáo, không phải một bản sao campaign/ad flight. Một Ad có thể tạo nhiều sessions ở nhiều Conversations và có thể nhiều lượt trong cùng Conversation. Cùng ad_id không phải dedup key của Session.

Đề xuất exact design: referral mới, không trùng provider event, mở CTM session mới; message tiếp nối gắn đúng session theo order/boundary policy. Retry webhook không tạo session mới. Referral đến muộn hoặc sai thứ tự phải reconcile theo policy có audit, không ghi lại nguồn Lead đã đóng dấu. Không tự coi message mới luôn là session mới hoặc luôn đóng session đang active.

PLAN-011 phải chốt: event nào mở phiên; referral cùng ad khác event có phải lượt mới; khoảng im lặng cho organic return; explicit close/reopen; simultaneous referrals; một hay nhiều active sessions; membership của outbound/late messages; source correction trước/sau tạo Lead. Chưa tự đặt timeout24h/7 ngày. Việc mở session mới có đóng phiên trước không là quyết định lifecycle cần exact contract, không suy từ sơ đồ.

Nguồn session đã publish/pin vào Lead bất biến đối với UI/API edit. Missing ad evidence giữ unknown/organic theo policy đã xác định, không lấy ad mới nhất của Contact để backfill. Late Marketing hierarchy chỉ bổ sung dimension resolution, không thay session/Lead source. Nếu cần correction sau publication: versioned correction/audit riêng, giữ original evidence và report policy; không mutable source PATCH.

## CRM và funnel

Agent có thể mở CRM context từ Conversation hoặc Session. Khi tạo Lead trong context Conversation, command phải resolve một Session cụ thể có quyền và thể hiện cho agent biết lượt tương tác đang xử lý; không chọn âm thầm nếu ambiguous. Cho phép một session có nhiều nhu cầu/Leads bằng command khác; không unique một Lead/session. Liên kết session theo dõi thêm với Lead/Deal hiện có là association riêng, không chuyển origin attribution.

Ví dụ: cùng Page và khách hàng, Conversation C1 có Session S1 từ Ad A rồi Session S2 từ Ad B. Lead L1 từ S1, L2 từ S2; Deal won của L2 phải truy hồi Ad B và campaign của B. S2 không sửa nguồn L1, và nguồn đầu C1 không áp lên L2.

Primary marketing funnel: **Ad → CTM Conversation Session → Lead → Deal → Won**. Session không tạo Lead vẫn nằm trong mẫu số. Session→Lead = distinct sessions cohort có ≥1 Lead / distinct sessions cohort; Session→Won tương tự. Lead→Deal và Lead→Won giữ distinct Lead cohort; won value mỗi Deal một lần theo primary lineage/currency. Distinct Conversations/Contacts là measures khác để thấy new/returning engagement, không thay mẫu số sessions. Receipt không là dependency.

Session outcome nên projection từ facts (has_lead, has_deal, has_won, unresolved, pending) với as_of/coverage, không đóng session chỉ vì Deal won và không một outcome enum làm mất trường hợp nhiều Leads/Deals.

## Compatibility và triển khai

Baseline code: Conversation closed hiện nhận inbound mới bằng Conversation mới; Lead source port lấy nguồn Conversation/first touchpoint; qualification_session_id trỏ Chatflow. Những hành vi này chưa đáp ứng target long-lived thread + acquisition sessions. Giữ evidence DONE cũ là baseline scoped, không coi đó là SRC-053 DONE.

SRC-053 sau PLAN-011 Ready: forward migrations, versioned commands/events, durable session membership, Inbox session context, create Lead from session, inherited Deal lineage, tenant/ACL/idempotency và migration evidence. Không rename qualification_session_id thành conversation_session_id. Human manual Lead/Deal vẫn được phép không có session.

Legacy dữ liệu chỉ backfill sessions/nguồn từ evidence đủ chứng minh; không split giả hoặc gom Conversations của nhiều khách hàng. Thiếu ranh giới ghi legacy_unsegmented/unknown coverage; giữ record IDs và nguồn cũ, không đổi audit lịch sử. PLAN-011 chốt tương thích client conversation_id-only và conversation close semantics trước cutover. SRC-049 campaign conversion report phải chờ cả SRC-051 và SRC-053.

Acceptance: hai ads/hai sessions cùng Conversation; cùng ad nhiều lượt; duplicate/out-of-order/late referrals; session không Lead; nhiều Lead/session và Deal/Lead; organic return; close/reopen; manual path; additional association không đổi origin; legacy unknown; tenant/field ACL; history/restart/membership consistency. Source/runtime tests NOT_RUN trong task product/ERD này.

[ERD tổng thể](../data/marketing-erd.md) · [Marketing report purpose](../planning/marketing-conversion-performance.md).
