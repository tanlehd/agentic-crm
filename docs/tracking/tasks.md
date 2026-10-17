# Task tracker — source generation

Nguồn chuẩn trạng thái công việc. Updated: 2026-10-07. Thiết kế có thể Ready nhưng source task vẫn TODO; hai trạng thái không đồng nghĩa.

**Hiện tại:** SRC-001…031 DONE (M1–M2:25; M3 foundation:2; independent ingress:1; signed Messenger capture:1; contact cache compatibility:1; Facebook configuration:1); M1 và M2 local/mock release gates PASS. Runtime local localhost:18080 dùng native MySQL auth (SRC-038); historical preview có, Identity Admin/CRM UI, standard/custom CRUD, Lead qualification, metadata/form/view và association. SRC-014/015 Conversation và mock intake, SRC-016 inbox UI DONE; SRC-017 routing/assignment/takeover DONE; SRC-018 private mock runtime DONE; SRC-019 durable Workflow DONE; SRC-020 DONE, Codex 2026-10-05; SRC-021 DONE, Codex 2026-10-05; SRC-022 DONE, Codex 2026-10-05; SRC-023 DONE, Codex 2026-10-05; SRC-024 DONE, Codex 2026-10-06; SRC-025 DONE, Codex 2026-10-06; PLAN-005/006A DONE (architecture/doc-only); SRC-028 DONE; SRC-029 DONE; PLAN-006B DONE (design-only); PLAN-006C/006D DONE (scoped design); SRC-030/031 DONE; SRC-032/033 DONE (Codex 2026-10-06), SRC-034 DONE backend (SRC-038 final regression); Agent Chat rebuild còn SRC-035…037. PLAN-002/003/004A/004B DONE; PLAN-004 remaining TODO. [Checkpoint](checkpoint.md) · [Execution log](log.md) · [Build plan](../planning/build-plan.md).

Owner `—` nghĩa chưa claim. Evidence `—` nghĩa chưa kiểm thử/hoàn thành, không phải pass. Chỉ promote TODO→READY khi tất cả dependency DONE và thiết kế đúng phạm vi Ready. Một task active tại một thời điểm theo mặc định.

Git sync S-20261004-03: initial commit `7c05518` đã push lên `origin/main` theo yêu cầu người dùng; implementation status không đổi. Xem [execution log](log.md).

Git sync S-20261013-01: user explicitly requested commit/push of the accumulated workspace on main. Pre-commit checks recorded in [execution log](log.md); feature statuses and acceptance scope unchanged (SRC-064 IN_PROGRESS, SRC-059/SRC-051 READY). No implementation task claimed for this Git-only session.

Git sync S-20261015-01: user authorized commit/push of all accumulated source/docs on main. Fresh pre-commit validation in [execution log](log.md); no feature status change or new implementation task.

Git sync S-20261017-12: user authorized publishing accumulated SRC-084/SRC-085, assignment research/ERD and evidence to origin/main. Feature states unchanged; PLAN-041 remains IN_PROGRESS. See execution log for checks.

## Operational reporting generalization — 2026-10-17

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-046 | Exact connected operations objects/properties/core reporting integration gate | SRC-084; SRC-072; SRC-063 | DONE | Codex 2026-10-17 | [Ready contract and OR-01…08](../contracts/operations-reporting.md); docs323/2893links/DAG85 PASS before source; forward005 table review added before DDL |
| SRC-085 | Connected operations source and reusable Report Builder/Dashboard templates | PLAN-046; SRC-084; SRC-072; SRC-063 | DONE | Codex 2026-10-17 | [Evidence](details/SRC-085.md);399unit/7producer/5storage/12regression/8browser groups +10images PASS; Reporting5 preserved20old tables; bounded30day/5000rows |

## Agent workspace queue/view research — 2026-10-17

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-040 | Research conversation assignment, employee skills, capacity queues and workflow policy against five vendors | PLAN-037; SRC-017; SRC-078; SRC-082 | DONE | Codex 2026-10-17 | [Research / DOC-ASG-01…04](../references/conversation-assignment.md); five-vendor official sources + local inspection; docs/whitespace PASS, research-only; ASG-01…10 runtime NOT_RUN |
| PLAN-041 | Collect official waitlist and incoming-assignment UI screenshots for HubSpot/respond.io/Intercom and compare clarity | PLAN-040 | IN_PROGRESS | Codex 2026-10-17 | [8-image gallery / evidence](../references/assignment-ui-screenshots.md); queue/state references collected; exact incoming-assignment popup set still missing; public-source research only, no runtime changes |
| PLAN-042 | Verify queue redispatch wakeups versus time-based retries across five vendors | PLAN-040 | DONE | Codex 2026-10-17 | [Research section6.1 / DOC-WAKE-01…03](../references/conversation-assignment.md);5official vendor references, explicit unknown intervals; docs/whitespace PASS; no implementation or measured SLO |
| PLAN-043 | Research Salesforce native dispatch versus visual Omni-Channel Flow and capacity release | PLAN-042 | DONE | Codex 2026-10-17 | [Section7.1 / DOC-FLOW-01…03](../references/conversation-assignment.md); official sources separate native push, routing Flow, capacity model and auto-accept; docs/whitespace PASS; runtime NOT_RUN |
| PLAN-044 | Design logical Omni-style conversation routing ERD and review existing-model gaps | PLAN-043; SRC-017; SRC-082 | DONE | Codex 2026-10-17 | [ERD / ROUTE-D01…08](../data/conversation-routing-erd.md), [preview](../data/conversation-routing-preview.html); 3 Mermaid renders + docs/browser/whitespace checks PASS; logical-only, physical/API/cutover gate remains separate; runtime RQ-01…10 NOT_RUN |
| PLAN-045 | Exact monolith Human routing, team skills, workload and performance acceptance gate | PLAN-044; SRC-083 | DONE | Codex 2026-10-17 | [Ready bounded contract/table templates/HR-01…10](../contracts/human-routing.md); logical scope reviewed against baseline ports; docs check PASS before source |
| SRC-084 | Human routing administration, automatic capacity dispatch, agent handling and performance report | PLAN-045; SRC-083 | DONE | Codex 2026-10-17 | [Evidence](details/SRC-084.md); HR-01…10 bounded monolith R1, 12 MySQL + 8 browser groups/10 screenshots, 11 regression groups, 393 unit tests/build/static PASS; mock transport, broader routing gates separate |

Git publication S-20261017-04: user authorized commit/push of accumulated SRC-081/082/083 and PLAN-037/038/039 work on main. Fresh unit/type/static checks in [execution log](log.md); no source task or acceptance status changed.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-039 | Group product capabilities by user goal/persona and establish presentation/documentation axis | PLAN-037; SRC-083 | DONE | Codex 2026-10-17 | [Capability map / DOC-G01…04](../product/capability-map.md); docs315/2762links/83source DAG + whitespace PASS; documentation-only, no runtime redesign |
| PLAN-037 | Compare workspace filters/views and routing queues; propose configuration/data separation | SRC-033; SRC-074; SRC-082 | DONE | Codex 2026-10-17 | [Research/evidence](../references/agent-workspace-queues-views.md); official sources + local inspection; research-only, no Ready contract/schema/source change |
| PLAN-038 | Exact custom Inbox builder and authorized discovery gate | PLAN-037; SRC-033; SRC-039; SRC-082 | DONE | Codex 2026-10-17 | [Scoped contract](../contracts/custom-inbox-builder.md); design-only |
| SRC-083 | Custom Inbox builder, preview, lifecycle/share and workspace integration | PLAN-038; SRC-033; SRC-039; SRC-082 | DONE | Codex 2026-10-17 | [Evidence](details/SRC-083.md); CIB-01…05 bounded v1;8native/13browser/builds/types PASS, no migration |

## No-code Object Platform — 2026-10-15

Git publication S-20261016-Record-Pages: user requested commit/push of SRC-079/080 source, specs and evidence. No implementation status change or new active task; see execution log/checkpoint.

Git publication S-20261015-Object-Platform: user requested commit/push of the completed Object Platform foundation and its plan/contracts/evidence. No implementation task/status change; remaining PLAN-028E and connected consumer gates retained. See execution log and checkpoint.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-036 | Conversation identity alignment gate | SRC-081 | DONE | Codex 2026-10-16 | [Ready contract](../contracts/conversation-identity.md); design-only |
| SRC-082 | Restore conversation_id across API, storage and workflows | PLAN-036; SRC-081 | DONE | Codex 2026-10-16 | [Evidence](details/SRC-082.md); CI-01…03;389unit/25native/10browser/builds PASS;forward34 preserves104tables |
| PLAN-035 | Thread identity, need enrichment and follow-up exact gate | SRC-078; SRC-080; SRC-066 | DONE | Codex 2026-10-16 | [Ready contract](../contracts/need-follow-up.md); design-only |
| SRC-081 | Canonical thread API, need assessment/AI adapter and workflow recovery | PLAN-035; SRC-078; SRC-080; SRC-066 | DONE | Codex 2026-10-16 | [Evidence](details/SRC-081.md); NF-01…07;386unit/24native/10browser/builds PASS;forward33 preserves100old tables |
| PLAN-034 | Exact record detail/preview and team-view design, table templates, native contracts | SRC-079; SRC-078 | DONE | Codex 2026-10-16 | [Ready contract](../contracts/record-pages.md), [UX](../ux/record-pages.md); user chose Default + team views; design-only |
| SRC-080 | Persisted record detail/preview builder, team views and runtime CRM/Inbox integration | PLAN-034; SRC-079; SRC-078 | DONE | Codex 2026-10-16 | [Evidence](details/SRC-080.md);RP-01…08;380unit/22native/32browser/builds PASS;forward32 preserves98old tables |
| SRC-079 | Layout cấu hình Đối tượng / Thuộc tính theo ảnh tham chiếu | SRC-074; SRC-078 | DONE | Codex 2026-10-16 | [Evidence](details/SRC-079.md);376unit/16native-browser/build/types/docs/lint PASS; OP-UI-01…05 bounded UI; không migration |
| PLAN-028 | Object & Properties, ERD, association, Agent Workspace và shared entity model cho Reporting/Workflow; Salesforce reference và staged delivery | SRC-010; SRC-011; SRC-013; SRC-065; SRC-072 | DONE | Codex 2026-10-15 | [Evidence](details/PLAN-028.md); inventory/UX/logical model/contracts/19AC/Salesforce references; docs/dependency checks, design-only; chưa claim implementation |
| PLAN-028A | Exact metadata/lifecycle/capabilities/association/placement contracts và filled table designs nếu cần | PLAN-028 | DONE | Codex 2026-10-15 | [Scoped Ready contract/table template](../contracts/object-platform-r1.md); docs283/2468links PASS; lifecycle beyond immutable baseline remains follow-up |
| SRC-073 | Object Platform catalog/capability backend và persisted workspace configuration | PLAN-028A; SRC-011; SRC-065 | DONE | Codex 2026-10-15 | [Evidence](details/SRC-073.md);9 focused unit,8 native/MySQL groups,build/schema PASS; scoped OP-01/02/03/08, immutable baseline; lifecycle/unlink remains PLAN-028E |
| SRC-074 | Object & Properties, ERD và dynamic Agent Workspace | SRC-073; SRC-013; SRC-039 | DONE | Codex 2026-10-15 | [Evidence](details/SRC-074.md);365unit/9native/11browser/builds, local30 preserved95tables; bounded config/CRUD/link UI; broader lifecycle remains PLAN-028E |
| PLAN-028E | Remaining metadata lifecycle/unlink/reverse labels/dependency-index/backfill exact gate | SRC-074 | TODO | unassigned | Preserves incomplete R1 scope; no archive/deprecation or unlink implementation inferred from SRC-073/074 |
| PLAN-028B | Exact connected CRM producer/projection/ACL/dynamic report model contract | SRC-074; SRC-058; SRC-063 | TODO | unassigned | Root/related grain, watermark/change coverage, physical design và SRC-049 overlap boundary |
| SRC-075 | Connected custom-object Report Builder và Dashboard report integration | PLAN-028B; SRC-074; SRC-058; SRC-059; SRC-072 | TODO | unassigned | OP-08…13; mock bindings preserved; SRC-059 remaining scope prerequisite |
| PLAN-028C | Exact custom-object Flow triggers/actions và distributed runtime source dependency inventory | SRC-075; PLAN-024E | TODO | unassigned | Phải liệt kê runtime source prerequisites trước SRC-076 READY |
| SRC-076 | Custom-object business Flow activation và durable execution | PLAN-028C; SRC-075; SRC-065; SRC-067 | TODO | unassigned | OP-08/13…17; thêm runtime prerequisite tasks từ PLAN-028C trước promote READY; không suy runtime từ design DONE |
| PLAN-028D | Exact bounded release/capacity/restore/compatibility matrix | SRC-076 | TODO | unassigned | Limits/retention và retained synthetic fixtures |
| SRC-077 | No-code platform retained-data E2E/recovery/upgrade release | PLAN-028D; SRC-076 | TODO | unassigned | OP-18/19 và integrated R1→R2→R3; runtime evidence required |

## Session fields / attribution evaluation — 2026-10-15

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-029 | Nghiên cứu Contact versus Session custom fields, respond.io/Chatwoot và attribution Facebook; khuyến nghị phạm vi | SRC-068; SRC-069; SRC-074 | DONE | Codex 2026-10-15 | [Research/evidence](details/PLAN-029.md);7official public pages, docs/links/DAG PASS; research-only, không đổi contract Ready/PLAN-028 hoặc claim source |
| PLAN-030 | Salesforce Messaging/Email-to-Case; object fields versus stage/Path/layout/validation | PLAN-029 | DONE | Codex 2026-10-15 | [Evidence/research](details/PLAN-030.md);17official source groups, docs/whitespace PASS; research-only, không đổi Ready contracts hoặc claim source |
| PLAN-031 | HubSpot Conversation versus Ticket pipeline, stage properties và Help Desk UX | PLAN-030 | DONE | Codex 2026-10-15 | [Evidence/research](details/PLAN-031.md); stage plus lifecycle ERD/threading/merge follow-up; docs checks in log; research-only, exact Facebook segmentation NOT_VERIFIED |
| PLAN-032 | Intercom conversation/ticket lifecycle và khuyến nghị quản lý nhiều lượt trao đổi | PLAN-031 | DONE | Codex 2026-10-15 | [Evidence/research](details/PLAN-032.md);11official sources, docs/whitespace PASS; recommendation only, no implementation or Ready-contract change |
| PLAN-033 | Chốt Thread/Conversation, thuộc tính theo phiên, related outcomes và truy hồi đóng góp khi chuyển owner | PLAN-032; SRC-068; SRC-069; SRC-074 | DONE | Codex 2026-10-15 | [Evidence/product contract](details/PLAN-033.md); CHG-20261015-04 user-approved, docs/whitespace PASS; original product-only evidence; follow-up PLAN-033A/SRC-078 below |
| PLAN-033A | Exact compatibility, Conversation fields/ownership history, related-outcome commands và reporting attribution gate | PLAN-033 | DONE | Codex 2026-10-16 | [Exact contract/table designs](../contracts/thread-conversation-implementation.md); docs298/2574 links/DAG77 PASS; runtime NOT_RUN |
| SRC-078 | Thread/Conversation episode classification, contribution history, transfer and related outcomes UI | PLAN-033A; SRC-069; SRC-074 | DONE | Codex 2026-10-16 | [Evidence](details/SRC-078.md);376unit/11native/24regression/9browser/9cold-bootstrap PASS; builds/types/static checks; forward31 preserves96tables; Ticket/connected Reporting gated |

## Customer 360 — 2026-10-13


| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| SRC-068 | Session continuity, Customer360 Lead/Deal context and duplicate consolidation | SRC-053; SRC-046; SRC-038 | DONE | Codex 2026-10-13 | [Evidence](details/SRC-068.md);333unit/11persistent MySQL/6healthcare/8native-browser; forward28 preserves86 tables; stage/milestones not included |

| PLAN-025 | Exact versioned session process/stage and subject-scoped milestone evidence/correction contract | SRC-068 | DONE | Codex 2026-10-14 | [Ready contract](../contracts/session-progress.md); exact API/coverage/correction/metric and six filled table designs reviewed |
| SRC-069 | Configurable pinned session stages, scoped milestone corrections and connected behavioral funnel | PLAN-025; SRC-068 | DONE | Codex 2026-10-14 | [Evidence](details/SRC-069.md); forward29 preserves89tables;345unit/13MySQL/11acquisition/6healthcare/8browser, builds/types PASS |

## Inbox demo dashboards — 2026-10-14

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-026 | Exact50-inbox scenario metrics and bounded private dashboard contract | SRC-069; SRC-057; SRC-058; SRC-063 | DONE | Codex 2026-10-14 | [Ready design](../contracts/inbox-demo-dashboards.md); user confirmed30accepted/20queued |
| SRC-070 | Seed50inbox case and saved operations/marketing dashboards in Report Builder | PLAN-026; SRC-069; SRC-057; SRC-058; SRC-063 | DONE | Codex 2026-10-14 | [Evidence](details/SRC-070.md); ID-01…05 verified; tenant super admin; actual Alpha 2 dashboards/11 widgets/CSV; 356unit,22native,5Alpha browser groups PASS |

## Dashboard / Reports redesign — 2026-10-14

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-027 | Dashboard home/menu, template creation, saved-report widgets: feature/component/data specification | PLAN-026; SRC-070 | DONE | Codex 2026-10-14 | [Evidence](details/PLAN-027.md); 10features/15components/data/API/14AC; docs/links/JSON/DAG/whitespace PASS; design-only for user review, no implementation claimed |
| PLAN-027A | Finalize executable Dashboard API/JSON schemas, DDL, template manifests after design review | PLAN-027 | DONE | Codex 2026-10-14 | [Ready gate](../contracts/dashboard-implementation.md); generator drift/strict Ajv PASS; forward004 designed, runtime evidence follows |
| SRC-071 | Dashboard own-service persistence/API, atomic templates and legacy conversion | PLAN-027A; SRC-057; SRC-058; SRC-063; SRC-070 | DONE | Codex 2026-10-14 | [Evidence](details/SRC-071.md);11native groups/4unit/builds PASS; forward004 local/test preserves13tables; capacity/release separate |
| SRC-072 | Separate Dashboard/Reports UI, home/gallery/canvas/saved-report picker/library/editor | SRC-071 | DONE | Codex 2026-10-15 | [Evidence](details/SRC-072.md); publication review362unit/12native/15browser, builds/types PASS; future-shape and stale-modal fixes; broader Reporting/a11y audit separate |

## Công việc chuẩn bị

Final ERD second review 2026-10-13 · Codex · DONE (design review only), CHG-20261013-09. [ERD section7](../data/chat-sales-erd.md) records five findings and scenarios9–13; core model retained, origin/create wording corrected. Docs254/2146 links/whitespace PASS, Mermaid not rendered, runtime NOT_RUN. Exact subject/context/evidence/lifecycle gates remain; no replacement implementation or business-policy approval inferred.

Final Chat/Sales ERD 2026-10-13 · Codex · DONE (logical design only), CHG-20261013-08. [Canonical ERD](../data/chat-sales-erd.md): session-preserving Ad touches, versioned stage/milestone history, Lead/Deal origin and follow-up links. Docs254/2140 links and whitespace PASS; Mermaid headers checked, not rendered. No physical schema/runtime change, next-scope scenarios NOT_RUN; exact replacement contract not Ready.

Inbox-session clarification 2026-10-13 · Codex · DONE (design clarification only), CHG-20261013-07. User accepts keeping an open session on a new ad touch and requires conversion measurement by inbox episode. Accepted rule and proposed metric semantics recorded; docs253/2121 links/whitespace PASS, runtime NOT_RUN/unchanged, replacement exact contract not Ready.

Chat/Sales model critique 2026-10-13 · Codex · DONE (review only), CHG-20261013-06. [Findings](../data/chat-sales-model-review.md) compare current SRC-045/046/053 with official CRM/inbox docs; docs253/2116 links and whitespace PASS, runtime scenarios NOT_RUN. Recommendations remain proposed, no source implementation or business-policy change.

ERD review 2026-10-13 · Codex · DONE (documentation only), CHG-20261013-05. Đối chiếu Conversation → acquisition session → Lead → Deal với SRC-045/046/053 DONE, sửa mô tả/tên trường cũ; docs252/2104 links và scoped whitespace PASS, Mermaid chưa render. Runtime tests NOT_RUN; không claim source task hoặc thay đổi nghiệp vụ. Evidence trong execution log.

### Workflow CMS / execution architecture — 2026-10-13

SRC-067 DONE scoped · Codex 2026-10-13 · dependency SRC-066 DONE. Real visual builder requested by user; [evidence](details/SRC-067.md), CHG-20261013-04. No active source task; distributed Kafka gates retained.

Operations2026-10-13 14:07 Asia/Saigon: Codex completed user-requested local service restart and Alpha Workflow smoke. No source task/status change. Runtime evidence in artifacts/workflow-visual-builder/services-start.json; see execution log/checkpoint.

CHG-20261013-02: user yêu cầu triển khai Workflow tuần tự. SRC-064 requeued READY, giữ mọi evidence và Alpha activation gate; không task source song song. PLAN-024A được claim để chốt scope trước source.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| SRC-067 | Visual Workflow canvas, ports, palette, inspector, layout/history | SRC-066 | DONE | Codex 2026-10-13 | [Evidence](details/SRC-067.md);332unit/42files,8native groups/11browser checks,workspace types/Next build; screenshots desktop/mobile inspected; layout device-local |
| PLAN-024 | Kiểm kê Workflow hiện hữu; kiến trúc Web/API/Core, Kafka object changes, shared CRM metadata, node/action catalog và kế hoạch thiết kế | PLAN-005; SRC-019; SRC-050 | DONE | Codex 2026-10-13 | [Evidence](details/PLAN-024.md); design-only, docs/link/DAG/lint/whitespace PASS; runtime mới NOT_RUN |
| PLAN-024A | Exact shared CRM metadata/binding/query và producer capability catalog | PLAN-024 | DONE | Codex 2026-10-13 | [Scoped contract](../contracts/workflow-catalog.md); document review and docs check PASS; producer capability gaps explicit, no source/runtime completion claim |
| PLAN-024B | Exact Kafka object-change/change-image/enrollment/replay/security | PLAN-024A | READY | unassigned | Ready to design after native catalog slice; producer coverage/schema/topic/sequence/activation boundary/retention và anti-cycle before source |
| PLAN-024C | Exact Workflow API/Core control/auth/table templates/migrations | PLAN-024B | TODO | unassigned | OpenAPI, native scopes, publish saga, two private schemas, per-table filled templates và compatibility |
| PLAN-024D | Exact node/action execution, related records và communication adapters | PLAN-024C | TODO | unassigned | Typed inputs/outputs, CAS/partial receipts, routing, delay/branch/wait, provider authority/reconcile |
| PLAN-024E | CMS UX, scoped source backlog và distributed release/cutover | PLAN-024D | TODO | unassigned | API-backed screens, keyboard/mobile, persistent synthetic fault tests, single starter/drain/restore |
| SRC-065 | Native shared CRM Workflow catalog và typed Core authoring validator | PLAN-024A; SRC-038; SRC-019; SRC-053 | DONE | Codex 2026-10-13 | [Evidence](details/SRC-065.md);325 unit,8 native HTTP/MySQL groups, builds/types/schema/drift PASS; WF-01/02/07/13 metadata/validator only, runtime/Kafka/CMS still pending |
| PLAN-024F | Scoped M2 Workflow CMS, native discovery/validation and local activation design | SRC-019; SRC-020; SRC-021; SRC-038 | DONE | Codex 2026-10-13 | [Ready contract](../contracts/workflow-cms-m2.md); CHG-20261013-03, existing storage/graph retained; distributed gates unchanged |
| SRC-066 | Workflow menu, node editor, saved versions/publish/enable and local UI release | PLAN-024F; SRC-019; SRC-020; SRC-021; SRC-038; SRC-039 | DONE | Codex 2026-10-13 | [Evidence](details/SRC-066.md);328unit,8native/browser groups,backend/Next build,workspace types/schema/drift PASS; local menu/API live, user-approved Alpha Workflow Admin; distributed scope remains PLAN-024B…E |

| ID | Công việc | Status | Owner | Evidence |
|---|---|---|---|---|
| PLAN-001 | Build plan, Docker plan, tracker, checkpoint và change-control guideline | DONE | Codex phiên 2026-10-02 | S-20261002-01; docs/link/task dependency checks PASS; source chưa sinh |

## M1 — Foundation

| ID | Deliverable | Deps | Status | Owner | Gate / acceptance cụ thể | Evidence |
|---|---|---|---|---|---|---|
| SRC-001 | Khóa toolchain, bổ sung physical/auth/schema contracts | — | DONE | Codex 2026-10-02 | Version manifest/ADR; auth routes+session TTL; DB constraints/order; source Ready gap review; docs check pass | details/SRC-001.md |
| SRC-002 | pnpm monorepo, Next/Nest API+worker, contracts/testkit | SRC-001 | DONE | Codex 2026-10-02/03 | Install frozen, typecheck/build, health shell; schemas/client generation reproducible; chưa gọi là CRM hoàn chỉnh | details/SRC-002.md |
| SRC-003 | Dockerfiles, Compose dev/release/test, gateway, local IdP | SRC-002 | DONE | Codex 2026-10-03 | Compose config/health, loopback expose, non-root app images; stop/start giữ volume; không secret trong image | details/SRC-003.md |
| SRC-004 | Migration runner + unit of work + tenant repository kernel | SRC-003 | DONE | Codex 2026-10-03 | Cold migration, rerun no-op, composite tenant FK thử nghiệm; MySQL DDL partial failure được ghi nhận; không auto-sync | details/SRC-004.md |
| SRC-005 | Portable verify scripts + CI workflow + docs/schema checks | SRC-004 | DONE | Codex 2026-10-03 | Local CI tương đương chạy được; lint/type/unit/build/link/schema checks; remote CI NOT_RUN nếu chưa có remote | details/SRC-005.md |
| SRC-006 | OIDC login/callback/logout/session/CSRF | SRC-005 | DONE | Codex 2026-10-03 | Browser login thật với Keycloak dev, PKCE/state/nonce, public issuer/private backchannel; CSRF negative/logout/session expiry | details/SRC-006.md |
| SRC-007 | Membership/seat/role/team/principal, quyền và admin API | SRC-006 | DONE | Codex 2026-10-03 | AC-01/02: own/team/all, field deny, tenant switch, last admin guard; authorization revision live check | details/SRC-007.md |
| SRC-008 | Hoàn thiện audit/idempotency, outbox relay/inbox, worker leases | SRC-007 | DONE | Codex 2026-10-03 | AC-05 foundation, AC-12; transaction atomic, duplicate consume, replay response rights, lease fencing | details/SRC-008.md |
| SRC-009 | Bootstrap/seed hai tenant, users/roles/service actors | SRC-008 | DONE | Codex 2026-10-04 | Alpha/Beta fixtures idempotent, không hard-code secret; dev guard; login mỗi tenant và negative cross-tenant | details/SRC-009.md |
| SRC-010 | Object/record registry, ownership history, association | SRC-009 | DONE | Codex 2026-10-04 | Same-tenant FK/cardinality/CAS; record+subtype atomic; source/target permission tests | details/SRC-010.md |
| SRC-011 | Properties, custom values/index, form/view API | SRC-010 | DONE | Codex 2026-10-04 | AC-04/M1 và AC-13/M1; validation, index rollback, query ACL; Appointment/ServiceOffering generic CRUD | details/SRC-011.md |
| SRC-012 | Contact/Company/Activity + Lead core/draft/qualification | SRC-011 | DONE | Codex 2026-10-04 | AC-03/M1, AC-09 phần qualification; nhiều Lead/Contact; consent evidence; reserved session creation interface; handoff triển khai SRC-021 | details/SRC-012.md |
| SRC-013 | Admin/CRM UI và M1 release gate | SRC-012 | DONE | Codex 2026-10-04 | Browser login→tenant→custom/standard record; permission/error states; M1 AC sub-scopes pass; Docker cold/warm demo | details/SRC-013.md |

## M2 — Mock vertical slice

| ID | Deliverable | Deps | Status | Owner | Gate / acceptance cụ thể | Evidence |
|---|---|---|---|---|---|---|
| SRC-014 | Conversation/message domain, outbound intent/mock sender | SRC-013 | DONE | Codex 2026-10-04 | Một active Conversation/identity, owner-only send, notes; status queued/sending/sent/unknown; ports cho intake | details/SRC-014.md |
| SRC-015 | Mock Messenger intake, identity resolution, attribution | SRC-014 | DONE | Codex 2026-10-04/05 | AC-05; durable ACK, duplicate event/message, same-key different-payload conflict; missing referral vẫn hoạt động | details/SRC-015.md |
| SRC-016 | Chat inbox UI, timeline, note, quick reply, polling | SRC-015 | DONE | Codex 2026-10-05 | Queue/detail/context; loading/error/forbidden/owner stale; API-backed timeline, không static mock UI thay backend | details/SRC-016.md |
| SRC-017 | Routing/capability/capacity, assignment/takeover | SRC-016 | DONE | Codex 2026-10-05 | AC-06; round-robin concurrency, unassigned fallback, owner independence; cancel intent khi đổi owner | details/SRC-017.md |
| SRC-018 | Agent Runtime adapter + deterministic mock + tools | SRC-017 | DONE | Codex 2026-10-05 | AC-07 runtime sub-scope; tool allowlist, deadline, auth/owner revocation, timeout, late result reject; session harness riêng khỏi API public | details/SRC-018.md |
| SRC-019 | Workflow graph/version/run/step/wait engine | SRC-018 | DONE | Codex 2026-10-05 | AC-08/16 engine; publish validation, pin version, action key, fencing, lost-signal prevention; Chatflow port contract fake trong test | details/SRC-019.md |
| SRC-020 | Chatflow/session/turn và Human completion | SRC-019 | DONE | Codex 2026-10-05 | AC-07/08/16; first message không mất, consent explicit, paused_human giữ dữ liệu, single Lead/session; nối Workflow thật | details/SRC-020.md |
| SRC-021 | Sales handoff/acceptance API và workflow action | SRC-020 | DONE | Codex 2026-10-05 | AC-09/15; Contact share đúng team, hai Sales race chỉ một thắng, queue khi không eligible, 15 phút attention | details/SRC-021.md |
| SRC-022 | Sale queue/detail và operations/run UI | SRC-021 | DONE | Codex 2026-10-05 | Nhận Lead bằng command thật, link CRM có quyền, failed delivery/retry an toàn, run timeline sanitized | details/SRC-022.md |
| SRC-023 | Healthcare fixtures xuyên luồng + metric queries | SRC-022 | DONE | Codex 2026-10-05 | AC-09, AC-11/M2; dataset KPI đúng 12/4/3 và 2/3; deterministic clock; có walkthrough từ volume trống | details/SRC-023.md |
| SRC-024 | Regression/fault/race/permission integration suite | SRC-023 | DONE | Codex 2026-10-06 | AC-01/02 regression + AC-05…09/12/15…18 thuộc M2; crash/restart/out-of-order/Redis outage/in-flight send | details/SRC-024.md |
| SRC-025 | Release images, upgrade smoke, M2 demo và handoff | SRC-024 | DONE | Codex 2026-10-06 | Cold start + M1→M2 migration, data giữ qua restart, native/multi-arch evidence rõ, docs sync và gate report; không production deploy | details/SRC-025.md |

## Mapping về backlog gốc

| Backlog | Source tasks |
|---|---|
| B-01 | SRC-001…005 |
| B-02 | SRC-006…007, SRC-009 |
| B-03 | SRC-010…013 |
| B-04 | SRC-008 |
| B-05 | SRC-015 |
| B-06 | SRC-014, SRC-016 |
| B-07 | SRC-017…018 |
| B-08 | SRC-019…020 |
| B-09 | SRC-021…022 |
| B-10 | SRC-023…025 |

Conversation port/domain đi trước intake để giải dependency; Workflow test port trước rồi nối Chatflow thật, không dùng circular imports như cách giải mặc định. Audit/unit-of-work interface nằm kernel từ scaffold, persisted audit đã có từ SRC-007, relay/inbox/fencing và privilege hardening hoàn thiện SRC-008 trước domain mutations sản phẩm.

## Backlog sau M2

### Chuẩn bị thiết kế M3

| ID | Deliverable | Deps | Status | Owner | Evidence / gate |
|---|---|---|---|---|---|
| PLAN-002 | Định hướng AI Agent provider, CRM Connector, message đa nền tảng; snapshot Meta khởi đầu và kế hoạch design gate | SRC-025 | DONE | Codex 2026-10-06 | [Evidence](details/PLAN-002.md); doc-only, không triển khai provider |
| PLAN-003 | Hoàn thiện provider dossier và capability/gap matrix Meta | PLAN-002 | DONE | Codex 2026-10-06 | [Evidence](details/PLAN-003.md);56 source snapshots, capability/gap matrix, sandbox NOT_RUN |
| PLAN-004 | Exact M3 contracts/data/UX/AC và source backlog (phần còn lại) | PLAN-003 | TODO | unassigned | Scope thiết kế theo [M3 plan](../planning/m3-provider-plan.md); live routing/tools giữ Draft khi G-04/05/08 chưa giải quyết |


| Epic | Status | Gate trước khi chia task source |
|---|---|---|
| M3 — AI Agent providers + CRM Connectors/routing + rich messages | TODO / design gate | PLAN-002/003/004A/004B DONE, SRC-026/027 DONE; PLAN-004 remaining TODO; [M3 plan](../planning/m3-provider-plan.md); production contract/sandbox chưa Ready |
| M4 — Deal/Customer/Appointment/Google Ads/Ticket | TODO / design gate | Chi tiết module Draft, SLA/calendar, conversion/reopen và migration |
| M5 — Builders/custom reports/templates | TODO / design gate | Graph/query limits, schema version migration, report ACL/grain, UX authoring |

Không tính các epic này vào 25 task source M1–M2; không tạo thời hạn giả. Khi scope đổi, ghi CHG và cập nhật dependency/roadmap; task bị bỏ dùng CANCELLED kèm replacement.

## Quy tắc evidence

Mỗi DONE trỏ session log hoặc task detail có command/result/artifact, docs changed và remaining risks. Commit/PR chỉ ghi khi thực sự có; working-tree reference hợp lệ khi chưa commit. Dashboard tiến độ báo số task DONE và milestone gate, không suy diễn % chức năng từ số dòng code.

## Defect regression

DEF-001 DONE (Codex 2026-10-04): concurrent session touch gây AUTH_SESSION_BUSY; bounded wait + live reread/CAS đã qua unit và real Chrome M1. CHG-20261004-06; [evidence SRC-013](details/SRC-013.md). Không tính thêm vào 25 source tasks.

## M3 foundation

PLAN-004 được tách gate nhỏ theo CHG-20261006-05; phần còn lại không được tính DONE.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-004A | Exact legacy message envelope projection | PLAN-003 | DONE | Codex 2026-10-06 | [Design](../contracts/message-envelope-v2.md) |

Source backlog: SRC-026 legacy projection → thiết kế rich persistence/renderer và connector ports thuộc PLAN-004 → chia source tasks sau khi Ready. Provider config/binding, Messenger transport, WA routing và hosted tools giữ design gate riêng, không gom vào SRC-026.

| ID | Deliverable | Deps | Status | Owner | Gate / acceptance cụ thể | Evidence |
|---|---|---|---|---|---|---|
| SRC-026 | Legacy text message envelope v2 API | SRC-025 | DONE | Codex 2026-10-06 | PLAN-004A DONE; AC-05/M3 text foundation, tenant/field ACL, history/cursor compatibility | details/SRC-026.md |

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-004B | Rich content storage và passive renderer | SRC-026 | DONE | Codex 2026-10-06 | [Contract](../contracts/rich-messages.md); không bao gồm remote media resolver |

| ID | Deliverable | Deps | Status | Owner | Gate / acceptance cụ thể | Evidence |
|---|---|---|---|---|---|---|
| SRC-027 | Normalized rich mock storage/API/passive inbox | SRC-026 | DONE | Codex 2026-10-06 | PLAN-004B DONE; rich roundtrip/ACL/Chatflow isolation/schema18 | details/SRC-027.md |

## Enterprise microservices direction

| ID | Deliverable | Deps | Status | Owner | Evidence / gate |
|---|---|---|---|---|---|
| PLAN-005 | Service boundaries, per-service scope/architecture/data, contracts và extraction roadmap | SRC-027 | DONE | Codex 2026-10-06 | [Evidence](details/PLAN-005.md); doc-only, không claim services đã deploy |

| ID | Deliverable | Deps | Status | Owner | Evidence / gate |
|---|---|---|---|---|---|
| PLAN-006 | Exact Connector→CRM/Chat contracts, auth/revocation/dispatch fences, broker và data extraction specification (remaining) | PLAN-005 | TODO | unassigned | Design task theo [extraction roadmap](../planning/microservices-migration.md); full domain extraction vẫn TODO |

| ID | Deliverable | Deps | Status | Owner | Evidence / gate |
|---|---|---|---|---|---|
| PLAN-006A | Exact independent Connector durable HTTP ingress bridge | PLAN-005 | DONE | Codex 2026-10-06 | [Contract](../contracts/connector-bridge.md); scoped prerequisite, remaining006 not DONE |

| ID | Deliverable | Deps | Status | Owner | Gate | Evidence |
|---|---|---|---|---|---|---|
| SRC-028 | Independent Connector durable HTTP ingress | SRC-027; PLAN-006A | DONE | Codex 2026-10-06 | PLAN-006A DONE; own DB, HTTP binding, retry/fencing và rich roundtrip | details/SRC-028.md |

## M3 local completion — S-20261006-11

User yêu cầu hoàn thiện M3, chọn hoàn thiện/kiểm thử local trước vì chưa có Meta sandbox. Không bỏ các AC provider thật; release local và sandbox ghi riêng.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-004C | Exact Messenger signed durable webhook capture, Page binding, normalization and quarantine | SRC-028; PLAN-003 | DONE | Codex 2026-10-06 | Contract trước source; không forward real events qua mock bridge |
| SRC-029 | Messenger signed ingress, own schema2, atomic batch/dedup and local HTTP/MySQL tests | SRC-028; PLAN-004C | DONE | Codex 2026-10-06 | [Evidence](details/SRC-029.md);185 MySQL,9 canonical gates, image/restart PASS |

Remaining M3 local work: versioned Chat ingestion and dispatch/control fences (PLAN-006), provider catalog/lifecycle and capability UI, authenticated media, local provider/control fault simulation and release gate. Live eligibility/WA control and mutable hosted tools remain blocked by G-04/05/08 and unavailable sandbox. These are not completed by SRC-029.

## Contact resolution responsibility design

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-006B | Connector enrichment/cache, CRM canonical identity resolution, required crm_contact_id in Chat message contracts | PLAN-005; SRC-029 | DONE | Codex 2026-10-06 | [Evidence](details/PLAN-006B.md); doc-only, not full PLAN-006/source readiness |

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-006C | Cache-aside DB lookup for Chat/Connector; create Contact+identity only on confirmed mapping miss | PLAN-006B | DONE | Codex 2026-10-06 | [Evidence](details/PLAN-006C.md); design only |

## Cache-aside implementation

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-006D | Exact scoped cache-aside compatibility API and immutable mapping gate | PLAN-006C; SRC-029 | DONE | Codex 2026-10-06 | Scope existing mock connections, no domain extraction/provider relabel |

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| SRC-030 | CRM lookup/resolve + Connector/Chat cache-aside + contact-bound message APIs | PLAN-006D; SRC-029 | DONE | Codex 2026-10-06 | [Evidence](details/SRC-030.md);188 MySQL,89 unit,9 gates and image smoke PASS |

## Facebook configuration and unified channel views

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-004D | Exact OAuth/Page credential catalog and conversation channel contract | SRC-030; PLAN-003 | DONE | Codex 2026-10-06 | [Contract](../contracts/facebook-configuration.md) |
| SRC-031 | Facebook OAuth/Page admin, encrypted credentials and channel-aware inbox | PLAN-004D; SRC-030 | DONE | Codex 2026-10-06 | [Evidence](details/SRC-031.md);196 MySQL,96 unit,9 gates, browser/gateway PASS; live Meta NOT_RUN |

## Local development environment

| ID | Deliverable | Deps | Status | Owner | Evidence |
|---|---|---|---|---|---|
| ENV-001 | Initialize Windows local development stack and verify toolchain, migration, fixtures and health | SRC-031 | DONE | Codex 2026-10-06 | [Evidence](details/ENV-001.md); S-20261006-17 |
| ENV-003 | Persistent local infra, host env per unit, independent service monitor | ENV-001 | DONE | Codex 2026-10-07 | [Evidence](details/ENV-003.md); Windows runtime/retention verified, source22 readiness and macOS/Linux runtime not claimed |

## Agent Chat workspace redesign

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| UX-001 | Viết lại đặc tả UX Chat theo ảnh layout người dùng cung cấp | SRC-031 | DONE | Codex 2026-10-06 | [Evidence](details/UX-001.md); design-only, layout Ready trên API hiện có; UI chưa rebuild |
| UX-002 | Hoàn thiện product/contract/data design cho metrics, unread, custom inbox, snooze, tags và activity theo sample | UX-001; SRC-031 | DONE | Codex 2026-10-06 | [Evidence](details/UX-002.md); contract/data/UX Ready design, SRC-032…037 TODO; runtime NOT_RUN |

Source backlog dưới đây theo [workspace build plan](../planning/agent-chat-workspace.md); SRC-032/033/034 DONE backend, tiếp theo SRC-035; các task sau chờ dependency. Không thay evidence của SRC-001…031.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| SRC-032 | Workspace sequence/read-state, queue query và ACL metrics | SRC-031; UX-002 | DONE | Codex 2026-10-06 | [Evidence](details/SRC-032.md);203 MySQL,99 unit, canonical9/9 PASS; backend sub-scope UX-CHAT-13/14/15/19/22 |
| SRC-033 | Saved/shared inbox, conversation tags và snippets | SRC-032 | DONE | Codex 2026-10-06 | [Evidence](details/SRC-033.md);209 MySQL +13 final workspace/102 unit/canonical9/9 PASS; UX-CHAT-16/17/21 backend |
| SRC-034 | Durable snooze, activity projection và source notifications | SRC-033 | DONE | Codex 2026-10-06/07 | UX-CHAT-18/20/22 backend; final regression222 PASS trong SRC-038; [Evidence](details/SRC-034.md) |
| SRC-035 | CRM Contact context metadata và channel identities/navigation | SRC-034 | TODO | unassigned | UX-CHAT-21, field/tenant ACL; runtime NOT_RUN |
| SRC-036 | App shell/grouped nav + Inbox UX-004 và workspace contracts | SRC-035; UX-004 | TODO | unassigned | UX-APP-01…08 + UX-CHAT-01…22; runtime NOT_RUN |
| SRC-037 | Workspace upgrade/regression/restart và local release gate | SRC-036 | TODO | unassigned | Data preservation/flags/rollback/synthetic demo; runtime NOT_RUN |

## Local workspace database upgrade

| ID | Deliverable | Deps | Status | Owner | Evidence |
|---|---|---|---|---|---|
| ENV-002 | Backup, quiesced local schema19 to21 upgrade and runtime verification | SRC-033; ENV-001 | DONE | Codex 2026-10-06 | [Evidence](details/ENV-002.md); local only, not SRC-037 release |

## Native Identity và chuẩn schema

| ID | Deliverable | Deps | Status | Owner | Evidence / gate |
|---|---|---|---|---|---|
| PLAN-007 | Remove Keycloak from target design; native Identity, schema catalog, mandatory tenant_id and DB design template | PLAN-005; ENV-003 | DONE | Codex 2026-10-07 | [Evidence](details/PLAN-007.md); design-only at PLAN-007; source/cutover delivered separately by SRC-038 |
| PLAN-007A | Exact native auth API/UX/DDL, credential library, tenant journal retrofit and cutover gates | PLAN-007 | DONE | Codex 2026-10-07 | [Plan](../planning/native-identity-data-plan.md); before source claim |
| PLAN-007B | Per-service schema extraction manifests and scoped migration/grants/reconciliation contracts | PLAN-007; PLAN-006 | TODO | unassigned | [Plan](../planning/native-identity-data-plan.md); no cross-service SQL/FK |

| SRC-038 | Native MySQL authentication, tenant-column retrofit and local Keycloak cutover | SRC-033; PLAN-007A | DONE | Codex 2026-10-07 | [Evidence](details/SRC-038.md);222 MySQL/16 native/104 unit, browser/ACL/restart, build and local data preservation PASS; physical extraction pending |

## App shell và Inbox UX — 2026-10-07

| ID | Deliverable | Deps | Status | Owner | Evidence / gate |
|---|---|---|---|---|---|
| UX-003 | Nghiên cứu IA, app shell/header/tabs/nav, UX guidelines và đặc tả + mock Inbox | UX-002; SRC-038 | DONE | Codex 2026-10-07 | [Evidence](details/UX-003.md); design/mock only;33 prototype assertions + docs/whitespace PASS; app runtime NOT_RUN |

| UX-004 | Bỏ tab bar dưới header, cập nhật shell/Inbox mock và đặc tả | UX-003 | DONE | Codex 2026-10-07 | [Evidence](details/UX-004.md);31 prototype checks PASS, không đổi UI runtime |

| SRC-039 | Approved no-tab app shell and API-backed Inbox presentation on existing contracts | SRC-034; SRC-038; UX-004 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-039.md); native API browser9 groups/6 viewports,104 unit tests and web build PASS; full SRC-035/036/037 retained separately |

| SRC-040 | Conversation need_response projection and list response-state labels | SRC-039 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-040.md);10 browser groups/6 viewports,106 unit tests, types/contracts/schema/lint PASS |

| SRC-041 | Reset response assessment to unknown on inbound; define Assist boundary | SRC-040 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-041.md);10 browser groups/107 unit/31 prototype checks PASS; Assist adapter remains PLAN-008 |

| PLAN-008 | Exact typed Conversation next-action and rule/Assist orchestration contracts | UX-006; SRC-042; SRC-043; SRC-044 | TODO | unassigned | [Product rules](../ux/agent-assist-response.md); two-part scope; Conversation action independent of AI, orchestration integration Draft |

| UX-005 | Separate Conversation suggestions from Workflow/Chatflow orchestration and Assist permissions | SRC-041 | DONE | Codex 2026-10-07 | [Evidence](details/UX-005.md); product design only, exact action/orchestration contracts PLAN-008 TODO |

| UX-006 | Generalize Conversation list classification to next_action.type | UX-005 | DONE | Codex 2026-10-07 | [Evidence](details/UX-006.md); four type mappings and legacy compatibility design, runtime unchanged |

## Automation frameworks before Chat integration — 2026-10-07

User-prioritized sequence; [framework plan](../planning/automation-frameworks.md). Existing M2 engines are baseline, not evidence these framework scopes are complete. PLAN-008 waits for all three framework source gates.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-009 | Baseline gap review and exact Workflow/Chatflow/AI Agent framework scopes | UX-006; SRC-018; SRC-019; SRC-020; SRC-050 | TODO | unassigned | PLAN-024 supplies Workflow architecture/gap review only; exact PLAN-024A…E and remaining Chatflow/AI scopes still required; no SRC-042 readiness claim |
| SRC-042 | Workflow framework on existing engine | PLAN-009; SRC-019; SRC-065 | TODO | unassigned | SRC-065 metadata/validator foundation delivered; remaining exact PLAN-024B…E/PLAN-009 scopes and definition/action/trigger/auth/runtime tests still required |
| SRC-043 | Chatflow framework on Workflow foundation | SRC-042; SRC-020 | TODO | unassigned | Exact PLAN-009 scope; session/node/context/action lifecycle tests |
| SRC-044 | AI Agent definition/skill/permission/execution framework | SRC-043; SRC-018 | TODO | unassigned | Exact PLAN-009 scope; structured results and suggestion-only Assist guard tests |

## CRM base first — 2026-10-07

CHG-20261007-12 supersedes immediate framework-first priority. [CRM base plan](../planning/crm-base-outcomes.md) and [source rules](../contracts/crm-source-attribution.md): manual Lead/Deal, primary Conversation→Lead path, immutable system channel/Page/ad attribution and separate editable declared source. Sales owns Lead/Deal; CRM base is platform scope, not a transfer of all domain ownership into CRM Core. Scoped implementation uses PLAN-011A; remaining scopes still require PLAN-011.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| PLAN-010 | CRM base priority, outcome scope, immutable attribution product rules and source backlog | SRC-041; UX-006 | DONE | Codex 2026-10-07 | Design-only; S-20261007-15; docs links/DAG and whitespace PASS; runtime NOT_RUN |
| PLAN-011 | Exact CRM base domain/API/UI/data/ACL/migration/report design | PLAN-010 | TODO | unassigned | Scoped specs Ready before source; baseline gap review and table templates required |
| SRC-045 | Manual/Conversation Lead creation, immutable attribution and declared source UI/API | PLAN-011A; SRC-041 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-045.md);4 MySQL groups/native browser/107 unit/typechecks PASS |
| SRC-046 | Manual Deal and Lead→Deal pipeline, won/lost and Customer lifecycle | SRC-045 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-046.md); scoped terminal won/lost,6 MySQL groups/browser PASS |
| SRC-047 | Ticket basic commands, queue/detail, ownership and lifecycle | SRC-049 | TODO | unassigned | CRM-BASE-05; advanced SLA stays Draft, not full AC-10 |
| SRC-048 | Deal-linked collected-money evidence, partial receipts and refund/reversal | SRC-047 | TODO | unassigned | CRM-BASE-06; manual evidence, audit/idempotency; no implied payment integration |
| SRC-049 | Connected Reporting adapters and reusable Marketing/CRM templates release | SRC-051; SRC-053; SRC-055; SRC-062; PLAN-022 | TODO | unassigned | CRM-BASE-07/RB-17; [builder plan](../planning/report-builder.md); authorized producer APIs/events, source reconciliation/ACL/coverage; live Meta evidence separate |
| SRC-050 | Lead/Deal organic Page won-value local release | SRC-052 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-050.md);222 MySQL/109 unit/9 canonical gates/browser/restart PASS; full CRM-BASE-08/Ticket/receipts deferred |
| PLAN-012 | Marketing hierarchy ownership and campaign grouping refinement | PLAN-010 | DONE | Codex 2026-10-07 | S-20261007-16; docs links/DAG/whitespace PASS, product design only; runtime NOT_RUN |
| SRC-051 | Periodic Facebook hierarchy/Creative/targeting sync and Marketing lookup/events | PLAN-011E; SRC-050; SRC-054; SRC-056 | READY | Codex 2026-10-08 | Requeued2026-10-10 for user-prioritized Reporting slices, not completed; [preserved progress](details/SRC-051.md): schema3/scheduler/change store verified, producer/API/worker pending; CHG-20261010-02 |

| PLAN-011A | Exact Lead/Deal and organic Page won-value scoped contract | PLAN-010; PLAN-012 | DONE | Codex 2026-10-07 | [Design](../contracts/organic-sales-base.md); document review, full PLAN-011 remains TODO |
| SRC-052 | Organic won-value report by Page with currency/date/ACL and browser flow | SRC-046 | DONE | Codex 2026-10-07 | [Evidence](details/SRC-052.md);8 MySQL groups/native browser and109 unit PASS |
| PLAN-013 | Marketing conversion performance purpose and dimension/metric requirements | PLAN-012; SRC-050 | DONE | Codex 2026-10-07 | [Requirements](../planning/marketing-conversion-performance.md); product design only, exact contracts remain PLAN-011 |
| PLAN-014 | Official Meta Marketing Markdown dossier and CRM field mapping | PLAN-013 | DONE | Codex 2026-10-07 | [Evidence](details/PLAN-014.md);24 official Markdown/raw pairs,103 traced fields; logical merge only, PLAN-011 physical/API gate remains |
| PLAN-015 | Marketing logical ERD for review | PLAN-014 | DONE | Codex 2026-10-08 | [ERD](../data/marketing-erd.md); logical review artifact only, physical DDL remains PLAN-011 |
| PLAN-016 | Add Facebook Page and Instagram identity/post relationships to Marketing ERD | PLAN-015 | DONE | Codex 2026-10-08 | [ERD](../data/marketing-erd.md); actor/post/media refs and observed links, logical only |
| PLAN-017 | Merge Marketing core and Page/Instagram ERDs | PLAN-016 | DONE | Codex 2026-10-08 | [Combined ERD](../data/marketing-erd.md);16 entities/19 unique relations, docs/whitespace PASS |
| PLAN-018 | Page–Conversation–Session acquisition model and CRM lineage | PLAN-017 | DONE | Codex 2026-10-08 | [Product contract](../contracts/conversation-acquisition-session.md); ERD/compatibility only, runtime gate SRC-053 |
| SRC-053 | Conversation acquisition sessions, message membership and session-based Lead/Deal lineage | PLAN-011B; SRC-050 | DONE | Codex 2026-10-08 | [Evidence](details/SRC-053.md): schema26, sessions/API/UI/Lead–Deal source,223 MySQL/9 gates,local browser/restart; campaign reporting remains SRC-049 |
| PLAN-011B | Exact scoped acquisition session API/data/lifecycle design | PLAN-018; SRC-050 | DONE | Codex 2026-10-08 | [Ready contract](../contracts/acquisition-session-implementation.md); table templates/review complete, broader PLAN-011 remains |

| PLAN-019 | Meta-native Marketing operating flow and CRM outcome join; remove manual taxonomy | PLAN-014; SRC-053 | DONE | Codex 2026-10-08 | [Operating flow](../contracts/marketing-operating-flow.md); ERD/mapping/ownership/AC synced; docs191/1364 links PASS; runtime unchanged, exact sync/Insights remains PLAN-011 |

| PLAN-020 | Separate Meta breakdown, CRM conversion and joined ad performance reports | PLAN-019 | DONE | Codex 2026-10-08 | CHG-20261008-06; operating contract/ERD/reporting/mapping/AC synced; docs191/1372 links and whitespace PASS; design-only |

| PLAN-021 | Separate Marketing source data design from Reporting builder/templates | PLAN-020 | DONE | Codex 2026-10-08 | CHG-20261008-07; Marketing source catalog + Reporting builder direction, docs193/1396 links/whitespace PASS; implementation remains PLAN-011/022 |

| PLAN-022 | Exact Reporting builder API/schema/producer adapter implementation gate | PLAN-022A | TODO | unassigned | Product plan in PLAN-022A; exact OpenAPI/JSON Schema, producer field/event coverage, filled table templates/index/migration and runtime limits before builder source; separate from Marketing ingestion |
| PLAN-022A | Report Builder product/semantic/UX design and mock-first delivery plan | PLAN-021 | DONE | Codex 2026-10-10 | [Evidence](details/PLAN-022A.md); plan/semantic/UX/RB-01…17, source sequence SRC-057…062 then049; docs/link/JSON/DAG and whitespace checks PASS; design-only, exact gate PLAN-022 TODO |
| PLAN-022B | Exact semantic registry/definition validator scoped contract | PLAN-022A | DONE | Codex 2026-10-10 | [Ready contract](../contracts/reporting-semantic-kernel.md); reviewed no-persistence/no-HTTP scope, typed schema/graph/ACL/limits and kernel acceptance; broader PLAN-022 unchanged |
| PLAN-022C | Exact private draft/version persistence and native ACL API contract | SRC-063 | DONE | Codex 2026-10-12 | [Ready scoped contract](../contracts/reporting-persistence.md); complete table templates, own/all authorization, signed admission window, CAS/idempotency and native/private HTTP; query/publish/UI remain PLAN-022 |
| PLAN-022D | Exact mock adapter/snapshot/projection persistence contract | SRC-057; SRC-053 | DONE | Codex 2026-10-12 | [Ready contract](../contracts/reporting-projections.md); typed observations,generations,replay,tombstones,coverage,filled tables; no public query |
| PLAN-022E | Bounded internal mock query-core execution/authorization port contract | SRC-058 | DONE | Codex 2026-10-12 | [Scoped contract](../contracts/reporting-query.md);26metrics,group/pivot,exact arithmetic,rights ports/cache/aggregate CSV; native API/run/drilldown gate remains open |
| PLAN-022F | Native mock preview/CSV API, explicit source grant and signed query admission | PLAN-022E; SRC-058 | DONE | Codex 2026-10-12 | [Scoped contract](../contracts/reporting-query-api.md); live Identity/session delivery check; no connected rights/run/drilldown completion |
| PLAN-022G | Durable caller-driven mock runs, pinned snapshot/lease/cancel/result and owner ACL | PLAN-022F; SRC-058 | DONE | Codex 2026-10-12 | [Ready contract/table templates](../contracts/reporting-runs.md); two own-schema tables, no automatic worker/drilldown |
| PLAN-022H | Bounded early mock authoring UI/discovery contract | SRC-057; SRC-058; SRC-063; PLAN-022F; PLAN-022G | DONE | Codex 2026-10-12 | [Scoped contract](../contracts/reporting-authoring.md); CHG-20261012-06, design-only; full UX scope remains open |

| PLAN-011C | Exact Meta provider field/storage dictionary and dataset sync profiles | PLAN-021 | DONE | Codex 2026-10-08 | [105-field dictionary](../data/marketing-storage-dictionary.md), storage/sync design; source trace/regeneration/docs/lint PASS; auth/API/DDL gates still PLAN-011 |

| PLAN-023 | Shared Meta Ad Account and Page-gated tenant ingestion | PLAN-011C | DONE | Codex 2026-10-08 | [Tenant admission](../contracts/marketing-tenant-admission.md); shared account/Page-filtered sync, dictionary/ERD/AC synced; docs196/1537 links/lint/regeneration PASS; design-only |

| PLAN-011D | Ready database-only Marketing schema/table/operator contract | PLAN-023; SRC-053 | DONE | Codex 2026-10-08 | [Contract](../contracts/marketing-database.md); scoped table-template review; sync API gate remains PLAN-011 |
| SRC-054 | Independent Marketing database, migrations, grants and persistent MySQL verification | PLAN-011D; SRC-053 | DONE | Codex 2026-10-08 | [Evidence](details/SRC-054.md):23 tables/352 columns/105 provider fields,17 MySQL groups,local v1 and warm preservation; periodic sync deferred |
| SRC-055 | Periodic Meta base/age/region Insights ingestion | PLAN-011; SRC-051; SRC-054 | TODO | unassigned | Ad/Page admission, versioned grains, late corrections, cadence/backfill/retry/fence; no report builder |

| PLAN-011E | Exact metadata backend credential/Page authority/schedule/API/migration design | PLAN-023; SRC-054 | DONE | Codex 2026-10-08 | [Evidence](details/PLAN-011E.md):88-field manifest,20 schema examples,docs/source traces/lint PASS; design only |

| SRC-056 | Channels Marketing credential/Graph proxy/Page authority and admission receipts | PLAN-011E; SRC-054; SRC-031; SRC-038 | DONE | Codex 2026-10-08 | [Ready design](../contracts/marketing-metadata-sync.md); prerequisite to SRC-051, native ACL/encrypted credential/forward migration/revoke race; live gate separate |

## Report Builder mock-first delivery — PLAN-022A, 2026-10-10

[Plan](../planning/report-builder.md) · [semantic model](../data/reporting-semantic-model.md) · [UX](../ux/report-builder.md) · [acceptance](../quality/report-builder-acceptance.md). SRC-063 kernel,SRC-057 drafts,SRC-058 mock projections use scoped PLAN-022B/C/D gates. SRC-059 READY with retained progress through PLAN-022E query core and PLAN-022F native mock preview/CSV; PLAN-022G durable caller-driven runs implemented; drilldown still needs its exact gate. SRC-060…062 TODO. SRC-051 stays READY with preserved progress; only one source task may be active.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| SRC-057 | Reporting persisted private drafts/immutable versions, native BFF/ACL and own schema | PLAN-022C; SRC-038; SRC-063 | DONE | Codex 2026-10-12 | [Evidence](details/SRC-057.md);17 MySQL/native HTTP groups repeated,178 unit,build/types/OpenAPI/docs/lint PASS; local/test Reportingv1,CRM27 preserved; no query/publish/UI claim |
| SRC-058 | Synthetic datasource adapters and typed CRM/Marketing fact/dimension projections | PLAN-022D; SRC-057; SRC-053 | DONE | Codex 2026-10-12 | [Evidence](details/SRC-058.md);25objects/120fields/86canonical G1 rows,10 MySQL+17 regression groups,196 unit/types/build/static PASS; local/test schema2 preserves11 tables,CRM27 unchanged; no public query |
| SRC-059 | Semantic validator/query planner, metrics/cohort/pivot/run/cache/drilldown/CSV | PLAN-022E; PLAN-022F; PLAN-022G; SRC-058 | READY | Codex 2026-10-12 (progress retained) | [Evidence](details/SRC-059.md);26metric core/native preview + durable caller-driven run/cancel/result,schema3;248 unit,13 lifecycle MySQL/12 native/24 regression groups PASS; drilldown/remaining KPI semantics still required |
| SRC-060 | Next.js Report Builder, source/related fields, axes/charts/pivot and report templates | SRC-059; SRC-064 | TODO | unassigned | RB-11/12/14; API-backed authoring, keyboard/mobile/zoom, version conflict and late response tests |
| SRC-061 | Dynamic dashboards, versioned widgets, filters/comparison/cross-filter and library | SRC-060 | TODO | unassigned | RB-13; per-widget snapshot/freshness/filter scope and viewer permission; browser evidence |
| SRC-062 | RB-MOCK local release, catalog extension proof and preservation/capacity verification | SRC-061 | TODO | unassigned | RB-14…16 and full RB-MOCK; MySQL/browser/restart/warm upgrade, golden KPI and extension fixtures; no live Meta claim |
| SRC-063 | Reporting semantic catalog and strict definition/ACL/grain/visualization validator | PLAN-022B; SRC-038 | DONE | Codex 2026-10-10 | [Evidence](details/SRC-063.md):19 objects/85 fields/26 metrics/4 models,49 kernel+109 existing unit PASS,build/workspace types/static checks; no DB/API/UI execution claim |
| SRC-064 | Early API-backed mock report builder: discover/configure/preview/chart/pivot/private draft/CSV | PLAN-022H; SRC-057; SRC-058; SRC-063; PLAN-022F; PLAN-022G | DONE | Codex 2026-10-15 | [Evidence](details/SRC-064.md); Alpha gate fulfilled in SRC-070; current SRC-072 native/browser regression; scoped authoring complete, advanced SRC-059/060 gates remain |
