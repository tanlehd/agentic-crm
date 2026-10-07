# Task tracker — source generation

Nguồn chuẩn trạng thái công việc. Updated: 2026-10-07. Thiết kế có thể Ready nhưng source task vẫn TODO; hai trạng thái không đồng nghĩa.

**Hiện tại:** SRC-001…031 DONE (M1–M2:25; M3 foundation:2; independent ingress:1; signed Messenger capture:1; contact cache compatibility:1; Facebook configuration:1); M1 và M2 local/mock release gates PASS. Runtime local localhost:18080 dùng native MySQL auth (SRC-038); historical preview có, Identity Admin/CRM UI, standard/custom CRUD, Lead qualification, metadata/form/view và association. SRC-014/015 Conversation và mock intake, SRC-016 inbox UI DONE; SRC-017 routing/assignment/takeover DONE; SRC-018 private mock runtime DONE; SRC-019 durable Workflow DONE; SRC-020 DONE, Codex 2026-10-05; SRC-021 DONE, Codex 2026-10-05; SRC-022 DONE, Codex 2026-10-05; SRC-023 DONE, Codex 2026-10-05; SRC-024 DONE, Codex 2026-10-06; SRC-025 DONE, Codex 2026-10-06; PLAN-005/006A DONE (architecture/doc-only); SRC-028 DONE; SRC-029 DONE; PLAN-006B DONE (design-only); PLAN-006C/006D DONE (scoped design); SRC-030/031 DONE; SRC-032/033 DONE (Codex 2026-10-06), SRC-034 VERIFYING (Codex, claim2026-10-06); Agent Chat rebuild còn SRC-035…037. PLAN-002/003/004A/004B DONE; PLAN-004 remaining TODO. [Checkpoint](checkpoint.md) · [Execution log](log.md) · [Build plan](../planning/build-plan.md).

Owner `—` nghĩa chưa claim. Evidence `—` nghĩa chưa kiểm thử/hoàn thành, không phải pass. Chỉ promote TODO→READY khi tất cả dependency DONE và thiết kế đúng phạm vi Ready. Một task active tại một thời điểm theo mặc định.

Git sync S-20261004-03: initial commit `7c05518` đã push lên `origin/main` theo yêu cầu người dùng; implementation status không đổi. Xem [execution log](log.md).

## Công việc chuẩn bị

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

Source backlog dưới đây theo [workspace build plan](../planning/agent-chat-workspace.md); SRC-032/033 DONE, tiếp theo SRC-034; các task sau chờ dependency. Không thay evidence của SRC-001…031.

| ID | Deliverable | Deps | Status | Owner | Gate / evidence |
|---|---|---|---|---|---|
| SRC-032 | Workspace sequence/read-state, queue query và ACL metrics | SRC-031; UX-002 | DONE | Codex 2026-10-06 | [Evidence](details/SRC-032.md);203 MySQL,99 unit, canonical9/9 PASS; backend sub-scope UX-CHAT-13/14/15/19/22 |
| SRC-033 | Saved/shared inbox, conversation tags và snippets | SRC-032 | DONE | Codex 2026-10-06 | [Evidence](details/SRC-033.md);209 MySQL +13 final workspace/102 unit/canonical9/9 PASS; UX-CHAT-16/17/21 backend |
| SRC-034 | Durable snooze, activity projection và source notifications | SRC-033 | DONE | Codex 2026-10-06/07 | UX-CHAT-18/20/22 backend; final regression222 PASS trong SRC-038; [Evidence](details/SRC-034.md) |
| SRC-035 | CRM Contact context metadata và channel identities/navigation | SRC-034 | TODO | unassigned | UX-CHAT-21, field/tenant ACL; runtime NOT_RUN |
| SRC-036 | Agent Chat UI rebuild và tích hợp workspace contracts | SRC-035 | TODO | unassigned | UX-CHAT-01…22; runtime NOT_RUN |
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
