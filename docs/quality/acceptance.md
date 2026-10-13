# Acceptance và traceability

Status: Ready for implementation như thiết kế test. Source có foundation/kernel tests; acceptance nghiệp vụ vẫn chờ task tương ứng. SRC-004 chỉ kiểm AC-01 tầng repository/composite FK/transaction, chưa đóng toàn AC-01; xem [evidence](../tracking/details/SRC-004.md).

SRC-005 kiểm AC-14 phần automated local links/fences/JSON/task dependency; Mermaid chỉ kiểm header, chưa render; không đóng toàn AC-14 hoặc business gate. [Evidence SRC-005](../tracking/details/SRC-005.md).

SRC-006 kiểm auth prerequisite của AC-01/02: OIDC/state/nonce/PKCE/CSRF, session expiry/logout/refresh/revocation, public issuer/private backchannel. Không đóng AC-01/02 tenant/permission; [evidence](../tracking/details/SRC-006.md).

## Ma trận truy vết

| Requirement | Thiết kế | Contract / interface | Acceptance |
|---|---|---|---|
| REQ-01 | [Security](../system/security-operations.md), [Identity](../modules/identity.md) | [REST context](../contracts/api.md) | AC-01 |
| REQ-02 | [Identity](../modules/identity.md) | [Admin/record API](../contracts/api.md) | AC-02 |
| REQ-03 | [CRM](../modules/crm.md), [Sales](../modules/sales.md) | [Lead API](../contracts/api.md) | AC-03 |
| REQ-04 | [Data model](../data/model.md), [CRM](../modules/crm.md) | [Metadata API](../contracts/api.md) | AC-04 |
| REQ-05 | [Channels](../modules/channels.md), [Operations](../modules/operations.md) | [API](../contracts/api.md), [Events](../contracts/events.md) | AC-05, AC-15 |
| REQ-06 | [Agents](../modules/agents.md) | [Assignment API](../contracts/api.md) | AC-06 |
| REQ-07 | [Agents](../modules/agents.md), [Chatflow](../modules/chatflow.md) | [Agent Runtime](../contracts/agent-runtime.md) | AC-07, AC-18 |
| REQ-08 | [Workflow](../modules/workflow.md), [Chatflow](../modules/chatflow.md) | [Events](../contracts/events.md) | AC-08, AC-16, AC-17 |
| REQ-09 | [First slice](../business/first-slice.md) | [Conversation/Lead API](../contracts/api.md) | AC-09 |
| REQ-10 | [Ticket](../modules/ticket.md) | Draft M4: transition/SLA contract | AC-10 |
| REQ-11 | [Reporting](../modules/reporting.md) | M2 metric definitions; [RB-MOCK/CONNECTED plan](../planning/report-builder.md), exact API gate PLAN-022 | AC-11; [RB-01…17](report-builder-acceptance.md) |
| REQ-12 | [Operations](../modules/operations.md) | [Events](../contracts/events.md) | AC-12, AC-17 |
| REQ-13 | [Healthcare](../business/healthcare.md) | [Custom object API](../contracts/api.md) | AC-13 |
| REQ-14 | [Development](../governance/development.md) | Module template + readiness gate | AC-14 |

## Scenarios

| ID / gate | Given / When | Then |
|---|---|---|
| AC-01 / M1 | Alpha/Beta có cùng label, provider subject và object key; Alpha dùng Beta record ID/association target/cursor/job context | Không đọc/sửa/liên kết được; 404 hoặc rejected context; không lộ count/label; composite FK chặn cross-tenant; không có side effect Beta |
| AC-02 / M1 | Viewer seat mang edit role; Chat seat thiếu reply role; scope own/team/all; field deny và record team share | Entitlement và role đều bắt buộc; own không đọc unassigned; team chỉ primary/shared team; field deny áp dụng filter/export; không suspend admin cuối |
| AC-03 / M1–M4 | Cùng Contact có hai nhu cầu khác nhau | Hai Lead hợp lệ, không duplicate Contact; M4 một Deal won làm Contact customer, appointment đơn thuần không làm customer |
| AC-04 / M1 + M5 | Tạo indexed enum property/custom record/association/form/view; thử sai type, required, cardinality và property thiếu index | CRUD/render/filter theo metadata đúng, transaction index không lệch; M5 workflow/report dùng cùng schema và ACL |
| AC-05 / M2 | Replay cùng delivery, khác event cùng message, cùng event khác payload | Hai replay đầu no-op; payload conflict 409; không thêm Message/Conversation/Lead/Touchpoint/Run |
| AC-06 / M2 | Supervisor chuyển Conversation AI→Human, Lead giữ Sales owner; thử gán inactive/cross-tenant principal | Conversation revision/history cập nhật riêng; Lead không đổi; target sai bị từ chối; owner NULL vẫn ở đúng team queue |
| AC-07 / M2 | Runtime gọi tool ngoài allowlist, dùng field denied, trả kết quả sau takeover hoặc bị disable | Không side effect; audit sanitized; late output rejected; queued outbound cancelled; Human nhận draft |
| AC-08 / M2 | Crash sau action commit trước step success, restart rồi publish graph version mới | Cùng action key không lặp tác dụng; run tiếp version cũ; consumer replay không tạo run mới |
| AC-09 / M2 | Chạy fixture A từ mock inbound đến Sales accept | Một Contact/Conversation/Lead, nguồn giữ đúng, consent có evidence, Lead accepted, Conversation owner độc lập; thiếu consent thì không qualify |
| AC-10 / M4 | Ticket pause/resume/reopen/escalate và lỗi retry | Sau khi spec SLA Ready: deadline đúng calendar, escalation một lần, ownership/audit không mất |
| AC-11 / M2 semantics + M5 engine | Dataset 4 conversations, nhiều message, nhiều association; chạy metric theo cohort | Đúng KPI fixture 12/4/3 và 2/3; không fan-out count; denom=0 null; cache không lộ tenant/scope; owner history dùng đúng thời điểm |
| AC-12 / M1 | Mutation thành công, permission denied, external failure | Audit actor/action/tenant/correlation đúng; secret/PII/message body không xuất hiện ở log; outbox atomic với business state |
| AC-13 / M1 + M4 | Tạo Appointment/ServiceOffering bằng metadata | M1 không có bảng ngành riêng, association và form hoạt động; M4 validates lịch và won/customer continuation |
| AC-14 / M0 | Rà toàn bộ tài liệu, link, Mermaid, REQ→design→contract→AC | Không link nội bộ hỏng, ID duy nhất, bảng dictionary khớp ERD, Draft không gắn Implemented; ghi rõ phần chỉ kiểm tra tài liệu |
| AC-15 / M2 | 2 inbound worker cùng identity, 2 qualifies cùng session, 2 sales cùng accept một handoff unassigned | Một active Conversation, một Lead/session, một accept thắng CAS; caller còn lại nhận response replay hoặc conflict |
| AC-16 / M2 | message/event tới trước session/wait; timer và event đồng thời | Session đọc được tin đầu; wait kiểm tra persisted result; chỉ một terminal transition; không mất signal |
| AC-17 / M2 | Redis outage, outbox publish rồi crash, lease hết hạn, worker cũ quay lại | Intake durable không mất; duplicate event an toàn; fencing từ chối worker cũ; queue phục hồi theo outbox |
| AC-18 / M2 | Outbound queued khi takeover và outbound đã sending khi takeover | Queued bị cancel; sending có thể sent/unknown và reconcile, không claim thu hồi được; không auto-resend unknown |

## Thứ tự kiểm thử khi implement

1. Unit tests cho permission evaluator, state transitions, metadata validation và metric formulas; không chỉ test mirror implementation.
2. Integration tests MySQL thật cho unique/FK/transaction/CAS/fencing, có hai tenant và concurrency thật.
3. Contract tests mock inbound/runtime và outbox consumer; fault injection crash/retry/out-of-order.
4. End-to-end UI/API với fixture A, Human takeover và Sales race; kiểm tra persisted state, audit và event counts.
5. M3 thêm provider sandbox, signature, permission window, rate limit, token expiry, outbound unknown/reconciliation; không đánh đồng mock pass với provider production pass.

## Kiểm tra tài liệu M0

Kiểm tra mọi relative link trỏ file tồn tại, fenced blocks đóng đúng, Mermaid parse được khi có renderer, module đủ mục theo template, ID không trùng và readiness có scope. Rà thủ công chéo state enum, endpoint inventory, ERD/dictionary và KPI arithmetic. Báo cáo kiểm tra đặt tại [validation](validation.md).

SRC-007 đạt sub-scope Identity của AC-01/02: seat+role own/team/all và field deny primitives (unit), tenant-scoped schema/API, live revision, team activation, last-admin guard với concurrent self-demotion, signed cursor, OIDC browser tenant switching. Chưa đóng toàn AC-01/02: CRM record/association/job isolation, persisted field_policy/query/export tiếp tục ở SRC-010…013/024. Admin transaction rollback/replay có evidence sơ bộ AC-12; relay/inbox/fencing vẫn SRC-008. [Evidence SRC-007](../tracking/details/SRC-007.md).

SRC-008 đạt AC-05 foundation (consumer duplicate) và AC-12 foundation (transaction audit/outbox, receipt replay quyền hiện hành, audit DB append-only); AC-17 sub-scope relay crash/reclaim/fencing/retry bằng MySQL integration và worker thật qua E2E. Không đóng AC-05 Messenger intake hoặc toàn AC-17/18: provider unknown, workflow/Redis outage recovery end-to-end và cancellation còn M2 tasks sau. [Evidence SRC-008](../tracking/details/SRC-008.md).

SRC-009 đạt bootstrap sub-scope AC-01/02/12: Alpha/Beta Identity fixtures, sáu OIDC users, shared viewer không có admin permission, cross-tenant context/reference denied, seed atomic/repeat-safe, system audit + Identity outbox/inbox. Không đóng CRM object/record/provider subject/association/job portions của AC-01 hoặc M1 release gate; các phần đó tiếp tục SRC-010…013/024. [Evidence SRC-009](../tracking/details/SRC-009.md).

SRC-010 kiểm registry/association sub-scope AC-01/02/04/12: FK và tenant isolation hai đầu, cardinality/CAS/race, scoped reads/shares, field-policy loader, subtype atomicity bằng test-only adapter, ownership history/outbox và receipt rollback. Chưa đóng full AC-04/13, query/index/form/view, CRM UI, runtime business subtypes hoặc public assignment/routing AC-06. [Evidence SRC-010](../tracking/details/SRC-010.md).

SRC-011 đạt backend AC-04/13 M1 và record ACL/query/replay phần AC-01/02/12; [evidence](../tracking/details/SRC-011.md). UI/render và gate M1 chờ SRC-013.

SRC-012 backend AC-03/M1, qualification sub-scope AC-09 và standard ACL/transaction đã kiểm; [evidence](../tracking/details/SRC-012.md). Handoff/acceptance và Customer M4 chưa đóng.

SRC-013 đóng **M1 release gate**: Admin/CRM UI real OIDC, tenant/permission negative, standard/custom CRUD, association, typed query/form/view; cold tmpfs migration+seed và warm restart giữ dữ liệu PASS. AC-03/04/13 chỉ phạm vi M1; AC-09 chỉ qualification, handoff/acceptance vẫn M2. Regression 53 MySQL và40 unit/contract; [evidence SRC-013](../tracking/details/SRC-013.md).

## SRC-014 — sub-scope M2

Evidence [SRC-014](../tracking/details/SRC-014.md): AC-05 business-message dedup/transaction port (chưa durable ACK/referral); AC-15 race một active Conversation/identity; AC-18 queued cancellation hook/close, sending giữ kết quả, unknown không resend và mock reconcile; AC-01/02 tenant/owner/field policy; AC-12 audit/outbox sanitized. Không đóng toàn AC-05/06/07/09/15/18 hoặc M2 release gate: intake, actual takeover/routing/AI, workflow/chatflow và Sales vẫn thuộc các task tiếp theo.

## SRC-015 — AC-05 mock inbound

[Evidence SRC-015](../tracking/details/SRC-015.md): durable ACK trước business processing, same event/hash replay cùng ID, payload conflict409 không overwrite, different event/same message no-op cả Contact/identity/Conversation/Message/touchpoint; missing referral vẫn xử lý unknown. Credential gắn tenant/connection/service role, live revocation, cross-tenant404/credential401; AC-15 identity race và AC-17 claim/crash/reclaim/fencing/rollback/backoff sub-scope. HTTP→worker local E2E dùng Alpha/Beta thật. Không đóng M2 full slice/Lead/Workflow KPI hoặc provider Meta acceptance.

## SRC-016 — Inbox UI sub-scope

[Evidence SRC-016](../tracking/details/SRC-016.md): queue/detail/Contact/CTM, real timeline and Activity notes, quick reply insertion, 5-second polling with cursor pagination, owner-revision review, lost-ACK retry same payload/key with exactly one Message, read-only and tenant switch. Chrome154 E2E PASS; 403 detail cache removal and unknown delivery display tested by explicit browser fault injection. Backend note scope/field/tenant and latest-message receipt replay regressions included in 82 MySQL tests. AC-01/02/05/18 UI sub-scopes only; no public assignment/takeover/AI/session qualification or M2 full gate.

## SRC-017 sub-scope

AC-06 routing/assignment/takeover: live target eligibility, atomic round-robin cursor, queue fallback/attention, independent Lead owner, CAS/history/audit/outbox. AC-18 actual queued cancellation and in-flight completion after takeover. AC-01/02 tenant/seat/role/team/policy/field negative checks and receipt replay revocation. Capacity reservation concurrency and disable attention tested through MySQL ports/durable inbox. Runtime execution/queued30s, session pause and tools remain SRC-018/020; full AC-07/08 and M2 gate are not closed. [Evidence SRC-017](../tracking/details/SRC-017.md).

## SRC-018 sub-scope

AC-07 runtime boundary implemented: exact schema/allowlist, live field/auth/policy/owner checks, transactional tool replay, queue30s/execution deadline, takeover/close/disable cancellation, released capacity, late-result rejection and sanitized audit. Durable synthetic ChatflowSessionPort proves draft preservation/handoff transaction effects; production port fails closed. Full Human session form, consent, Chatflow orchestration and M2 end-to-end remain SRC-020; full AC-07/08 is not closed. [Evidence SRC-018](../tracking/details/SRC-018.md).

## SRC-019 sub-scope

AC-08 engine: DAG publish/version pinning, duplicate starter selection, same action key after effect/step crash gap, five bounded retries and live-role/fencing rejection. AC-16 Workflow waits: persisted child predicate at registration, missed/early signal, concurrent event/timeout one transition, timer recovery without Redis. Cancellation preserves committed effects and records bounded child retry attention. Synthetic child port proves engine boundary only; real first-message/Chatflow/Sales remains SRC-020/021, full M2 gate remains open. Chrome/OIDC API and mock intake→worker→timer verified. [Evidence SRC-019](../tracking/details/SRC-019.md).

## SRC-020 completed scope (S-20261005-10)

Initial A parser evidence was extended by actual durable engine/ports and Human completion.150 MySQL integration tests pass (18 Chatflow +132 regression), including first input, fenced/restarted work, proposal-only runtime, takeover/late callback, live outbound auth, one Lead/session, atomic rollback and Human race/evidence/CAS.66 unit/contract tests and9 canonical gates pass. Preview schema16 upgrade retained count/hash across13 pre-existing tables. Chrome154 real OIDC/mock intake/Workflow/Chatflow/Human takeover and consent form PASS; qualified Lead and parent completion verified with Human owner retained. Final status and evidence at [SRC-020 detail](../tracking/details/SRC-020.md). Full M2/Sales acceptance is not closed.

## SRC-021 backend Sales sub-scope

AC-09 backend Chatflow→Workflow handoff→Sale accept PASS with unchanged Conversation ownership and Lead source/session snapshot; AC-15 handoff/accept concurrent commands one winner PASS. Contact share read-only/field denial, no eligible queue,15min attention, ACL revoke, replay/CAS, atomic rollback and actual Workflow fence/crash/early signal/timeout/cancel covered.166 MySQL tests and9 canonical gates PASS; [evidence SRC-021](../tracking/details/SRC-021.md). Sales browser UI and full M2 fixture/KPI/release gate remain SRC-022…025. Preview still schema16; no browser/preview upgrade17 claim.

## SRC-022 Sales và Operations UI

Sales queue/detail + real accept command + authorized CRM link, stale race UI and Operations reason-coded inbound retry/run timeline/runtime attention PASS.171 MySQL regression/integration, canonical verify9/9 and real Chrome154/OIDC browser gate; [evidence SRC-022](../tracking/details/SRC-022.md). Negative403 cached-detail and409 browser conflict use explicit injection; actual permission/race behavior independently covered in MySQL. Preview schema17 upgrade data check and fixture cleanup verified. Full M2 healthcare KPI/chaos/release remains SRC-023…025.

## SRC-023 healthcare and metric sub-scope

AC-09 application-service healthcare fixture and AC-11/M2 persisted metric semantics PASS:12/4/3,3 qualified,2/3 ratios,180s acceptance/30s response medians; duplicate deliveries, no-referral/refusal, historical owner, tenant/null/fan-out and as_of boundaries.176 MySQL regression PASS and isolated cold walkthrough5 PASS; [evidence](../tracking/details/SRC-023.md). No M5 report API/cache ACL or browser fixture seed claimed; full M2 fault/release gate remains SRC-024/025.

## SRC-024 M2 fault/regression gate

[Evidence SRC-024](../tracking/details/SRC-024.md), [fault matrix](m2-fault-suite.md):180 MySQL tests PASS, including real SIGKILL/restarted compiled services after assignment action/consumer/provider receipt commits; stale fencing, one durable effect/run, no blind resend unknown; actual Redis TCP outage with HTTP503/session loss401 and durable inbound202/replay/recovery. Full suite reruns AC-01/02/12 permissions/tenant/audit, AC-05/06/07/08/09/15/16/17/18 M2 mock sub-scopes and healthcare metrics. Canonical verify9/9 PASS. Lease expiry is accelerated by test SQL; OIDC exchange in outage harness is synthetic; no Redis queue implementation or real provider claimed. This closes SRC-024 regression/fault gate, not the full M2 release gate: cold/warm release images, M1 upgrade and demo remain SRC-025.

## SRC-025 — M2 local/mock release gate PASS

[Evidence SRC-025](../tracking/details/SRC-025.md): built actual release images and historical M1 f575a8e; native ARM64 and emulated AMD64 cold/upgrade/full-stack restart gates PASS. Schema8→17 preserves31 existing tables and10 CRM records; no-op migration; all-table hash equality across restart and one persisted timer completion. Fresh real Chrome/OIDC + API/worker CTM intake/duplicate, AI-owned qualification, Sales UI accept, Human takeover/form/handoff, tenant denial and owner/prospect invariants PASS on both app architectures.180 regression tests (including healthcare KPI and SRC-024 faults) and9 canonical gates PASS. This closes M1–M2 local/mock release acceptance only; native AMD64 hardware, remote CI, production rollout, real Meta/LLM and M4/M5 portions of shared AC IDs remain unclaimed.

## M3 provider/connector acceptance — Draft, NOT_RUN

CHG-20261006-03; [plan](../planning/m3-provider-plan.md), [message contract](../contracts/messaging-platforms.md), [source dossier](../references/meta/README.md). M2 AC results không đóng các sub-scopes sau.

| Sub-scope | Scenario/gate dự kiến | Evidence hiện tại |
|---|---|---|
| AC-01/02/07 / M3 | Provider/entity binding tenant isolation; eligibility denied; setup/read/config/test quyền; callback/tool revoke và idempotency | NOT_RUN |
| AC-05/15/17 / M3 | Verified raw webhook, batch, duplicate/reordered events, durable ACK, echo trước send response; không duplicate Message/turn | NOT_RUN |
| AC-06/18 / M3 | AI→CRM Human→AI qua routing/thread control đúng platform; pending/timeout/reconcile, external takeover, late event, no double reply | NOT_RUN |
| AC-05 / M3 rich messages | Text/media/reply/gallery/CSAT, unsupported template/version, inaccessible reply, media expiry, render isolation; backend reject unsupported send | NOT_RUN |
| AC-07/09 / M3 case study | Meta Agent setup→test→eligible channel conversation→Lead qualification→Human/Sales handoff bằng synthetic catering/retail; healthcare M2 giữ riêng | NOT_RUN |
| AC-12/17 / M3 operations | Secret rotation/token expiry/rate limit, sanitized audit, desired-vs-observed config/control, compatibility upgrade giữ M2 history | NOT_RUN |

PLAN-002 chỉ kiểm tra tài liệu và checksum; exact fixture/machine contracts và provider sandbox requirements chốt PLAN-003/004. Không tuyên bố production hoặc platform hỗ trợ chỉ từ docs snapshot.

PLAN-003 doc research complete: [capability/gap matrix và sandbox cases](../references/meta/capability-matrix.md). Bổ sung regression candidates cho standby vs messages/echo, budget shared-asset authority, outbound template definition+parameters, media URL expiry, current Graph version, send-vs-explicit-take và unknown operation. Tất cả provider AC vẫn NOT_RUN; G-04/05/08 là điều kiện chưa cho sub-scope live routing/mutable tools Ready.


AC-05/M3 text foundation (SRC-026): PASS181 MySQL regression và67 unit/contract trong9 canonical gates; [evidence](../tracking/details/SRC-026.md). Exact cases tại [contract](../contracts/message-envelope-v2.md); các AC rich/provider ở trên vẫn NOT_RUN.


AC-05/M3 normalized rich mock SRC-027: PASS183 MySQL regression,73 unit/contract/renderer và9 canonical gates; Chrome desktop/mobile component smoke PASS, full-stack browser NOT_RUN. [Evidence](../tracking/details/SRC-027.md); [cases và exclusions](../contracts/rich-messages.md).

## Microservices architecture / PLAN-005

Doc-only gate: mỗi module có mapping service, scope/non-goals/internal architecture/data owner/model/interfaces/consistency/operations/extraction/AC; [catalog](../services/README.md). Tại PLAN-005, source vẫn monolith; subsequent SRC-028 ingress evidence below. Full distributed acceptance remains NOT_RUN: isolated databases/grants, remote tenant/auth/owner fences, lost ACK/duplicate/reorder, saga recovery, schema/event compat, single-writer cutover, broker HA/restore and production SLO. PLAN-006 chốt exact cases trước source task, không reuse monolith PASS để đóng distributed gate.


AC microservices/ingress bridge SRC-028: PASS184 MySQL tests,77 unit/contract tests,9 canonical gates; release image/private DB/non-root/API restart smoke PASS. [Evidence](../tracking/details/SRC-028.md); [exact isolated DB/auth/HTTP/retry cases](../contracts/connector-bridge.md). Not full distributed/business/provider acceptance.

SRC-029 PASS185 MySQL/86 unit/9 canonical gates and release image restart: AC-05/M3 signed Messenger capture subset per [contract](../contracts/messenger-ingress.md), local synthetic raw HTTP/MySQL only. Not Chat delivery, provider send or sandbox completion.

Evidence [SRC-029](../tracking/details/SRC-029.md). All other M3 provider/domain/media/UI/local release scopes remain TODO/NOT_RUN; sandbox unavailable by user selection.

## PLAN-006B design gate / future source acceptance

[Contact-resolution contract](../contracts/contact-resolution.md) defines cache hit/miss/expiry, concurrent resolve/lost ACK, provider profile unavailable, stale enrichment/Human field preservation, cross-tenant identity, invalidation and required crm_contact_id on inbound/outbound/echo. Design/doc checks only; all runtime cases NOT_RUN. Existing M2/SRC-029 PASS does not close this scope.

PLAN-006C design refinement: test cache hit/no CRM lookup, cache miss+DB hit/no create, confirmed DB miss/concurrent resolve→one Contact+identity, DB outage/denial never creates, both service caches rehydrate, invalidation/revision mismatch pending, and nonblocking enrichment. Runtime NOT_RUN; [contract](../contracts/contact-resolution.md).

## SRC-030 scoped implementation

SRC-030 sub-scope: real local HTTP/MySQL tests verify lookup/resolve replay/concurrency, cache hit/expiry/reset/isolation, rollback without cache poisoning, failed lookup never creates, inbound contact binding and duplicate identity fencing, outbound contact checks/send, revocation. This does not close full Facebook/M3 acceptance. See [compatibility contract](../contracts/contact-resolution-local.md).

## SRC-031 Facebook configuration and channel dimensions

[Exact OAuth/Page/schema19 contract](../contracts/facebook-configuration.md) and [operator runbook](../development/facebook-configuration.md) define Admin→Channels→Facebook, session/state-bound OAuth, encrypted DB Page credentials and manual verified token replacement. Baseline Channels remains sole writer of catalog/credentials; independent Connector capture is unchanged until API-based extraction/provisioning. Conversation channel and generated channel_id retain existing connection IDs, with Page metadata and tenant/field-authorized filters/options. Messaging activation and real sandbox acceptance remain separate.

## Agent Chat rebuild — UX-001

[Đặc tả và scenarios UX-CHAT-01…12](../ux/agent-chat-workspace.md) là gate cho lần build lại giao diện theo ảnh mẫu. Bao gồm responsive/scroll, filters/cursor, reply/note, owner revision, unknown send, tenant/field ACL, rich passive renderer, qualification và accessibility. UX-001 chỉ nghiệm thu tài liệu (AC-14 sub-scope); mọi runtime/browser case của layout mới NOT_RUN, không kế thừa PASS từ SRC-016/031.

## UX-002 — Extended Agent Chat product acceptance

[Contract cases UX-CHAT-13…22](../contracts/agent-chat-workspace.md) bổ sung per-agent/multi-tab read markers, exact ACL counts/waiting coverage, server query/cursor, shared inbox revoke/transfer, tag concurrency, durable snooze races, source-authorized activity, snippets/contact navigation và migration/rollback. Kết hợp UX-CHAT-01…12 đã cập nhật trong UX. Mapping AC-01/02 privacy/ACL, AC-06/18 ownership/dispatch, AC-12/15/17 idempotency/race/restart, AC-14 design. Tất cả runtime của scope mới NOT_RUN; UX-002 chỉ kiểm tài liệu, không dùng PASS M2 để đóng gate mới.

SRC-032 backend sub-scope of UX-CHAT-13/14/15/19/22:203 MySQL regression and canonical9/9 PASS;99 unit tests. [Evidence](../tracking/details/SRC-032.md). Covers marker/sequence/ACL query/waiting coverage and schema19 upgrade/backfill. Does not close browser layout, full feature rollout/rollback or SRC-033…037 scenarios.

SRC-033 backend sub-scope UX-CHAT-16/17/21 PASS: full209 MySQL tests, final13 workspace cases (196 intentionally skipped),102 unit tests and canonical9/9. [Evidence](../tracking/details/SRC-033.md). Shared-view ACL/revoke/team/transfer/quota, Conversation tag concurrency/archive/field policies and snippet catalog/HTTP schemas verified; keyboard/composer and full UI remain SRC-036, deployment/rollback remains SRC-037.

## PLAN-007 / ADR-021 — Native auth và schema guideline

Design acceptance đã xác định; runtime cases NOT_RUN. Historical OIDC PASS giữ nguyên, không chứng minh native auth. REQ-01/02/12/14 áp thêm các gate:

| ID | Given / When | Then |
|---|---|---|
| DB-01 | Inventory mọi application table kể cả journal/account/tenant/link | tenant_id NOT NULL, đúng business/system scope; không hidden framework table ngoài chuẩn |
| DB-02 | Hai tenant có natural key giống nhau; thử reference/write tenant khác | Key trong tenant hợp lệ; foreign-tenant FK/repository/API/job/cache bị deny, không lộ count |
| DB-03 | Customer gửi system tenant hoặc thiếu tenant context | Fail closed; account login/system journal không grant quyền CRM |
| DB-04 | Runtime credential của service A đọc/write database B | DB permission denied; không cross-schema FK/view/trigger/shared transaction |
| DB-05 | Chuyển source data sang schema mới qua warm upgrade | IDs/quyền/counts/checksums/ledger preserved, một writer, resumable backfill, rollback/forward fix được kiểm thử |
| DB-06 | Rerun test/seed trên synthetic tenant có dữ liệu cũ | Không reset DB/Redis, không rotate password/regrant quyền; assertions dùng run IDs/delta |
| DB-07 | Propose table mới | Có schema owner, table template, tenant keys, query/index/retention/grants/migration evidence trước Ready |
| AUTH-NATIVE | Native login/session/recovery/cutover | Đạt NATIVE-01…08 trong [contract](../contracts/native-auth.md); không request Keycloak, permissions lấy từ MySQL |

PLAN-007 chỉ kiểm mapping/docs; enforcement và negative/runtime tests thuộc source tasks sau exact design gates.

SRC-038 local acceptance: AUTH-NATIVE scoped first slice, DB-01/02/03/06 retrofit/grants/reuse checks PASS; evidence details/SRC-038.md. DB-04 cross-service database isolation và DB-05 physical extraction vẫn NOT_RUN/PLAN-007B. DB-07 schema catalog/template design đã có. SRC-034 backend UX-CHAT-18/20/22 regression closed222/222, UI/full release còn pending.

## UX-003 — App shell và Inbox design acceptance

AC-14 design sub-scope: research/IA, [guidelines](../ux/guidelines.md), [app shell](../ux/app-shell.md), [Inbox screen](../ux/inbox-screen.md), [screen template](../templates/ux-screen.md) và [mock](../ux/mockups/inbox.html). UX-CHAT-01/02 dùng layout/breakpoint UX-003; semantics UX-CHAT-03…22 giữ nguyên. Bổ sung UX-APP-01…08 shell/search/nav/tabs/create/tenant/keyboard và UX-G01…09 usability/accessibility/documentation.

Mock interaction/layout review chỉ chứng minh prototype synthetic, không đóng browser/API acceptance ứng dụng. Runtime SRC-035/036/037 và user usability/full AA audit NOT_RUN; backend evidence cũ giữ nguyên. Evidence thiết kế và screenshot: [UX-003](../tracking/details/UX-003.md).


UX-004 / CHG-20261007-05 supersedes work-tab requirements UX-003: không tab bar dưới header, main y56, Contact/create drawer và giữ draft. UX-APP-02/03/07 cập nhật tại app-shell.md;31 prototype assertions PASS, runtime vẫn NOT_RUN. [Evidence](../tracking/details/UX-004.md).

SRC-039 runtime sub-scope: shell không tab, authorized header/nav/tool search/create; API queue/search/filter/context/timeline, reply/note/takeover và draft/tenant guards. Browser9 groups/six viewports,104 unit tests và web build PASS; [evidence](../tracking/details/SRC-039.md). Không đóng toàn UX-CHAT hoặc SRC-036/037: read-marker writes, snooze/status actions, tag/saved-inbox management, full activity/Contact identities và release gates còn pending.

SRC-040 acceptance: API need_response true -> false after sent -> true on new inbound; internal note preserves waiting; list labels match. Browser10 groups/6 viewports and106 unit tests PASS. [Evidence](../tracking/details/SRC-040.md). Unknown coverage does not render as responded; closed keeps lifecycle label.

SRC-041 supersedes SRC-040 need-response transition: inbound -> unknown/null; note unchanged; sent covering current inbound -> replied/false; follow-up inbound -> unknown/null.10 browser groups/107 unit/31 prototype checks PASS. True “Cần trả lời” + optional Next action requires future valid Assist assessment; not current integration acceptance. [Evidence](../tracking/details/SRC-041.md).

UX-005 product acceptance (design-only): Conversation suggestion attributes/update action independent of AI; Workflow/Chatflow can apply fixed-rule output or validated configured Assist proposal. Assist cannot directly write CRM/Conversation or publicly reply; orchestrator actor writes only suggestion fields. Same tenant/revision/dedup guards for both branches. [Scope](../ux/agent-assist-response.md); runtime acceptance awaits PLAN-008/source, existing tests do not claim this integration.

UX-006 design acceptance: each registered next_action.type maps to correct list label; null/unknown fallback distinct from responded; no independent need_response target; rule and Assist use same update path; type assignment has no business side effects. Reply completion cannot complete a create_lead/create_ticket/close_chat suggestion. Source rollout/legacy compatibility and runtime verification remain PLAN-008/source work. [Spec](../ux/agent-assist-response.md).

## CRM base — planned acceptance, runtime NOT_RUN

[PLAN-010 scope](../planning/crm-base-outcomes.md); exact fixtures/contracts finalized in PLAN-011. No historical AC or M4/M5 gate is closed by this plan.

| ID | Scenario | Required result / source task |
|---|---|---|
| CRM-BASE-01 | Sales manual Lead, Conversation Lead, retry/new need, qualification/handoff | Authorized commands/UI; one result per command retry, multiple intentional needs allowed; consent not inferred; SRC-045 |
| CRM-BASE-02 | Client spoofs/edits channel/Page/ad via create/PATCH/import/custom fields; inbound changes later | Backend rejects user-controlled system source; original trusted snapshot unchanged; field/tenant ACL on reads/filter/export; SRC-045 |
| CRM-BASE-03 | Agent selects/edits declared source; organic/manual/legacy missing referral or campaign | Declared source audit/CAS independent; known Page/channel retained; absent ad/campaign unknown, no fabricated attribution; SRC-045/049 |
| CRM-BASE-04 | Manual Deal from Contact or Lead, stage/won/lost/reopen and multiple Deals | Lifecycle/ACL/version and Customer semantics enforced; immutable primary lineage, direct manual Deal allowed without invented ad; SRC-046 |
| CRM-BASE-05 | Ticket from Chat/manual, assignment, resolve/reopen and linked Deal | UI/API permissions and transition audit; no implicit Chat closure or duplicated revenue; basic only, advanced SLA excluded; SRC-047 |
| CRM-BASE-06 | Partial collection, duplicate receipt, correction/refund/reversal and restart | Evidence retained, idempotency, authorized append/correction policy; won amount distinct from net collected; SRC-048 |
| CRM-BASE-07 | Multiple campaigns/ad sets/ads and creative/message/targeting dimensions; many Leads/Conversation and Deals/Lead; mature/pending cohorts | Conversion rates use distinct cohort numerator/denominator and as_of; won value counts each Deal once per currency; no fan-out, source separation, unknown coverage and drilldown ACL; receipts independent; SRC-049 |
| CRM-BASE-08 | Upgrade existing local data then CTM→Lead→Deal→receipt→report, manual and Ticket paths | Data preserved, tenant negatives, retry/races/restart/browser and rollback compatibility evidence; local synthetic gate only; SRC-050 |

CRM-BASE-09 / SRC-051+049 (planned, NOT_RUN): sync two tenant-scoped Ad Accounts with multiple campaigns/ad sets/ads; test paginated duplicate/retry/restart, partial failure and permission revoke without destructive deletion, rename/archive/history retention, unresolved then late resolution and ambiguous mapping. Report counts cohort conversions and groups each won Deal exactly once by Ad→Ad Set→Campaign→Account, preserves immutable Lead source and rejects cross-tenant access; stale/watermark states visible. Local synthetic and live Facebook account evidence recorded separately.

## ORGANIC-01/02 scoped release

PLAN-011A/SRC-045/046/052: Human manual Lead/Deal and organic Inbox→Lead→Deal won with positive decimal value; immutable Page source and separate declared source. Page report groups by channel/Page/currency in UTC closed-date range; exact totals and per-record/field ACL, no paid/manual/unknown inclusion. Native browser and8 persistent MySQL groups PASS in task evidence; full release SRC-050 pending. Ticket/SLA, actual receipts, live Meta and campaign integration remain outside this gate.


CHG-20261007-15 / SRC-049 planned NOT_RUN: [marketing conversion acceptance](../planning/marketing-conversion-performance.md) includes content/message/targeting provenance, zero denominator, late wins, equal observation windows, unknown dimensions and metadata history. Receipt reliability is not this report objective.
PLAN-014 extends planned CRM-BASE-09 with [field acceptance](../data/marketing-field-mapping.md): opaque IDs, USD/VND units, budget versus spend, configured/effective status, Advantage+ suggestions, creative reuse/change, unchanged updated_time on budget changes, nullable/unsupported fields, unknown enums, Insights breakdown grain and history gaps. Meta breakdowns must not multiply CRM won value. Document checks prove research only; runtime/live tests NOT_RUN.

CRM-BASE-10 / SRC-053 scoped PASS2026-10-08 ([evidence](../tracking/details/SRC-053.md)): [Session model](../contracts/conversation-acquisition-session.md): same Conversation, Ad A→Session1 and Ad B→Session2 produce independent Lead/Deal attribution; retry/late/out-of-order events, same-ad returns, organic session, sessions without Leads, multiple Leads/Deals, manual origin, legacy unknown, tenant/ACL and restart membership preservation. Membership and source lineage implemented; session→Lead cohort denominator/report remains SRC-049 and must include nonconverted sessions. No Chatflow-session aliasing.

PLAN-020 / CHG-20261008-06: [Three report families](../contracts/marketing-operating-flow.md) separate Meta delivery/engagement by age and region, CRM conversions via Session ad_id, and joined ad-total performance. Sync age/region breakdowns for impressions/clicks/spend; no person-level demographic join, no allocation of CRM won to breakdown rows. Preserve separate datasets and recompute distinct Contact totals. Exact Insights ingestion and query/period contracts remain PLAN-011.

PLAN-021 / CHG-20261008-07 supersedes fixed-report interpretation: Marketing provides [source datasets/storage/field descriptions](../data/marketing-source-catalog.md); Reporting owns the [builder and reusable templates](../planning/report-builder-data-model.md). The three PLAN-020 families are examples, not a limit or separate Marketing report engines. Source ingestion acceptance and Reporting template/query acceptance are separate. PLAN-011 is the Marketing data gate; PLAN-022 is the Reporting implementation gate.

PLAN-011C data-design acceptance:105 unique field paths with source-row trace, proposed owning table/column/type, meaning/unit/role/coverage; deterministic regeneration must match.24 official snapshots remain checksum-valid. Runtime ingestion, migrations and live account coverage are separate NOT_RUN gates in [storage design](../data/marketing-storage-design.md).

PLAN-023 / CHG-20261008-09: [Shared account and Page tenant admission](../contracts/marketing-tenant-admission.md). All tables retain tenant_id NOT NULL. The same external Ad Account may have independent tenant-local replicas/bindings. Ads/related metadata/Insights are admitted only when Creative Page resolves to the sync tenant; foreign Ads skip, unresolved defer. Parent configuration can be shared; children and ad-level Insights remain tenant-filtered. No cross-tenant payload/history persistence or campaign/account aggregate metric substitution.

MKT-DATA-01 / SRC-054: own database v1, all23 tables tenant_id NOT NULL,105 selected provider fields, shared tenant-local accounts/parents, same-tenant/account FK isolation, required Ad/Page evidence, separate query/breakdown grains and metric revisions, exact decimals, history grants, idempotent migration and persistent fixture preservation. [Evidence](../tracking/details/SRC-054.md). This is storage acceptance only: actual Page authority skip/defer, schedule/reconciliation/Meta API and report builder remain NOT_RUN.

MKT-SYNC-01/02/03 design now Ready under [PLAN-011E contract](../contracts/marketing-metadata-sync.md). Source acceptance still NOT_RUN: SRC-056 authority/credential/revoke-race first; SRC-051 metadata/scheduling/history/lookup/change-stream next.20 request-schema examples validate design shape only, not deployed auth or worker behavior. Live Meta remains independent.
