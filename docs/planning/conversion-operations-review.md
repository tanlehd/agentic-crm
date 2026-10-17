# Rà soát hiệu suất Conversation → Lead → Deal won và vận hành theo mục tiêu

Follow-up2026-10-17: user authorized implementation after this review; PLAN-048/SRC-086 completed the [bounded contract](../contracts/conversion-reporting.md), [native dashboard and evidence](../tracking/details/SRC-086.md). The NOT_RUN/TODO statements below describe the earlier review-only session, not current release status.

PLAN-047 · Codex · 2026-10-17 · CHG-20261017-07. **Source/design review hoàn tất; đề xuất bên dưới chưa là Ready implementation contract.** Base `62b1b02`, workspace sạch trước khi claim. Nhóm sản phẩm: hiệu suất kinh doanh và giám sát vận hành; người dùng chính: quản lý Sales/CS, supervisor, người phụ trách nguồn khách.

## 1. Kết luận về base

Giữ mô hình Thread → Conversation episode (`session_id`) → Lead/Deal và quyền sở hữu hiện có. Base đã có immutable origin, actual created/follow_up/closing context, duplicate Lead journal, need→outcome link và contribution history. Chưa thấy lý do phải thay lõi hoặc thêm cột `converted`/`won` vào Chat. Deal là nguồn chuẩn cho won/amount/currency; đóng hội thoại hoặc đạt milestone tư vấn không phải bán thành công.

Phần còn thiếu để phục vụ mục tiêu người dùng là **connected business funnel + semantic rules + mục tiêu và danh sách công việc cần xử lý** trên Reporting core. Dashboard SRC-085 hoàn thành đúng phạm vi workload/queue; không phải evidence cho conversion dashboard. Cần bổ sung có phạm vi, không chỉ đổi biểu đồ.

## 2. Những gì thực sự đã có

| Phần | Evidence source | Giới hạn đã xác minh |
|---|---|---|
| Lead origin, Deal từ Lead hoặc trực tiếp | [source.ts](../../apps/backend/src/modules/sales/source.ts), [deals.ts](../../apps/backend/src/modules/sales/deals.ts) | Deal kế thừa source từ Lead; trực tiếp có thể lấy session origin. Nhiều Lead/session, nhiều Deal/Lead hợp lệ; Lead không bắt buộc |
| Nguồn khác với nơi làm việc/chốt | [session-context.ts](../../apps/backend/src/modules/sales/session-context.ts), [Customer360 contract](../contracts/customer-360-session.md) | `created`, `follow_up`, `closing` là context riêng. Closing context tùy chọn; không có context không có nghĩa không won |
| Lead trùng và need chính xác | [lead-merge.ts](../../apps/backend/src/modules/sales/lead-merge.ts), [need-outcome-port.ts](../../apps/backend/src/modules/sales/need-outcome-port.ts) | Merge giữ source/Deal.lead_id cũ. Need link là explicit, không suy từ Contact hoặc mọi record cùng phiên; linked không có nghĩa won |
| Tiến trình tư vấn | [session-funnel.ts](../../apps/backend/src/modules/reporting/session-funnel.ts), [contract](../contracts/session-progress.md) | Same-need ordered milestones, full/partial/none coverage; không đọc Lead/Deal, không chứng minh conversion kinh doanh |
| Báo cáo organic | [organic-report.ts](../../apps/backend/src/modules/sales/organic-report.ts) | Won theo closed_at, Page và currency; chỉ authorized organic Deals, không có mẫu số phiên/Lead |
| Bộ tính acquisition dùng chung | [catalog.ts](../../services/reporting/src/catalog.ts), [query-registry.ts](../../services/reporting/src/query-registry.ts), [query.ts](../../services/reporting/src/query.ts) | Đã có sessions, Leads, sessions_with_lead, session_to_lead_rate, deals_won, won_value trên synthetic source. Chưa có registered lead_to_won/session_to_won/lead-root model tương ứng |
| Dashboard vận hành kết nối | [operations-source.ts](../../apps/backend/src/modules/agents/operations-source.ts), [connected-sources.ts](../../services/reporting/src/connected-sources.ts), [template](../../services/reporting/src/operations-template.ts) | Sáu object Routing/Chat/Identity; bảy reports. Không chứa Lead/Deal/merge/need outcomes; cửa sổ30ngày,5000rows, refresh theo yêu cầu |

## 3. Các khoảng trống theo mức ưu tiên

| Ưu tiên | Phát hiện và tác động | Bổ sung cần thiết |
|---|---|---|
| P1 | Business acquisition hiện có executor nhưng chưa có connected producer; operations source chỉ nhận operations payload | Source-owned Chat/Sales read ports và typed connected adapter; tenant/record/field ACL, source coverage/watermarks, bounded queries, current-rights recheck. Không đổi nhãn mock thành live |
| P1 | Funnel tuyến tính bắt buộc qua Lead sẽ bỏ sót direct Deal; lấy số Lead/Deal làm chiều cao cùng một funnel có thể tăng ở bước sau | Session funnel đếm distinct session, tách nhánh qua Lead/trực tiếp; Lead cohort riêng. Thêm metric descriptors/operators/versioned models thay vì tính trong widget |
| P1 | Lead merge giữ Deal trỏ duplicate gốc; lọc archived Lead trước join có thể làm mất won; đếm mọi duplicate như nhu cầu độc lập có thể tăng mẫu số | Công bố raw record count và canonical-dedup policy riêng. Mapping merge có effective/recorded time, giữ origin gốc; không reparent hoặc backfill tùy tiện |
| P1 | Nguồn ban đầu, người tạo, người follow-up và người chốt là các vai khác nhau | Chọn attribution role rõ; dùng lịch sử tại hành động, không team hiện tại. Origin một lần; contribution là tham gia có overlap, không cộng full won value cho mọi người/phiên |
| P1 | Cohort chưa đủ tuổi dễ bị xem là convert kém; rolling30ngày không thay được lịch sử bán hàng dài hơn | Pin cohort, observation cutoff và horizon; tách activity và cohort; giữ pending/immature/unknown. Exact snapshot/history contract trước khi hứa historical as_of |
| P2 | Template vận hành đo bận/rảnh, chờ, completed, replies; không có target/actual/gap và việc nào cần can thiệp để convert | Goal metadata có version và bộ lọc thống nhất; saved reports về conversion + danh sách ngoại lệ + drilldown được kiểm quyền |
| P2 | Milestone và Sales outcome tồn tại riêng; need outcome link không luôn đầy đủ | Hiển thị mapped/unmapped coverage; outcome Lead/Deal chỉ dùng exact link. Không nối nhu cầu khác nhau để dựng một hành trình thành công |

Đây là khoảng trống so với mục tiêu mở rộng, không phủ nhận DONE của SRC-068/069/078/085. Test hiện có không chứng minh connected business funnel, target, historical comparison hoặc actionable drilldown đã chạy.

## 4. Công thức cần dùng

`S`: tập session thuộc cohort mở trong `[from,to)`; `L(S)`: Leads có primary origin thuộc S; `D(S)`: Deals có primary origin thuộc S, gồm direct Deals. Chỉ tính facts quan sát được đến cutoff, cùng quyền và coverage. Dùng `session_id` của episode; `conversation_id` vẫn là Thread API hiện hữu, không đổi tên/ID trong lượt rà này.

| Chỉ số | Công thức / cách đọc |
|---|---|
| Session → Lead | Số session trong S có ≥1 Lead / số session trong S |
| Session → Deal / Won | Số session trong S có ≥1 Deal / Deal won / số session trong S; phải nói rõ tính cả direct Deal |
| Session qua Lead → Won | Số session có chuỗi origin Session→Lead→Deal won hợp lệ / số session S; dùng nhánh này nếu vẽ funnel tuần tự có bước Lead |
| Lead → Deal / Won | Số Lead trong cùng Lead cohort có ≥1 Deal / Deal won / số Lead cohort; mỗi Lead tính một lần, raw/canonical policy phải ghi rõ |
| Deal win rate | Won Deals / tất cả Deals của Deal cohort; open/lost hiển thị riêng. Nếu dùng won/(won+lost), đặt tên closed-deal win rate riêng |
| Won value | Cộng mỗi Deal won đúng một lần, tách currency; không `SUM(DISTINCT amount)`, không gọi là tiền đã thu |

Session→Lead và Session→Won tổng có direct Deal là hai KPI song song, không bảo đảm nesting. Lead-root cohort theo ngày tạo Lead khác với tập Leads của session cohort; không tráo mẫu số. Để so sánh horizon H, chỉ session/Lead đủ H mới vào nhóm matured, outcomes dừng ở cohort-origin+H; nhóm đang chờ vẫn hiện riêng. H là cấu hình cần chốt, không mặc định ép7/30ngày.

Ví dụ minh họa, **không phải dữ liệu runtime**:100 phiên,20 Lead từ15 phiên;5 Lead có tổng7 Deal won. Session→Lead=15%, Lead→Won=25%, không phải20% và35%. Số phiên won cần đọc lineage riêng, không suy từ5 Lead. Một Deal có3 follow-up contexts vẫn chỉ đóng góp amount một lần.

Mẫu số0 trả null. Không đọc được nguồn/thiếu coverage không trả0 giả. Không loại phiên chưa có Lead khỏi cohort, không lấy won tháng này chia Leads tháng này nếu khác cohort. Milestone behavioral full coverage không được tự dùng làm mẫu số cho toàn bộ business sessions: hai báo cáo có coverage khác nhau.

## 5. Dashboard đề xuất trên core hiện tại

Dùng saved reports + widget/template hiện có. Chưa cần một màn hình hoặc metric engine riêng. Bố cục đề xuất:

| Tầng | Nội dung | Quyết định hỗ trợ |
|---|---|---|
| Kết quả so với mục tiêu | Eligible sessions, Session→Lead, Lead→Won, Session→Won, won count/value theo currency; actual/target/chênh lệch, sample n, cohort age, as_of/coverage | Đang hụt số lượng đầu vào hay tỷ lệ ở bước nào? |
| Điểm nghẽn | Phiên đủ điều kiện chưa có Lead; Lead chưa nhận/chưa có Deal; Deal open lâu; nhu cầu cần follow-up; waiting/capacity/response | Việc nào đang chặn bước chuyển đổi? Phân biệt chưa đủ tuổi, chưa mapping và chưa thành công |
| So sánh và hành động | Page/channel/nguồn/đội/nhân viên theo attribution role; bảng danh sách record, owner, tuổi chờ, lý do, bước tiếp theo | Mở Inbox/Lead/Deal, phân lại hoặc follow-up qua command hiện có; dashboard không tự ghi outcome |

Hai chế độ thời gian tách rõ: **Kết quả cohort** để đánh giá convert; **Vận hành hiện tại** để xử lý việc đang kẹt. Bộ lọc toàn dashboard chỉ áp dụng khi report khai báo mapping tương thích; không ép cùng một date field lên tất cả widgets. Source timestamps từng widget phải hiển thị; refresh riêng không bảo đảm snapshot đồng thời toàn dashboard.

Goal tối thiểu cần chốt: metric ID/version, scope/dimensions, cohort/timezone/period, horizon/attribution/merge policy, target/unit/currency, người chịu trách nhiệm và phiên bản có hiệu lực. Tỷ lệ chênh dùng điểm phần trăm; attainment có mẫu số target0 thì null. Không hardcode target doanh nghiệp chưa cung cấp. Ngưỡng aging/nhỏ mẫu/alert là config được review; không tạo lịch gửi cảnh báo hoặc auto follow-up trong lượt rà này.

## 6. Phạm vi thay đổi base tối thiểu và thứ tự triển khai

1. **PLAN-048 exact gate:** chốt semantics/branch/merge/time/rights và payload từ Chat/Sales, mapping nguồn đủ/thiếu, metric/model versions, goal/drilldown và acceptance. Tách v1 hiện tại khỏi history/durable snapshot mở rộng. Đây là bước kế tiếp được đề xuất, chưa claim code.
2. **Connected CRM funnel:** tái sử dụng source/context/need/contribution hiện hữu qua application ports trong monolith và authorized versioned APIs/events khi extraction. Triển khai descriptors/executor trên core Reporting, gồm lead-root cohort; không chờ Meta Insights hoặc generic custom-object ingestion hoàn tất cho scoped CRM funnel. Phối hợp PLAN-028B/SRC-075 và SRC-049 để không tạo hai producer cùng nghĩa.
3. **Dashboard convert:** template saved reports + mục tiêu + ngoại lệ/drilldown. Dùng Routing hiện hữu cho tải/hàng chờ; acceptance có thao tác tạo Lead/Deal won rồi Refresh đối soát.
4. **Mở rộng sau bằng evidence:** projection/history lâu dài, time-to-conversion, đối chiếu kỳ đủ tuổi, goal alerts; Marketing enrichment/spend có gate riêng. Không cộng demographic/asset/spend vào won khi thiếu evidence.

Chưa xác định cần thêm bảng vào Sales/Chat cho v1 chỉ đọc hiện trạng: nguồn và liên kết cốt lõi đã có. Cần khảo sát coverage actor/time/merge và lịch sử stage thực tế trước khi đề xuất thêm facts. Goal config hoặc Reporting projection nếu cần lưu phải có owner/schema/table template/retention/ACL, `tenant_id NOT NULL`, forward migration và compatibility trước code. Không sửa migration cũ hoặc viết lại source attribution. Existing reports/catalog pins giữ nguyên; semantics mới dùng model/metric versions mới, không đổi v1 đã lưu.

## 7. Acceptance cần có trước khi gọi là conversion dashboard

CV-01: một Thread nhiều sessions, session không outcome, nhiều Leads/session, nhiều Deals/Lead, direct Deal; rates và distinct totals đúng, không fan-out.

CV-02: origin S1, tạo Deal S2, closing S3; source KPI/created activity/contribution riêng, amount cộng đúng một lần.

CV-03: merge Lead sau khi có Deal, source khác cohort; canonical và raw policy tái lập được theo cutoff, không làm mất won hoặc sửa origin.

CV-04: late won, immature cohort, cùng horizon giữa hai kỳ, denominator0, nhiều currency, legacy/unmapped; history thiếu phải báo rõ. Behavioral milestone không tự thành Lead/won.

CV-05: revoke quyền record/field/team, export/drilldown, tenant isolation, source lỗi/oversize; tỷ lệ không kết hợp numerator/denominator khác population hoặc rò số lượng hidden.

CV-06: chuyển team/owner, Human/AI và actual actor khác nhau; event-time credit, unassigned/unknown coverage, không suy nhân viên từ current owner.

CV-07: native tạo Lead→Deal→won và direct Deal; Refresh giữ report/catalog versions, đối soát IDs/count/value; target cùng scope, gap đúng đơn vị; mở record/next action theo quyền. Desktop/mobile loading/error/empty có kiểm chứng.

CV-01…07 là **future runtime acceptance, NOT_RUN**. Không đổi trạng thái acceptance của các task cũ.

## 8. Evidence của lượt rà

DOC-CV-01…04 hoàn thành bằng inspection: trace base/source ownership; phân biệt behavioral/organic/mock/connected; rà grain/time/attribution/merge; ghi gap/đề xuất dashboard và gate tiếp theo. Đối chiếu [semantic model](../data/reporting-semantic-model.md), [dictionary](../data/dictionary.md), [ownership](../data/service-ownership.md), [Sales](../services/sales.md), [Chat](../services/chat.md), [Reporting](../services/reporting.md), [operations acceptance](../quality/operations-reporting-acceptance.md) và contracts dẫn ở trên.

Windows PowerShell, Node24.21.0: chạy `& '.\.local\node-v24.21.0-win-x64\node.exe' node_modules/vitest/vitest.mjs run apps/backend/tests/organic-sales.test.ts apps/backend/tests/session-progress.test.ts apps/backend/tests/customer360-contracts.test.ts apps/backend/tests/need-follow-up.test.ts services/reporting/tests/query.test.ts services/reporting/tests/operations-source.test.ts services/reporting/tests/dashboard.test.ts --reporter=default`: **59/59 tests,7/7files PASS**, exit0. Đây là tests sẵn có cho primitives/contracts/reducers, không phải native end-to-end conversion test. Doc/whitespace kết quả cuối ghi trong [execution log](../tracking/log.md).

Không sửa source/schema, không gọi DB/provider, không seed/reset/restart/commit/push/deploy. Native/MySQL/browser/full build NOT_RUN; services không được fresh health-check. Working-tree references là tài liệu trong lượt rà này; không có commit mới hoặc claim dữ liệu conversion production.
