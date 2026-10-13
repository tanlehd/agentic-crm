# Marketing conversion performance

Product requirements accepted2026-10-07, PLAN-013 / CHG-20261007-15. Exact provider fields, APIs, projections and UI remain PLAN-011; this is not implemented reporting evidence.

## Mục tiêu quyết định

Báo cáo trả lời nguồn quảng cáo, nội dung, thông điệp và tệp khán giả nào tạo hội thoại có chất lượng, chuyển thành Lead, Deal và kết quả bán hàng tốt để phân bổ ngân sách và nguồn lực sản xuất content/chăm sóc. Giá trị Deal won là outcome kinh doanh trong funnel này. Thu tiền/chứng từ là nghiệp vụ riêng, không phải dependency hoặc thước đo độ tin cậy của báo cáo marketing.

Đọc theo Account → Campaign → Ad Set → Ad, drilldown Conversation → Lead → Deal. Organic theo Page là baseline nguồn không quảng cáo. Báo cáo tổng won theo ngày chốt hiện có là đầu ra nền tảng; chưa đủ để tuyên bố đã đo conversion marketing theo cohort.

## Dimensions phục vụ quyết định

| Dimension | Dùng để so sánh | Nguồn và giới hạn |
|---|---|---|
| Campaign | Chiến lược/mục tiêu chiến dịch | Marketing hierarchy và objective có evidence từ provider |
| Ad Set | Tệp target và cấu hình phân phối | Targeting metadata được API cho phép, có version; không suy đặc điểm cá nhân thực tế của người chuyển đổi |
| Ad / creative | Mẫu nội dung nào đem lại outcome tốt | Creative reference và metadata được phép đồng bộ; một creative có thể được nhiều ads sử dụng |
| Content / thông điệp | Xem Creative/Post/nội dung/CTA của quảng cáo để marketer đánh giá | Provider metadata có evidence; không gán nhãn chiến lược trong CRM |
| Channel / Page | So sánh nguồn organic và paid | Immutable Conversation→Lead source; unknown/unresolved hiển thị riêng |

Hierarchy IDs đơn thuần chưa đủ phân tích content/message/audience. PLAN-011 phải xác minh fields/permissions của Meta, chốt metadata và Insights dimensions do Meta cung cấp và lịch sử trước SRC-051. Dynamic creative không có evidence asset-level thì chỉ báo ad/creative configuration, không đoán asset đã tạo conversion. Không nhóm chỉ theo tên hoặc tự coi campaign name là audience/message.

## Funnel và measures

- Số Conversation, Lead, qualified Lead, Deal, Deal won; tổng won value tách currency.
- Conversation→Lead: distinct Conversation trong cohort có ít nhất một Lead / distinct Conversation cohort.
- Lead→Deal: distinct Lead cohort có ít nhất một Deal / distinct Lead cohort.
- Lead→Won: distinct Lead cohort có ít nhất một Deal won / distinct Lead cohort.
- Deal win rate: distinct Deal cohort đã won / distinct Deal cohort; hiển thị open/lost và thời gian theo dõi.
- Won value per Lead: tổng won value từ Deals có lineage thuộc Lead cohort / số Lead cohort; cùng currency, mỗi Deal tính một lần.
- Nếu có Ads Insights được đồng bộ và đối soát: spend, cost per Lead/won và won-value-to-spend theo cùng scope/time/currency. Chưa có spend thì không có cost efficiency/ROAS; hierarchy sync vẫn triển khai độc lập, PLAN-011 tách task Insights nếu cần.

Không dùng số Deal chia số Lead để gọi là conversion rate vì một Lead có nhiều Deal. Denominator0 trả null. Với cohort Conversation/Lead phải đếm kết quả tới cùng as_of và cửa sổ theo dõi; không lấy Lead tạo trong tháng chia Deal chốt trong tháng của cohort khác. Exact qualification/stage/history semantics và window sẽ chốt ở PLAN-011.

## Cách đọc để ra quyết định

Hiển thị volume, tỷ lệ chuyển đổi từng bước, won value, pending, cohort age/as_of, freshness và unknown coverage cùng nhau. Tách báo cáo cohort conversion khỏi báo cáo hoạt động theo ngày phát sinh/chốt. Cho phép so cùng kỳ/cùng thời gian theo dõi và drilldown theo quyền để tìm điểm rơi trong funnel.

Nhiều Lead nhưng ít won gợi ý cần kiểm tra chất lượng đầu vào và khâu xử lý Sales; tỷ lệ won cao nhưng mẫu nhỏ chưa đủ để kết luận nên tăng ngân sách. Đây là so sánh kết quả attribution quan sát được, không tự khẳng định tác động nhân quả của riêng content/audience. Không tự điều chỉnh ngân sách.

## Acceptance trước đóng SRC-049

Fixture có ít nhất hai campaigns/ad sets/ads, các creative/message/targeting dimensions xác định được, và trường hợp không xác định. Bao gồm nhiều Lead/Conversation, nhiều Deal/Lead, cohort chưa trưởng thành, won tới muộn, zero denominator, hai currency và late hierarchy resolution. Totals không fan-out; các rate đúng distinct numerator/denominator; lọc cohort/as_of và drilldown ACL đúng. Rename/metadata changes không gán cấu hình hiện tại ngược cho kết quả lịch sử mà thiếu policy/version. Cash receipts không nằm trong gate này.

[CRM base plan](crm-base-outcomes.md) · [Marketing](../services/marketing.md) · [Reporting](../modules/reporting.md).
PLAN-014: [official-source mapping](../data/marketing-field-mapping.md) specifies Campaign objective/budget, Ad Set optimization/targeting/destination, Ad delivery/creative binding, Creative variants/CTA without marketer-owned CRM labels. Meta audience/asset aggregate metrics do not identify which individual asset/audience generated a CRM won. Physical/API design stays PLAN-011.

CHG-20261008-03 supersedes Conversation grain as the primary CTM acquisition funnel: use [Conversation Session cohort](../contracts/conversation-acquisition-session.md). Session→Lead/Won use distinct sessions with outcomes divided by all sessions in the cohort, including those without Leads. Conversation/Contact counts remain separate new/returning-context metrics. Session is not an ad flight or Chatflow run.

PLAN-019 / CHG-20261008-05: [Meta-native operating flow](../contracts/marketing-operating-flow.md) supersedes CRM taxonomy. No ad-unit tagging workflow; immutable ad_id joins CRM outcomes at Ad/Ad Set/Campaign grain. Insights breakdowns do not provide per-Lead demographic/placement/asset attribution. PLAN-011 must scope Insights ingestion before closing the complete joined report.

PLAN-020 / CHG-20261008-06: [Three report families](../contracts/marketing-operating-flow.md) separate Meta delivery/engagement by age and region, CRM conversions via Session ad_id, and joined ad-total performance. Sync age/region breakdowns for impressions/clicks/spend; no person-level demographic join, no allocation of CRM won to breakdown rows. Preserve separate datasets and recompute distinct Contact totals. Exact Insights ingestion and query/period contracts remain PLAN-011.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.
