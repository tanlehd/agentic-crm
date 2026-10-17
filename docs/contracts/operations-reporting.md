# Operations reporting — đối tượng, thuộc tính và dashboard dùng chung

PLAN-046 / SRC-085 · 2026-10-17 · CHG-20261017-06. **Ready for bounded on-demand connected source.** Thiết kế mở rộng theo yêu cầu đưa giám sát vận hành vào Report Builder/Dashboard core. Không dựng một renderer hoặc bộ tính KPI riêng cho Routing.

## Quyết định sản phẩm và phạm vi

Routing giữ cấu hình, hàng chờ và thao tác phân lại. Phần phân tích hiệu suất chuyển sang Reports và Dashboards. Dashboard vận hành là template tạo các saved reports và widget bình thường; người dùng sửa nhóm, bộ lọc, metric, kiểu biểu đồ và bố cục bằng builder hiện hữu. Các report có thể tái sử dụng ở nhiều dashboard. Không tạo dữ liệu giả để gọi là connected.

Nguồn Reporting là read model được mô tả bằng object/field/relation/model/metric descriptors. Các đối tượng này chỉ đọc, không phải custom CRUD entity để quản trị viên sửa lịch sử phân công. Object Platform tiếp tục giữ canonical CRM metadata; Reporting bổ sung thuộc tính dẫn xuất có lineage và grain. Generic custom-object ingestion toàn hệ thống vẫn thuộc PLAN-028B/SRC-075.

## Data dictionary và grain

| Đối tượng | Một dòng là | Thuộc tính và nguồn |
|---|---|---|
| Agent workload | Một agent tại asOf | principal_id, tên, capacity, workload, available, enabled; Identity directory + Routing profile/allocation |
| Routing queue | Một queue | queue_id, tên, team_id; Routing queue/version |
| Routing work | Một phiên cần xử lý | work_id, conversation_id, session_id, state, created_at, completed_at; Routing work |
| Assignment | Một lượt agent giữ việc | allocation_id, work_id, agent_id, team_id, assigned_at, released_at, release_reason, handling_seconds; Routing allocation |
| Queue visit | Một lần công việc vào queue | entry_id, work_id, queue_id, started_at, ended_at, state, blocked_reason, waiting_seconds; Routing entry/version |
| Agent reply | Một contribution outbound_submitted | contribution_id, session_id, agent_id, team_id, submitted_at; Chat contribution port, không transcript |

Assignment→Agent, Assignment→Work, Queue visit→Queue/Work là many-to-one. Không join fan-out Agent→Assignments→Replies để SUM vì nhân bản workload. Team của assignment/reply là lịch sử tại hành động; team queue và tên agent là metadata hiện tại, phải ghi rõ. Agent thuộc nhiều team không được nhân capacity qua membership join.

## Metric semantics

- Current workload/capacity/available slots: snapshot hiện tại, không SUM qua thời gian. Tỷ lệ sử dụng = SUM(workload)/SUM(capacity), mẫu số0 trả null; agent disabled/không available không tự thành slot có thể nhận.
- Được phân công: COUNT DISTINCT allocation_id theo assigned_at; một work chuyển người có nhiều assignment.
- Hoàn tất: allocation có release_reason=completed theo released_at; chuyển giao đếm riêng, không ghi completion.
- Handling duration: released_at−assigned_at cho completed allocation; bao gồm pending/snooze/chờ khách. AVG theo các lượt, tổng phải recompute, không lấy AVG các AVG team.
- Queue wait: ended_at−started_at khi assigned; thời gian còn chờ = asOf−started_at. Hai population riêng, không trộn chờ đang diễn ra với completed wait.
- Reply submissions: COUNT DISTINCT contribution_id theo submitted_at và actor thực; không suy delivery sent/read hoặc first response từ submission.
- Mọi metric nhận filter/group theo field descriptor được phép và dùng executor chung. Giá trị thiếu là null, không0; thời gian UTC, bucket theo timezone report.

## Connected source boundary

Nguồn kết nối cần được cấp quyền hiện tại qua producer-owned port; Reporting không SELECT database Chat/Routing/Identity. Native BFF kiểm tenant/session, report run/export và routing read/all + conversation read/all/assign/all + owner/team field access. Viewer thiếu scope đầy đủ không được xem tổng tenant hay nguồn này. Snapshot không chứa transcript, credential hoặc khách hàng thật trong evidence.

Đường query phải giữ admission có chữ ký, kiểm quyền trước và sau delivery, giới hạn payload/row/time/concurrency, và fail closed khi nguồn lỗi. Không dùng quyền mock source như quyền connected. Catalog/source pin tách khỏi data watermark: làm mới dashboard lấy dữ liệu mới mà không tự đổi report version hoặc catalog. Snapshot hiện tại phải hiển thị asOf; không gọi dữ liệu cũ là realtime. Bounded live windows tối đa30ngày, vượt giới hạn phải lỗi rõ thay vì truncate. Historical workload trend cần snapshot history riêng, chưa suy từ workload hiện tại.

## Implementation gate

Để Ready trước source phải khóa: producer payload schema/version + field lineage, signed transport và source grants, descriptor/executor registry, live-window/catalog-pin behavior, report/template compatibility, UI current-source labels và acceptance dưới đây. Reporting schema5 thêm metadata catalog bất biến và dual pin cho widget theo table review bên dưới; không lưu projection/history nghiệp vụ. Không sửa mock binding/dữ liệu demo hiện có. Durable run trên connected source phải có immutable snapshot và retention gate riêng, không tự dùng snapshot mới cho run cũ.

## Nghiệm thu OR-01…08

### Exact transport / execution decisions

Native public report/dashboard APIs remain compatible. BFF wraps private query/authoring/dashboard operations in `{operation,sourcePolicy:{allowMock,operations}}`; operations is null or `{schemaVersion:1,tenantId,asOf,historyFrom,rows}` from authorized producer ports. Six row collections use the exact fully qualified fields above; typed descriptor validation rejects unknown/missing values. Rows bounded5000 total, envelope4MiB; source errors fail the request. Existing signed audience verifies the full envelope, then dispatches the validated operation internally with a recomputed digest. New private `/connected/query|authoring|dashboards` endpoints only; no browser cookie/origin accepted. Current native field policies are evaluated before creating the payload and auth revision rechecked after response. Legacy private mock endpoints remain mock-only.

`allowMock` derives only from report_mock_source.read/all. Operations derives only from the required native source grants, independently. Neither flag nor payload can be submitted through a native browser body. Request-local source registry uses AsyncLocalStorage; no cross-viewer cache or source-policy fallback. Stable tenant-specific connected binding ID is derived from tenant/source identity; generation pin is catalog hash. Snapshot data hash differs per observation. Generic query engine accepts the registered connected adapter and uses normal registered operators; all other adapters fail closed.

Connected definitions add optional `time.rollingDays` integer1…30. For connected source it is required: executor resolves from/asOf/to against the current snapshot; snapshot-agent rows carry the observation start timestamp strictly before the final asOf, so the existing exclusive-to boundary includes current rows without changing compiler window semantics. Source catalog pin is immutable and mismatches fail, no auto-upgrade. Mock definitions reject rollingDays and keep exact snapshot pin/time semantics. Dashboard render shows connected provenance and returned asOf. No source rows persist in Reporting in this bounded slice; existing report/dashboard definitions persist as before. Connected durable-run endpoints reject this adapter until durable snapshot retention exists. Forward005 adds catalog metadata and typed connected widget pin; existing mock generation FK remains.

Initial template recipes: current workload/capacity by agent, waiting jobs by queue/reason, completed/transfer by agent, average completed handling time, average assigned queue wait, replies by agent and assignments by day. These are ordinary definitions, not custom reducers/widgets. Administrative actions remain on Routing screen. Removing the bespoke performance UI happens only after shared dashboard acceptance succeeds.

1. OR-01: catalog liệt kê object/field/type/grain/relation/metric; thêm report từ các trường bằng builder, không hardcode UI hiệu suất.
2. OR-02: snapshot connected đối chiếu nguồn Routing/Chat thật; tenant/role/field revoke và unavailable source không rò dữ liệu hoặc trả0 giả.
3. OR-03: group/filter theo agent/team/queue; assigned/completed/transfer/reply và AVG/ratio đúng grain, timezone/date window rõ.
4. OR-04: template tạo dashboard + saved reports atomic/idempotent; sửa report và layout, mở lại, dùng cùng report ở dashboard thứ hai.
5. OR-05: agent close→phân việc tiếp; Refresh dashboard phản ánh workload/completion mới, giữ pinned report/catalog; hiển thị asOf.
6. OR-06: nguồn mock/report/dashboard hiện có vẫn chạy, giữ pin semantics; connected không mang nhãn DEMO hoặc quyền mock.
7. OR-07: HTTP/native/browser negative tests, CSV quyền riêng, stale authority, nguồn timeout/bounds, không cross-service SQL.
8. OR-08: bỏ tab hiệu suất riêng sau khi dashboard thay thế hoạt động; giữ cấu hình và hành động phân lại; lưu ảnh desktop/mobile và tài liệu/evidence.

Hiện trạng trước SRC-085: source/query/dashboard code vẫn hardcode mock trong admission, ProjectionContext, QueryResult, discovery và source resolution. Chưa có generic connected execution. Đây là gap cần xử lý ở core; không được đổi nhãn nguồn mock để lách gate.

## Table review — schema5 (Ready trước migration)

Browser validation exposed schema4 dashboard_widget_generation_fk requiring a persisted mock generation. Forward005 preserves that FK and adds a distinct connected catalog reference. No source data is disguised as mock.

| Mục | Thiết kế |
|---|---|
| Task / acceptance | SRC-085 / OR-04, OR-06, OR-07 |
| Table / schema / physical | report_connected_catalog; extracted crm_reporting and retained test_crm_reporting |
| Writer / aggregate | Reporting DashboardService; same transaction as dashboard command |
| Meaning / type | Immutable adapter catalog metadata, never operational rows or query result |
| Scope | Business tenant from signed admission; tenant_id NOT NULL; system/zero denied |
| Columns | tenant_id/binding_id ASCII CHAR36; catalog_hash ASCII CHAR64; catalog JSON; adapter_id ASCII VARCHAR64; created_at DATETIME(6) UTC; all NOT NULL, no defaults |
| Keys / constraints | PK tenant,binding,catalog_hash; hash regex; native_operations_v1 adapter check; no external FK |
| Remote refs | Registered source identity via signed producer envelope; fail closed on source errors |
| Query/index | Exact PK insert/existence; bounded one row per source catalog release; no list/pagination |
| Rights | report.design plus current connected source grants; no public catalog writes |
| Concurrency | INSERT IGNORE identical registered hash metadata; immutable, idempotent inside command transaction |
| Audit/outbox | Existing dashboard command receipt/audit/outbox records the enclosing mutation atomically |
| PII/retention | Metadata only, no names of people/transcript/secrets; retained while referenced, no runtime purge |
| DB grants | Runtime SELECT,INSERT only; DDL operator separately |
| Migration | 005 CREATE + ALTER widget; preserve rows; backup, fingerprint, repeat0 |
| Widget alteration | generation_id becomes nullable; connected_catalog_hash CHAR64 nullable; same-tenant/binding catalog FK; CHECK exactly one pin nonnull |
| Compatibility | Wire generationId unchanged; new reader coalesces pins, named-column writer. Deploy schema then new binary. Old binary cannot read connected widgets; roll forward, no downgrade after connected writes |
| Fixtures / evidence | Retained local Alpha and native_seed_test; mock regression and wrong tenant; commands/results in SRC-085 evidence, NOT_RUN until executed |

Saved report drafts retain the existing unvalidated draft contract. Their catalog_hash identifies the authoring catalog selected by registered model family; execution still validates against the authorized source and widget catalog pin.
