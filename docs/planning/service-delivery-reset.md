# Kế hoạch chuyển service theo kết quả vận hành — PLAN-056

**Phạm vi hiện hành 2026-10-23 / CHG-20261023-19:** [ADR-029 service delivery](../governance/service-delivery-scope.md) áp dụng D3 và mọi service tiếp theo. Kết quả vận hành là API/producer/local consumers của owner, không toàn bộ nghiệp vụ downstream. Scope producer kết thúc ở durable transport delivery theo contract; owner nhận chịu integration riêng. T01–T05 DONE, T06 IN_PROGRESS; D3 2/6, local2/14. [Chat consumer handoff](chat-extraction/consumer-handoff.md) thay yêu cầu gom consumer vào T06/T08; không mở D4. Các snapshot có ngày bên dưới giữ làm lịch sử.

**Cập nhật CHG-20261019-23:** [Base Omni CRM Human-first](human-first-omni-crm.md) là phạm vi D3 hiện hành; AI native triển khai sau. T04 IN_PROGRESS; AI Runtime capacity không chặn nghiệm thu Human. D4 chưa được mở.

**Review2026-10-19 / PLAN-058:** [Mapping17ranh giới sang nhóm image và phạm vi D4](deployment-groups-review.md). D1/D2 DONE; D3 active2/6, T04 chưa bắt đầu. D4 chưa scoped/Ready, chọn một đầu ra từ Workflow/AI, không tự tách cả bốn ranh giới. Web/core tiếp tục đóng gói chung theo nhóm; core separation chỉ khi có nhu cầu độc lập. Những dòng “next D1/D2” phía dưới là lịch sử của review2026-10-18.

**Review2026-10-19 / PLAN-058:** [Mapping17ranh giới sang nhóm image và phạm vi D4](deployment-groups-review.md). D1/D2 DONE; D3 active2/6, T04 chưa bắt đầu. D4 chưa scoped/Ready, chọn một đầu ra từ Workflow/AI, không tự tách cả bốn ranh giới. Web/core tiếp tục đóng gói chung theo nhóm; core separation chỉ khi có nhu cầu độc lập. Những dòng “next D1/D2” phía dưới là lịch sử của review2026-10-18.

**D2 execution complete2026-10-18:** SRC-108 DONE6/6, [main Alpha delivery/operations evidence](../tracking/details/SRC-108.md). D1+D2 now delivered;2/17independent packages/local services remain correct because Identity/Chat still baseline. D3 is next, with exact physical migration and authority replacement gates before dependent source; D4 remains separately scoped.

**Execution update 2026-10-18:** D1/SRC-107 DONE **5/5**; [evidence](../tracking/details/SRC-107.md), [runbook](../development/connector-local.md). Connector mock ingress phục vụ native backend/Chat, local2/17; gói2/17. Candidate schema5 dùng database/volume riêng, giữ old schema2 deployment; backend37 không đổi. CHG-20261018-23 giữ legacy monitor3020/app con và kiểm probe/current registry bằng observer. Audit/0-of-5 dưới đây là baseline trước triển khai. Next D2 exact runtime composition scope.

2026-10-18 / CHG-20261018-22. Review và kế hoạch thay thế chuỗi microtask sau SRC-106. Giữ ADR-017/021/023, ownership, tenant isolation và evidence đã có. Không xóa code/test hay đổi trạng thái lịch sử để làm đẹp tỷ lệ. Đây là review source/artifact; không chạy lại runtime suites trong phiên này.

## Kết luận kiểm tra

Kế hoạch trước ưu tiên hoàn tất từng cơ chế của một giao thức phân tán hơn là đưa một luồng hiện có vào vận hành. Từ sau SRC-091, SRC-092…106 gồm15task DONE nhưng không thêm deploy unit/traffic local. Code có giá trị ở persistence, revoke, fencing, replay và transport; chưa hội tụ thành ứng dụng chạy qua entrypoint. Liên tục báo số test/task làm tiến độ có vẻ tăng trong khi kết quả người dùng cần không thay đổi. Trách nhiệm điều chỉnh thứ tự và cách báo cáo thuộc agent triển khai.

17 là catalog trách nhiệm (có cả module Draft), không phải17service đã Ready để tách ngay. Theo ADR-023, CRM/Sales/Identity có thể cùng deploy group khi còn transaction/policy coupling. Giữ số đo2/17gói và1/17phục vụ local để so sánh lịch sử; không gọi chúng là phần trăm hoàn thiện toàn hệ thống. Không tạo container rỗng hoặc đổi mẫu số để tăng tiến độ.

## Bằng chứng source, không suy từ tên thư mục

| Phần | Có thật | Chưa có / hệ quả |
|---|---|---|
| Reporting | package, main/HTTP, database/grants riêng, image và local container đã verified | Không đại diện cho các module còn lại |
| Connector ingress | services/crm-connector main API/worker, durable queue, own DB, Compose, readiness; contract SRC-028/030/091 có | Main local vẫn configuration-required; activation chưa khép kín |
| Connector outbound mới | PayloadStore, PreparationStore, AttemptStore, AttemptExecutor; AttemptPorts inject được | main.ts/http.ts không compose các class này; các instance hiện chủ yếu ở scripts test |
| Identity/Chat dispatch | Class/ports/types riêng, owning-role tests, không cross-DB SQL từ Connector | Trong services/core-baseline; bootstrap.ts không đăng ký private dispatch; Chat vẫn SELECT crm_record/record_team_access trong transaction baseline |
| TLS/registry | Kernel transport + native registry, kiểm thử TLS thật | Callback registry local, probe synthetic; chưa có deployment trust/bootstrap và business composition |
| UI component | Inbox import MessageContentView/Ownership/RecordPreview; Dashboard có model/API/visual riêng | InboxBody và DashboardWorkspace vẫn gom nhiều state/fetch/command/render; chưa thể gọi component hóa hoàn chỉnh |
| Kiểm soát dependency | Chat AST guard268edges, contract-only imports mới được review | Guard chặn drift, không chứng minh hết SQL coupling, runtime boundary hay physical extraction |

Tham chiếu: [backend bootstrap](../../services/core-baseline/src/bootstrap.ts), [Connector main](../../services/crm-connector/src/main.ts), [HTTP](../../services/crm-connector/src/http.ts), [executor](../../services/crm-connector/src/attempt-executor.ts), [Chat claim](../../services/chat/src/dispatch-claim.ts), [Inbox](../../apps/web/app/crm/inbox.tsx), [Dashboard](../../apps/web/app/crm/dashboard-workspace.tsx). Inventory read-only: artifacts/service-delivery-review/audit.json. Ví dụ source dồn nhiều biểu thức một dòng: DashboardWorkspace khoảng31KB/63lines, Inbox26KB/88lines; đây là dấu hiệu khó review, không phải phép đo chất lượng độc lập. Đã đọc state/hooks/API orchestration để xác nhận trách nhiệm đang trộn.

Kết luận: **đã chia module và có component tái sử dụng một phần; chưa có ranh giới runtime và composition hoàn chỉnh cho luồng mới**. Không cần viết lại tất cả. Hoàn thiện facade/ports/composition ở đúng luồng bàn giao; UI cleanup là backlog riêng, không chặn Connector.

## Test có lặp không?

Có lặp ở cách chạy và cách tổ chức. Tám log full unit còn lưu từ SRC-099…106 gồm7success và1failed suite, khoảng145.19giây tổng Vitest duration (mỗi lượt16–20giây); thêm một focused run1.51giây. Log có thể bị ghi đè, không phải tổng thời gian phiên hay số lần chạy đầy đủ. Một lượt fail do Ajv duplicate schema được rerun sau sửa là cần thiết. Không có bằng chứng để nói mọi lượt full unit đều vô ích, hay test là nguyên nhân chính của toàn bộ chậm trễ.

Lãng phí rõ hơn:

- Lịch sử SRC-101…106 có ba lệnh dispatch lồng nhau chạy cùng harness. T09 đã xoá harness baseline và command cũ; current Human dispatch được kiểm bằng `test:chat:outbound:native` trên Chat độc lập. Không chạy lại evidence lịch sử như current acceptance.
- Harness mỗi lượt đều duyệt/hash mọi bảng cũ và gọi migration/no-op, kể cả chỉ thay adapter wire. Migration preservation phải là suite riêng khi migration/manifest/DDL đổi hoặc fixture cần nâng, không mặc định là chi phí của mọi repository test.
- Các wrapper pnpm test native đều build contracts/backend(/Connector); sau build thành công không đổi source mà chạy nhiều wrapper sẽ build lặp. Chưa có bộ chọn scope/chứng nhận build revision để quản lý điều này.
- Có8script native riêng lặp parse env/private fixture, role provisioning, SQL snapshot, fault injection, artifact writing. Nên gom hạ tầng test dùng chung; giữ assertion nghiệp vụ tại owning component. Không gom logic nghiệp vụ vào test helper.
- `verify` toàn repo gồm lint/docs/schema/generation/scripts/unit/build/typecheck/smoke; CI còn image jobs/MySQL regression. Đây là release/CI gate, không phải inner loop sau mỗi edit.

30nhóm native mới là **integration với MySQL và injected owner calls**. TLS12nhóm là **transport integration** với synthetic probe. Chúng chưa phải E2E qua UI→service deployments→DB/worker. Không cần full E2E sau mỗi bước của task dài; cần focused tests khi sửa, integration ở đường biên bị tác động và một acceptance E2E khi luồng đã nối. Quy tắc cụ thể: [testing policy](../development/testing-policy.md).

## Cách code từ đây

Một task triển khai kéo dài tới một kết quả người dùng/ops quan sát được; substeps ở checklist task, không tự mở một PLAN/SRC cho mỗi helper/schema wrapper. Chỉ tách task khi có sản phẩm bàn giao độc lập hoặc thay đổi ownership/compatibility đáng kể. Claim một task; chứng minh một runtime path trước khi mở rộng framework chung.

Mỗi component có public facade/typed ports, một nơi compose config+adapters+lifecycle, owner persistence adapter và test scope riêng. Entry point phải sử dụng composition đó; test-only wiring không đủ nghiệm thu service. In-process adapter chỉ ở deploy group baseline; qua process phải API/event đúng owner, không import app khác hoặc đọc DB khác. Shared package chỉ chứa contract/infra thuần và chỉ tách khi có >=2consumer thực cần dùng; không tạo generic platform mới cho giả định tương lai.

Sửa file liên quan thì trình bày TypeScript/TSX dễ review, tách function theo trách nhiệm; không format toàn repo hoặc đại tu UI trong một task rollout. Testkit refactor làm cùng task sử dụng nó, không biến thành một milestone hạ tầng mới kéo dài. Existing security/replay/tenant tests giữ lại; không giảm invariants để đạt tốc độ.

## Lộ trình thay thế

| Mốc | Đầu ra vận hành / giới hạn | Điều kiện xong | Tác động số đo dự kiến, chưa đạt |
|---|---|---|---|
| D1 — Connector ingress local | Kích hoạt bridge mock hiện có tới native backend thật với synthetic binding rõ ràng; không đợi outbound/mTLS/control-plane mới | Connector container/API/worker own DB chạy; delivery hoàn tất thành Chat message; retained restart/outage/dedup + rollback; service manager phản ánh ready | Gói vẫn2/17; local từ1→2/17, chỉ phạm vi ingress |
| D2 — Human outbound composition | Nối các ledger/ports SRC-096…106 thành luồng chạy qua owning HTTP adapters; Identity/Chat vẫn deploy group baseline khi chưa tách dữ liệu | Runtime entrypoints dùng composition; current auth qua biên mạng; result delivery/recovery; một flow Human từ app tới synthetic provider và Chat result | Có thêm capability vận hành; không tự tăng số service. Real provider cần config/gate riêng |
| D3 — Chat extraction | Chuyển Chat ownership/data/registry compatibility thật, không chỉ chuyển folder | Own DB/credentials + image + Chat APIs/producer/local consumers, required compatibility và migration/reconciliation/single writer/rollback/cutover evidence; downstream nghiệp vụ theo owner backlog, không chặn D3 | Chỉ sau evidence mới tính thêm Chat package/local; không hứa3/17trước đó |
| D4 — Workflow/AI chọn theo nhu cầu | Sau D1/D2, chọn deploy boundary có lợi ích scale/failure/release thực; giữ ADR-022/023 | Exact Ready domain/data/runtime scope rồi mới code; không bắt17catalog thành17container | Chưa gán số hoặc lịch vì gate chi tiết chưa Ready |

D1 là task kế tiếp SRC-107. D2 cần thiết kế trust/bootstrap **trong cùng delivery scope** trước runtime wiring, chưa Ready toàn bộ; không mở rộng PKI/control-plane như một dự án độc lập. Giữ và tái sử dụng code registry/TLS, không xóa hay bật bypass. D3/D4 không được đánh Ready chỉ vì D1 hoàn tất. Không deploy production/real provider để làm tăng số.

## D1: exact Ready scope cho SRC-107

Deps PLAN-056, SRC-028, SRC-030, SRC-091 DONE. Dùng [bridge v1/v2 compatibility](../contracts/connector-bridge.md), [contact resolution](../contracts/contact-resolution-local.md), [rollout](../contracts/phased-service-rollout.md), [operations script](../../scripts/connector-operations-test.mjs). Đây là local synthetic activation của chức năng đã có, không nâng nó thành production integration. Một implementation task với5acceptance gates sau; hiện0/5được nghiệm thu cho release candidate mới, evidence lịch sử của các component vẫn giữ.

1. **DLV-01 — Preflight/config:** inventory image/schema/main backend compatibility hiện tại, own DB/runtime/migration roles, explicit reusable synthetic tenant/connection, origin loopback/host-local; không thay binding thật/default grants. Kiểm checksum/no unexpected migrations; current source manifest Connector5 so với retained image/schema2 phải chốt candidate/version trước khi chạy, không tự migrate lúc boot. Nếu cần forward upgrade thì dùng migration đã có và preservation evidence đúng scope, không reset volume. Credential thiếu là config gate được ghi rõ, không sinh quyền rộng/fallback.
2. **DLV-02 — Live local path:** API+worker Connector độc lập, current binding check→contact resolution/cache→deliveries-v2→backend worker→persisted Chat message. Một correlation đi qua actual native backend, không fake HTTP receiver. Đưa synthetic traffic vào luồng local có thể quan sát được, không chỉ thêm health endpoint. Không đổi existing public user behavior hay real connection routes.
3. **DLV-03 — Delivery integrity:** duplicate cùng event không thêm message; conflicting body rejects; tenant/binding mismatch rejects trước forwarding. Controlled worker restart hoặc ACK-loss trên synthetic flow và upstream outage/recovery chỉ bằng proxy hoặc test process, không dừng shared API/MySQL để fault-inject.
4. **DLV-04 — Operations:** service manager/health thấy actual Connector API/worker ready; logs sanitized, queue receipt quan sát được, startup/shutdown lệnh thật và known ownership. Candidate image/version pinned ở evidence; giữ dữ liệu qua container restart.
5. **DLV-05 — Rollback/closure:** drain/disable chỉ synthetic binding, giữ queue/receipt/data, rollback config/image theo bridge compatibility; không rollback backend qua pending v2 payload. Run one composed acceptance on final candidate, liên quan unit/contract/migration checks, cập nhật runbook/tracker/progress. Không tính full Connector outbound/provider/Chat extraction là DONE.

Nếu preflight chứng minh current candidate không tương thích, ghi exact blocker/forward change trong cùng task và giải quyết trước activation; không thêm scope security framework không liên quan ingress. Các luật không cross-service SQL, không sửa migration lịch sử, không dữ liệu production giữ nguyên. Chưa thực hiện activation trong phiên review này.

## Báo cáo tiến độ

Sau mỗi task báo: runtime/capability mới quan sát được; mốc delivery và acceptance đạt/tổng; blockers có ảnh hưởng trực tiếp; gói/local số thật. Unit counts là evidence phụ, không phải thước đo phần trăm. Nếu task dài, báo checkpoint nội bộ theo5gate D1; không chốt task DONE giữa chừng vì một helper pass. Không tự lên lịch nền hay dùng agent song song.

Review acceptance REV-01: source/runtime composition audit có refs; REV-02: phân loại test + evidence lặp và giới hạn thống kê; REV-03: outcome roadmap/Ready D1, deferred D2–D4 rõ; REV-04: tracker/build plan/checkpoint/governance/progress đồng bộ, docs/whitespace check. Runtime checks NOT_RUN ở review, không tái sử dụng old logs thành PASS của phiên này.
