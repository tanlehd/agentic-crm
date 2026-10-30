# Conversation lifecycle và đề xuất quản lý pipeline

REV-20261029-01 · CHG-20261029-02 · Codex · 2026-10-29. Phạm vi: đánh giá source/thiết kế và đề xuất sản phẩm theo yêu cầu người dùng. Đây là proposal, chưa là contract Ready hoặc tính năng mới đã triển khai. Nhóm chính: vận hành hội thoại và chuyển đổi; người dùng: agent, team lead, quản trị quy trình và người xem báo cáo.

## Kết luận

Conversation đã có lifecycle xử lý, session đã có process/stages tùy chỉnh và lịch sử. **Pipeline của từng lượt tiếp nhận nằm trên session**, được hiển thị trong workspace Conversation. Theo clarification của người dùng CHG-20261029-03, mỗi lượt có nguồn CTM/Ad, tiến trình và kết quả riêng; không đặt một stage/outcome duy nhất lên thread. Khoảng trống gồm kết quả kết thúc phiên có cấu trúc, trải nghiệm quản lý pipeline, khả năng chọn nhiều pipeline nếu nghiệp vụ cần, và tích hợp Reporting với các owner sau Chat cutover.

Wire hiện hành theo [identity contract](../contracts/conversation-identity.md): `conversation_id` là luồng lâu dài, `session_id` là một lượt xử lý. Các bảng hiện trạng và phân tích bên dưới dùng các tên implementation này để phản ánh source; không tái diễn giải ID từ nhãn sản phẩm mới.

CHG-20261030-02 chốt tên sản phẩm mới: **Conversation Channel → Conversation**, thay tên Thread và Conversation Session trong đề xuất cũ. [Mô hình/mapping](../contracts/conversation-channel-model.md) và [glossary](../product/glossary.md) là nguồn chuẩn thuật ngữ đích. Pipeline của đợt nghiệp vụ gọi là **Conversation pipeline**; các tham chiếu Session bên dưới chỉ object implementation tương ứng, không thêm một object hoặc cấp pipeline mới. Lifecycle mở rộng vượt qua nhiều lần đóng chat cần exact design riêng; source/API chưa đổi.

## Hiện trạng được kiểm tra

| Thành phần | Đã có trong source/contract | Giới hạn hiện tại |
|---|---|---|
| Lifecycle xử lý | Conversation `open/pending/closed`; session `active/closed`; inbound phù hợp sau close mở phiên mới trên cùng Conversation | Đóng hội thoại không đồng nghĩa chuyển đổi thành công hoặc thất bại |
| Quy trình tư vấn | Một process hiện hành mỗi tenant; phiên bản bất biến; session ghim version và current stage | Chưa là nhiều pipeline có ID riêng, chọn theo loại nghiệp vụ/team/channel |
| Cấu hình stage | 1–20 stage, key/label/thứ tự; mặc định Tiếp nhận → Tư vấn → Bước tiếp theo; cho tiến/lùi/bỏ bước có lý do | Chưa có ma trận chuyển stage, required fields theo stage, SLA hay terminal outcome cấu hình riêng |
| Lịch sử | Stage events, actor/reason/time; CAS, idempotency, history; phiên cũ enrollment partial, không dựng lịch sử | Stage biểu thị tiến độ; không tự tạo milestone hoặc Sales outcome |
| UI | Customer360 có “TIẾN TRÌNH & CHUYỂN ĐỔI”, chọn phiên, “Quy trình phiên”, chuyển stage, lịch sử và “Phễu theo lượt inbox” | Chưa thấy màn quản trị Conversation pipeline tập trung hoặc board Kanban stage trong source UI được rà |
| Phễu hành vi | Chat có session-funnel route/reducer, evidence theo cùng need và coverage | Đếm phiên có bằng chứng, không tự là phễu Sales hoặc unique Conversation |
| Reporting stage/business | Có catalog/query engine, templates và evidence SRC-086/087 trước cutover | `connected-policy.ts` hiện trả `operations/conversion/stage: null`; đường query/dashboard đang dùng policy này. H-Reporting còn integration acceptance sau cutover |
| Lead/Deal | Sales giữ lifecycle, source session, stage/won/value; Reporting có thể nối lineage | Sales pipeline hiện fixed; configurable Sales pipeline không nằm trong feature đã có |

Source đối chiếu: [progress UI](../../apps/web/app/crm/session-progress.tsx), [Customer360](../../apps/web/app/crm/customer360.tsx), [Chat progress](../../services/chat/src/session-progress.ts), [process storage](../../services/chat/src/session-progress-storage.ts), [Chat composition](../../services/chat/src/composition.ts), [Chat funnel](../../services/chat/src/session-funnel.ts), [connected policy](../../services/core-baseline/src/modules/reporting/connected-policy.ts), [query bridge](../../services/core-baseline/src/modules/reporting/query-bridge.ts), [Reporting source availability](../../services/reporting/src/connected-sources.ts).

Thiết kế/data/acceptance đối chiếu: [session progress và SP-01…07](../contracts/session-progress.md), [ownership](../data/service-ownership.md), [dictionary](../data/dictionary.md), [Chat/Sales ERD](../data/chat-sales-erd.md), [stage funnel](../contracts/stage-funnel-reporting.md), [SF-01…08 evidence](../quality/stage-funnel-reporting-acceptance.md), [Chat→Sales boundary](../contracts/chat-sales-conversion-boundary.md), [consumer handoff](chat-extraction/consumer-handoff.md). Evidence cũ không được coi là fresh runtime acceptance. Phiên review này không gọi DB/API/browser.

## Đề xuất sản phẩm

### Pipeline theo object và nhu cầu doanh nghiệp — CHG-20261030-01

Người dùng chốt: pipeline là tiến trình có thứ tự trên object sở hữu; stage là một giai đoạn trong pipeline. Conversation Session, Lead và Deal đều có thể được thiết lập pipeline của riêng mình. Việc bổ sung object phụ thuộc nhu cầu vận hành, không phải chuỗi bắt buộc Session → Lead → Deal.

| Nhu cầu doanh nghiệp | Object và pipeline sử dụng | Kết quả quản lý |
|---|---|---|
| Chỉ Omnichannel | Conversation Session + pipeline | Tiếp nhận CTM/organic, xử lý, chuyển stage và kết quả từng phiên; đủ cho phạm vi này mà không cần Lead/Deal |
| Quản trị nhu cầu/qualification riêng | Thêm Lead + pipeline riêng khi cần | Tiến trình của nhu cầu độc lập với từng lượt tiếp nhận |
| Quản trị Deal process trên platform | Thêm Deal + pipeline riêng | Tiến trình và kết quả của giao dịch; không bắt buộc có Lead trung gian |

Một quy trình tư vấn có thể đặt trên Session, Lead hoặc Deal tùy object doanh nghiệp muốn quản lý. Nếu dùng nhiều object, mỗi object có stage/outcome và lịch sử riêng; liên kết giữ context/nguồn nhưng không tự đồng bộ stage. Phễu Session-only đo stage và outcome của phiên; báo cáo liên kết Lead/Deal chỉ áp dụng khi doanh nghiệp sử dụng các object đó. Không tạo Lead/Deal giả chỉ để ghi nhận một phiên thành công.

Đây là định hướng sản phẩm được người dùng xác nhận; hiện trạng code phía trên vẫn giữ đúng: process/stage Session đã có, structured session outcome và configurable Lead/Deal pipelines cần exact design và implementation riêng. Không mở thêm source task hoặc shared pipeline service trong phiên tài liệu này.

### Đối tượng đúng theo lượt tiếp nhận — CHG-20261029-03

Người dùng xác nhận: cùng khách quay lại nhiều lần, một lượt từ Ad A đóng với outcome đạt mục tiêu, lượt khác từ Ad B kết thúc lost. Session là đơn vị quản lý pipeline và kết quả của lượt tiếp nhận đó; Conversation chỉ giữ thread và tập hợp các phiên. Một hành trình mua kéo dài nhiều phiên có thể liên kết cùng Lead/Deal, nhưng không chuyển stage/outcome của các lượt tiếp nhận lên thread.

| Thread | Lượt tiếp nhận | Nguồn có evidence | Tiến trình / kết quả của lượt |
|---|---|---|---|
| Conversation C1 | Session S1 | CTM từ Ad A | Đi qua các stage, đóng với outcome đạt mục tiêu đã xác minh |
| Conversation C1 | Session S2, khách quay lại sau khi S1 đóng | CTM từ Ad B | Đi qua các stage, kết thúc lost của riêng lượt S2 |

S2 không đổi nguồn, lịch sử hoặc outcome của S1. Báo cáo phễu tiếp nhận và kết quả theo Ad phải lấy session làm đơn vị; distinct Conversation chỉ là chỉ số bổ sung về số thread. Attribution giữ đúng evidence và immutable origin; không suy nguồn theo Ad gần nhất trên Contact/thread. Nếu Ad B xuất hiện khi S1 vẫn mở, contract hiện tại chỉ thêm touchpoint và giữ S1; không mặc định mỗi click/referral là một session. Yêu cầu tách cả trường hợp đang mở cần quyết định segmentation riêng.

**Gap bổ sung:** session stage/history hiện có chưa đủ cho kết quả đóng phiên có cấu trúc. Contract hiện tại cấm stage key `won/lost`, close hiện ghi `agent_closed`; không thể chỉ cấu hình thêm cột Lost rồi coi yêu cầu đã được triển khai. Exact design tiếp theo phải định nghĩa session outcome, lý do, thời điểm/người ghi nhận, evidence hoặc reference nếu có, quy tắc kết thúc/correction và phiên có nhiều nhu cầu/kết quả. Tên enum, tiêu chí đạt mục tiêu và physical storage chưa chốt trong review này.

Lost hoặc đạt mục tiêu ở session nói về kết quả lượt tiếp nhận theo pipeline của phiên; không cần tồn tại Lead/Deal và không tự đổi stage của chúng. Chỉ khi tuyên bố đã tạo một Lead/Deal hoặc một Deal cụ thể won mới cần Sales evidence/ref tương ứng. Nếu doanh nghiệp quản trị Deal, Sales sở hữu trạng thái và giá trị Deal đó. Outcome khi đóng phiên và kết quả Sales phát sinh muộn cần hiển thị phân biệt, không tự ghi đè lịch sử kết thúc của phiên. Dữ liệu giá trị/đơn hàng ngoài Deal không được tự thêm vào scope bằng định nghĩa pipeline này.

Giữ bốn trục riêng, hiển thị cùng trên Conversation:

| Trục | Câu hỏi trả lời | Nguồn chuẩn |
|---|---|---|
| Trạng thái xử lý | Hội thoại đang mở, chờ hay đã đóng? | Chat lifecycle; snooze/assignment vẫn riêng |
| Pipeline và stage | Lượt tư vấn đang ở bước nào? | Chat session process/progress và lịch sử |
| Kết quả lượt tiếp nhận | Phiên kết thúc đạt mục tiêu, lost hay kết quả nào theo quy trình? | Chat session outcome — yêu cầu sản phẩm đã xác định, exact contract/source còn thiếu |
| Kết quả Sales liên kết, nếu sử dụng | Đã tạo Lead/Deal, Deal có won không? | Sales receipt/lineage/outcome; Reporting tổng hợp; không là điều kiện hoàn tất phiên Omnichannel |

Ví dụ pipeline Session đề xuất: **Tiếp nhận → Xác định nhu cầu → Tư vấn → Thống nhất bước tiếp theo**, với kết quả phiên theo cấu hình nghiệp vụ. Tên bước do admin cấu hình; đây là ví dụ, chưa đổi mặc định đang chạy. Khi sử dụng thêm Sales, “Đã tạo Lead”, “Đã tạo Deal”, “Deal won” hiển thị bằng badge/link từ dữ liệu Sales đã xác minh. Nhãn đạt mục tiêu của Session là kết quả của phiên, không tự chứng minh đã tạo record hoặc có Deal won.

Conversation header/list hiển thị stage của phiên active; khi đã đóng, hiển thị rõ “Phiên gần nhất · đã đóng”. Bảng theo stage dùng một card cho một session, có liên kết Conversation và số phiên. Chọn lịch sử phải nhìn đúng process version của phiên đó. Phiên mới bắt đầu stage đầu theo version mới; không ghi đè tiến trình phiên cũ, không reset chỉ vì chuyển owner/team hoặc có referral mới.

Đặt cấu hình tại **Settings → Data Management → Conversation → Pipeline theo lượt tiếp nhận**, nối vào process editor hiện có và ghi rõ đối tượng áp dụng là session. V1 đề xuất giữ một pipeline Conversation Session mỗi tenant; đây không phải giới hạn một pipeline chung cho mọi object. Lead/Deal có pipeline riêng khi doanh nghiệp sử dụng. Outcome cần thiết kế dữ liệu riêng theo gap trên, không suy là chỉ đổi tên UI. Workspace bổ sung stage badge, lọc stage/process version, bảng/Kanban và lịch sử chuyển; thao tác chuyển tiếp tục qua Chat command có quyền, If-Match, lý do và idempotency. Board/filter API và stale-card behavior cần exact design trước code; không giả định endpoint hiện có đã hỗ trợ.

Nếu cần tách tư vấn bán hàng, hỗ trợ và chăm lại thành nhiều pipeline: thiết kế tiếp pipeline identity/version, quy tắc chọn khi mở session, quyền quản trị và hành vi chuyển pipeline đang xử lý. Đề xuất mặc định ghim pipeline/version khi mở phiên; đổi cấu hình chỉ áp dụng phiên mới. Không tự thêm pipeline cho từng channel/team khi chưa có use case. Workflow có thể tự động hóa qua authorized owner commands/events ở scope riêng; không nhúng lại orchestration vào Chat.

## Đo phễu cho đúng

1. **Stage funnel:** số session đi qua các stage đã chọn theo thứ tự lịch sử; khác số card hiện đang nằm ở từng cột. Có tỷ lệ qua bước và thời gian lưu stage. Lùi/bỏ bước/quay lại không nhân số session.
2. **Behavior funnel:** xác nhận nhu cầu → thống nhất bước tiếp theo bằng evidence cùng một need; giữ cơ chế hiện có.
3. **Kết quả Omnichannel:** session đi qua pipeline và kết thúc với outcome theo mục tiêu của doanh nghiệp; không cần Lead/Deal. Structured outcome còn cần exact design, không suy từ thao tác close đơn thuần.
4. **Sales conversion, khi sử dụng thêm Sales:** liên kết session/Lead/Deal theo immutable source lineage; chọn đường đo phù hợp object thực dùng. Direct Deal là nhánh riêng, không bắt phải có Lead. Đóng Chat không làm mất kết quả Sales phát sinh sau đó.

Mặc định quản trị dùng **session grain**, vì một Conversation có thể có nhiều lượt. Nếu cần KPI “tỷ lệ hội thoại chuyển đổi”, chọn rõ **distinct conversation grain** và quy tắc cohort/cutoff; không cộng session rates, không lấy số Lead chia số hội thoại. Một phiên có nhiều Lead/Deal chỉ đếm một lần tại bước reached; giá trị won deduplicate theo Deal và tách tiền tệ. Old/partial/none coverage, dữ liệu chưa kết nối và mẫu số 0 phải hiện rõ; unavailable không hiển thị thành 0.

## Thứ tự thực hiện đề xuất

| Lát cắt | Owner | Đầu ra / gate |
|---|---|---|
| 1. Pipeline trên Conversation | Chat + Web | Exact UX/API cho cấu hình, stage/list/board trên process hiện có; giữ canonical IDs, pin/version/history và kiểm quyền |
| 1a. Outcome của lượt tiếp nhận | Chat | Exact session outcome/close/correction/evidence, source attribution, nhiều nhu cầu và acceptance trước schema/code; không ghi outcome lên thread hoặc đổi Sales status |
| 2. Khôi phục nguồn báo cáo sau cutover | Reporting, tiêu thụ Chat/Sales/CRM | Owner adapters qua authorized API/events; kiểm coverage/freshness/drilldown; nghiệm thu nguồn thật trên runtime đã tách. Có thể ưu tiên trước board nếu mục tiêu trước mắt là KPI |
| 3. Nhiều pipeline và quy tắc nâng cao | Chat; Workflow cho automation | Chỉ mở khi có nhu cầu được chốt; contract/table review/forward migration nếu thêm dữ liệu; acceptance riêng |

Đây là các lát cắt đề xuất, chưa claim task implementation hoặc đổi dependency của SRC-109 đã DONE. H-Reporting là phần owner integration còn lại, không mở lại Chat extraction. Không tạo shared pipeline service hoặc cross-service SQL/UoW. Nếu phát sinh bảng, bắt buộc table template, tenant_id NOT NULL, schema owning service và forward migration; review hiện tại không thêm/sửa schema.

## Kiểm tra của review

DOC-CP-01: đối chiếu lifecycle/session/stage với source Chat và canonical identity. DOC-CP-02: xác định UI có sẵn và khoảng trống pipeline. DOC-CP-03: xác minh Reporting connected policy và giới hạn evidence sau cutover. DOC-CP-04: đề xuất owner/grain/version/compatibility và scope triển khai, không đổi business contract đang Ready.

DOC-CP-01…04 hoàn tất bằng source/document inspection trên Windows PowerShell, working tree main tại base `fcbde1a8dd1d2442991d8b6cd3be48f2cb19e933`. Lệnh chính: `rg -n` trên Chat/Web/Reporting và `Get-Content` các nguồn liên kết ở trên. Docs/link/whitespace verification ghi tại execution log; native/browser/build tests NOT_RUN vì không thay runtime code. Dữ liệu/process config hiện tại của từng tenant chưa được đọc; stage mặc định trong báo cáo là default trong source, không khẳng định tenant đang dùng default.
