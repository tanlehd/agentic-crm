# Kế hoạch thiết kế Workflow platform

CHG-20261013-03: [PLAN-024F](../contracts/workflow-cms-m2.md) brought forward a usable CMS on the existing M2 engine at user request. SRC-066 DONE with native/browser evidence and local activation; no new persistence or prerequisite on unavailable Kafka. The target eleven-node/CRM object CMS remains gated by B…E. Next is PLAN-024B design; no active source task.

**Implementation2026-10-13 / CHG-20261013-02:** PLAN-024A DONE; SRC-065 delivers [native shared catalog + pure Core authoring validator](../development/workflow-foundation.md),325 unit/8 native groups PASS. This first slice is complete; Kafka/independent authoring/run persistence/CMS/actions remain. SRC-064 requeued READY with progress retained. PLAN-024B READY for design. Historical design-only statements below describe the preceding planning session.

PLAN-024 · Codex · 2026-10-13. Yêu cầu: Workflow Web + Workflow API cho CMS, Workflow Core cho engine đa node, Kafka CRM object change, business routing/search/update related records, message/email/notification follow-up, delay/branching và shared CRM metadata. **Phiên này hoàn tất kiến trúc/kế hoạch; không triển khai source.**

[Architecture và baseline gap](../system/workflow-architecture.md) · [Metadata](../data/workflow-metadata.md) · [Acceptance](../quality/workflow-platform-acceptance.md) · [Official references](../references/workflow-platform.md).

## Quan hệ kế hoạch cũ

SRC-019/020/021 DONE là primitive M2 trong monolith, không là service framework mới đã hoàn thành. PLAN-009 vẫn TODO vì bao gồm exact Workflow/Chatflow/AI Agent scopes; PLAN-024 chỉ hoàn tất phần kiến trúc Workflow của review đó. SRC-042 chưa Ready, chưa được claim. SRC-043/044 và PLAN-008 vẫn giữ dependency, không đưa Next action/AI vào scope tự động.

User đã yêu cầu thiết kế canvas CMS và Kafka: phần kiến trúc này thay hạn chế planning cũ rằng không mở rộng visual builder trong PLAN-009; implementation visual builder vẫn phải qua gate E. SRC-064 tiếp tục là source task IN_PROGRESS; không khởi tạo source thứ hai, subagent hoặc scheduler.

## Các bước thiết kế tiếp theo, thực hiện tuần tự

| Gate / task | Dependency | Deliverable để đủ Ready cho phạm vi tương ứng | Acceptance |
|---|---|---|---|
| PLAN-024A — shared metadata và producer capability | PLAN-024 | Inventory canonical object/property/association IDs và ownership; typed descriptor/query/binding schema; field ACL/null/collection semantics; impact/deprecation; đánh dấu object nào thật sự query/write được | WF-01/02/07/13 |
| PLAN-024B — Kafka object-change/enrollment | PLAN-024A | Exact event JSON Schema/topic/partition keys, producer outbox manifest, immutable before/after API/change sequence, inbox/offset/gap/DLQ/replay, activation boundary/re-enrollment/cycle budget; broker/client pin/config/retention/security | WF-04/05/06/12 |
| PLAN-024C — CMS API và Core control/storage | PLAN-024B | OpenAPI install/activate/disable/status/run/cancel, signed service auth/native BFF/scopes/errors; graph version/capability handshake; từng table template đủ columns/indexes/tenant keys/grants/retention; forward migration + schema split/backfill/rollback | WF-02/03/09/13/15 |
| PLAN-024D — execution/node/actions | PLAN-024C | Per-node input/output/error schemas, branch/delay/wait semantics, search limits/CAS/batch receipts, routing/transition ports, communication provider ownership/consent/unknown/reconcile; fault/contract fixtures | WF-07/08/09/10/11/12 |
| PLAN-024E — CMS UX và release/cutover | PLAN-024D | Screen spec/canvas/keyboard/mobile, API mapping/empty/error states, run trace redaction, phased implementation tasks, single starter/drain/shadow strategy, persistent synthetic data test plan, deployment/HA/load/RPO/RTO gates | WF-14/15 và integrated WF-01…13 |

READY của A nghĩa sẵn sàng làm **thiết kế A**, không là source metadata API đã Ready. Khi gate hẹp đạt, có thể tạo scoped source task với deps rõ và riêng evidence, nhưng chỉ sau khi reprioritize source active trong tracker; không đóng toàn PLAN-009 từ một gate nhỏ. Technical decisions tự chốt bằng ADR trong scope đã được user yêu cầu, không hỏi lại Kafka hoặc service decomposition.

## Trình tự triển khai dự kiến sau thiết kế

Chưa gán SRC mới hoặc claim READY vì exact contracts chưa có. Tách SRC-042 thành các slice khi scope Ready; không giữ một task quá lớn rồi đánh DONE chỉ từ một phần:

1. CRM shared metadata/capabilities + typed node/graph validator; reuse baseline type rules và test schemas. Chưa side effect.
2. Workflow API own database/drafts/versions và Core artifact/control skeleton có native auth, immutable install/activation receipts.
3. Owner transactional object-change outboxes/change-image read APIs; Kafka ingress/inbox/ordered evaluation/enrollment, shadow mode trước live enrollment.
4. Core run/step/wait/delay/branch/retry/fence/cancel; port M2 semantics sang remote actions; local failure/restart proofs.
5. Read/search related + bounded update/CAS + business transition/routing/task adapters; validate actual owners/capabilities, không mock production.
6. Message/email/in-app notification adapters theo owner contract; unknown delivery/reconciliation, consent/permissions, provider test gates tách synthetic khỏi live.
7. Workflow Web CMS trên API thật, save/reopen/publish/review/run inspection, keyboard/mobile/tenant negatives.
8. Integrated synthetic scenarios, data preservation, shadow/cutover/single writer/drain/rollback; activation chỉ trên definition/capability đủ gate, chưa tự production deploy.

Có thể trình bày JSON admin prototype trước canvas để kiểm contract; không coi prototype là Web CMS DONE. MVP đủ node base + data/routing/follow-up theo adapters thực; deferred: parallel fork/join, arbitrary code, unbounded loop, nested workflow, automatic compensation, auto-migrate active run, business-calendar recurrence, retroactive bulk enrollment. Ticket/live provider chưa có contract giữ unavailable.

## Các quyết định đã chốt và phần cần xác minh

Đã chốt: Next/Nest/TypeScript/MySQL; native Identity; Web/API/Core boundaries; API/Core private schemas; shared canonical CRM metadata; Kafka cho CRM change ingress; at-least-once và stable action receipts; version pin + fresh authorization; exclusive branch và persisted delay; reuse M2 semantics.

Cần xác minh trong từng gate, không là câu hỏi đang chờ user: actual producer field/change coverage; query traversal support; email/notification/task owning adapter; exact auth protocol/grants; physical schema mapping; broker versions/capacity/retention; source action endpoints; load thresholds và recovery proof. Một feature phụ thuộc capability chưa có phải hiện unavailable, không fallback silent/no-op success. Không lựa chọn broker/engine mới chỉ để né compatibility.

## Definition of done và bước tiếp tục

PLAN-024 DONE cần kiến trúc + service descriptors + metadata ownership + node catalog + delivery plan + official references + acceptance matrix, source gap review và docs/link/DAG/whitespace checks thực chạy. Không gồm build/unit/Kafka/DB/browser/provider acceptance của source tương lai. Exact commands/evidence trong [PLAN-024](../tracking/details/PLAN-024.md).

Bước tiếp tục cho thiết kế Workflow: claim PLAN-024A, chốt CRM canonical descriptors và producer capability coverage trước schema/wire mới. Không claim SRC-042 khi PLAN-009/gates tương ứng chưa DONE. Trạng thái và ưu tiên implementation khác giữ ở [tracker](../tracking/tasks.md).
