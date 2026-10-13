# Marketing physical dictionary — SRC-054 / SRC-051

Generated from MySQL version3 using `scripts/marketing-db-dictionary.mjs`; `--check` detects drift. Physical owner `crm_marketing`; inspected instance `test_crm_marketing` uses identical DDL. [Filled table templates](../contracts/marketing-database.md), [provider source/units](marketing-storage-dictionary.md), [immutable DDL](../../services/marketing/database/migrations/001-storage.sql). Scheduler/change-store foundation exists; provider ingestion and HTTP service remain incomplete. [Control templates](../contracts/marketing-sync-tables.md), [v2 control DDL](../../services/marketing/database/migrations/002-sync-control.sql), [v3 tenant validation](../../services/marketing/database/migrations/003-control-tenant-validation.sql).

All26 business tables plus system migration journal have tenant_id NOT NULL. Same-schema FK definitions and index column order are authoritative in the DDL; no remote-service SQL/FK. Every table inherits retention, permissions, concurrency, grants, migration and acceptance rules in the filled template contract.

## marketing_account

Marketing owned account; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| provider_node_id | varchar(255) / ascii_bin | NO | none | ID Graph của Ad Account, giữ tiền tố act_ nếu provider trả về. |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên hiển thị từ Meta; không dùng làm khóa nối. |
| account_status_code | bigint unsigned | YES | none | Mã trạng thái tài khoản quảng cáo từ Meta. |
| disable_reason_code | bigint unsigned | YES | none | Mã lý do tài khoản bị vô hiệu hóa; thiếu khác mã 0. |
| currency | varchar(255) / utf8mb4_0900_as_cs | YES | none | Đơn vị tiền của tài khoản. |
| provider_timezone_id | bigint unsigned | YES | none | Mã múi giờ Meta. |
| timezone_name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên múi giờ dùng diễn giải biên ngày Insights. |
| observed_utc_offset_hours | decimal(6,3) | YES | none | Độ lệch UTC tại lần quan sát; không thay timezone/DST. |
| business_id | varchar(255) / ascii_bin | YES | none | ID Business liên quan nếu có quyền đọc; không phải tenant. |
| spend_cap_raw | decimal(30,0) | YES | none | Giới hạn chi tiêu theo đơn vị nhỏ nhất của currency; không phải spend theo kỳ. |
| provider | varchar(32) / ascii_bin | NO | meta | Meta provider namespace |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| last_seen_at | datetime(6) | NO | none | UTC last successful observation |
| availability | varchar(32) / utf8mb4_0900_as_cs | NO | none | Last-known availability; missing page is not deletion |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| latest_observation_id | char(36) / ascii_bin | YES | none | Accepted source observation; account alone permits bootstrap NULL |

## marketing_account_binding

Marketing owned account_binding; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| credential_ref | varchar(255) / ascii_bin | NO | none | Opaque remote credential reference; never token |
| credential_owner | varchar(64) / utf8mb4_0900_as_cs | NO | none | Logical credential-owning service |
| status | varchar(16) / utf8mb4_0900_as_cs | NO | none | Binding or run lifecycle; constrained per table |
| active_account_id | char(36) / ascii_bin | YES | none / STORED GENERATED | Generated uniqueness guard for active binding |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_ad

Marketing owned ad; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_ad_id | varchar(255) / ascii_bin | NO | none | ID Ad; khóa liên kết nguồn Session/Lead/Deal với Meta. |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| external_campaign_id | varchar(255) / ascii_bin | YES | none | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_adset_id | varchar(255) / ascii_bin | YES | none | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. |
| name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên hiển thị từ Meta; không dùng làm khóa nối. |
| external_creative_id | varchar(255) / ascii_bin | YES | none | ID Creative; nhiều Ads có thể dùng chung. |
| configured_status | varchar(255) / utf8mb4_0900_as_cs | YES | none | Trạng thái người vận hành thiết lập. |
| effective_status | varchar(255) / utf8mb4_0900_as_cs | YES | none | Trạng thái có hiệu lực, có thể bị ảnh hưởng bởi parent/review. |
| issues_info | json | YES | none | Danh sách mã/vấn đề phân phối được tối giản; không lưu bí mật. |
| provider_created_at | datetime(6) | YES | none | Thời điểm tạo do Meta cung cấp. |
| provider_updated_at | datetime(6) | YES | none | Thời điểm cập nhật do Meta cung cấp; không bảo đảm thay đổi budget luôn làm đổi timestamp. |
| provider | varchar(32) / ascii_bin | NO | meta | Meta provider namespace |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| last_seen_at | datetime(6) | NO | none | UTC last successful observation |
| availability | varchar(32) / utf8mb4_0900_as_cs | NO | none | Last-known availability; missing page is not deletion |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| latest_observation_id | char(36) / ascii_bin | NO | none | Accepted source observation; account alone permits bootstrap NULL |
| object_type | varchar(32) / ascii_bin | NO | ad | Provider entity discriminator |
| campaign_id | char(36) / ascii_bin | YES | none | Resolved same-account Campaign UUID; nullable until hydrated |
| ad_set_id | char(36) / ascii_bin | YES | none | Resolved same-account Ad Set UUID |
| creative_id | char(36) / ascii_bin | YES | none | Resolved same-account Creative UUID |
| admission_page_id | varchar(255) / ascii_bin | NO | none | Verified Creative Page identity at admission |
| page_binding_ref | char(36) / ascii_bin | NO | none | Logical authoritative Connector binding UUID |
| page_binding_namespace | varchar(255) / ascii_bin | NO | none | Binding application/namespace disambiguator |
| page_binding_revision | varchar(255) / ascii_bin | NO | none | Verified ownership revision |
| admission_policy_version | varchar(32) / utf8mb4_0900_as_cs | NO | none | Admission policy version |
| admitted_at | datetime(6) | NO | none | UTC acceptance time |
| ownership_checked_at | datetime(6) | NO | none | UTC authority validation time |

## marketing_ad_creative_binding

Marketing owned ad_creative_binding; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| ad_id | char(36) / ascii_bin | NO | none | Same-account admitted Ad UUID |
| creative_id | char(36) / ascii_bin | YES | none | Resolved same-account Creative UUID |
| observation_id | char(36) / ascii_bin | NO | none | Same-account immutable source observation |
| external_creative_id | varchar(255) / ascii_bin | NO | none | ID Creative; nhiều Ads có thể dùng chung. |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_ad_set

Marketing owned ad_set; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_adset_id | varchar(255) / ascii_bin | NO | none | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| external_campaign_id | varchar(255) / ascii_bin | YES | none | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. |
| name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên hiển thị từ Meta; không dùng làm khóa nối. |
| configured_status | varchar(255) / utf8mb4_0900_as_cs | YES | none | Trạng thái người vận hành thiết lập. |
| effective_status | varchar(255) / utf8mb4_0900_as_cs | YES | none | Trạng thái có hiệu lực, có thể bị ảnh hưởng bởi parent/review. |
| destination_type | varchar(255) / utf8mb4_0900_as_cs | YES | none | Loại đích quảng cáo theo Meta. |
| optimization_goal | varchar(255) / utf8mb4_0900_as_cs | YES | none | Kết quả mà hệ thống phân phối tối ưu. |
| billing_event | varchar(255) / utf8mb4_0900_as_cs | YES | none | Sự kiện tính phí theo cấu hình. |
| bid_strategy | varchar(255) / utf8mb4_0900_as_cs | YES | none | Chiến lược đặt giá thầu. |
| bid_amount_raw | decimal(30,0) | YES | none | Giá thầu theo currency minor unit. |
| daily_budget_raw | decimal(30,0) | YES | none | Ngân sách ngày theo currency minor unit; không phải chi tiêu thực tế. |
| lifetime_budget_raw | decimal(30,0) | YES | none | Ngân sách toàn thời gian theo currency minor unit. |
| budget_remaining_raw | decimal(30,0) | YES | none | Ngân sách còn lại theo provider; không phải số dư CRM. |
| start_time | datetime(6) | YES | none | Thời điểm bắt đầu theo provider; Campaign có thể là tổng hợp từ Ad Sets. |
| end_time | datetime(6) | YES | none | Thời điểm kết thúc Ad Set. |
| adset_schedule | json | YES | none | Lịch phân phối theo ngày/khung giờ; giữ cấu trúc provider. |
| is_dynamic_creative | tinyint(1) | YES | none | Cờ dynamic creative nếu provider trả về. |
| attribution_spec | json | YES | none | Cấu hình attribution của Ad Set; không phải attribution cá nhân của CRM. |
| promoted_object | json | YES | none | Đối tượng được quảng bá; chỉ giữ các khóa được allowlist. |
| targeting | json | YES | none | Cấu hình targeting, suggestions/exclusions/placements; không phải nhân khẩu học Contact. |
| learning_stage_info | json | YES | none | Trạng thái giai đoạn học phân phối. |
| issues_info | json | YES | none | Danh sách mã/vấn đề phân phối được tối giản; không lưu bí mật. |
| provider_created_at | datetime(6) | YES | none | Thời điểm tạo do Meta cung cấp. |
| provider_updated_at | datetime(6) | YES | none | Thời điểm cập nhật do Meta cung cấp; không bảo đảm thay đổi budget luôn làm đổi timestamp. |
| provider | varchar(32) / ascii_bin | NO | meta | Meta provider namespace |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| last_seen_at | datetime(6) | NO | none | UTC last successful observation |
| availability | varchar(32) / utf8mb4_0900_as_cs | NO | none | Last-known availability; missing page is not deletion |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| latest_observation_id | char(36) / ascii_bin | NO | none | Accepted source observation; account alone permits bootstrap NULL |
| object_type | varchar(32) / ascii_bin | NO | ad_set | Provider entity discriminator |
| campaign_id | char(36) / ascii_bin | YES | none | Resolved same-account Campaign UUID; nullable until hydrated |

## marketing_audience_reference

Marketing owned audience_reference; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_audience_id | varchar(255) / ascii_bin | NO | none | ID audience metadata; không lấy danh sách thành viên. |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên hiển thị từ Meta; không dùng làm khóa nối. |
| subtype | varchar(255) / utf8mb4_0900_as_cs | YES | none | Loại audience do Meta cung cấp. |
| lookalike_spec | json | YES | none | Cấu hình lookalike được phép đọc; không phải hồ sơ Contact. |
| provider | varchar(32) / ascii_bin | NO | meta | Meta provider namespace |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| last_seen_at | datetime(6) | NO | none | UTC last successful observation |
| availability | varchar(32) / utf8mb4_0900_as_cs | NO | none | Last-known availability; missing page is not deletion |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| latest_observation_id | char(36) / ascii_bin | NO | none | Accepted source observation; account alone permits bootstrap NULL |
| object_type | varchar(32) / ascii_bin | NO | audience_reference | Provider entity discriminator |

## marketing_campaign

Marketing owned campaign; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_campaign_id | varchar(255) / ascii_bin | NO | none | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên hiển thị từ Meta; không dùng làm khóa nối. |
| objective | varchar(255) / utf8mb4_0900_as_cs | YES | none | Mục tiêu chiến dịch do Meta trả về. |
| buying_type | varchar(255) / utf8mb4_0900_as_cs | YES | none | Cơ chế mua quảng cáo. |
| configured_status | varchar(255) / utf8mb4_0900_as_cs | YES | none | Trạng thái người vận hành thiết lập. |
| effective_status | varchar(255) / utf8mb4_0900_as_cs | YES | none | Trạng thái có hiệu lực, có thể bị ảnh hưởng bởi parent/review. |
| daily_budget_raw | decimal(30,0) | YES | none | Ngân sách ngày theo currency minor unit; không phải chi tiêu thực tế. |
| lifetime_budget_raw | decimal(30,0) | YES | none | Ngân sách toàn thời gian theo currency minor unit. |
| budget_remaining_raw | decimal(30,0) | YES | none | Ngân sách còn lại theo provider; không phải số dư CRM. |
| bid_strategy | varchar(255) / utf8mb4_0900_as_cs | YES | none | Chiến lược đặt giá thầu. |
| special_ad_categories | json | YES | none | Các danh mục quảng cáo đặc biệt do Meta khai báo. |
| special_ad_category_country | json | YES | none | Các quốc gia liên quan danh mục quảng cáo đặc biệt. |
| is_adset_budget_sharing_enabled | tinyint(1) | YES | none | Cho phép chia sẻ ngân sách giữa Ad Sets nếu provider trả về. |
| start_time | datetime(6) | YES | none | Thời điểm bắt đầu theo provider; Campaign có thể là tổng hợp từ Ad Sets. |
| stop_time | datetime(6) | YES | none | Thời điểm dừng theo provider; không suy lịch độc lập của Campaign. |
| provider_created_at | datetime(6) | YES | none | Thời điểm tạo do Meta cung cấp. |
| provider_updated_at | datetime(6) | YES | none | Thời điểm cập nhật do Meta cung cấp; không bảo đảm thay đổi budget luôn làm đổi timestamp. |
| provider | varchar(32) / ascii_bin | NO | meta | Meta provider namespace |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| last_seen_at | datetime(6) | NO | none | UTC last successful observation |
| availability | varchar(32) / utf8mb4_0900_as_cs | NO | none | Last-known availability; missing page is not deletion |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| latest_observation_id | char(36) / ascii_bin | NO | none | Accepted source observation; account alone permits bootstrap NULL |
| object_type | varchar(32) / ascii_bin | NO | campaign | Provider entity discriminator |

## marketing_change_clock

Marketing per-tenant committed change clock.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| last_sequence | bigint unsigned | NO | 0 | Commit-ordered tenant watermark |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_change_event

Marketing immutable commit-ordered metadata change stream.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| sequence | bigint unsigned | NO | none | Unique per-tenant committed event order |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| object_type | varchar(32) / ascii_bin | NO | none | Provider entity discriminator |
| external_object_id | varchar(255) / ascii_bin | NO | none | Opaque Meta object identity |
| observation_id | char(36) / ascii_bin | NO | none | Same-account immutable source observation |
| revision | bigint unsigned | NO | none | Positive accepted observation revision |
| event_type | varchar(64) / utf8mb4_0900_as_cs | NO | none | Versioned producer event kind |
| payload | json | NO | none | Minimized identity/revision/scope descriptor; no creative body |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_content_variant

Marketing owned content_variant; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| creative_revision_id | char(36) / ascii_bin | NO | none | Same-account creative revision projection |
| kind | varchar(32) / utf8mb4_0900_as_cs | NO | none | Content variant kind |
| provider_path | varchar(255) / ascii_bin | NO | none | Original selected variant path with array identity |
| asset_ref | varchar(255) / ascii_bin | YES | none | Opaque provider asset reference |
| content_text | text / utf8mb4_0900_as_cs | YES | none | Selected marketing content, not chat/customer transcript |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_creative

Marketing owned creative; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_creative_id | varchar(255) / ascii_bin | NO | none | ID Creative; nhiều Ads có thể dùng chung. |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| name | varchar(255) / utf8mb4_0900_as_cs | YES | none | Tên hiển thị từ Meta; không dùng làm khóa nối. |
| actor_id | varchar(255) / ascii_bin | YES | none | ID actor hiển thị Creative; không tự coi là nguồn Page của hội thoại. |
| object_story_spec | json | YES | none | Cấu trúc nội dung theo loại và Page actor; giữ các biến thể được chọn. |
| instagram_user_id | varchar(255) / ascii_bin | YES | none | ID Instagram actor do provider trả về. |
| object_story_id | varchar(255) / ascii_bin | YES | none | ID bài viết được tham chiếu; có thể thiếu với unpublished creative. |
| effective_object_story_id | varchar(255) / ascii_bin | YES | none | ID bài viết hiệu lực; giữ riêng với object_story_id. |
| effective_instagram_media_id | varchar(255) / ascii_bin | YES | none | ID Instagram media hiệu lực. |
| provider_body | text / utf8mb4_0900_as_cs | YES | none | Nội dung body nếu field áp dụng; không mặc định là toàn bộ nội dung creative. |
| provider_title | text / utf8mb4_0900_as_cs | YES | none | Tiêu đề nếu field áp dụng. |
| asset_feed | json | YES | none | Các asset/variant và luật phân phối; không chỉ ra asset khách chuyển đổi đã thấy. |
| image_hash | varchar(255) / ascii_bin | YES | none | Hash tham chiếu ảnh trong thư viện quảng cáo. |
| video_id | varchar(255) / ascii_bin | YES | none | ID video được Creative tham chiếu. |
| thumbnail_url | text / utf8mb4_0900_as_cs | YES | none | URL preview có thể hết hạn; không phải định danh bền vững. |
| call_to_action_type | varchar(255) / utf8mb4_0900_as_cs | YES | none | Loại CTA do provider cung cấp. |
| provider_url_tags | text / utf8mb4_0900_as_cs | YES | none | Tham số URL do advertiser cấu hình; không thay referral ad_id. |
| creative_transformation_spec | json | YES | none | Cấu hình biến đổi Creative được phép; không chứng minh nội dung cuối cùng đã phân phối. |
| provider | varchar(32) / ascii_bin | NO | meta | Meta provider namespace |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| last_seen_at | datetime(6) | NO | none | UTC last successful observation |
| availability | varchar(32) / utf8mb4_0900_as_cs | NO | none | Last-known availability; missing page is not deletion |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| latest_observation_id | char(36) / ascii_bin | NO | none | Accepted source observation; account alone permits bootstrap NULL |
| object_type | varchar(32) / ascii_bin | NO | creative | Provider entity discriminator |

## marketing_creative_revision

Marketing owned creative_revision; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| creative_id | char(36) / ascii_bin | NO | none | Resolved same-account Creative UUID |
| observation_id | char(36) / ascii_bin | NO | none | Same-account immutable source observation |
| page_id | char(36) / ascii_bin | YES | none | Tenant-local observed Page reference |
| instagram_account_id | char(36) / ascii_bin | YES | none | Tenant-local observed Instagram actor reference |
| post_id | char(36) / ascii_bin | YES | none | Resolved tenant-local Post UUID |
| media_id | char(36) / ascii_bin | YES | none | Resolved tenant-local Instagram media UUID |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_facebook_page_ref

Marketing owned facebook_page_ref; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| external_page_id | varchar(255) / ascii_bin | NO | none | Opaque Meta Page identity; not ownership authority |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_facebook_post_ref

Marketing owned facebook_post_ref; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| external_post_id | varchar(255) / ascii_bin | NO | none | Opaque Meta post identity |
| page_id | char(36) / ascii_bin | YES | none | Tenant-local observed Page reference |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_insight_action

Marketing owned insight_action; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| observation_id | char(36) / ascii_bin | NO | none | Same-account immutable source observation |
| action_type | varchar(255) / ascii_bin | NO | none | Meta action name; not CRM Lead count |
| window_key | varchar(255) / ascii_bin | NO | none | Returned attribution window or value key |
| metric_kind | varchar(16) / utf8mb4_0900_as_cs | NO | none | actions count or action_values monetary measure |
| value | decimal(30,6) | NO | none | Exact decimal string; unit follows metric kind/currency |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_insight_grain

Marketing owned insight_grain; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_ad_id | varchar(255) / ascii_bin | NO | none | ID Ad; khóa liên kết nguồn Session/Lead/Deal với Meta. |
| date_start | date | NO | none | Ngày bắt đầu kỳ Insights trong timezone account. |
| date_stop | date | NO | none | Ngày cuối kỳ Insights, inclusive theo Meta. |
| dataset_profile | varchar(32) / utf8mb4_0900_as_cs | NO | none | Separate base, age or region dataset |
| query_signature | binary(32) | NO | none | SHA256 canonical query bytes |
| breakdown_signature | binary(32) | NO | none | SHA256 canonical breakdown bytes |
| query_canonical | text / utf8mb4_0900_as_cs | NO | none | Exact canonical query including settings/version; verify equality on hash collision |
| breakdown_canonical | text / utf8mb4_0900_as_cs | NO | none | Explicit breakdown value/missing/not_requested state |
| account_timezone | varchar(255) / utf8mb4_0900_as_cs | NO | none | Timezone interpreting provider inclusive dates |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_insight_observation

Marketing owned insight_observation; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| external_account_id | varchar(255) / ascii_bin | YES | none | ID tài khoản quảng cáo; scope liên kết, không phải Page ID. |
| external_campaign_id | varchar(255) / ascii_bin | YES | none | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_adset_id | varchar(255) / ascii_bin | YES | none | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_ad_id | varchar(255) / ascii_bin | NO | none | ID Ad; khóa liên kết nguồn Session/Lead/Deal với Meta. |
| account_currency | varchar(255) / utf8mb4_0900_as_cs | YES | none | Currency của dòng Insights; không tự đổi sang currency Deal. |
| date_start | date | NO | none | Ngày bắt đầu kỳ Insights trong timezone account. |
| date_stop | date | NO | none | Ngày cuối kỳ Insights, inclusive theo Meta. |
| impressions | decimal(30,0) | YES | none | Số lượt hiển thị ở đúng grain/query dataset. |
| clicks | decimal(30,0) | YES | none | Số clicks theo định nghĩa field clicks của Meta, không đồng nhất link clicks. |
| inline_link_clicks | decimal(30,0) | YES | none | Số link clicks do Meta báo cáo. |
| reach | decimal(30,0) | YES | none | Số người được tiếp cận theo Meta; distinct/estimated, không cộng ngày hoặc Ads. |
| spend | decimal(30,6) | YES | none | Chi tiêu trong kỳ; decimal currency chính, không áp offset ngân sách lần nữa. |
| actions | json | YES | none | Các action_type và số lượng theo cửa sổ attribution; không đổi tên thành CRM Leads. |
| action_values | json | YES | none | Giá trị actions theo action_type/window; không phải Deal won value. |
| attribution_setting | varchar(255) / utf8mb4_0900_as_cs | YES | none | Thiết lập attribution được trả về; khác cấu hình request và khác nguồn Session. |
| age | varchar(255) / utf8mb4_0900_as_cs | YES | none | Nhóm tuổi tổng hợp của người được tiếp cận trong dataset age; không phải tuổi Contact. |
| region | varchar(255) / utf8mb4_0900_as_cs | YES | none | Khu vực tổng hợp của người được tiếp cận trong dataset region; không phải địa chỉ Contact. |
| grain_id | char(36) / ascii_bin | NO | none | Same-account Ad/period/query/breakdown identity |
| revision | bigint unsigned | NO | none | Positive accepted observation revision |
| sync_run_id | char(36) / ascii_bin | NO | none | Same-account producing run |
| ad_observation_id | char(36) / ascii_bin | NO | none | Accepted Ad observation that supplies historical Page evidence |
| ad_object_type | varchar(32) / ascii_bin | NO | ad | Constant ad discriminator |
| admission_page_id | varchar(255) / ascii_bin | NO | none | Verified Creative Page identity at admission |
| fetched_at | datetime(6) | NO | none | UTC fetch time; not historical effective start |
| api_version | varchar(32) / utf8mb4_0900_as_cs | NO | none | Version used by actual fetch; fixture only in tests |
| mapping_version | varchar(32) / utf8mb4_0900_as_cs | NO | none | Field-selection mapping version |
| requested_settings | json | NO | none | Requested query/attribution settings, <=1MiB |
| resolved_settings | json | NO | none | Actually resolved settings and coverage, <=1MiB |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| completeness | varchar(32) / utf8mb4_0900_as_cs | NO | none | Complete/partial accepted observation, never zero-fill |
| selected_payload | json | NO | none | Minimized selected provider payload, <=1MiB |

## marketing_instagram_account_ref

Marketing owned instagram_account_ref; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| external_instagram_id | varchar(255) / ascii_bin | NO | none | Opaque Meta Instagram account identity |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_instagram_media_ref

Marketing owned instagram_media_ref; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| external_media_id | varchar(255) / ascii_bin | NO | none | Opaque Meta media identity |
| instagram_account_id | char(36) / ascii_bin | YES | none | Tenant-local observed Instagram actor reference |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_object_observation

Marketing owned object_observation; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| object_type | varchar(32) / ascii_bin | NO | none | Provider entity discriminator |
| external_object_id | varchar(255) / ascii_bin | NO | none | Opaque Meta object identity |
| revision | bigint unsigned | NO | none | Positive accepted observation revision |
| sync_run_id | char(36) / ascii_bin | NO | none | Same-account producing run |
| fetched_at | datetime(6) | NO | none | UTC fetch time; not historical effective start |
| payload_hash | binary(32) | NO | none | SHA256 selected payload |
| mapping_version | varchar(32) / utf8mb4_0900_as_cs | NO | none | Field-selection mapping version |
| api_version | varchar(32) / utf8mb4_0900_as_cs | NO | none | Version used by actual fetch; fixture only in tests |
| field_coverage | json | NO | none | Selected-field presence/null/unsupported/forbidden map |
| selected_payload | json | NO | none | Minimized selected provider payload, <=1MiB |
| external_campaign_id | varchar(255) / ascii_bin | YES | none | ID Campaign; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_adset_id | varchar(255) / ascii_bin | YES | none | ID Ad Set; đối tượng gốc hoặc tham chiếu parent theo entity. |
| external_creative_id | varchar(255) / ascii_bin | YES | none | ID Creative; nhiều Ads có thể dùng chung. |
| admission_page_id | varchar(255) / ascii_bin | YES | none | Verified Creative Page identity at admission |
| page_binding_ref | char(36) / ascii_bin | YES | none | Logical authoritative Connector binding UUID |
| page_binding_namespace | varchar(255) / ascii_bin | YES | none | Binding application/namespace disambiguator |
| page_binding_revision | varchar(255) / ascii_bin | YES | none | Verified ownership revision |
| admission_policy_version | varchar(32) / utf8mb4_0900_as_cs | YES | none | Admission policy version |
| admitted_at | datetime(6) | YES | none | UTC acceptance time |
| ownership_checked_at | datetime(6) | YES | none | UTC authority validation time |
| admission_receipt_ref | char(36) / ascii_bin | YES | none | Logical Channels authorization grant UUID; legacy NULL |
| admission_request_sha256 | binary(32) | YES | none | SHA256 authority-admitted minimized bundle |
| admission_authority | varchar(64) / utf8mb4_0900_as_cs | YES | none | Versioned grant issuer namespace |

## marketing_operation_receipt

Marketing immutable management receipts.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| action | varchar(64) / utf8mb4_0900_as_cs | NO | none | Public management command kind |
| target_id | char(36) / ascii_bin | YES | none | Own-tenant command target UUID |
| request_sha256 | binary(32) | NO | none | SHA256 canonical non-secret command body |
| http_status | smallint unsigned | NO | none | Replay response status |
| response_json | json | NO | none | Minimized public command result references |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_page_instagram_link

Marketing owned page_instagram_link; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| page_id | char(36) / ascii_bin | NO | none | Tenant-local observed Page reference |
| instagram_account_id | char(36) / ascii_bin | NO | none | Tenant-local observed Instagram actor reference |
| observed_at | datetime(6) | NO | none | UTC relationship observation time |
| evidence_ref | varchar(255) / ascii_bin | NO | none | Logical evidence reference |

## marketing_sync_run

Marketing owned sync_run; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| binding_id | char(36) / ascii_bin | NO | none | Same-account authorization binding |
| profile | varchar(64) / utf8mb4_0900_as_cs | NO | none | Fetch profile key |
| status | varchar(16) / utf8mb4_0900_as_cs | NO | none | Binding or run lifecycle; constrained per table |
| fence | bigint unsigned | NO | none | Positive writer fencing token |
| checkpoint | json | YES | none | Sanitized bounded resume state; no token-bearing URL |
| scanned_ads | bigint unsigned | NO | 0 | Nonnegative scanned counter |
| admitted_ads | bigint unsigned | NO | 0 | Nonnegative admitted counter |
| skipped_page_mismatch | bigint unsigned | NO | 0 | Nonnegative foreign Page skip counter |
| unresolved_page | bigint unsigned | NO | 0 | Nonnegative unresolved Page counter |
| deferred_insight_rows | bigint unsigned | NO | 0 | Nonnegative deferred metrics counter |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |
| error_code | varchar(64) / utf8mb4_0900_as_cs | YES | none | Enumerated operational error; no provider message |
| completed_at | datetime(6) | YES | none | UTC run completion; NULL for unfinished/legacy |

## marketing_sync_schedule

Marketing durable account/profile scheduler.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| binding_id | char(36) / ascii_bin | NO | none | Same-account authorization binding |
| profile | varchar(64) / utf8mb4_0900_as_cs | NO | none | Fetch profile key |
| enabled | tinyint(1) | NO | 0 | Explicit verified binding scheduling toggle |
| state | varchar(16) / utf8mb4_0900_as_cs | NO | none | Durable scheduler lifecycle |
| interval_seconds | int unsigned | NO | 21600 | Full reconciliation cadence seconds |
| next_due_at | datetime(6) | NO | none | UTC next eligible claim time |
| active_run_id | char(36) / ascii_bin | YES | none | Same-account incomplete run reference |
| lease_owner | char(36) / ascii_bin | YES | none | Worker instance UUID |
| lease_until | datetime(6) | YES | none | UTC exclusive writer lease expiry |
| fence | bigint unsigned | NO | 0 | Positive writer fencing token |
| consecutive_errors | int unsigned | NO | 0 | Consecutive failed pages; 8 requires attention |
| last_success_at | datetime(6) | YES | none | UTC last completed scan, possibly with gaps |
| error_code | varchar(64) / utf8mb4_0900_as_cs | YES | none | Enumerated operational error; no provider message |
| version | bigint unsigned | NO | 1 | CAS version, >=1 |
| created_at | datetime(6) | NO | none | UTC creation time |
| updated_at | datetime(6) | NO | none | UTC projection/control-state update time |

## marketing_targeting_audience_ref

Marketing owned targeting_audience_ref; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| targeting_revision_id | char(36) / ascii_bin | NO | none | Same-account targeting observation projection |
| audience_id | char(36) / ascii_bin | NO | none | Same-account metadata-only audience UUID |
| relation | varchar(16) / utf8mb4_0900_as_cs | NO | none | Included/excluded audience reference |
| created_at | datetime(6) | NO | none | UTC creation time |

## marketing_targeting_revision

Marketing owned targeting_revision; tenant scoped.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| id | char(36) / ascii_bin | NO | none | Local opaque UUID |
| account_id | char(36) / ascii_bin | NO | none | Same-tenant local Marketing account UUID |
| ad_set_id | char(36) / ascii_bin | NO | none | Resolved same-account Ad Set UUID |
| observation_id | char(36) / ascii_bin | NO | none | Same-account immutable source observation |
| selected_targeting | json | NO | none | Selected provider targeting configuration, <=1MiB; not Contact demographics |
| created_at | datetime(6) | NO | none | UTC creation time |

## schema_migration

Marketing system-scope immutable migration journal.

| Column | SQL type / collation | Null | Default / generated | Meaning |
|---|---|---|---|---|
| tenant_id | char(36) / ascii_bin | NO | none | Explicit business tenant; journal alone registered system tenant |
| version | int unsigned | NO | none | Immutable migration version |
| step | int unsigned | NO | none | Ordered DDL step within immutable version |
| checksum | char(64) / ascii_bin | NO | none | SHA256 exact DDL step bytes |
| applied_at | datetime(6) | NO | none | UTC operator application time |
