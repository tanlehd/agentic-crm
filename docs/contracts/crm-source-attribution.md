# CRM source attribution — yêu cầu sản phẩm và gate exact contract

**Current priority CHG-20261007-14:** Lead/Deal → organic Conversation→Lead→Deal won with value → organic Page report/release (SRC-045/046/052/050); then Marketing sync/campaign reports (SRC-051/049). Ticket/receipts follow separately. CHG-20261007-15: marketing reports measure conversion performance for resource, content/message and audience strategy; won value is a funnel outcome, receipts are independent. Exact scoped design: [organic Sales base](organic-sales-base.md).


Status: product rules accepted2026-10-07 theo người dùng; PLAN-010. Wire names, physical DDL, selection policy, versioned API/events và migration Ready thuộc PLAN-011. Không thay DTO/runtime M2 ngay bằng tài liệu này. [Plan](../planning/crm-base-outcomes.md).

## Hai nhóm nguồn độc lập

| Nhóm | Nội dung logical target | Writer / thay đổi |
|---|---|---|
| System origin | creation origin manual/conversation/automation, original Conversation/Contact/connection/touchpoint refs, captured_at, snapshot version | Sales command đóng dấu một lần từ context/evidence được xác thực; actor không nhập hoặc sửa |
| Conversation source snapshot | channel/platform, page_id, ad_id; campaign_id/adset_id nếu được chứng minh; occurred_at/basis và trạng thái known/unknown | Snapshot từ Conversation và Connector-owned evidence qua port/API; bất biến sau tạo |
| Declared source | source option do agent chọn từ danh mục được phép, independent of system attribution | Agent có quyền chọn/sửa qua command có CAS/audit; catalog disable/rename không phá lịch sử |
| Marketing hierarchy | Ad Account→Campaign→Ad Set→Ad synced từ Facebook Marketing API, provider/account scope, observed_at và version | Marketing owns replica trong crm_marketing; Reporting lookup/projection qua API/events; không rewrite original snapshot |
| Deal/revenue lineage | Origin Lead/Conversation/source snapshot refs, Deal và receipt refs | Pin tại lúc tạo theo authoritative command; thêm association không rewrite lineage |

Các tên trên là logical concepts, chưa phải field keys được API hỗ trợ. Provider IDs lưu như opaque strings; uniqueness/lookup có tenant và provider/account/Page scope, không coi ad_id trần là key toàn platform. Không lưu token/transcript vào attribution hay event/log.

## Hành vi

Sales agent được tạo Lead thủ công từ Contact, hoặc chọn “Tạo Lead” trong Conversation có quyền. Tạo từ Conversation là lối chính: backend validate same-tenant Contact binding và current permissions, đọc source evidence đã persist, tạo Lead+snapshot+audit/receipt atomic trong domain boundary. Client chỉ gửi refs và dữ liệu nghiệp vụ được phép; source values từ client bị reject. Manual không có Conversation giữ system channel/Page/ad unknown, dù declared source là Facebook hay campaign do người dùng khai báo.

Source snapshot không được sửa bởi Human, AI, admin, generic CRM PATCH, import hoặc tool. Field custom không được shadow/override reserved system source. Retry cùng command key trả cùng Lead; command mới có chủ đích có thể tạo nhu cầu khác trong cùng Conversation. Session-based Chatflow uniqueness hiện có vẫn giữ. Qualification, consent và handoff là nghiệp vụ riêng; tạo Lead không tự xác nhận consent/qualified/accepted.

Không dùng latest Contact touchpoint để cập nhật Lead cũ. Nhiều touchpoint trong cùng Conversation phải có exact server-side selection policy ở PLAN-011 trước implementation. Thiếu ad/campaign giữ null/unknown và reason; Page/channel không bị mất chỉ vì hội thoại organic không có ad. Campaign không phải luôn có trong CTM webhook; không suy từ tên hoặc giá trị declared source. Report dùng mapping có provenance/version và công bố unknown coverage.

Deal được tạo thủ công từ Contact hoặc từ Lead. Từ Lead: pin lineage của Lead, không lấy source của hội thoại mới. Deal độc lập: không fabricated ad attribution. CRM base dùng một primary lineage/Deal; các Lead/Conversation associations bổ sung không tạo attribution thứ hai. Không reparent origin để sửa doanh thu campaign; correction policy/audit nếu cần phải qua design riêng, không mở mutable field thông thường.

Receipt/refund/reversal truy về Deal rồi lineage. Won amount, gross collected, refunded và net collected là metric riêng; số tiền có currency và effective date. Quyền read/filter/export/drilldown kiểm trên từng resource, không bypass Conversation ACL chỉ vì được đọc Deal; metadata snapshot có field ACL riêng.

## Compatibility và acceptance

CHG-20261007-13: [Marketing](../services/marketing.md) là authority của local ad hierarchy. Reporting đi từ immutable source ad_id → Marketing Ad → Ad Set → Campaign → Ad Account để gom nhóm doanh thu; không đòi campaign_id phải có trong webhook hoặc Lead snapshot. Late sync có thể resolve report cũ qua projection mà không sửa Lead. Tenant/account scoping, mapping history/watermark và unresolved/mismatch cases phải được chốt trong PLAN-011; không SQL join xuyên schema. Declared source vẫn độc lập.

Giữ baseline source_touchpoint_id semantics tới migration/version cutover được thiết kế. Legacy chỉ backfill được từ evidence persisted; thiếu evidence đánh unknown, không tự lấy connection/Page hiện tại để gán lịch sử. Chưa có physical table mới hoặc migration trong PLAN-010.

Acceptance CRM-BASE-02/03/06/07 trong [ma trận](../quality/acceptance.md): spoof/edit bị reject, snapshot không đổi khi inbound/declared source thay đổi, tenant/field ACL, manual unknown, retry không duplicate, lineage bảo toàn và report không fan-out. Test phải bao gồm legacy/missing referral và campaign enrichment unavailable.

Target override CHG-20261008-03: [Conversation Session source](conversation-acquisition-session.md) replaces first/latest Conversation touchpoint as the target basis for new session-origin Leads after SRC-053. Same thread can contain independent Ad A/Ad B sessions; Lead pins selected session source and Deal inherits it. Existing runtime baseline is unchanged pending exact contract/migration; do not mutate prior snapshots or reuse qualification_session_id.
