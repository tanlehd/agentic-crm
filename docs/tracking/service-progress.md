# Tiến độ chuyển sang microservices

SRC-109/T01–T09 DONE, Codex 2026-10-27. D3 Human-first 6/6; independent local delivery3/14 (Reporting, Connector, Chat). Legacy Conversation graph retired; main baseline46/crm_chat4, both Chat tenant gates active epoch2 after accepted post-write freeze/forward recovery. Source data and original receipts retained. Production, AI native, live-provider delivery and other-owner business consumers remain outside this acceptance. No commit/push/reset. [Evidence](details/SRC-109.md#t09-legacy-retirement-and-main-cutover--2026-10-27). No D4 task opened.

## Historical evidence

2026-10-23 / CHG-20261023-11, SRC-109/T05 DONE, Codex. Human lifecycle verified12native groups plus8detail regression; original ownership composition regression and30focused cases PASS. Affected builds and generated225/630 PASS. Candidate handler review covers56public operations/66registrations;27catalog entries are explicitly T06/deferred/removed, not silently implemented. Acceptance: docs/quality/t05-human-acceptance.md; lifecycle evidence: artifacts/chat-extraction/continuation-20261022/transition-native-final.log and transition-ownership-regression-final.log. D3 remains2/6, local2/14. Main43/Chat4/Connector5 unchanged; no main restart/migration/cutover/commit/push. Next sequential step T06 consumer integration; no independent Chat runtime yet.

2026-10-23 / CHG-20261023-09/10, SRC-109/T05 Codex: generic record16native/25contract and global connection-disable17native plus outbound12regression PASS. Builds, generated225/630, lint1017 and boundary0added PASS. Evidence artifacts/chat-extraction/continuation-20261022 (record-native-final.log, disable-native-1.log, disable-outbound-regression.log); runbooks docs/development/chat-record-candidate.md and chat-connection-disable.md. Only retained native_connector_test upgraded5→6 with old data/journal hashes preserved; main Connector5, baseline43 and Chat4 unchanged. Handler audit found public lifecycle transition response/open-pending still missing; this existing T05 requirement is the next action before capability signoff. T05 IN_PROGRESS, D3 2/6/local2/14; T06–T09 remain sequential. Working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 dirty; no commit/push or main restart.

2026-10-23 / CHG-20261023-09, SRC-109/T05 Codex: generic Conversation GET/custom PATCH candidate verified16native groups (8custom metadata +8generic),25contract tests, affected builds/lint1014/boundary0added and generated222operations624schemas PASS. Evidence artifacts/chat-extraction/continuation-20261022/record-native-final.log; runbook docs/development/chat-record-candidate.md. Full field-safe envelope, original metadata/replay, source drift, lost ACK, public CSRF/ETag and logout verified. No DDL/main mount. T05 IN_PROGRESS; next global connection-disable composition/capability mapping, then T06–T09. D3 2/6, local2/14.

2026-10-23 / CHG-20261023-06/07/08 candidate verified, SRC-109/T05 Codex: full need composition25native groups PASS (11assessment,2AI-deferred compatibility,12outcome saga), focused27, affected builds/lint1010/boundary0added and generated220operations620schemas PASS. Evidence artifacts/chat-extraction/continuation-20261022/need-composed-native.log and need-composed-review.json. Classification/contribution13regression PASS. Exact Sales receipt table is test-only, main43/Chat4 unchanged; no provider execution or main mount. Next T05 generic hydration/global disable, then T06–T09 sequentially. T05 IN_PROGRESS, D3 2/6/local2/14.

2026-10-23 / CHG-20261023-07 candidate verified, SRC-109/T05 Codex: Human need outcome saga12native groups PASS (artifacts/chat-extraction/continuation-20261022/outcome-native-final.log), actual Lead/Deal, current ACL/CAS/replay, source race, lost ACK/tombstone, pending assessment fence and native logout recovery. Exact reviewed Sales receipt table installed only in retained test schema; main43/Chat4 unchanged. Runbook docs/development/chat-need-outcome-candidate.md. Full composed need/enrich verification underway (CHG-08). T05 IN_PROGRESS; generic hydration/global disable then T06–T09 remain, D3 2/6/local2/14.

2026-10-23 / CHG-20261023-06 candidate verified, SRC-109/T05 Codex: Human need assessment11native groups and27focused PASS, affected builds/lint1005/boundary0added and generated216operations609schemas PASS. Evidence artifacts/chat-extraction/continuation-20261022/need-native-final.log; runbook docs/development/chat-need-candidate.md. Current Human field/pin/CAS/replay, native owners/outages/logout, closed sessions, aliases and bounds verified. No DDL/main mount/provider activation. T05 IN_PROGRESS, D3 2/6/local2/14. Next CHG-07 need outcome saga, then generic hydration/global disable and T06–T09.

2026-10-23 / CHG-20261023-05 candidate verified, SRC-109/T05 Codex: [session funnel](../development/chat-session-funnel-candidate.md)6native groups, focused32, builds/lint1003/boundary0added PASS. Current authorized cohort/Contact, committed cutoff/corrections, public session, owner outage/logout and2001session/20001fact overflow verified. Evidence artifacts/chat-extraction/continuation-20261022/funnel-native-2.log; generated212operations601schemas. No DDL/main routing. T05 IN_PROGRESS, D3 2/6/local2/14. Next Human need assessment/outcome, then generic hydration/global disable before T06–T09.

2026-10-23 / CHG-20261023-04 complete candidate sub-scope, SRC-109/T05 Codex: [classification and contribution history](../development/chat-classification-candidate.md) verified9classification +4history native groups; session9/notes8 regression, focused27, affected builds/lint1000/boundary0added and generated209operations594schemas PASS. Source-specific Activity/Lead/Deal ACL, outages, historical owner/coverage and50row cursor/native public route verified. Evidence contributions-native-final.log, session-classification-regression.log, notes-classification-regression.log under artifacts/chat-extraction/continuation-20261022. No DDL/main mount. T05 IN_PROGRESS, D3 2/6/local2/14. Next active sub-scope CHG-20261023-05 session funnel; need assessment/outcome, generic hydration/global disable and T06–T09 remain required.

2026-10-23 / CHG-20261023-04, SRC-109/T05, Codex: [classification candidate](../development/chat-classification-candidate.md) verified9native groups, focused27, builds/lint997/boundary0added PASS. Current source also adds contribution hydration; its native acceptance remains IN_PROGRESS. Classification preserves metadata pins, session field policies, local CAS, lost ACK and legacy replay. Evidence artifacts/chat-extraction/continuation-20261022/classification-native-final.log. No DDL/main routing. T05 remains IN_PROGRESS, D3 2/6/local2/14. Next complete contribution history, then need/funnel/generic hydration/global disable; T06 includes CRM metadata writer barrier and source producer integrations.

2026-10-23 / CHG-20261023-03, SRC-109/T05, Codex: [session process/progress candidate](../development/chat-session-progress-candidate.md) verified 9 native groups; affected builds, focused39, lint995, boundary0added and generated204operations582schemas PASS. Preserves process pins, progress CAS, historical corrections/owner snapshots, native Contact/field/session denial, public CSRF/ETag and legacy receipt replay. Evidence: artifacts/chat-extraction/continuation-20261022/session-native-final.log. No DDL/main routing change. T05 remains IN_PROGRESS, D3 2/6/local2/14. Next: classification/contribution, need/funnel, generic hydration/global disable before T06–T09.

2026-10-23 / CHG-20261023-02, SRC-109/T05: [Activity candidate](../development/chat-activity-candidate.md) verified10feed +5notification native groups, plus retained feed repeat and notes8read/13write regression. Chat-owned index/cursor/message hydration, CRM/Workflow owner HTTP, current policy/logout fences,2000hidden scan/100row reply, durable inbox dedup/gaps/quarantine and source binding all PASS. Builds/focused39/lint991/boundary0added and generated201operations575schemas PASS. Evidence: artifacts/chat-extraction/continuation-20261022/activity-notifications-native.log. No DDL/main mount. T05 remains IN_PROGRESS, Codex; D3 2/6/local2/14. Next: session/classification/process/progress/need and generic hydration/global disable; T06 owns relay/replay, generic CRM update/archive producer switch and old consumer removal.


## Snapshot audit ngày 2026-10-22 — lịch sử, xem trạng thái 2026-10-23 ở trên

CHG-20261022-02, Codex2026-10-22: own-schema Human outbound candidate verified (9 native groups, 6 history regression groups, 54 focused tests, affected builds). OPS-20261022-01 startup mismatch CLOSED after schema43-compatible D2 rollout, public synthetic sent and restart readiness. Evidence: [outbound candidate](../development/chat-outbound-candidate.md). T05 remains IN_PROGRESS, D3 2/6/local2/14; continue remaining recovery/workspace/session/hydration, then T06–T09 sequentially. User authorized completion through local cutover after all gates; earlier stop/thread instructions are superseded. No commit/push or production deployment.

CHG-20261022-01, Codex. Đối chiếu ADR-017/027/028, [catalog](../services/README.md), [repository map](../architecture/repository-map.md), [tracker](tasks.md), code/Compose/Docker và artifacts nghiệm thu còn lưu. Catalog hiện hành có **14 ranh giới**. **Reporting và Connector là 2 service có packaging/local delivery evidence**; Chat chưa được tính là service đã tách. 2/14 là số ranh giới có delivery độc lập trong phạm vi đã nghiệm thu, không phải phần trăm sản phẩm hay khẳng định toàn bộ domain đã chuyển.

| Phạm vi | Kết quả đã có | Còn thiếu / giới hạn |
|---|---|---|
| Reporting | Runtime/image/schema riêng, local delivery SRC-090/091; probe hiện tại HTTP 200 | Producer/BFF còn tích hợp baseline; không suy thành production |
| Connector D1 | SRC-107 DONE, 5/5 gates; own storage, ingress mock, recovery/rollback | Chưa real provider; Channels/connection/referral còn phần baseline |
| Human outbound D2 | SRC-108 DONE, 6/6 gates theo evidence lịch sử; owner HTTP và durable coordinator | Identity/Chat vẫn cùng baseline image/data; worker đã sửa bằng image schema43 và nghiệm thu lại, xem evidence CHG-02 |
| Chat D3 | SRC-109 IN_PROGRESS, **2/6 gates**; T01–T04 DONE, T05 partial | T05 send/workspace/session và T06–T09 chưa đạt; chưa chuyển main traffic |
| Workflow / AI D4 | Đã thống nhất một Workflow owner; validator là library | Chưa scoped/Ready delivery D4; PLAN-024B…E còn mở, native AI deferred |
| Các owner còn lại | Có responsibility/source map | Phần lớn còn baseline; Marketing có storage/scheduler library, Ticket Draft; chưa có evidence runtime độc lập |

### Chat đang ở đâu

D3-01 thiết kế và D3-02 owning storage đã đạt. T04 có Human ownership/authorization/assignment acceptance. T05 đã có history, canonical references, ingress organic/referral, terminal-denial, Human outbound/recovery và read-state/snooze/tag-link candidate trên own storage qua owner HTTP. Evidence mới của CHG-20261022-02 nằm trong artifacts/chat-extraction/continuation-20261022; số nhóm chỉ mô tả từng candidate, không phải hoàn tất extraction.

T05 đã có Human D2 intent/job/claim/result/coordinator candidate trên Chat DB, đã kiểm thử12 nhóm gồm recovery; catalog10/inbox9 native groups và workspace11 regression đã đạt; lineage2focused/4native đạt nhưng không quảng bá handler chưa có. Detail8/history6, scoped Channels reference/status11 và inbox9 repeat đã đạt. Queue/sidebar11 native groups, detail8/inbox9 regression, focused57 đã đạt theo [evidence](../development/chat-queue-candidate.md); legacy list/Channel options7 và notes read8/write13 native groups đã đạt theo [notes evidence](../development/chat-notes-candidate.md); còn activity notification/hydration, session hydration/writers, generic hydration và global connection-disable composition. Sau T05: T06 consumers → T07 image/API/worker → T08 composed parity → T09 single-writer local cutover/rollback. Chỉ khi T09 đạt mới tăng số service lên 3/14. AI native vẫn deferred theo Human-first; không khôi phục Chatflow đã retire.

Source xác nhận services/chat chỉ có build/typecheck, chưa start/main/Docker target. Compose D2 Identity/Chat/coordinator dùng backend image. Boundary check mới PASS: 273 dependency edges, 0 added, 10 removed so với baseline; đây là kiểm không tăng coupling, không phải đã loại toàn bộ coupling. R1 đổi path sang services/core-baseline và packages/workflow-definition đã xong; R2 tối ưu build/CI chưa được đóng.

### Runtime tại thời điểm audit — đã sửa lỗi D2 theo CHG-02

Docker: 9 container healthy và 1 D2 worker restarting/unhealthy. Host API3001/worker3002, Reporting3004, Connector3010/3011 readiness HTTP 200; monitor3020 HTTP 200; web18080 không truy cập được. Private endpoints3012/3013/3014 trả401 khi gọi không credentials; Docker health của chúng healthy, không gọi401 là service failure.

Worker agentic-crm-human-outbound-worker-1 exit1 và lặp OUTBOUND_START_FAILED. Read-only probe trong Chat container **cùng image** xác nhận manifest42, database journal43, validateJournal(..., true) không tương thích. Worker entrypoint kiểm chính journal này trước khi listen. Đây là bằng chứng lệch image/schema cần xử lý; chưa chạy chẩn đoán trong worker đang restart hoặc thử image mới, nên chưa khẳng định đây là lỗi duy nhất. D2 historical DONE giữ nguyên; current outbound readiness không đạt. Không dùng snapshot cũ “10 healthy” để báo hiện tại.

Theo dõi vận hành **OPS-20261022-01 CLOSED (CHG-02)** trong audit này, cần đồng bộ D2 image với schema43 theo runbook hiện có và nghiệm thu lại readiness + Human synthetic send/recovery trước khi coi outbound đang phục vụ bình thường. Phiên audit không rebuild/restart/deploy hoặc sửa database; không đánh mất receipt/unknown state. Đây là issue trong delivery hiện có, không claim thêm source task.

### Evidence và bước tiếp theo

Evidence phiên audit: artifacts/microservices-audit-20261022 (boundary.log, runtime.json, schema-compatibility.json, docs.log, whitespace.log, source-preservation.json). Môi trường Windows PowerShell, project Node24.21.0; main HEAD21eaadd0e8d1e9163bfb7721390c2e6b385b1b42, dirty working tree với 734 status entries trước sửa tài liệu. Không coi HEAD là revision đại diện toàn bộ code hiện tại. Unit/native/E2E/image acceptance NOT_RUN; chỉ kiểm tài liệu, AST boundary và read-only runtime/schema metadata.

D2 startup repair đã nghiệm thu readiness/send/restart. Next feature action là hoàn thiện recovery và workspace/session/hydration T05 trên Chat-owned storage; T06–T09 dependency-gated. Không cần đổi quyết định kiến trúc hoặc mở task source song song.

## Lịch sử đến 2026-10-21 — giữ nguyên evidence, không dùng làm hiện trạng

Các số17, mô tả Chatflow cần migration và trạng thái “next/current” dưới đây phản ánh thời điểm ghi; bị thay thế bởi phần hiện hành bên trên. Chatflow đã retire theo CHG-20261021-08; catalog14 không thay kết quả test cũ.


**ADR-027 /2026-10-21:** Một [Workflow service](../services/workflow.md) định nghĩa mọi business automation, gồm conversational flows và routing. API/engine/worker/editor là components cùng owner/schema; Chatflow không còn service/module riêng. Target catalog14ranh giới, số service đã triển khai không tăng. Source legacy còn cần migration theo plan; các số2/17 và mô tả decomposition trước đây bên dưới là lịch sử.


2026-10-21 CHG-20261021-03: T05 [terminal-denial classification](../development/chat-ingress-denials.md) verified28native/63focused using native owner verdicts and Chat failure CAS/audit. No new deployment or schema; D3 remains2/6/packages/local2/17. D2 send/workspace/hydration and connection-disable compatibility pending; no Contact archive saga.

2026-10-21 CHG-20261021-02: T05 [referral candidate](../development/chat-referral-saga.md) verified21native groups/58focused cases with durable Channels evidence and real Chat Message/session effects. Candidate only, no deployment/count increment; D3 remains2/6, packages/local2/17. Remaining T05 gates unchanged.

**Current2026-10-21:** T01–T04 DONE; T05 IN_PROGRESS with [organic Message/session processor](../development/chat-ingress-processor.md) verified. Referral/touchpoint saga and other writers remain. No new deployment; D3 still2/6/packages-local2/17.

**Current2026-10-20:** T01–T04 DONE; T05 IN_PROGRESS with history, references and [ingress accept/read candidate](../development/chat-ingress-candidate.md) verified. Processor Message/session, other writers and runtime cutover remain pending. D3 stays2/6, packages/local2/17. Earlier T04 IN_PROGRESS notes below are historical.

**PLAN-058 /2026-10-19:** [17catalog entries thuộc nhóm nào và image thực tế](../planning/deployment-groups-review.md). D4 là vùng lựa chọn Workflow API/Core, Chatflow, AI Runtime, chưa Ready/chưa có ETA; không phải service thứ4. Báo cáo chính: D1 5/5, D2 6/6, D3 2/6 (T01–T03 DONE; T04 candidate IN_PROGRESS), D4 chưa scoped. Packaging/local vẫn2/17; bốn nhóm image cấu hình web/core/Connector/Reporting không phải4/17extracted. Không dùng2/17làm phần trăm hoàn thiện sản phẩm.

[PLAN-057](../planning/chat-extraction-execution.md) chia phần còn lại của Chat thành9thread có dependency/acceptance/handoff. Trạng thái từng bước ở tracker; T01/T02/T03 hoàn tất, D3-01/02 đạt2/6; vẫn2/17service thực tế. Chỉ T09 đạt đầy đủ main cutover mới nâng3/17.

SRC-108/D2 DONE: **6/6 cổng đã kiểm chứng**, gồm native public Human command/worker, phục hồi crash/logout, unknown→sent và main Alpha local activation/restart/rollback/reapply. Connector phục vụ thêm outbound synthetic; không tính Identity/Chat baseline containers thành service đã tách. [Evidence](details/SRC-108.md) · [Runbook](../development/human-outbound-local.md).

SRC-109/D3 đang active **2/6**: T01/T02/T03 DONE. Owning DB test59bảng/43FK,2.136dòng/restore;20nhóm native và89focused PASS. [Evidence](details/SRC-109.md#t03--retained-storage-complete). T04 IN_PROGRESS: Chat local candidate và native Identity Human/role barrier có kiểm thử; full acceptance chưa đạt. Main42 và số service2/17 không đổi; owning test DB không được tính là service đã deploy.

Sau D1/SRC-107,2026-10-18. Nguồn chuẩn: [tracker](tasks.md), [catalog](../services/README.md), [topology](../system/deployment-topology.md). Mẫu số17 gồm16ranh giới trong catalog chính và Marketing; External API facade không phải service thứ18. ADR-023 cho phép một số ranh giới tiếp tục cùng deploy group.

| Thước đo | Hoàn tất / tổng | Điều kiện |
|---|---|---|
| Ranh giới kiến trúc cấp cao |17/17 | Đã xác định trách nhiệm; chưa đồng nghĩa thiết kế chi tiết Ready |
| Gói độc lập đã test container |2/17 (11.8%) | Reporting, Connector |
| Service độc lập phục vụ local |2/17 (11.8%) | Reporting và Connector mock ingress + Human outbound synthetic qua native app; chưa real provider |
| Production |Chưa xác minh | Không suy từ local |

Không tính Next.js, MySQL/Redis, thư viện hoặc bảng riêng thành service đã deploy. Không tính phần trăm toàn hệ thống từ số task DONE vì backlog chi tiết còn đang phân rã.

| Task | Phần đã chứng minh | Gói độc lập | Phục vụ local |
|---|---|---|---|
| [SRC-099](details/SRC-099.md) | Native Human session/account/ACL locks |2/17 |1/17 |
| [SRC-100](details/SRC-100.md) | Native Identity grant/consume/revoke |2/17 |1/17 |
| [SRC-101](details/SRC-101.md) | Native Chat owner claim và Identity round trip |2/17 |1/17 |
| [SRC-102](details/SRC-102.md) | Ba owning repositories, Connector DB riêng, kiểm thử mất ACK/thu hồi quyền |2/17 |1/17 |
| [SRC-103](details/SRC-103.md) | Chat nhận kết quả sent/unknown, audit/outbox/coverage nguyên tử |2/17 |1/17 |
| [SRC-104](details/SRC-104.md) | Native workload registry, xoay/thu hồi chứng thư và quyền tenant hiện hành |2/17 |1/17 |
| [SRC-105](details/SRC-105.md) | TLS1.3 thật + registry MySQL, thu hồi quyền trên cùng keepalive socket |2/17 |1/17 |
| [SRC-106](details/SRC-106.md) | Full Chat claim proof wire và native Identity inspector, giữ tương thích |2/17 |1/17 |
| [SRC-107](details/SRC-107.md) | D1 5/5: actual Connector ingress→Chat, outage/lost ACK/restart/rollback; own image/schema5 |2/17 |2/17 |
| [SRC-108](details/SRC-108.md) | D2 6/6: public Human→durable coordinator→owning HTTP→synthetic sent; main Alpha rollout/restart/rollback/reapply |2/17 |2/17 |

**D1 hoàn tất5/5:** [SRC-107](details/SRC-107.md), local ingress phục vụ và rollback verified. Next [PLAN-056 D2](../planning/service-delivery-reset.md): Human outbound composition tới runtime, exact trust/bootstrap/owning HTTP scope trước code; D3/D4 vẫn gated. Legacy monitor3020 chưa nạp worker probe; Docker/probe/current registry snapshot ready, xem [status command](../development/connector-local.md).

Báo cáo sau task: runtime/capability mới, gate đạt/tổng của mốc, blocker trực tiếp, rồi số gói/local. Số test là evidence phụ.17catalog không phải mẫu số phần trăm hoàn thiện toàn hệ thống. [Testing policy](../development/testing-policy.md) không yêu cầu full E2E mỗi step. PLAN-056 là review-only, không làm tăng tỷ lệ.
