# Report Builder — acceptance và golden fixtures

PLAN-0272026-10-14: bounded Dashboard/Reports redesign has [DW-AC01…14](dashboard-workspace-acceptance.md), feature/component/data/API traceability and legacy conversion gates. Review documents only, runtime NOT_RUN; does not close RB-13 or SRC-061 global filters/comparison/sharing.

SRC-059 lifecycle phase2026-10-12: [evidence](../tracking/details/SRC-059.md) adds13 MySQL run/race/reconnect/recovery/preservation groups and12 native groups (8 preview+4 runs). RB-10/16 caller-driven durable run sub-scope verified,248 unit total PASS. OS kill/restart,automatic worker,drilldown,remaining event-role/cost metrics and browser UI still open; full RB-MOCK not closed.

SRC-059 native phase2026-10-12 adds8 MySQL/native HTTP groups for RB-01/10 mock sub-scope: cookie/CSRF/membership,explicit run/source/export grants,tenant-complete synthetic scope,private signed admission/cache/CSV and live permission/session revocation before delivery.243 unit total PASS. [Evidence](../tracking/details/SRC-059.md). Connected source field/row ACL, durable run/drilldown and browser/UI still open; broader RB IDs not closed.

SRC-059 internal query phase2026-10-12: [evidence](../tracking/details/SRC-059.md) verifies executable G1/cohort/dedup/pivot/provider profile/currency/null/timezone/authorization-port/cache/CSV/extension sub-scopes of RB-03/04/05/06/08/09/10/15.34 query unit cases plus7 MySQL groups PASS; full RB IDs remain open. Native query/source ACL, event-role Team/Agent, durable runs/drilldown, joined cost/outcome metrics, DST transitions and browser UI are not covered by this phase. Native draft tests below are separate.

PLAN-022A · 2026-10-10. Design scenarios cho AC-11/RB-MOCK và CRM-BASE-07/RB-CONNECTED; full builder scenarios remain NOT_RUN except the scoped evidence below. [Plan](../planning/report-builder.md) · [Semantic definitions](../data/reporting-semantic-model.md) · [UX](../ux/report-builder.md). Source tasks chỉ DONE khi evidence thật; M2 metric fixture PASS cũ không đóng các gate mới.

SRC-063 implements/tests only the static semantic sub-scope of RB-01/03/05/06/09/10/12/15: registry, input/field access, profile/join/encoding rejection and descriptor extension. [Contract](../contracts/reporting-semantic-kernel.md). This does not execute golden dataset G1, MySQL/row ACL, live source, query/visualization/dashboard or API tests; the runtime matrix below remains NOT_RUN.

SRC-057 tests only private definition persistence/native authorization sub-scope of RB-01/10/12/16: MySQL isolation, own/all draft ACL, real native cookie/CSRF/seat/role, CAS/idempotency, pinned catalog/edit history, expiry rollback and warm migration/reconnect. [Exact acceptance/evidence](../tracking/details/SRC-057.md). 17 MySQL/HTTP groups PASS; no G1 KPI, source-row/field ACL, query/chart/publish/export or browser evidence. Full RB-MOCK and AC-11 remain open.

## Golden dataset G1 — kết quả cần chứng minh

SRC-058 implements RB-02 for synthetic snapshots only:10 real MySQL groups and18 unit cases verify paging/replay/checkpoint/tombstone/CAS/preservation/extension. G1 raw counts, money/profile totals and event-derived latency cross-checks PASS ([evidence](../tracking/details/SRC-058.md)); no generic query execution, source ACL, frontend or full RB-MOCK completion claim.

Reusable synthetic tenants Alpha/Beta, fixture namespace riêng; seed idempotent và preserve data/user đã có. IDs chỉ là aliases trong tài liệu. Account USD/UTC và shared external account replica ở tenant Beta để bắt tenant leak; cùng provider IDs nhưng tenant keys khác. Kỳ acquisition 2026-09-01…2026-09-08 UTC, as_of 2026-10-08, outcome histories đầy đủ.

| Session | Thread / Contact | Source | Leads | Won Deals trước as_of |
|---|---|---|---|---|
| S1 | C1 / P1 | Ad A / Campaign X | L1, L2 | D1 từ L1=100 USD; D2 từ L2=100 USD |
| S2 | C2 / P2 | Ad A / Campaign X | Không | Không |
| S3 | C1 / P1 | Ad B / Campaign Y | L3 | D3 từ L3=200 USD |
| S4 | C3 / P3 | Ad B / Campaign Y | Không | Không |
| S5 | C4 / P4 | Organic Page O | L4 | Không |

Ad A unbroken spend100 USD/impressions1.000/clicks100; B spend50/impressions500/clicks25; C spend25/impressions250/clicks25 nhưng không có session. A có age rows spend60+40 và region rows70+30; các query datasets này không cộng với unbroken totals. Một Creative tái sử dụng bởi A/B và có2 media links; session/message/CRM associations nhiều hàng để bắt fan-out. Một quan sát A cũ bị thay bởi revision hiện tại; không cộng cả2. Clicks ở fixture này là all clicks, không dùng làm link clicks.

Expected complete authorized population:

- All:4 distinct threads,5 sessions,4 engaged Contacts,4 Leads,3 won Deals,400 USD won value. Hai Deal cùng100 đều được tính; SUM(DISTINCT amount) sẽ sai.
- Paid:4 sessions,3 Contacts,3 Leads; sessions with Lead=2, with Deal=2, with Won=2; cả3 session conversion rates=50%. S2/S4 không biến mất.
- A:2 sessions/2 Contacts/2 Leads/2 won Deals/200 USD; B:2 sessions/2 Contacts/1 Lead/1 won Deal/200 USD. Tổng paid Contacts=3, không4. S1 và S3 cùng Conversation/Contact nhưng nguồn khác.
- Campaign totals chứa cả Ad C spend25 và0 sessions. Paid spend175, impressions1.750, clicks150; CTR=150/1.750×100; CPC=175/150; CPM=100; không average các ratio theo Ad.
- Paid cost/session=175/4=43,75 USD; cost/CRM Lead=175/3; cost/won Deal=175/3; won value/spend=400/175. Tính decimal chính xác trước rounding. Organic S5 không được nhận paid spend.
- Age/region của A chỉ có provider metrics; CRM lead/won metric bị từ chối. Không xuất A spend300 từ base+age+region.
- Latency subfixture ba responded sessions [10,30,50] giây: p50=30, p95=48 theo continuous percentile; hai unanswered sessions count2, không thêm zero latency. Queued/note/unknown messages không là response.

Unknown-source, second currency, denied field, late outcome và partial provider coverage là các variants độc lập với baseline trên; không trộn làm expected values mơ hồ.

## Scenario matrix

| ID / task | Scenario | Expected / evidence cần có |
|---|---|---|
| RB-01 / 057 | Tenant A/B cùng external IDs; missing/forged tenant; own/team/all, field deny | Không leak definitions/catalog/rows/counts/filters/cache; native authorization negative MySQL/HTTP tests |
| RB-02 / 058 | Snapshot paging/retry/duplicate/out-of-order revision, checkpoint restart, tombstone và rebuild generation | Exact state canonical;0 duplicate spend/outcome; no truncate/reset live generation; test restart/replay |
| RB-03 / 059 | G1 many messages/Leads/Deals/associations and optional joins | Expected counts/value/cohort rates đúng; equal-value Deals không bị loại; explain grain checked |
| RB-04 / 059 | Same Contact ở2 Ads; pivot/subtotals/top-N/Other/distinct và percentile | Grand totals recompute underlying set; không sum distinct, average rates hoặc p95; compare independent oracle |
| RB-05 / 059 | Base/age/region/multiple revisions; mixed/suppressed/missing coverage | Chỉ1 profile/revision; missing≠0; reject joint marginals và CRM demographic metrics |
| RB-06 / 059 | Media N:M, Creative reuse, post missing/multiple mapping; unknown ad late resolution | Không allocate conversion/spend qua assets; exists filter hợp lệ; unknown retained; no Sales source rewrite |
| RB-07 / 059 | Received owner A, responded B, qualified C; agent đổi team; Human/AI/note/queued | Metric role đúng event/history; current owner không sửa lịch sử; p50/p95 và pending đúng G1 |
| RB-08 / 059 | Activity vs acquisition; late wins; equal horizon; UTC/DST/account-local dates | Closed-date win không tự là acquisition return; cohort denominator/as_of đúng; reject daily spend rebucket sai timezone |
| RB-09 / 059 | USD+VND, denom0, negative/late timestamps, missing spend | Currency split hoặc reject; null≠0; no float money; cost ratio unavailable với missing/incompatible scope |
| RB-10 / 059 | Revocation sau queue/before delivery/download; lower Sales scope than Chat; denied filter/metric input | Fail closed; không dùng hidden outcome như0; field deny enforced cả count/drill/export; cache auth revision checked |
| RB-11 / 060 | Blank→sources→related objects→X/Y/series→filter→preview→pivot→save/template | Ít nhất3 structurally khác reports trên cùng engine; đổi cấu hình đổi backend result, không static KPI |
| RB-12 / 060 | Archived/renamed field, new metric version, concurrent edit, old slow response | Stable IDs; no silent filter loss/auto-upgrade;409 diff; late preview không overwrite; draft preserved |
| RB-13 / 061 | Dashboard widget report version, parameter mapping, cross-filter, period comparison và partial error | Filters scope rõ, unsupported indicator; pin versions; per-widget freshness; viewer permissions; clear/back đúng |
| RB-14 / 060–062 | Keyboard flow, mobile320px/tablet/desktop, zoom200%, chart table fallback | Browser screenshots + assertions; no inaccessible drag-only flow/overlap; manual visual QA, actual evidence |
| RB-15 / 062 | Add custom numeric field + synthetic object/source qua descriptors/adapters | Không sửa builder/renderer/query switch theo domain; old report hash/meaning ổn; unsupported capability clear |
| RB-16 / 062 | Cold/warm migrate/no-op, existing synthetic data, restart, quotas/timeouts/cancel/CSV formula injection | Preserve fingerprints/counts; no history edits/reset; limit errors explicit; timings/resource use recorded, no invented PASS |
| RB-17 / 049 | Bind connected CRM/Marketing, admitted Ads, shared account/Page revoke, live source unavailable | Reconcile expected source counts/value by scope/revision; no foreign Ads/parent totals; no mock/real mixing; real Meta claim chỉ với riêng evidence |

## Gate tổng hợp

RB-MOCK: SRC-057…062, schema/API contract tests, unit semantics/query, MySQL isolation/restart/preservation, browser/report/dashboard tests và catalog extension proof. Full AC-11/M5 không tự đóng vì scheduling/advanced connectors/warehouse chưa scope. Mock success không đóng RB-17.

RB-CONNECTED: SRC-049 sau Marketing producers và RB-MOCK, field-by-field coverage manifest, producer revision/reconciliation and ACL tests. Dữ liệu source thiếu timestamp/owner/content mapping khiến metric unavailable cho binding đó, không skip test rồi ghi fully supported. Live Meta và synthetic HTTP integration ghi thành hai evidence groups riêng.

Evidence record gồm exact command, pinned runtime/env, fixture namespace, expected/actual, initial failures/fixes, artifact path và working-tree/commit thật. Fixture/user/data được giữ để tái sử dụng. Không chạy/reset persistent DB chỉ để làm đúng expected counts; test theo namespace/baseline deltas.


SRC-064/PLAN-022H scopes early RB-11/12/14 UI over delivered APIs: discovery rights, compatible config, pinned preview, server pivot totals, save/reopen/CAS conflict, CSV, late response and responsive/keyboard checks. Evidence pending; full acceptance unchanged.

SRC-064 implementation evidence: [early UI](../tracking/details/SRC-064.md) covers source/model configuration, pinned preview, server pivot totals, private draft/reopen/CAS conflict, CSV, late response, source revocation and responsive native controls through a browser-only proxy to the isolated native fixture.14 browser groups PASS. Normal local Alpha activation pending explicit role approval; full RB-MOCK remains open.

## Field summaries extension — 2026-10-12

CHG-20261012-07: [bounded Ready contract](../contracts/reporting-measures.md) adds field/aggregation authoring and registered COUNT/AVG/MIN/MAX on existing numeric populations. Distinct, missing-data policy, formula dependencies and recomputed totals are explicit. Existing26 descriptors remain unchanged; no schema migration, freeform formula editor or new source grain.

## Common visualization extension — 2026-10-12

CHG-20261012-08: [Ready scoped contract](../contracts/reporting-visualizations.md) adds horizontal bar, stacked bar, area, pie/donut and descriptor-driven quick-start presets to SRC-064. Trend uses temporal line/area, composition requires additive measures and complete nonnegative partitions, exact table remains available. Existing definitions stay compatible; no database migration. Published reusable templates/dashboard/period comparison remain separate.

SRC-064 common-visual evidence: RB-11/12/14 bounded sub-scope now verified across ten native-backed displays, 14visual browser groups, save/reopen/CSV and unobscured320px chart, plus compiler/rendering negatives. [Evidence](../tracking/details/SRC-064.md). Full RB-MOCK remains open; normal Alpha activation and reusable published templates/dashboard/comparison are separate.
