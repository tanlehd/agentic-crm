# Task tracker — source generation

Nguồn chuẩn trạng thái công việc. Updated: 2026-10-05. Thiết kế có thể Ready nhưng source task vẫn TODO; hai trạng thái không đồng nghĩa.

**Hiện tại:** SRC-001…016 DONE (16/25); base CRM M1 gate PASS. Preview localhost:8080 có OIDC, Identity Admin/CRM UI, standard/custom CRUD, Lead qualification, metadata/form/view và association. SRC-014/015 Conversation và mock intake, SRC-016 inbox UI DONE; SRC-017 READY, chưa claim; không task active. [Checkpoint](checkpoint.md) · [Execution log](log.md) · [Build plan](../planning/build-plan.md).

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
| SRC-017 | Routing/capability/capacity, assignment/takeover | SRC-016 | READY | — | AC-06; round-robin concurrency, unassigned fallback, owner independence; cancel intent khi đổi owner | — |
| SRC-018 | Agent Runtime adapter + deterministic mock + tools | SRC-017 | TODO | — | AC-07; tool allowlist, deadline, auth/owner revocation, timeout, late result reject; test harness riêng khỏi API public | — |
| SRC-019 | Workflow graph/version/run/step/wait engine | SRC-018 | TODO | — | AC-08/16 engine; publish validation, pin version, action key, fencing, lost-signal prevention; Chatflow port contract fake trong test | — |
| SRC-020 | Chatflow/session/turn và Human completion | SRC-019 | TODO | — | AC-07/08/16; first message không mất, consent explicit, paused_human giữ dữ liệu, single Lead/session; nối Workflow thật | — |
| SRC-021 | Sales handoff/acceptance API và workflow action | SRC-020 | TODO | — | AC-09/15; Contact share đúng team, hai Sales race chỉ một thắng, queue khi không eligible, 15 phút attention | — |
| SRC-022 | Sale queue/detail và operations/run UI | SRC-021 | TODO | — | Nhận Lead bằng command thật, link CRM có quyền, failed delivery/retry an toàn, run timeline sanitized | — |
| SRC-023 | Healthcare fixtures xuyên luồng + metric queries | SRC-022 | TODO | — | AC-09, AC-11/M2; dataset KPI đúng 12/4/3 và 2/3; deterministic clock; có walkthrough từ volume trống | — |
| SRC-024 | Regression/fault/race/permission integration suite | SRC-023 | TODO | — | AC-01/02 regression + AC-05…09/12/15…18 thuộc M2; crash/restart/out-of-order/Redis outage/in-flight send | — |
| SRC-025 | Release images, upgrade smoke, M2 demo và handoff | SRC-024 | TODO | — | Cold start + M1→M2 migration, data giữ qua restart, native/multi-arch evidence rõ, docs sync và gate report; không production deploy | — |

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

| Epic | Status | Gate trước khi chia task source |
|---|---|---|
| M3 — Meta thật + AI runtime thật | TODO / design gate | Verify provider docs/permissions, outbound reconciliation, secrets; đặc tả connector/runtime production Ready |
| M4 — Deal/Customer/Appointment/Google Ads/Ticket | TODO / design gate | Chi tiết module Draft, SLA/calendar, conversion/reopen và migration |
| M5 — Builders/custom reports/templates | TODO / design gate | Graph/query limits, schema version migration, report ACL/grain, UX authoring |

Không tính các epic này vào 25 task source M1–M2; không tạo thời hạn giả. Khi scope đổi, ghi CHG và cập nhật dependency/roadmap; task bị bỏ dùng CANCELLED kèm replacement.

## Quy tắc evidence

Mỗi DONE trỏ session log hoặc task detail có command/result/artifact, docs changed và remaining risks. Commit/PR chỉ ghi khi thực sự có; working-tree reference hợp lệ khi chưa commit. Dashboard tiến độ báo số task DONE và milestone gate, không suy diễn % chức năng từ số dòng code.

## Defect regression

DEF-001 DONE (Codex 2026-10-04): concurrent session touch gây AUTH_SESSION_BUSY; bounded wait + live reread/CAS đã qua unit và real Chrome M1. CHG-20261004-06; [evidence SRC-013](details/SRC-013.md). Không tính thêm vào 25 source tasks.
