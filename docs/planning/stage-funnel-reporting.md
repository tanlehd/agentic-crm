# Funnel theo lịch sử vào/ra stage — rà soát và đề xuất

**Implementation update2026-10-18:** PLAN-050 exact gate completed and SRC-087 implemented the [bounded stage-event contract](../contracts/stage-funnel-reporting.md). [Runbook](../development/stage-funnel-reporting.md) · [Runtime evidence](../quality/stage-funnel-reporting-acceptance.md). The audit/research below is the historical pre-code assessment; proposed optional/horizon/correction/opening-closing capabilities outside the exact contract are not delivered by this slice.

PLAN-049 · Codex · 2026-10-18 · CHG-20261018-01. **Research/design proposal; chưa là Ready implementation contract.** Kiểm tra source tại `main/e370532`, working tree sạch trước khi claim. Nhóm sản phẩm: hiệu suất kinh doanh và giám sát vận hành; người dùng: Sales/CS manager, supervisor; người cấu hình: report designer. Yêu cầu: dashboard widgets cho Conversation stage, Lead stage và Deal stage dựa trên sự kiện vào/ra.

## 1. Kết luận từ source hiện tại

**Chưa có chart type hoặc template stage-event funnel trong Report Builder.** Nền dashboard/saved report có thể tái sử dụng. Đã có hai khả năng liên quan nhưng khác semantics:

| Thành phần | Evidence | Đã có / phần thiếu |
|---|---|---|
| Report Builder | [authoring.ts](../../services/reporting/src/authoring.ts), [types.ts](../../services/reporting/src/types.ts), [definition-schema.ts](../../services/reporting/src/definition-schema.ts), [visual contract](../contracts/reporting-visualizations.md) | 10 displays: table, kpi, bar, horizontal_bar, stacked_bar, line, area, pie, donut, pivot. Không có `funnel`; contract chủ động loại khỏi slice vì thiếu ordered-stage/cohort semantics |
| Dashboard conversion SRC-086 | [conversion-template.ts](../../services/reporting/src/conversion-template.ts), [contract](../contracts/conversion-reporting.md) | 10 reports KPI/table về cohort, nguồn, Lead/Won, direct branch, goal và việc cần xử lý; không phải funnel qua stage. Adapter lấy current snapshot, không tái dựng lịch sử stage |
| Behavioral funnel SRC-069 | [session-funnel.ts](../../apps/backend/src/modules/reporting/session-funnel.ts), [contract](../contracts/session-progress.md) | Funnel theo chuỗi milestone của cùng need, đếm distinct session và coverage. Endpoint riêng `/api/v1/session-funnel`; không dùng `session_stage_event` để tính stage-entry/exit, chưa thành saved report/widget chung |
| Conversation stage | [session-progress.ts](../../apps/backend/src/modules/conversation/session-progress.ts), [session contract](../contracts/session-progress.md) | Đã lưu `session_stage_event` với session/revision/from_stage/to_stage/recorded_at; process version được pin trong progress. Outbox `session.progress_changed` chỉ có session/revision/action, không chứa đầy đủ transition. Chưa có model/projector stage visits hoặc metrics in/out/dwell trong builder |
| Lead stage | [leads.ts](../../apps/backend/src/modules/sales/leads.ts), [handoff.ts](../../apps/backend/src/modules/sales/handoff.ts), [chatflow-port.ts](../../apps/backend/src/modules/sales/chatflow-port.ts), [module](../modules/sales.md) | Hiện là status cố định new/qualifying/qualified/handed_off/accepted/disqualified; có qualified_at, accepted_at và một số domain events. Chưa có ledger đầy đủ mọi transition, kể cả draft status, disqualify và automation |
| Deal stage | [deals.ts](../../apps/backend/src/modules/sales/deals.ts), [schema catalog](../data/schema-catalog.md) | open/qualified/proposal/won/lost, current stage + closed_at; có deal.created/deal.won. Chưa ghi history đầy đủ from/to cho mọi stage; `crm_sales.deal_stage_history` mới là target gated M4. Terminal won/lost hiện không reopen |

Audit `changed_fields` trong [commands.ts](../../apps/backend/src/kernel/reliability/commands.ts) không cung cấp toàn bộ giá trị before/after; không thể lấy audit hiện có làm lịch sử stage đầy đủ. Đếm current stage theo nhóm chỉ trả phân bố hiện tại, không chứng minh record từng đi qua các bước trước.

## 2. Mẫu HubSpot đã nghiên cứu

Nguồn chính thức đọc ngày 2026-10-18; chỉ kiểm chứng tài liệu public, chưa thử tài khoản HubSpot. Phân biệt tài liệu builder mới đang gắn Beta với legacy; không trộn semantics giữa hai phiên bản.

| Nguồn | Điều rút ra |
|---|---|
| [Create custom funnel reports](https://knowledge.hubspot.com/reports/create-new-custom-funnel-reports), cập nhật 2026-05-30 | Tạo từ template hoặc chọn object/first event rồi thêm stages. Funnel chuẩn dựa vào Lifecycle/Deal stage và Date entered, không tùy ý chọn custom property. Stage trung gian có thể optional; đầu/cuối bắt buộc. Date range lọc ngày event, không mặc định ngày tạo record. Bài mô tả Contacts/Companies/Deals, không chứng minh Conversation hay Lead-object funnel có sẵn |
| [Funnel legacy report types / migration](https://knowledge.hubspot.com/reports/differences-between-funnel-reports-types), cập nhật 2025-11-19 | Journey funnel xét thứ tự thời gian; legacy và journey khác về date window, creation event và merge. Có conversion bước kế tiếp và từ bước đầu. Cần pin semantics khi nâng version, không silently đổi kết quả saved reports |
| [Use stage calculated properties](https://knowledge.hubspot.com/properties/stage-calculated-properties), cập nhật 2026-07-15 | Có entered/exited, latest/cumulative duration, current-stage entry/age, gồm Lead. Duration của lượt đã kết thúc khác current-stage age; re-entry cần được tính riêng. Tài liệu hiện ghi calculated properties mặc định tắt cho pipeline/stage mới; phải kiểm tra coverage |

Áp dụng cho CRM là **đề xuất của dự án**, không phải lời khẳng định HubSpot có đúng các object, schema hay thuật toán dưới đây. Template chỉ cấu hình một saved report; dashboard widget tham chiếu immutable report version như nền hiện có.

## 3. Tách ba câu hỏi báo cáo

| Loại | Câu hỏi | Dữ liệu / cách hiển thị |
|---|---|---|
| Ordered stage funnel | Bao nhiêu record đi qua A → B → C, rớt/chưa tới bước nào? | Distinct subject trên cùng cohort và chuỗi event hợp lệ; funnel + bảng conversion/drop-off |
| Stage movement / duration | Trong kỳ, bao nhiêu lượt vào/ra từng stage, đang tồn bao nhiêu, ở bao lâu? | Transition/visit facts; bảng, in/out columns, current-age KPI; không bắt chiều cao giảm dần |
| Current stage distribution | Hiện bao nhiêu record ở mỗi stage? | Snapshot group-by; bar/table, tên rõ “hiện tại” |

**Exit stage không đồng nghĩa drop-off.** A → B tạo một exit A và một enter B trong cùng transition. Exit có thể đi tới bước kế tiếp, bỏ qua bước, quay lại hoặc terminal; drop-off là chưa đạt bước bắt buộc kế tiếp theo chính sách quan sát của funnel.

## 4. Đề xuất facts và ownership

Một logical transition gồm tenant, object kind, subject ID, process/pipeline ID + version, event ID, aggregate revision, from/to stage, occurred_at, recorded_at, actor kind/ref và reason code khi có. Đây là shape nghiên cứu, **chưa thêm wire schema/event/table**.

- Chat sở hữu Conversation episode stage; subject là `session_id` hiện có, giữ `conversation_id` để mở Thread. Không dùng Thread/Contact thay episode. Stage tổng quan khác need milestone và Lead/Deal outcome.
- Sales sở hữu Lead status/Deal stage. R1 đề xuất dùng status/stage hiện có; configurable Sales pipeline, reopen và business lifecycle mới vẫn gate riêng, không mở rộng Draft ngầm.
- Reporting sở hữu projection/visit/metric, đọc qua authorized owner ports trong monolith; sau extraction dùng versioned API/events. Không đọc SQL/FK xuyên service, không shared UoW giữa services.
- Producer ghi state + transition + outbox atomically; bao phủ create, human/API/AI/workflow và mọi đường đổi stage. No-op cùng stage không tạo visit mới. Một transition sinh cặp exit/enter để tránh đếm lệch khi hai event đến khác lúc.
- Consumer dedup tenant + event ID; dùng revision để xử lý thứ tự/gap, không dùng delivery time. Late facts/corrections cần watermark, recorded-time cutoff, policy supersedes và snapshot/executor version; không sửa event lịch sử.
- Khởi tạo ghi from=null khi có evidence thật. Conversation history cũ dùng recorded_at làm thời điểm command (không giả occurred_at quá khứ); enrollment partial chỉ biết từ lúc enroll. Tạo terminal stage entry không tự tạo exit terminal. Conversation close cần lifecycle fact để dừng active duration; không tự biến close thành sales conversion hoặc stage transition.
- Legacy thiếu history phải hiện full/partial/none và history_from. Không backfill chuỗi A→B→C từ current C. Chat ledger có thể tái sử dụng nhưng phải chứng minh initial/close coverage; Lead/Deal timestamps/domain events chỉ bổ sung facts thực sự được chứng minh.
- Nếu exact design cần bảng mới: điền [table template](../templates/database-table.md), đọc [DB guideline](../data/database-guidelines.md)/[schema catalog](../data/schema-catalog.md), tenant_id NOT NULL, owner schema và forward migration. Không sửa migration đã chạy; giữ synthetic data.

## 5. Quy tắc tính đề xuất để chốt ở PLAN-050

### Funnel và thời gian

Chọn **một object + process version + ordered stages** cho mỗi report. Mặc định đề xuất count distinct raw subject ID; stage order lấy cấu hình, không sort theo count. Lead canonical merge là mode riêng cần mapping theo thời điểm; không nối event của hai duplicate thành một hành trình đã đi đủ bước. Branch Conversation→Lead→Deal tiếp tục dùng immutable lineage riêng, không trộn số session/Lead/Deal làm cùng funnel; direct Deal không bắt qua Lead.

Hai time modes cần nhãn riêng và saved definition pin:

1. **Event window** gần mẫu HubSpot: tất cả event chứng minh các bước nằm trong `[from,to)` và đã biết ở as_of. Record tạo trước kỳ vẫn được tính nếu bước đầu được chọn xảy ra trong kỳ.
2. **Entry cohort**: bước đầu vào trong `[from,to)`, các bước sau quan sát tới as_of hoặc entry+H. Đề xuất first eligible entry per subject trong window, một subject tính một lần; không lấy lần quay lại làm mẫu số mới. H là cấu hình được chọn, không tự đặt target/horizon. Phải công bố immature/pending và coverage.

Chỉ dùng entered-stage để hoàn thành bước funnel; exited-stage để xác định visit/dwell/movement. Tìm ordered prefix của cùng subject, mỗi bước tiếp sau phải có event hợp lệ sau bước trước; cùng timestamp dùng aggregate revision. Gặp gap/collision không có thứ tự đáng tin → unknown, không bịa sequence. Skip một required stage không được credit bước sau; quay lại và sau đó đi đúng chuỗi có thể hoàn thành prefix. Re-entry không nhân distinct count.

R1 đề xuất chỉ required stages. Optional intermediate stages và unordered/any-stage modes là extension được ghi rõ; nếu triển khai optional thì đầu/cuối bắt buộc và phải định nghĩa riêng denominator của optional step. Any-stage counts không bảo đảm nested nên hiển thị bar/table, không ép thành funnel conversion.

Với ordered required stages: `N_i` là số subject hoàn thành prefix tới i; `step_rate_i=N_i/N_(i-1)`; `overall_rate_i=N_i/N_1`; mẫu số 0 trả null. `N_i-N_(i+1)` là chưa qua bước kế tại cutoff, không gọi tất cả là thất bại. Nếu H chưa hết, tách pending khỏi observed non-conversion của matured cohort. Missing coverage/permission không biến thành zero.

### In/out và thời gian stage

Visit là khoảng `[entered_at,exited_at)` của một lần ở stage. Cùng record có thể nhiều visits. Hiển thị riêng `entry_visits`, `exit_visits`, `distinct_entered`, `distinct_exited`, `current_records`, `completed_visit_duration`, `current_stage_age`; không SUM distinct qua stage hoặc gọi số visits là số Leads.

Completed duration = exit−entry của visit đã kết thúc; cumulative completed = tổng visits đã kết thúc của subject/stage; current age = as_of−entry của visit đang mở, dừng theo lifecycle close nếu model quy định. Median/P90 cần exact population, null handling và unit trước khi thêm metric descriptor; không trộn completed duration với current age. Movement window có thể có exit từ visit bắt đầu trước from, nên phải đọc opening state/history trước kỳ. Trong scope population cố định, full coverage và cùng lifecycle convention: closing balance = opening balance + entries − exits. Archive/merge/close ảnh hưởng active population phải được giải thích riêng, không làm cân bằng giả.

Ví dụ synthetic để duyệt semantics: X đi A→B→A→C; Y đi A→B→C; mọi event cùng kỳ, required A/B/C. Funnel có A=2, B=2, C=2 vì X có ordered subsequence A→B→C; A entry visits=3 nhưng distinct A=2. Nếu X chỉ A→C thì C của funnel chỉ có Y, còn stage movement vẫn ghi entry C của X. Exit A ở hai ví dụ không tự là lost.

## 6. Template/widget đề xuất

| Template | Preset / metric | Gate |
|---|---|---|
| Conversation stage funnel | received → consulting → next_step từ process version đã chọn, distinct episode | Stage facts + registered ordered model; không thay behavioral milestone report |
| Lead stage funnel | new → qualifying → qualified → handed_off → accepted, cho designer chọn subset | Ledger bao phủ mọi status write; direct qualify có thể skip qualifying, preset strict phải giải thích |
| Deal stage funnel | open → qualified → proposal → won, cho designer chọn subset | Ledger đầy đủ; lost là branch/breakdown, không thêm sau won trong chuỗi |
| Stage movement — chọn Conversation/Lead/Deal | Entries/exits theo ngày/stage + opening/closing counts | Visit model, full/partial coverage và lifecycle policy |
| Stage duration — chọn Conversation/Lead/Deal | Latest/cumulative completed duration, current age | Visit population và duration definitions |
| Stage cần xử lý — chọn Conversation/Lead/Deal | Current stage + age + owner/team + native record links | Current ACL, ngưỡng tuổi do người dùng chọn; không tự đặt SLA/cảnh báo |

Builder UX: chọn source/object → pipeline/process/version → stages/thứ tự → time mode/window/cutoff → filters → Preview → Save report → Add to dashboard. Preview luôn hiện distinct subject, denominator, dates, coverage, pending và bảng số chính xác. Click step/drop-off mở danh sách cùng predicate và quyền hiện tại. Widget chỉ render kết quả backend, không tự tính funnel từ grouped bars. Thiếu history/capability thì giải thích và disable preset tương ứng.

## 7. Implementation gate và nghiệm thu tương lai

PLAN-050 TODO cần exact contracts cho producer coverage, initial/close/terminal/merge semantics, retention/backfill, source ACL, bounded scans, replay/corrections, time modes, definition/result/schema/executor versions, discovery/renderer và report/widget pin compatibility. R1 có thể giới hạn required stages + fixed Sales lifecycle để tránh phụ thuộc configurable pipeline M4. Chưa có source task mới được claim.

| ID | Scenario cần kiểm thử khi triển khai |
|---|---|
| SF-01 | Normal A→B→C, skip, backward, re-entry, no-op, same-time revisions; distinct khác visit counts |
| SF-02 | Create trước kỳ/enter trong kỳ, event-window khác entry-cohort, timezone/boundary, cutoff/H, zero denominator và pending |
| SF-03 | Duplicate/out-of-order/missing events, late facts/correction/replay; deterministic versioned results, không double count |
| SF-04 | Conversation initial/enroll partial/close/new episode; stage và same-need milestones độc lập |
| SF-05 | Mọi Lead/Deal mutation path, won/lost, disqualify, merge không dựng chuỗi giả; giữ direct Deal và currency semantics |
| SF-06 | Tenant/current record/field/export rights, denied drilldown, revoked access, history coverage và query limit không truncate |
| SF-07 | Tạo từ template, preview/save/reopen/add widget/refresh, old reports unchanged, desktop/mobile + exact table/CSV |
| SF-08 | Duration completed/current, visit trước window, opening/closing reconciliation; synthetic fixtures và dữ liệu cũ giữ nguyên |

## 8. Evidence của phiên nghiên cứu

DOC-SF-01: đối chiếu capabilities/schema/types/templates để xác nhận chưa có funnel display. DOC-SF-02: đọc Chat stage ledger/reducer và Lead/Deal producers để phân biệt evidence sẵn có với missing transition coverage. DOC-SF-03: ba nguồn HubSpot chính thức và proposal tách event window/cohort, stage exit/drop-off, distinct/visits, stage/milestone. DOC-SF-04: đồng bộ module/service/semantic references, build plan/tracker/log/checkpoint và kiểm tra docs links/whitespace.

DOC-SF-01…03 đã kiểm tra thủ công; kết quả lệnh DOC-SF-04 ở [execution log](../tracking/log.md). SF-01…08 runtime **NOT_RUN**, không claim feature implemented. Source/schema/DB/runtime không đổi. Không commit/push/deploy/reset/subagent/schedule; services không kiểm tra lại. Bước tiếp theo cho chủ đề này: PLAN-050 exact design trước source.
