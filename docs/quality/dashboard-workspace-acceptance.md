# Dashboard workspace — acceptance và traceability

**Implementation evidence 2026-10-14:** [SRC-071](../tracking/details/SRC-071.md) verifies11native/MySQL groups; [SRC-072](../tracking/details/SRC-072.md) adds real Alpha browser and362unit checks. The original design-phase NOT_RUN statement below is historical. Runtime evidence covers DW-AC01–10/12–14 representative scenarios. DW-AC11 has actual320/390/768/1280/1440 screenshots and keyboard/pointer controls; exhaustive assistive-technology/contrast/zoom audit remains NOT_RUN. No claim that every combination in this matrix ran. Full scope limits and artifact references are in evidence.

PLAN-027 · 2026-10-14 · design-only. [Feature](../planning/dashboard-workspace.md), [components](../ux/dashboard-workspace.md), [data](../data/dashboard-workspace.md), [contract](../contracts/dashboard-workspace.md). **Mọi runtime scenario dưới đây NOT_RUN; chưa có implementation trong PLAN-027.** Evidence cũ SRC-070 không chứng minh API/menu/template/picker mới.

| ID / feature | Components / data | Scenario và expected | Evidence gate |
|---|---|---|---|
| DW-AC01 / F01,F07 | C01/02/03/10; dashboard/report summaries | Hai menu riêng; home không tự run; direct link/reload/back đúng; dashboard không xuất hiện trong report picker/library; organic route giữ nguyên | Native browser, history/navigation assertions |
| DW-AC02 / F02 | C02/06/07; head/version | Blank create name validation, private owner,0widgets, empty CTA; double click/lost ACK cùng key chỉ1dashboard | MySQL/native/browser |
| DW-AC03 / F03 | C04/05; manifest/recipes/receipt | Search/category/card counts từ manifest; preview/select1..12; bind đúng source; thành công tạo Nreports+1dashboard; failure bất kỳ rollback toàn bộ; retry IDs ổn định | Schema/unit, native MySQL forced failure/race |
| DW-AC04 / F05 | C09/13; ReportVersion refs | Search/paging multi-select; exclude dashboard/archived; invalid report lý do rõ; duplicate report2widgets ID khác; add giữ pinned version đã chọn dù latest đổi | Native browser/API concurrency |
| DW-AC05 / F09 | C08/13; report version/generation | Edit report không đổi dashboard; explicit upgrade diff/save chỉ đổi widget chọn; active generation đổi báo unavailable, không latest fallback; đổi snapshot không đổi report time | Query/native + browser |
| DW-AC06 / F06 | C07/15; immutable layout | Move/resize keyboard/pointer; no overlap/out-of-bounds; Save/Cancel/reload giữ exact layout; duplicate title không làm mất widget; mobile resize không ghi desktop layout | Unit aggregate + browser pointer/keyboard |
| DW-AC07 / F04,F05 | C08/09/14; tenant/owner/source | A/B same report names; own/all; tamper tenant/report/version/widget; dashboard read không grant report/source; revoke before delivery/CSV clears data; usage count không leak inaccessible dashboards | Native HTTP/MySQL signed auth negatives |
| DW-AC08 / F04 | C08/14; query result epoch | Refresh <=2inflight; delay old result rồi đổi tenant/dashboard/version; stale ignored; one ordinary widget fail → partial; auth fail → all cleared; null/error không0 | Browser controlled responses + native authority tests |
| DW-AC09 / F07,F08 | C10/11/12; semantic definitions | Report library→viewer→edit→save→picker; ten supported chart types/table fallback, summary đúng selected metrics; backend result đổi theo config; CSV current rights; no raw detail tab giả | Existing report regression + native browser |
| DW-AC10 / F09 | C15; CAS/receipt/audit/outbox | Hai tab same revision chỉ một Save; failed save giữ draft; idempotency payload conflict; same key concurrent create; archive/restore revision vs edit version; no delete report on remove widget | Persistent MySQL race/rollback/reconnect |
| DW-AC11 / F01…09 | all UI | Keyboard end-to-end không drag; focus trap/Escape/return;320/390/768/1280/1440px và zoom200%; no page overflow; contrast thực đo; chart accessible table | Screenshots visually reviewed, a11y/manual results |
| DW-AC12 / F10 | conversion + six tables | Forward migration/no-op preserves old fingerprints; legacy JSON bytes unchanged; explicit convert yields report refs same definitions/pins/order/results; retry same version không duplicates; no inbox reseed/DB reset | MySQL preservation + actual Alpha legacy browser |
| DW-AC13 / F03,F04 | manifests/runtime provenance | Hai DEMO templates preserve scenario metrics/populations/time/currency; không seed/call Meta; zero vs null/coverage rõ; card không dùng static totals | Compiler/golden query + UI provenance assertions |
| DW-AC14 / F07,F09 | usage/lifecycle | Usage count distinct active authorized dashboards/latest content only;2widgets same report count1; old versions/archived/foreign not counted; report archive displays unavailable widget, restore rechecks rights | MySQL/API bounded query/EXPLAIN |

## Design verification của PLAN-027

- Bốn reference screenshots mapped to explicit screens; sources hiện tại được đọc và discrepancy recorded.
- Features có component/data/API/AC mapping; review-level status khác implementation Ready.
- Report/version/generation/owner/tenant và template-vs-dashboard semantics không nhập nhằng.
- Filled table designs gồm six own-schema tables, tenant keys/FKs, permissions/grants, lock/CAS/replay, retention, migration/rollback/tests; no physical tables claimed.
- Local links/Markdown fences/JSON examples/task dependency DAG và whitespace kiểm bằng repository commands. Kết quả thực ghi trong [PLAN-027 evidence](../tracking/details/PLAN-027.md).

## Điều kiện DONE sau này

SRC-071 chỉ DONE khi backend/table/API/template/conversion scenarios PASS bằng retained MySQL/native evidence và warm preservation; source/grants trong repo đủ, executable contract sync. SRC-072 chỉ DONE khi UI native flow qua backend thật, report regression, screenshots inspected, dirty/version/authority races/keyboard/mobile verified. Không dùng API interception/mocked successful response để claim actual Alpha integration.

No full SRC-061/RB-13 completion từ bounded redesign: global parameter mapping, cross-filter, comparison và sharing còn task riêng. No production/live integration claim, no fake SLO/performance PASS. Mỗi evidence có exact command/environment/expected/actual/artifact và working-tree reference; full broader test suite NOT_RUN nếu không chạy.

## Publication hardening — 2026-10-15

DW-AC09 includes opening an unvalidated/future report shape: show safe unavailable UI, never crash or execute, preserve stored bytes. DW-AC08 includes delayed usage/target modal reads after close or viewer navigation: ignore late responses, clear modal state when report changes. These are defect corrections within existing scope; regression evidence follows in SRC-072.
