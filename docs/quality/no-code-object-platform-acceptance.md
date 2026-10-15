# No-code Object Platform acceptance — PLAN-028

2026-10-15 · **Full scenarios chưa hoàn tất.** Bounded SRC-073/074 có [acceptance sub-scope/evidence](../tracking/details/SRC-074.md): catalog/config/ERD/record/link/ACL/CAS/upgrade đã test; R2/R3/lifecycle/capacity còn NOT_RUN. Bảng dưới là full test plan, không tự đồng nghĩa PASS. [Plan](../planning/no-code-object-platform.md), [contract direction](../contracts/no-code-object-platform.md). AC-04/M5 và AC-11 extension; không đóng toàn milestone từ docs.

Fixture synthetic giữ lại qua reruns: tenant Alpha/Beta, admin/Human agent/viewer/AI/service actor hiện có hoặc fixture riêng được provision idempotent; Service Request và Service Offering theo keys namespaced, Contact association; quyền temporary phải restore. Không reset DB/Redis.

| ID / slice | Given / When | Expected |
|---|---|---|
| OP-01 / R1 | Admin mở Object & Properties, standard/custom cùng catalog | Stable IDs/owner/capability; immutable standard field không sửa; Deal custom unsupported không nhận write giả |
| OP-02 / R1 | Tạo object + tám field types, valid/invalid/default/required/reserved collision | Typed validation; no per-object table; duplicate receipt cùng IDs; unknown/invalid fail atomic |
| OP-03 / R1 | Field required thêm sau data, index enable/backfill bị crash | Reject unsupported hoặc resumable gated rollout; query capability chỉ ready khi complete; data/index không lệch |
| OP-04 / R1 | Tạo 1:1/1:N/N:N, duplicate/racing links, đảo chiều, Beta endpoint | Cardinality/tenant/CAS enforced; inverse cùng link; domain relation không generic edit |
| OP-05 / R1 | ERD mở từ object, filter/keyboard/mobile và denied objects/fields | Đúng labels/direction/cardinality; table alternative; no hidden nodes/counts/values; overflow explicit |
| OP-06 / R1 | Bật workspace, create/edit/list/filter/view/related list bằng agent | Metadata renderer, current object/field rights; placement không grant; disabled menu không xóa records |
| OP-07 / R1 | Tenant switch/rapid object switch lúc request pending; stale CAS | Không late response leak; input giữ khi409; no silent overwrite |
| OP-08 / R1–3 | Rename label; deprecate field đang có form/report/active run; consumer unavailable | IDs/bindings giữ; dependency impact/gate fail closed; explicit version upgrade; historical manifests retained |
| OP-09 / R2 | Tạo object/field mới sau release và chọn connected Report source | Không thêm per-object source code; stable canonical mapping; mock source/reports không bị chuyển mode |
| OP-10 / R2 | Fixture R1=100 linked O1/O2, R2=50 unlinked; optional/exists/group | Root2/150, matching1/100; không nhân totals; overlap chart reject/explicit semantics; two child collections safe |
| OP-11 / R2 | Save report, widget Dashboard, schema upgrade, missing adapter/field | Reopen/version pin, per-widget readiness; explicit model upgrade; no stale silent rebinding |
| OP-12 / R2 | Snapshot→events handoff, duplicates/out-of-order/tombstones, producer outage | No gap/double facts; watermark/coverage truthful; unavailable policy enforced, no SQL across services |
| OP-13 / R2–3 | Revoke object/field/filter/export/execute quyền sau cache/run creation | Query/aggregate/export/step/resume deny theo current rights; tenant super-admin policy đúng, AI/service không thừa hưởng |
| OP-14 / R3 | Request status chuyển approved, duplicate event và unrelated later update | Enrollment theo pinned before/after; re-entry modes đúng; one action per stable receipt |
| OP-15 / R3 | Flow get related Contact, create Activity/update request, fault/partial write | Owner commands + scalar/collection guards; no standard state bypass; partial receipts/reconcile chính xác |
| OP-16 / R3 | Delay restart, revoke/archive/date edit khi đang wait, publish new version | Persisted timer/pinned run; defined cancel/reschedule; no duplicate side effect; new version không thay old run |
| OP-17 / R3 | Self-trigger/A→B→A, event sequence gap, crash after effect before ACK | Bounded anti-cycle, gap handling, idempotent recovery; no false exactly-once claim |
| OP-18 / release | Retained upgrade/rerun/restart, old M1 metadata/mock reports/M2 runs | IDs/data/rights giữ; migrations checksum unchanged; compatibility and restore evidence |
| OP-19 / release | Hai tenant cùng keys với configured catalog/query/graph limits | Isolation, overflow/timeouts/cancel and pagination; measured capacity budgets trước release |

R1 gate: OP-01…08 có backend/native/MySQL/browser evidence; R2: OP-08…13 + reporting regression; R3: OP-08/13…17 + Workflow recovery regression; release: OP-18/19 và end-to-end R1→R2→R3. Exact scenario sub-scopes, commands/environment/artifacts/failures ghi tại source task evidence. Browser desktop/mobile/keyboard và ERD render phải thực chạy; Mermaid source validation trong design session không thay UI evidence.
