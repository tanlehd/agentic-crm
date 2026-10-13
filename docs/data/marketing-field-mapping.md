# Marketing data dictionary — Meta field mapping

PLAN-014 / CHG-20261007-16, 2026-10-07. Đã đối chiếu official Markdown và chọn logical fields phục vụ [conversion performance](../planning/marketing-conversion-performance.md). Đây là merge vào thiết kế dữ liệu, chưa phải bảng/API đã triển khai hoặc DDL Ready. Exact lengths, indexes, grants, auth, wire contracts và table templates thuộc PLAN-011 trước SRC-051/049.

[Dossier và nguồn](../references/meta/marketing-dossier.md) · [Manifest](../references/meta/2026-10-07-marketing/manifest.json) · [Machine-readable field selection](marketing-field-selection.json).

## Ownership và nguyên tắc ánh xạ

Marketing owns provider replicas, targeting/creative metadata/history trong target `crm_marketing`. Reporting owns dimension/fact projections trong `crm_reporting`; Sales giữ Lead/Deal và immutable source. Không join SQL/FK xuyên service. Các tên entity/field dưới đây là logical names, không tạo bảng ngầm. Mỗi application entity/link/history/fact có `tenant_id NOT NULL` lấy từ TenantContext.

- Provider IDs là opaque strings, kể cả field Meta mô tả numeric string/int64; không parse qua JavaScript Number. Key scope tenant + provider + account + object type + ID. Account `id=act_<id>` và `account_id=<id>` được lưu riêng, normalize có kiểm chứng, không gán Page thành Account.
- Mọi provider field read-only trong CRM; sync adapter là writer. Missing/null/unsupported/permission-denied khác empty/0/false. Ghi field coverage và sync status; không suy zero từ response thiếu trường.
- Provider enum giữ raw value/string hoặc numeric code và label dictionary có version. Unknown enum không làm mất record. Không copy mọi enum/deprecated field trong docs thành feature đang hỗ trợ.
- `created_time`/`updated_time` → provider timestamps; `observed_at`, `last_success_at`, `snapshot_revision`, `payload_hash`, `api_version`, `mapping_version`, `sync_run_id`, `field_coverage`, `availability` là CRM-owned metadata. Thời gian lưu UTC, giữ account timezone phục vụ báo cáo.
- Lịch sử observation không chứng minh thời điểm provider thực sự đổi cấu hình. `observed_from/to` là khoảng đã quan sát; không gọi là effective history chính xác nếu provider thiếu evidence. Report pin revision/as_of và hiển thị coverage; lần sync đầu không backdate creative/targeting hiện tại cho mọi Lead cũ.

## Account — binding, tiền tệ và thời gian

Nguồn: [Ad Account](../references/meta/2026-10-07-marketing/ad-account.md.txt), [currency units](../references/meta/2026-10-07-marketing/currencies.md.txt). Đích logical `marketing_account`.

| Meta field | CRM field / logical type | Ý nghĩa vận hành / lựa chọn |
|---|---|---|
| id, account_id | provider_node_id, external_account_id / string | Định danh gọi API và scope ownership |
| name | name / text | Nhãn hiển thị; không dùng làm key |
| account_status, disable_reason | account_status_code, disable_reason_code / integer + versioned labels | Phân biệt chưa có kết quả với tài khoản không phân phối được |
| currency | currency / currency code | Currency của ngân sách/spend account, không ép currency Deal theo account |
| timezone_id, timezone_name, timezone_offset_hours_utc | provider_timezone_id / integer; timezone_name / string; observed_utc_offset_hours / decimal | Biên ngày Insights; offset là observation, không dùng offset cố định thay timezone qua DST |
| business.id | business_id / nullable opaque string | Business sở hữu nếu có quyền đọc; không phải tenant ID |
| spend_cap | spend_cap_raw / integer-string + currency + offset | Giới hạn chi tiêu account; 0 có nghĩa không giới hạn theo docs; không phải spend theo kỳ |
| amount_spent, balance | Không chọn vào KPI dataset phase1 | Account aggregate và khoản phải trả không thay thế Insights spend theo ad/ngày |

CRM binding thêm credential reference (không token), authorization status, authorized account ID, connected_by, connected_at, revoked_at; exact credential owner/scopes còn gate PLAN-011. Không sao chép địa chỉ thanh toán/thuế vì không phục vụ mục tiêu report.

## Campaign — mục tiêu và nguồn lực

Nguồn: [Campaign, URL ad-campaign-group](../references/meta/2026-10-07-marketing/campaign.md.txt). Đích `marketing_campaign`.

| Meta field | CRM field / logical type | Ý nghĩa vận hành / lựa chọn |
|---|---|---|
| id, account_id, name | external_campaign_id, external_account_id, name / strings | Parent relation và label |
| objective | objective / raw enum-string | Nhóm mục tiêu; modern values gồm OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_APP_PROMOTION, OUTCOME_SALES; giữ legacy khi đọc |
| buying_type | buying_type / string | Cơ chế mua AUCTION/RESERVED; context khi so sánh hiệu suất |
| status, effective_status | configured_status, effective_status / strings | Ý định operator so với trạng thái có hiệu lực; không cần nhân đôi alias configured_status của Meta |
| daily_budget, lifetime_budget, budget_remaining | *_raw / integer-strings + account currency/offset | Allocation tại campaign; không cộng campaign budget với child budgets |
| bid_strategy | bid_strategy / enum-string | Campaign-level bid strategy khi dùng budget optimization; giữ scope owner |
| special_ad_categories, special_ad_category_country | arrays of raw strings | Context giới hạn targeting; không dùng singular deprecated field làm chuẩn mới |
| is_adset_budget_sharing_enabled | boolean nullable | Ad sets có chia sẻ budget; không mặc định false khi thiếu |
| start_time, stop_time | provider_start_time, provider_stop_time / timestamp nullable | Trường tổng hợp lịch child ad sets, không suy campaign schedule độc lập |
| created_time, updated_time | provider_created_at, provider_updated_at / timestamps | Docs cảnh báo updated_time không tự đổi khi một số budget thay đổi: incremental sync phải có periodic reconciliation/hash |

## Ad Set — tệp target, optimization và phân phối

Nguồn: [Ad Set, URL ad-campaign](../references/meta/2026-10-07-marketing/ad-set.md.txt), [Promoted Object](../references/meta/2026-10-07-marketing/promoted-object.md.txt). Đích `marketing_ad_set` + versioned targeting snapshot.

| Meta field | CRM field / logical type | Ý nghĩa vận hành / lựa chọn |
|---|---|---|
| id, account_id, campaign_id, name | external_adset_id, external_account_id, external_campaign_id, name / strings | Ad Set thuộc campaign, không đặt nhầm thành campaign vì tên URL |
| status, effective_status | configured_status, effective_status / strings | CAMPAIGN_PAUSED giải thích ad set không chạy dù configured active |
| destination_type | destination_type / string | MESSENGER, INSTAGRAM_DIRECT, WEBSITE… khác placement và khác channel đã quan sát từ Conversation |
| optimization_goal | optimization_goal / enum-string | Ví dụ CONVERSATIONS, LEAD_GENERATION, QUALITY_LEAD, MESSAGING_PURCHASE_CONVERSION; mục tiêu delivery của Meta, không phải trạng thái CRM Lead |
| billing_event | billing_event / enum-string | Event tính phí; không đồng nhất với optimization_goal |
| bid_strategy, bid_amount | bid_strategy / string; bid_amount_raw / integer-string + currency/offset | Bidding context; tiền raw có đơn vị theo currency và billing event, không float |
| daily_budget, lifetime_budget, budget_remaining | *_raw / integer-strings | Budget ở ad set nếu áp dụng; report xác định budget owner, không double count |
| start_time, end_time, adset_schedule | timestamps; structured schedule nullable | Lịch chạy và dayparting; cần timezone semantics trong exact adapter |
| is_dynamic_creative | boolean nullable | Cờ dùng creative biến thể; không tự suy creative đơn từ false/missing |
| attribution_spec | structured list event_type/window_days theo response | Attribution dùng cho Meta optimization; không thay policy nguồn CRM hoặc cohort CRM |
| promoted_object | allowlisted structured object | page_id, pixel_id, application_id, custom_conversion_id, custom_event_type khi có; target object không phải observed touchpoint |
| targeting | structured versioned object + hash | Giữ cấu trúc AND/OR/inclusion/exclusion; normalized dimensions bên dưới |
| learning_stage_info, issues_info | nullable minimized structured data | Context delivery/learning để đọc đúng biến động conversion; không copy full diagnostic payload vào log |
| created_time, updated_time | provider timestamps | Reconciliation vẫn cần full scan theo lịch |

### Targeting dimensions

Nguồn: [basic targeting](../references/meta/2026-10-07-marketing/basic-targeting.md.txt), [advanced targeting](../references/meta/2026-10-07-marketing/targeting.md.txt), [Advantage+ audience](../references/meta/2026-10-07-marketing/advantage-audience.md.txt), [placements](../references/meta/2026-10-07-marketing/placement-targeting.md.txt), [Custom Audience](../references/meta/2026-10-07-marketing/custom-audience.md.txt).

| Provider path | Logical normalized field / type | Quy tắc đọc |
|---|---|---|
| targeting.geo_locations, excluded_geo_locations | included_geo, excluded_geo / structured object | Giữ provider IDs, keys và types; không làm phẳng mất exclusion |
| targeting.age_min, age_max, age_range, genders, locales | age bounds / integers; age suggestion / pair; gender/locale codes / arrays | Cấu hình/suggestion, không phải tuổi/giới tính/ngôn ngữ của CRM Contact |
| targeting.flexible_spec | detailed_targeting_spec / structured groups | Giữ logic gốc; interests/behaviors trong các nhóm không mặc định là các cohort loại trừ nhau |
| targeting.custom_audiences, excluded_custom_audiences | included_audience_refs, excluded_audience_refs / arrays of IDs | Metadata-only lookup; không tải danh sách thành viên hoặc gán Contact thuộc audience |
| targeting.targeting_automation.advantage_audience | advantage_audience / nullable integer code 0/1 | 1 cho phép mở rộng; không coi missing là 0 vì có version-dependent defaults |
| targeting.targeting_relaxation_types, targeting_optimization | relaxation_spec / object; optimization_mode / string | Giữ nếu trả về; không gọi tệp gợi ý là giới hạn delivery tuyệt đối |
| targeting.publisher_platforms, device_platforms và *_positions | placement_spec / arrays keyed by platform | Cấu hình nơi được phân phối; không khẳng định mỗi won đến từ từng placement đã bật |
| CustomAudience.id, account_id, name, subtype, lookalike_spec | audience_ref / strings + structured lookalike metadata | Nhãn/loại tệp và cấu hình lookalike để diễn giải; không cần member identity |

Các fields có trong docs không đồng nghĩa mọi account/version đều đọc được. Không chọn income/relationship/health hoặc mọi targeting option chỉ vì nằm trong reference. Hiển thị cấu hình targeting từ Meta; không tạo nhãn chiến lược riêng như prospecting/retargeting hoặc suy nhãn từ tên ad set.

## Ad và Creative — nội dung/thông điệp

Nguồn: [Ad, URL adgroup](../references/meta/2026-10-07-marketing/ad.md.txt), [Creative](../references/meta/2026-10-07-marketing/creative.md.txt), [asset feed](../references/meta/2026-10-07-marketing/asset-feed-spec.md.txt), [CTM](../references/meta/2026-10-07-marketing/click-to-messenger.md.txt). Đích `marketing_ad`, `marketing_creative`, creative asset observations.

| Meta field | CRM field / logical type | Ý nghĩa vận hành / lựa chọn |
|---|---|---|
| Ad.id, account_id, campaign_id, adset_id, name | external_ad_id và hierarchy refs / strings | Điểm join immutable Lead source_ad_id với hierarchy |
| Ad.creative.id | external_creative_id / nullable string | Một creative có thể dùng bởi nhiều ads; giữ lịch sử ad→creative, không dùng creative name làm key |
| Ad.status, effective_status, issues_info | configured/effective status; minimized issue list | PENDING_REVIEW, DISAPPROVED, ADSET_PAUSED… giải thích thiếu volume |
| Ad.created_time, updated_time | provider timestamps | Observation/history và sync |
| Creative.id, account_id, name | external_creative_id, external_account_id, name / strings | Creative library identity |
| actor_id, object_story_spec.page_id, instagram_user_id | page actor refs, Instagram actor ref / nullable strings | Identity hiển thị quảng cáo, không overwrite Conversation source_page_id; mismatch có coverage flag |
| object_story_id, effective_object_story_id, effective_instagram_media_id | provider post/media refs / strings | object_story_id có thể null với unpublished post; giữ effective_object_story_id riêng |
| body, title | provider_body, provider_title / nullable text | Không universal: body không hỗ trợ video post creative; missing không có nghĩa không có message |
| object_story_spec | structured content variants | link_data/photo_data/video_data/text_data/template_data theo loại; không ép mọi nội dung vào một body |
| asset_feed_spec | asset_feed / structured object | images/videos/bodies/titles/descriptions/link_urls/call_to_action_types và rules; lấy asset IDs/hash/labels/text có provenance |
| image_hash, video_id, thumbnail_url | media refs; optional preview URL / strings | ID/hash để định danh; URL preview không là durable identity và có thể hết hạn |
| call_to_action_type | call_to_action_type / enum-string | CTA ví dụ MESSAGE_PAGE/LEARN_MORE; phân tích lời kêu gọi theo nội dung |
| url_tags | provider_url_tags / nullable string | Tham số tracking do advertiser cấu hình; không thay ad ID từ referral |
| degrees_of_freedom_spec | creative_transformation_spec / structured object | Các biến đổi creative được bật; không chứng minh asset cuối cùng một người đã thấy |

Content extraction lưu danh sách variant `{kind, provider_path, asset_ref, text, observed_revision}` và trạng thái extraction; không chọn tùy ý phần tử đầu làm thông điệp duy nhất. CTM ad copy khác opening chat template và khác transcript. Chỉ ingest template cấu hình khi có field/permission đã kiểm chứng; không lấy transcript khách hàng làm marketing creative.

### Phân lớp theo Meta — PLAN-019

Không triển khai CRM taxonomy hoặc luồng gán nhãn Ad/Creative/Ad Set. Dùng Meta hierarchy/metadata và Insights dimensions; nội dung/CTA/targeting hiển thị theo evidence provider. CRM giữ source_ad_id từ Session trên Lead/Deal để nối outcomes. [Luồng vận hành, attribution và grain báo cáo](../contracts/marketing-operating-flow.md).

## Insights — delivery/cost riêng với CRM outcome

Nguồn: [account Insights fields/parameters](../references/meta/2026-10-07-marketing/account-insights.md.txt), [breakdowns](../references/meta/2026-10-07-marketing/insights-breakdowns.md.txt), [asset Insights](../references/meta/2026-10-07-marketing/asset-insights.md.txt). Logical `marketing_insight_observation`; triển khai Insights là scope riêng sau exact gate, không tự thêm vào hierarchy sync.

| Fields / params | Logical type / grain | Dùng trong vận hành |
|---|---|---|
| account_id, campaign_id, adset_id, ad_id, account_currency | opaque refs + currency | Grain level=ad đề xuất cho base daily data; không cộng cùng lúc ad và campaign totals |
| date_start, date_stop; time_range, time_increment | date range + requested daily granularity | Meta until bao gồm ngày đó; adapter chuyển rõ sang CRM half-open interval theo timezone account |
| impressions, clicks, inline_link_clicks, reach | integer/decimal strings theo provider field, giữ precision | Volume delivery; clicks khác link clicks; reach là distinct/estimated, không cộng ngày/ads như impressions |
| spend | decimal-string tiền theo currency Insights | Spend theo kỳ; không lấy account.amount_spent hay daily_budget làm spend. Không áp currency offset của budget lần nữa vào decimal spend |
| actions, action_values | arrays indexed by action_type + attribution settings | Provider-attributed actions/value; không rename thành crm_leads hoặc crm_won_value |
| action_attribution_windows, action_report_time, use_unified_attribution_setting, use_account_attribution_setting; attribution_setting | requested settings + resolved setting + source revision | Khóa cấu hình query để không cộng kết quả từ các attribution windows/models khác nhau |
| breakdowns, action_breakdowns | sorted request signature + dimension values | Separate datasets: unbroken totals, age, region, placement, audience aggregate, asset; không join một CRM won với mọi breakdown row của ad |

Persist query signature (fields/filters/level/timezone/interval/settings/breakdowns/API version), fetched_at, revision và completeness. Rerun cùng grain cập nhật observation/revision, không append để cộng spend hai lần. Pagination/async/late corrections có checkpoint và reconciliation. CTR/CPC/CPM tính lại từ totals có cùng scope; không lấy trung bình các tỷ lệ con. Không cộng reach/frequency hoặc action types chồng lấn.

Asset Insights có thể cho body/image/title/video breakdown metrics; referral chỉ có ad_id không đủ gán CRM Lead/won cho asset cụ thể. Report CRM outcome ở Ad/creative-configuration grain; asset performance ghi rõ là Meta aggregate. Tương tự, audience age/gender/region breakdown không cấp liên kết từ Contact tới nhóm nhân khẩu học.

## Liên kết funnel và merge với fields hiện tại

| Data đang có / producer | Merge hợp lệ | Không thực hiện |
|---|---|---|
| Sales Lead/Deal source_ad_id, source_page_id, source_channel và lineage | Reporting resolve tenant-authorized ad→ad set→campaign→account; bổ sung creative/targeting revision với coverage | Không PATCH source theo sync mới; không bổ sung hàng trăm marketing fields vào Lead |
| Chat Conversation + Connector touchpoint evidence | Conversation cohort cần authoritative ad source policy và events/snapshot API ở PLAN-011, kể cả hội thoại chưa tạo Lead | Không lấy riêng Leads làm mẫu số Conversation→Lead; không suy ad nguồn từ creative Page |
| Sales qualification/Deal stage/closed_at/value/currency | Distinct cohort conversions và mỗi won Deal chỉ một lần | Meta actions không thay CRM state; nhiều Deals/Lead không biến count ratio thành conversion rate |
| Reporting mapping/metadata history | Pin policy/version/as_of; unresolved/ambiguous/stale/history-unavailable buckets | Không cross-service SQL hoặc join mọi history row gây fan-out |

## Phạm vi implementation kế tiếp

SRC-051 minimum hierarchy + selected Account/Campaign/Ad Set/Ad/Creative/targeting metadata và snapshots; fields không đọc được phải báo coverage. SRC-049 cohort conversion/rates/won value + dimensions do Meta cung cấp có evidence; Ads Insights có thiết kế và task riêng khi chốt phạm vi cost/delivery. Không tạo/sửa quảng cáo hoặc tự điều chỉnh budget.

PLAN-011 cần table template cho từng physical entity/link/history; precision/units và nullable coverage; tenant scope/ACL; versioned API/events và event rebuild; attribution source selection cho Conversation chưa có Lead; lịch sử creative/targeting; permissions/credential reuse; version pin và live capability test. Không dùng source v26.0 của Messenger làm Marketing pin: snapshot Marketing versioning/changelog hiện ghi v25.0. Đây là evidence theo surface; revalidate khi triển khai, không thay version service khác.

Acceptance: source field traceability; opaque IDs vượt JS safe integer; USD offset100/VND offset1; budget không thành spend; status active nhưng parent paused; Advantage+ suggestion vs constraint; campaign budget đổi không updated_time; nhiều ads/creative và creative thay đổi; missing/null/unsupported; unknown enum; breakdown grain; asset/audience breakdown không nhân CRM outcomes; tenant/field ACL; retry/reconcile/history gaps. Runtime và live account tests NOT_RUN trong PLAN-014.

ERD review: [Marketing logical ERD](marketing-erd.md), PLAN-015. Tách hierarchy/creative/targeting, sync/history và reporting boundary; chưa phải physical schema Ready.

## Page / Instagram / Post relations — PLAN-016

[ERD bổ sung](marketing-erd.md) mô hình hóa Facebook Page và Instagram Account metadata refs trong Marketing, cùng Facebook Post/Instagram Media refs. Creative revision giữ nullable local refs và external actor/story/media IDs đã chọn. Creative đại diện nội dung quảng cáo của post có sẵn/unpublished, nhưng Creative ID và Post ID khác nhau, không unique1:1. Page↔Instagram link chỉ ghi từ authoritative evidence và có history; không suy từ cùng Creative. Account sử dụng identities qua Creative, không là owner parent của Page/Instagram. Marketing projections không chuyển credential/webhook ownership khỏi Channels/Connector. Extra name/username/media metadata cần exact endpoint/permission gate PLAN-011;103-field selection hiện tại vẫn giữ nguyên.

PLAN-020 / CHG-20261008-06: [Three report families](../contracts/marketing-operating-flow.md) separate Meta delivery/engagement by age and region, CRM conversions via Session ad_id, and joined ad-total performance. Sync age/region breakdowns for impressions/clicks/spend; no person-level demographic join, no allocation of CRM won to breakdown rows. Preserve separate datasets and recompute distinct Contact totals. Exact Insights ingestion and query/period contracts remain PLAN-011.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.

PLAN-011C adds the [105-field storage dictionary](marketing-storage-dictionary.md), [machine-readable descriptors](marketing-storage-dictionary.json) and [storage/sync profiles](marketing-storage-design.md). These specify provider path → proposed table/column/type/unit/meaning, common keys, age/region datasets and coverage; not applied DDL or live capability evidence. Broader auth/API/table-template gates remain PLAN-011.

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.
