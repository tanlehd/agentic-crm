# CRM base — Lead, Deal, Ticket và outcome tới doanh thu

**Current priority CHG-20261007-14:** Lead/Deal → organic Conversation→Lead→Deal won with value → organic Page report/release (SRC-045/046/052/050); then Marketing sync/campaign reports (SRC-051/049). Ticket/receipts follow separately. CHG-20261007-15: marketing reports measure conversion performance for resource, content/message and audience strategy; won value is a funnel outcome, receipts are independent. Exact scoped design: [organic Sales base](../contracts/organic-sales-base.md).


Status: scoped Lead/Deal/organic implementation theo PLAN-011A Ready; evidence trong tracker. PLAN-011 còn thiết kế exact Marketing/Ticket/receipts trước source tương ứng. CHG-20261007-14 ưu tiên organic trước Marketing, rồi các scope CRM còn lại và frameworks; không thay evidence M1–M2.

## Mục tiêu và baseline

Một platform quản lý Contact → Conversation → Lead → Deal → kết quả bán hàng/thực thu, truy hồi nguồn marketing. Sales agent tạo được Lead và Deal thủ công; lối tạo Lead chính là từ hội thoại. Ticket phục vụ chăm sóc, liên kết Contact/Conversation/Deal, không là bước bắt buộc để ghi nhận doanh thu.

Đã có Contact/Company/Activity/metadata/ACL; Lead draft/qualification/disqualification, Chatflow upsert, handoff/acceptance và Sales queue/detail (SRC-012/020/021/022). SRC-045/046/052 bổ sung immutable Lead source, Deal lifecycle cố định và organic Page won-value report. Ticket nghiệp vụ, thực thu và campaign report còn backlog. Framework M2 đủ làm baseline tương thích, CRM base không phải chờ SRC-042…044.

## Quy tắc nguồn phải giữ

Chi tiết sản phẩm tại [source attribution](../contracts/crm-source-attribution.md). Có hai nhóm độc lập:

- **Nguồn hệ thống:** creation origin, Conversation/Contact/connection/touchpoint refs và snapshot channel, Page ID, ad ID; campaign/ad-set chỉ khi có evidence. Backend lấy từ dữ liệu hội thoại đã lưu và được phép đọc, không nhận giá trị tự khai từ client. Snapshot bất biến, không sửa qua UI/API/import/generic metadata/tool, kể cả admin hoặc automation.
- **Nguồn khai báo:** agent được chọn giá trị trong danh mục cấu hình, có quyền và lịch sử thay đổi. Không ghi đè nguồn hệ thống, không dùng thay ad/campaign khi tính attribution. UI và báo cáo đặt tên riêng hai nhóm.

Nguồn thiếu là unknown/null có lý do; không suy campaign từ ad ID, không lấy quảng cáo mới nhất của Contact để gán ngược. Dữ liệu campaign bổ sung từ provider phải có provenance/version riêng, không sửa snapshot gốc. Lead thủ công không gắn hội thoại không được nhận nguồn hệ thống do agent nhập; Deal độc lập cũng vậy. Deal tạo từ Lead giữ lineage nguồn của Lead dù thao tác tạo Deal là thủ công.

## Chuỗi task và đầu ra

Trạng thái chuẩn tại [tracker](../tracking/tasks.md); một task triển khai active. PLAN-011A đã mở gate scoped organic; các phần Marketing/Ticket/receipts còn cần PLAN-011 chia exact spec/acceptance trước claim source.

| Task | Dependency | Đầu ra / nghiệm thu bắt buộc |
|---|---|---|
| PLAN-011A | PLAN-010; PLAN-012 | Exact scoped Lead/Deal + organic Page won-value contract, Ready; [design](../contracts/organic-sales-base.md) |
| SRC-045 | PLAN-011A; SRC-041 | Manual/Conversation Lead, immutable source snapshot và editable declared source |
| SRC-046 | SRC-045 | Manual/from-Lead Deal, fixed stages và won/lost terminal, value/currency và Customer; reopen/configurable pipeline ngoài phase1 |
| SRC-052 | SRC-046 | Organic Page report theo ngày chốt/currency, ACL và Deal drilldown; không phụ thuộc Marketing |
| SRC-050 | SRC-052 | Local organic release: data preservation, regression, browser/restart/build evidence |
| PLAN-011 remaining | PLAN-010 | Exact Marketing/sync/campaign contracts; Ticket/receipt contracts trước source scopes tương ứng |
| SRC-051 | PLAN-011; SRC-050 | Facebook Ad Account→Campaign→Ad Set→Ad sync trong crm_marketing, API/events, local/live gates riêng |
| SRC-049 | SRC-051; SRC-053; SRC-055; SRC-062; PLAN-022 | Connected Reporting adapters/templates sau [mock builder release](report-builder.md); acquisition Session→Lead→Deal→won và admitted ad spend, creative/content/targeting theo evidence; không duplicate fixed report engine |
| SRC-047 | SRC-049 | Ticket basic; advanced SLA riêng |
| SRC-048 | SRC-047 | Cash collection/refund evidence và report extension; khác won value |

CHG-20261007-14 supersedes earlier Ticket/receipt-before-report ordering. Organic release first; next Marketing exact design/sync/campaign reporting, then deferred CRM scopes. Framework PLAN-009 remains gated at least by SRC-050 and does not override this user priority. SRC-035…037 Inbox completeness and PLAN-007B extraction retain separate gates.

## PLAN-011 phải giải quyết trước code

CHG-20261007-13 chốt ownership: [Marketing](../services/marketing.md) đồng bộ Ad Account/Campaign/Ad Set/Ad từ Facebook Marketing API trong schema crm_marketing; thay phần campaign enrichment chưa xác định trước đây. Connector chỉ giữ nguồn webhook/referral. PLAN-011 phải chốt sync/auth/API/events/physical tables và report projection; SRC-051 nằm sau SRC-050 organic release và trước SRC-049. Không cần Ads Insights/spend hoặc tạo/sửa quảng cáo để hoàn thành hierarchy sync. Local CRM base gate dùng adapter synthetic đã khai báo; live account sync là evidence riêng.

1. Rà command/UI/physical model hiện có; chọn state transitions Lead sau accepted và conversion sang Deal, nhiều Lead/Contact và nhiều Deal/Lead; giữ consent/qualification semantics. Sale human được manual create theo quyền hiện hành; không yêu cầu chạy AI mới tạo được record.
2. Chốt endpoint/DTO/field errors/permissions cho create-from-Conversation, manual create, declared source và immutable fields; actor/tenant từ session, quyền Contact/Conversation/Lead/Deal/Ticket độc lập. Định nghĩa idempotency command để retry không duplicate nhưng cho phép chủ đích tạo nhiều nhu cầu từ cùng hội thoại; không unique một Lead/Conversation.
3. Chốt chọn touchpoint khi hội thoại có nhiều ads: policy/version nhất quán và server-selected basis; không cho người dùng chọn ad để thay attribution. Chốt trusted enrichment ad→campaign, unknown reporting và bounded evidence retention. Chỉ bật policy khi exact contract Ready.
4. Chốt Deal stage/reopen, Contact Customer correction; một Deal có một lineage chính trong CRM base, không tự phân bổ đa chạm. Liên kết bổ sung không rewrite origin hoặc double count. Manual Deal không Lead vẫn hợp lệ và được báo cáo riêng.
5. Chốt Ticket transition/owner/resolution/reopen tối thiểu. SLA calendar/pause/escalation nâng cao vẫn Draft M4, không dùng gate basic để báo AC-10 đầy đủ DONE.
6. Chốt mô hình thực thu tối thiểu trong Sales và authority cho actor ghi nhận, chứng từ/reference, unique receipt key, correction/reversal/refund, reconciliation. Manual recording có evidence là phạm vi base; cổng thanh toán/ERP/bank sync giữ integration gate riêng. Phân biệt Deal won amount với tiền thu; không đồng nhất appointment/list price với doanh thu. Không tự mở nghiệp vụ kế toán ghi nhận doanh thu.
7. Chốt grain/date/cohort/currency của report: Lead/Deal/receipt riêng, không nhân tiền qua message/association/Ticket; không cộng các currency trực tiếp; chưa có ad spend thì không claim ROAS. Attribution campaign thiếu hiển thị unknown có độ bao phủ, không suy giá trị0.
8. Hoàn thiện module/data ownership/schema catalog/table design template cho mọi bảng thay đổi, exact OpenAPI/events và migration note. Mọi bảng có tenant_id NOT NULL; forward migration giữ dữ liệu, không auto-sync/reset. Baseline monolith dùng ports/UoW sẵn có; các service đã tách chỉ API/events, không cross-service SQL/FK/UoW. Sales owns Lead/Deal/revenue evidence, Chat owns Conversation, Connector owns ingress/touchpoint, Reporting owns projections.
9. Data legacy: backfill chỉ từ evidence lưu sẵn, không fabricated Page/ad/campaign; ghi provenance/coverage unknown cho dữ liệu không phục hồi được. Giữ source_touchpoint_id/consumer cũ qua compatibility window có kiểm thử; schema/event version và rollback/read compatibility chốt trước migration. Pin snapshot một lần cho legacy theo migration có kiểm chứng, không cho edit API dùng đường backfill.

## Gate nghiệm thu CRM base

- Human Sales tạo Lead/Deal thủ công, tạo Lead từ Inbox; thiếu quyền Contact/Conversation/cross-tenant phải bị chặn. Không auto qualify hoặc fake consent chỉ vì tạo từ Chat.
- Lead từ Conversation snapshot đúng channel/Page/ad; thêm inbound hoặc sửa nguồn khai báo không đổi snapshot. Client spoof/PATCH/bulk/custom-field shadow đều bị chặn ở backend. Read/filter/export áp dụng field ACL.
- Lead→Deal→receipt drilldown giữ cùng lineage sau đổi owner, handoff, rename Page/campaign và restart. Manual/unattributed records báo cáo tách rõ.
- Hai ad cùng campaign, nhiều Lead cùng Contact, nhiều Deal một Lead, nhiều receipt một Deal, refund và Ticket links: từng grain đếm đúng; tổng report đối soát được với chứng từ gốc, không fan-out.
- Ticket basic có thao tác UI/API và audit được kiểm; SLA nâng cao còn ngoài scope. Deal won chuyển Customer theo contract; thu tiền và won amount được hiển thị riêng.
- Synthetic data giữ/tái sử dụng; local signed/mock CTM đủ kiểm logic nguồn. Live Meta ingress/send/ad campaign lookup chưa có evidence không được đánh PASS production. Full M3 live, M4 appointments/Google Ads và M5 builders không được đóng bởi SRC-050.

## Theo dõi và phạm vi phiên lập plan

Phiên PLAN-010 chỉ tạo/cập nhật tài liệu, kiểm links/dependency/whitespace. Không schema/API/runtime change, không claim source implemented. PLAN-011A mở scoped organic implementation; PLAN-011 remaining trước Marketing/Ticket/receipt scopes. [Acceptance](../quality/acceptance.md) · [Sales](../modules/sales.md) · [Ticket](../modules/ticket.md).


CHG-20261007-15: [Marketing conversion performance](marketing-conversion-performance.md) là mục tiêu SRC-049; PLAN-011 phải chốt dimension metadata/history, cohort/rates và UI so sánh để quyết định nguồn lực/content/message/audience. Receipts không là dependency. Ads Insights/spend tách task khi exact scope Ready.

PLAN-014 research input: [Meta dossier](../references/meta/marketing-dossier.md) and [field merge](../data/marketing-field-mapping.md). PLAN-011 uses selected provider fields/units/versions for exact physical/API design; do not infer fields from ad names. Creative/targeting metadata belongs to SRC-051; Insights needs its own scoped task before cost reporting.

CHG-20261008-03: [Page→Conversation→Session→CRM](../contracts/conversation-acquisition-session.md) is the target acquisition model. PLAN-011 must resolve segmentation, long-lived Conversation lifecycle, events/DDL/API and legacy migration. Then SRC-053 session/source cutover and SRC-051 Marketing sync precede SRC-049 campaign conversion reports. Existing organic release is historical baseline; do not claim it covers sessions.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.
