# Meta Marketing API — object và operational field dossier

PLAN-014, nghiên cứu2026-10-07. Đã tải24 official Markdown documents, chọn103 top-level fields có trace tới dòng bảng nguồn, cùng nested targeting/creative paths và CRM-derived metadata trong [dictionary merge](../../data/marketing-field-mapping.md). Scope tập trung conversion marketing, không phải toàn bộ kho Meta docs. Chưa gọi account API hoặc triển khai sync.

## Snapshot và cách kiểm chứng

[Manifest](2026-10-07-marketing/manifest.json) ghi URL, thời gian UTC, HTTP/content type, số byte và SHA-256 cho từng Markdown và raw response. Meta trả “View as Markdown” trong HTML `<pre data-testid="developer-docs-markdown-page">`; downloader giữ raw response byte-for-byte, chỉ extract pre và decode HTML entity một lần sang `.md.txt`. Không gọi bản extracted là byte-identical HTTP response. Đuôi `.md.txt` theo convention repository để upstream JSON ví dụ không bị coi là internal schema test.

`scripts/meta-marketing-snapshot.mjs` tải/caching dated dossier; không overwrites successful snapshot bằng refresh ngầm. Refresh phải tạo dated directory mới và review impact. `scripts/meta-marketing-field-selection.mjs` sinh field selection từ allowlist và type trong bảng chính thức; semantic mapping được review riêng, không auto biến field thành DDL. `scripts/check-marketing-references.mjs` kiểm checksum/raw extraction/traceability.

Web search fetch gặp429; direct public HTTP lấy được official Markdown. Một số guessed legacy/root llms/Markdown paths trả HTML/404, không được lưu thành valid source; failed discovery attempts giữ trong manifest. Object Story Spec standalone chưa lấy được Markdown, dùng Creative parent reference và asset feed/CTM cho scope chọn hiện tại; exact nested schema còn PLAN-011. Ads Insights standalone path không có body hợp lệ; dùng official Ad Account `/insights` edge reference chứa fields/parameters. Không dùng nội dung login/error page làm bằng chứng.

## Nguồn đã tải

| Nhóm | Snapshot |
|---|---|
| Structure và version | [Overview](2026-10-07-marketing/overview.md.txt), [Versioning](2026-10-07-marketing/versioning.md.txt), [Changelog](2026-10-07-marketing/changelog.md.txt) |
| Access và sync operation | [Authorization](2026-10-07-marketing/authorization.md.txt), [Rate limiting](2026-10-07-marketing/rate-limiting.md.txt) |
| Core objects | [Account](2026-10-07-marketing/ad-account.md.txt), [Campaign](2026-10-07-marketing/campaign.md.txt), [Ad Set](2026-10-07-marketing/ad-set.md.txt), [Ad](2026-10-07-marketing/ad.md.txt), [Creative](2026-10-07-marketing/creative.md.txt) |
| Targeting | [Basic](2026-10-07-marketing/basic-targeting.md.txt), [Advanced](2026-10-07-marketing/targeting.md.txt), [Advantage+](2026-10-07-marketing/advantage-audience.md.txt), [Placement](2026-10-07-marketing/placement-targeting.md.txt), [Custom Audience](2026-10-07-marketing/custom-audience.md.txt) |
| Content/CTM | [Asset Feed](2026-10-07-marketing/asset-feed-spec.md.txt), [Click to Messenger](2026-10-07-marketing/click-to-messenger.md.txt), [Promoted Object](2026-10-07-marketing/promoted-object.md.txt) |
| Performance | [Insights](2026-10-07-marketing/insights.md.txt), [Account Insights fields](2026-10-07-marketing/account-insights.md.txt), [Breakdowns](2026-10-07-marketing/insights-breakdowns.md.txt), [Asset Insights](2026-10-07-marketing/asset-insights.md.txt), [Best practices](2026-10-07-marketing/insights-best-practices.md.txt), [Currency offsets](2026-10-07-marketing/currencies.md.txt) |

## Kết luận ảnh hưởng thiết kế

1. Legacy URL naming không là domain naming: ad-campaign-group=Campaign, ad-campaign=Ad Set, adgroup=Ad. Creative là object riêng, reusable bởi nhiều ads.
2. Chọn Account currency/timezone; Campaign objective/budget/bidding; Ad Set targeting/optimization/destination/schedule; Ad hierarchy/creative/status; Creative variants/CTA/post/media refs. Chọn fields để giải thích chuyển đổi và delivery, không sao chép billing/tax hoặc mọi field reference.
3. Status configured khác effective. Không kết luận content kém chỉ vì zero outcome khi ad pending review/parent paused hoặc sync unavailable.
4. Advantage+ audience có expansion/suggestions; targeting không xác định người thực sự nhận ad. Asset feed có nhiều biến thể; ad_id từ referral không chứng minh winning body/image. CRM outcome gắn grain Ad; Meta asset/audience aggregate là dataset khác.
5. Budget không phải spend; account amount_spent không phải spend theo ngày/ad. Currency offset100/USD,1/VND cho raw budget/bid; không chia Insights decimal spend lần nữa. Meta attribution settings/action_report_time khác CRM cohort/time basis.
6. Campaign updated_time có ngoại lệ đối với budget changes. Sync cần reconciliation và hashes; timestamps incremental đơn thuần có thể bỏ sót.
7. PLAN-019 supersedes earlier CRM taxonomy proposal. Meta does not supply arbitrary business message-angle labels; do not invent them or require marketer tagging. Use provider hierarchy/metadata/Insights and immutable CRM ad source.

## Version và permission gate

Snapshot Versioning/Changelog Marketing ghi v25.0, trong khi dossier Messenger trước đây pin v26.0. Lưu observation theo surface, không coi global graph_api_baseline là Marketing pin. PLAN-011 dùng v25.0 làm documentation candidate và revalidate supported version/selected fields trước live implementation; không sửa Messenger runtime version từ phát hiện này.

Authorization docs phân biệt permission `ads_read` với `ads_management` và feature Marketing API Access Tier (Limited/Full). Đề xuất sync/report read-only dùng ads_read và account authorization phù hợp; không tự xin management/write scope. Business discovery/Page access/credential reuse phụ thuộc endpoint cụ thể và App Review, cần exact auth design; Page connection hiện có không tự cấp Ad Account access.

## Merge và phần chưa Ready

[103 fields](../../data/marketing-field-selection.json) và [operational meaning](../../data/marketing-field-mapping.md) là đầu vào chuẩn cho PLAN-011. Đã merge ownership/dictionary, service descriptors, reporting acceptance và SRC-051/049 scope. Field definitions dựa nguồn; CRM names/types/history/labels là quyết định thiết kế suy ra từ mục tiêu. Không tạo physical tables, migrations hoặc API response shape trong task nghiên cứu.

Chưa có live field coverage, typed nested schemas đầy đủ, authorized account fixture, pagination/retry runtime hoặc report implementation mới. Không đánh DONE PLAN-011/SRC-051/SRC-049 từ doc research.
