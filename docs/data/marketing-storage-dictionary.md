# Meta storage dictionary — field by field

PLAN-011C / CHG-20261008-08. SRC-054 now implements database v1; [physical dictionary](marketing-physical-dictionary.md) records actual columns. Periodic ingestion remains planned. [Storage and sync rules](marketing-storage-design.md) define common keys, coverage, relationships and dataset grain. Generated from the preserved103-field selection plus age/region source references. [Machine-readable dictionary](marketing-storage-dictionary.json).

All provider IDs are opaque strings. All tables include tenant_id NOT NULL. The same external Ad Account may be connected by multiple tenants. Ad/Insights writes require authoritative Creative Page ownership matching the sync tenant; foreign Ads are skipped. See [tenant admission](../contracts/marketing-tenant-admission.md). Nonidentity provider fields permit missing coverage; no default0/false. DATETIME values normalize to UTC; DATE keeps account-local date. Storage uses strict SQL mode for overflow; the future ingestion adapter must reject excess decimal precision before SQL coercion; selected originals remain in observation for reconciliation. No live API capability claim.

## crm_marketing.marketing_account

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| id | provider_node_id / VARCHAR(255) NOT NULL | ID Graph của Ad Account, giữ tiền tố act_ nếu provider trả về. | —; not a measure | [ad-account.md.txt:137](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [ad-account.md.txt:138](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| name | name / VARCHAR(255) NULL | Tên hiển thị từ Meta; không dùng làm khóa nối. | —; not a measure | [ad-account.md.txt:186](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| account_status | account_status_code / BIGINT UNSIGNED NULL | Mã trạng thái tài khoản quảng cáo từ Meta. | —; not a measure | [ad-account.md.txt:139](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| disable_reason | disable_reason_code / BIGINT UNSIGNED NULL | Mã lý do tài khoản bị vô hiệu hóa; thiếu khác mã 0. | —; not a measure | [ad-account.md.txt:162](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| currency | currency / VARCHAR(255) NULL | Đơn vị tiền của tài khoản. | —; not a measure | [ad-account.md.txt:158](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| timezone_id | provider_timezone_id / BIGINT UNSIGNED NULL | Mã múi giờ Meta. | —; not a measure | [ad-account.md.txt:199](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| timezone_name | timezone_name / VARCHAR(255) NULL | Tên múi giờ dùng diễn giải biên ngày Insights. | —; not a measure | [ad-account.md.txt:200](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| timezone_offset_hours_utc | observed_utc_offset_hours / DECIMAL(6,3) NULL | Độ lệch UTC tại lần quan sát; không thay timezone/DST. | hours; not a measure | [ad-account.md.txt:201](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| business.id | business_id / VARCHAR(255) NULL | ID Business liên quan nếu có quyền đọc; không phải tenant. | —; not a measure | [ad-account.md.txt:147](../references/meta/2026-10-07-marketing/ad-account.md.txt) |
| spend_cap | spend_cap_raw / DECIMAL(30,0) NULL | Giới hạn chi tiêu theo đơn vị nhỏ nhất của currency; không phải spend theo kỳ. | account currency minor unit; not a measure | [ad-account.md.txt:195](../references/meta/2026-10-07-marketing/ad-account.md.txt) |

## crm_marketing.marketing_campaign

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| id | external_campaign_id / VARCHAR(255) NOT NULL | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [campaign.md.txt:117](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [campaign.md.txt:118](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| name | name / VARCHAR(255) NULL | Tên hiển thị từ Meta; không dùng làm khóa nối. | —; not a measure | [campaign.md.txt:141](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| objective | objective / VARCHAR(255) NULL | Mục tiêu chiến dịch do Meta trả về. | —; not a measure | [campaign.md.txt:142](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| buying_type | buying_type / VARCHAR(255) NULL | Cơ chế mua quảng cáo. | —; not a measure | [campaign.md.txt:125](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| status | configured_status / VARCHAR(255) NULL | Trạng thái người vận hành thiết lập. | —; not a measure | [campaign.md.txt:154](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| effective_status | effective_status / VARCHAR(255) NULL | Trạng thái có hiệu lực, có thể bị ảnh hưởng bởi parent/review. | —; not a measure | [campaign.md.txt:132](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| daily_budget | daily_budget_raw / DECIMAL(30,0) NULL | Ngân sách ngày theo currency minor unit; không phải chi tiêu thực tế. | account currency minor unit; not a measure | [campaign.md.txt:131](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| lifetime_budget | lifetime_budget_raw / DECIMAL(30,0) NULL | Ngân sách toàn thời gian theo currency minor unit. | account currency minor unit; not a measure | [campaign.md.txt:140](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| budget_remaining | budget_remaining_raw / DECIMAL(30,0) NULL | Ngân sách còn lại theo provider; không phải số dư CRM. | account currency minor unit; not a measure | [campaign.md.txt:124](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| bid_strategy | bid_strategy / VARCHAR(255) NULL | Chiến lược đặt giá thầu. | —; not a measure | [campaign.md.txt:120](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| special_ad_categories | special_ad_categories / JSON NULL | Các danh mục quảng cáo đặc biệt do Meta khai báo. | —; not a measure | [campaign.md.txt:149](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| special_ad_category_country | special_ad_category_country / JSON NULL | Các quốc gia liên quan danh mục quảng cáo đặc biệt. | —; not a measure | [campaign.md.txt:151](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| is_adset_budget_sharing_enabled | is_adset_budget_sharing_enabled / BOOLEAN NULL | Cho phép chia sẻ ngân sách giữa Ad Sets nếu provider trả về. | —; not a measure | [campaign.md.txt:134](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| start_time | start_time / DATETIME(6) NULL | Thời điểm bắt đầu theo provider; Campaign có thể là tổng hợp từ Ad Sets. | —; not a measure | [campaign.md.txt:153](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| stop_time | stop_time / DATETIME(6) NULL | Thời điểm dừng theo provider; không suy lịch độc lập của Campaign. | —; not a measure | [campaign.md.txt:155](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| created_time | provider_created_at / DATETIME(6) NULL | Thời điểm tạo do Meta cung cấp. | —; not a measure | [campaign.md.txt:130](../references/meta/2026-10-07-marketing/campaign.md.txt) |
| updated_time | provider_updated_at / DATETIME(6) NULL | Thời điểm cập nhật do Meta cung cấp; không bảo đảm thay đổi budget luôn làm đổi timestamp. | —; not a measure | [campaign.md.txt:157](../references/meta/2026-10-07-marketing/campaign.md.txt) |

## crm_marketing.marketing_ad_set

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| id | external_adset_id / VARCHAR(255) NOT NULL | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [ad-set.md.txt:352](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [ad-set.md.txt:353](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| campaign_id | external_campaign_id / VARCHAR(255) NULL | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [ad-set.md.txt:369](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| name | name / VARCHAR(255) NULL | Tên hiển thị từ Meta; không dùng làm khóa nối. | —; not a measure | [ad-set.md.txt:394](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| status | configured_status / VARCHAR(255) NULL | Trạng thái người vận hành thiết lập. | —; not a measure | [ad-set.md.txt:408](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| effective_status | effective_status / VARCHAR(255) NULL | Trạng thái có hiệu lực, có thể bị ảnh hưởng bởi parent/review. | —; not a measure | [ad-set.md.txt:380](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| destination_type | destination_type / VARCHAR(255) NULL | Loại đích quảng cáo theo Meta. | —; not a measure | [ad-set.md.txt:377](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| optimization_goal | optimization_goal / VARCHAR(255) NULL | Kết quả mà hệ thống phân phối tối ưu. | —; not a measure | [ad-set.md.txt:395](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| billing_event | billing_event / VARCHAR(255) NULL | Sự kiện tính phí theo cấu hình. | —; not a measure | [ad-set.md.txt:363](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| bid_strategy | bid_strategy / VARCHAR(255) NULL | Chiến lược đặt giá thầu. | —; not a measure | [ad-set.md.txt:362](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| bid_amount | bid_amount_raw / DECIMAL(30,0) NULL | Giá thầu theo currency minor unit. | account currency minor unit; not a measure | [ad-set.md.txt:359](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| daily_budget | daily_budget_raw / DECIMAL(30,0) NULL | Ngân sách ngày theo currency minor unit; không phải chi tiêu thực tế. | account currency minor unit; not a measure | [ad-set.md.txt:374](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| lifetime_budget | lifetime_budget_raw / DECIMAL(30,0) NULL | Ngân sách toàn thời gian theo currency minor unit. | account currency minor unit; not a measure | [ad-set.md.txt:388](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| budget_remaining | budget_remaining_raw / DECIMAL(30,0) NULL | Ngân sách còn lại theo provider; không phải số dư CRM. | account currency minor unit; not a measure | [ad-set.md.txt:365](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| start_time | start_time / DATETIME(6) NULL | Thời điểm bắt đầu theo provider; Campaign có thể là tổng hợp từ Ad Sets. | —; not a measure | [ad-set.md.txt:407](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| end_time | end_time / DATETIME(6) NULL | Thời điểm kết thúc Ad Set. | —; not a measure | [ad-set.md.txt:381](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| adset_schedule | adset_schedule / JSON NULL | Lịch phân phối theo ngày/khung giờ; giữ cấu trúc provider. | —; not a measure | [ad-set.md.txt:355](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| is_dynamic_creative | is_dynamic_creative / BOOLEAN NULL | Cờ dynamic creative nếu provider trả về. | —; not a measure | [ad-set.md.txt:384](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| attribution_spec | attribution_spec / JSON NULL | Cấu hình attribution của Ad Set; không phải attribution cá nhân của CRM. | —; not a measure | [ad-set.md.txt:357](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| promoted_object | promoted_object / JSON NULL | Đối tượng được quảng bá; chỉ giữ các khóa được allowlist. | —; not a measure | [ad-set.md.txt:398](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| targeting | targeting / JSON NULL | Cấu hình targeting, suggestions/exclusions/placements; không phải nhân khẩu học Contact. | —; not a measure | [ad-set.md.txt:409](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| learning_stage_info | learning_stage_info / JSON NULL | Trạng thái giai đoạn học phân phối. | —; not a measure | [ad-set.md.txt:387](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| issues_info | issues_info / JSON NULL | Danh sách mã/vấn đề phân phối được tối giản; không lưu bí mật. | —; not a measure | [ad-set.md.txt:386](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| created_time | provider_created_at / DATETIME(6) NULL | Thời điểm tạo do Meta cung cấp. | —; not a measure | [ad-set.md.txt:372](../references/meta/2026-10-07-marketing/ad-set.md.txt) |
| updated_time | provider_updated_at / DATETIME(6) NULL | Thời điểm cập nhật do Meta cung cấp; không bảo đảm thay đổi budget luôn làm đổi timestamp. | —; not a measure | [ad-set.md.txt:413](../references/meta/2026-10-07-marketing/ad-set.md.txt) |

## crm_marketing.marketing_ad

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| id | external_ad_id / VARCHAR(255) NOT NULL | ID Ad; khóa liên kết nguồn Session/Lead/Deal với Meta. | —; not a measure | [ad.md.txt:272](../references/meta/2026-10-07-marketing/ad.md.txt) |
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [ad.md.txt:273](../references/meta/2026-10-07-marketing/ad.md.txt) |
| campaign_id | external_campaign_id / VARCHAR(255) NULL | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [ad.md.txt:285](../references/meta/2026-10-07-marketing/ad.md.txt) |
| adset_id | external_adset_id / VARCHAR(255) NULL | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [ad.md.txt:280](../references/meta/2026-10-07-marketing/ad.md.txt) |
| name | name / VARCHAR(255) NULL | Tên hiển thị từ Meta; không dùng làm khóa nối. | —; not a measure | [ad.md.txt:300](../references/meta/2026-10-07-marketing/ad.md.txt) |
| creative.id | external_creative_id / VARCHAR(255) NULL | ID Creative; nhiều Ads có thể dùng chung. | —; not a measure | [ad.md.txt:290](../references/meta/2026-10-07-marketing/ad.md.txt) |
| status | configured_status / VARCHAR(255) NULL | Trạng thái người vận hành thiết lập. | —; not a measure | [ad.md.txt:307](../references/meta/2026-10-07-marketing/ad.md.txt) |
| effective_status | effective_status / VARCHAR(255) NULL | Trạng thái có hiệu lực, có thể bị ảnh hưởng bởi parent/review. | —; not a measure | [ad.md.txt:294](../references/meta/2026-10-07-marketing/ad.md.txt) |
| issues_info | issues_info / JSON NULL | Danh sách mã/vấn đề phân phối được tối giản; không lưu bí mật. | —; not a measure | [ad.md.txt:298](../references/meta/2026-10-07-marketing/ad.md.txt) |
| created_time | provider_created_at / DATETIME(6) NULL | Thời điểm tạo do Meta cung cấp. | —; not a measure | [ad.md.txt:289](../references/meta/2026-10-07-marketing/ad.md.txt) |
| updated_time | provider_updated_at / DATETIME(6) NULL | Thời điểm cập nhật do Meta cung cấp; không bảo đảm thay đổi budget luôn làm đổi timestamp. | —; not a measure | [ad.md.txt:311](../references/meta/2026-10-07-marketing/ad.md.txt) |

## crm_marketing.marketing_creative

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| id | external_creative_id / VARCHAR(255) NOT NULL | ID Creative; nhiều Ads có thể dùng chung. | —; not a measure | [creative.md.txt:248](../references/meta/2026-10-07-marketing/creative.md.txt) |
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [creative.md.txt:249](../references/meta/2026-10-07-marketing/creative.md.txt) |
| name | name / VARCHAR(255) NULL | Tên hiển thị từ Meta; không dùng làm khóa nối. | —; not a measure | [creative.md.txt:291](../references/meta/2026-10-07-marketing/creative.md.txt) |
| actor_id | actor_id / VARCHAR(255) NULL | ID actor hiển thị Creative; không tự coi là nguồn Page của hội thoại. | —; not a measure | [creative.md.txt:250](../references/meta/2026-10-07-marketing/creative.md.txt) |
| object_story_spec | object_story_spec / JSON NULL | Cấu trúc nội dung theo loại và Page actor; giữ các biến thể được chọn. | —; not a measure | [creative.md.txt:295](../references/meta/2026-10-07-marketing/creative.md.txt) |
| instagram_user_id | instagram_user_id / VARCHAR(255) NULL | ID Instagram actor do provider trả về. | —; not a measure | [creative.md.txt:283](../references/meta/2026-10-07-marketing/creative.md.txt) |
| object_story_id | object_story_id / VARCHAR(255) NULL | ID bài viết được tham chiếu; có thể thiếu với unpublished creative. | —; not a measure | [creative.md.txt:294](../references/meta/2026-10-07-marketing/creative.md.txt) |
| effective_object_story_id | effective_object_story_id / VARCHAR(255) NULL | ID bài viết hiệu lực; giữ riêng với object_story_id. | —; not a measure | [creative.md.txt:272](../references/meta/2026-10-07-marketing/creative.md.txt) |
| effective_instagram_media_id | effective_instagram_media_id / VARCHAR(255) NULL | ID Instagram media hiệu lực. | —; not a measure | [creative.md.txt:271](../references/meta/2026-10-07-marketing/creative.md.txt) |
| body | provider_body / TEXT NULL | Nội dung body nếu field áp dụng; không mặc định là toàn bộ nội dung creative. | —; not a measure | [creative.md.txt:256](../references/meta/2026-10-07-marketing/creative.md.txt) |
| title | provider_title / TEXT NULL | Tiêu đề nếu field áp dụng. | —; not a measure | [creative.md.txt:318](../references/meta/2026-10-07-marketing/creative.md.txt) |
| asset_feed_spec | asset_feed / JSON NULL | Các asset/variant và luật phân phối; không chỉ ra asset khách chuyển đổi đã thấy. | —; not a measure | [creative.md.txt:254](../references/meta/2026-10-07-marketing/creative.md.txt) |
| image_hash | image_hash / VARCHAR(255) NULL | Hash tham chiếu ảnh trong thư viện quảng cáo. | —; not a measure | [creative.md.txt:280](../references/meta/2026-10-07-marketing/creative.md.txt) |
| video_id | video_id / VARCHAR(255) NULL | ID video được Creative tham chiếu. | —; not a measure | [creative.md.txt:321](../references/meta/2026-10-07-marketing/creative.md.txt) |
| thumbnail_url | thumbnail_url / TEXT NULL | URL preview có thể hết hạn; không phải định danh bền vững. | —; not a measure | [creative.md.txt:317](../references/meta/2026-10-07-marketing/creative.md.txt) |
| call_to_action_type | call_to_action_type / VARCHAR(255) NULL | Loại CTA do provider cung cấp. | —; not a measure | [creative.md.txt:261](../references/meta/2026-10-07-marketing/creative.md.txt) |
| url_tags | provider_url_tags / TEXT NULL | Tham số URL do advertiser cấu hình; không thay referral ad_id. | —; not a measure | [creative.md.txt:319](../references/meta/2026-10-07-marketing/creative.md.txt) |
| degrees_of_freedom_spec | creative_transformation_spec / JSON NULL | Cấu hình biến đổi Creative được phép; không chứng minh nội dung cuối cùng đã phân phối. | —; not a measure | [creative.md.txt:267](../references/meta/2026-10-07-marketing/creative.md.txt) |

## crm_marketing.marketing_audience_reference

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| id | external_audience_id / VARCHAR(255) NOT NULL | ID audience metadata; không lấy danh sách thành viên. | —; not a measure | [custom-audience.md.txt:132](../references/meta/2026-10-07-marketing/custom-audience.md.txt) |
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [custom-audience.md.txt:133](../references/meta/2026-10-07-marketing/custom-audience.md.txt) |
| name | name / VARCHAR(255) NULL | Tên hiển thị từ Meta; không dùng làm khóa nối. | —; not a measure | [custom-audience.md.txt:145](../references/meta/2026-10-07-marketing/custom-audience.md.txt) |
| subtype | subtype / VARCHAR(255) NULL | Loại audience do Meta cung cấp. | —; not a measure | [custom-audience.md.txt:154](../references/meta/2026-10-07-marketing/custom-audience.md.txt) |
| lookalike_spec | lookalike_spec / JSON NULL | Cấu hình lookalike được phép đọc; không phải hồ sơ Contact. | —; not a measure | [custom-audience.md.txt:144](../references/meta/2026-10-07-marketing/custom-audience.md.txt) |

## crm_marketing.marketing_insight_observation

| Meta path | Stored column / type | Meaning | Unit / aggregation | Source |
|---|---|---|---|---|
| account_id | external_account_id / VARCHAR(255) NULL | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. | —; not a measure | [account-insights.md.txt:171](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| campaign_id | external_campaign_id / VARCHAR(255) NULL | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [account-insights.md.txt:201](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| adset_id | external_adset_id / VARCHAR(255) NULL | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. | —; not a measure | [account-insights.md.txt:185](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| ad_id | external_ad_id / VARCHAR(255) NOT NULL | ID Ad; khóa liên kết nguồn Session/Lead/Deal với Meta. | —; not a measure | [account-insights.md.txt:180](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| account_currency | account_currency / VARCHAR(255) NULL | Currency của dòng Insights; không tự đổi sang currency Deal. | —; not a measure | [account-insights.md.txt:170](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| date_start | date_start / DATE NOT NULL | Ngày bắt đầu kỳ Insights trong timezone account. | —; not a measure | [account-insights.md.txt:293](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| date_stop | date_stop / DATE NOT NULL | Ngày cuối kỳ Insights, inclusive theo Meta. | —; not a measure | [account-insights.md.txt:294](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| impressions | impressions / DECIMAL(30,0) NULL | Số lượt hiển thị ở đúng grain/query dataset. | count; sum only compatible nonoverlapping grains | [account-insights.md.txt:325](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| clicks | clicks / DECIMAL(30,0) NULL | Số clicks theo định nghĩa field clicks của Meta, không đồng nhất link clicks. | count; sum only compatible nonoverlapping grains | [account-insights.md.txt:214](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| inline_link_clicks | inline_link_clicks / DECIMAL(30,0) NULL | Số link clicks do Meta báo cáo. | count; sum only compatible nonoverlapping grains | [account-insights.md.txt:329](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| reach | reach / DECIMAL(30,0) NULL | Số người được tiếp cận theo Meta; distinct/estimated, không cộng ngày hoặc Ads. | count; nonadditive | [account-insights.md.txt:393](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| spend | spend / DECIMAL(30,6) NULL | Chi tiêu trong kỳ; decimal currency chính, không áp offset ngân sách lần nữa. | account_currency major unit; sum only compatible nonoverlapping grains | [account-insights.md.txt:409](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| actions | actions / JSON NULL | Các action_type và số lượng theo cửa sổ attribution; không đổi tên thành CRM Leads. | —; by action_type and attribution window, no blind array sum | [account-insights.md.txt:174](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| action_values | action_values / JSON NULL | Giá trị actions theo action_type/window; không phải Deal won value. | —; by action_type and attribution window, no blind array sum | [account-insights.md.txt:173](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| attribution_setting | attribution_setting / VARCHAR(255) NULL | Thiết lập attribution được trả về; khác cấu hình request và khác nguồn Session. | —; not a measure | [account-insights.md.txt:193](../references/meta/2026-10-07-marketing/account-insights.md.txt) |
| age | age / VARCHAR(255) NULL | Nhóm tuổi tổng hợp của người được tiếp cận trong dataset age; không phải tuổi Contact. | —; grouping only | [insights-breakdowns.md.txt:75](../references/meta/2026-10-07-marketing/insights-breakdowns.md.txt) |
| region | region / VARCHAR(255) NULL | Khu vực tổng hợp của người được tiếp cận trong dataset region; không phải địa chỉ Contact. | —; grouping only | [insights-breakdowns.md.txt:95](../references/meta/2026-10-07-marketing/insights-breakdowns.md.txt) |
