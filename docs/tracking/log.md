# Execution và change log

Append entry mới theo thời gian; checkpoint giữ bản mới nhất, tracker giữ status. Không sửa lịch sử test fail thành pass; thêm kết quả lần chạy mới.

## S-20261002-01 — Lập kế hoạch source và tracking

- Task: PLAN-001. Owner: Codex. Loại: documentation/planning.
- Yêu cầu: sinh source theo giai đoạn, dùng Docker để đóng gói, theo dõi nhiều ngày và cập nhật thiết kế khi build có thay đổi.
- Đầu ra: build plan 25 task M1–M2; Docker topology/health/migration; tracker/checkpoint; change control; task template; root AGENTS.md.
- Scope: chưa sinh app source, chưa tạo Docker artifacts, chưa cài dependency hay chạy service, chưa commit/push.
- Inspection: workspace chỉ có baseline docs; Docker CLI 29.3.0, Node v25.9.0, Git 2.39.5, pnpm executable được tìm thấy. Không kiểm chứng daemon hoặc image build.
- Validation: Python stdlib checker chạy trên 40 Markdown files; 173 relative links tồn tại, fences cân bằng, JSON examples parse được; 25 source task IDs duy nhất, dependency graph không vòng lặp, READY chỉ SRC-001. Mapping B-01…B-10 và design/source status đã rà; PASS.
- Evidence: checker thực thi trong workspace bằng `python3` heredoc (path/link regex, JSON parser, DFS dependency graph), exit 0; không tạo test source ứng dụng. Working-tree docs hiện tại; không có commit/PR để viện dẫn.
- Kết quả: PLAN-001 DONE; source 0/25 DONE. Docker build/Compose/E2E/remote CI: NOT_RUN, sẽ kiểm chứng ở task tương ứng.
- Next: SRC-001 khi bắt đầu triển khai.

### CHG-20261002-01 — Cụ thể hóa delivery workflow

- Classification: C1/C2, trong phạm vi kế hoạch được yêu cầu; resolved ở mức thiết kế.
- Quyết định: Docker Compose cho dev/test/release smoke; pnpm monorepo, TypeORM/mysql2, Keycloak dev, contracts-first schemas; task tracker trong repository, không cần dịch vụ ngoài.
- Ảnh hưởng: build plan, Docker doc, roadmap/architecture/governance, ADR-011/012 và navigation.
- Compatibility: không thay domain API/lifecycle đã chốt; auth/physical detail được hoàn thiện ở SRC-001 trước code. Chưa có DB/schema deployed nên chưa có migration chạy.
- Tracking: 25 source tasks chưa hoàn tất; không tự tạo automation hoặc hứa chạy nền nhiều ngày.

## Mẫu session tiếp theo

Ngày/session ID, task/owner, trạng thái đầu→cuối, deliverable/files, test commands/results/artifact, CHG/ADR refs, blocker/điều kiện unblock, services còn chạy, commit hoặc working-tree reference và next action. Chỉ thêm entry thực tế khi phiên đó diễn ra.

## S-20261002-02 — Bắt đầu dựng foundation

- Scope hôm nay: SRC-001 → SRC-002 → SRC-003 nếu môi trường build đạt; không mở module nghiệp vụ vượt gate.
- SRC-001 IN_PROGRESS, owner Codex; đã đọc AGENTS/checkpoint/design/contracts.
- Docker Desktop được mở và daemon 29.2.1 phản hồi; Compose 5.1.0.
- Npm metadata đang được xác minh; không dùng version tự đoán hoặc ghi PASS trước kiểm tra.

### CHG-20261002-02 — Auth transport và physical schema refinement

C2 trong phạm vi SRC-001: bổ sung session transport, schema defaults/constraints/migration stages; không đổi tenant/CRM lifecycle. Source chưa được đánh dấu hoàn tất.

## S-20261003-01 — Retry network, scaffold và Docker chạy được

- Nối tiếp S-20261002-02 theo yêu cầu “Thử lại”. SRC-001/002/003 DONE, source tasks 3/25; SRC-004 READY.
- Metadata pins/peers, auth transport và physical schema đã chốt. Install frozen, Next/Nest/package build, typecheck, generated contract check và 3 tests đạt.
- Docker release cold start và dev warm start 7/7 healthy; app runtime Node 24.21.0 uid1000; MySQL test row giữ qua down/up rồi cleanup; contract tests trong project test đạt; Keycloak issuer check đạt.
- Browser foundation mở localhost:8080, hiển thị API/MySQL/Redis connected; screenshot desktop đã xem. Còn auth/business schema/job engine chưa triển khai.
- Lỗi đã xử lý: npm/registry TLS timeout retry; thiếu Vite peer; duplicate Docker tag export khi build API/worker đồng thời; dev chown missing directory. Không đổi nghiệp vụ để bỏ qua lỗi.
- Secret generated local không in log; không Git commit/push/public deploy. 7 dev containers giữ chạy. Next SRC-004; evidence chi tiết trong tracking/details/SRC-001.md, SRC-002.md, SRC-003.md.

### CHG-20261003-01 — Scaffold/Docker hiện thực theo gate

C1/C2 resolved: Vite 8.3.2 là peer bắt buộc của Vitest; health OpenAPI là contract kỹ thuật riêng với stage=scaffold. API giữ quyền build backend image, worker reuse cùng tag; tránh duplicate export. Migration/seed service chưa tạo đến SRC-004/009, không thêm command giả để đáp ứng topology đích. CSS foundation preview tối thiểu; UI library/components nghiệp vụ được thêm ở task UI tương ứng.

## S-20261003-02 — SRC-004

- Claim SRC-004 IN_PROGRESS, Codex 2026-10-03. Dependency SRC-003 DONE; workspace không Git. Fresh inspection: 7 dev containers healthy.
- CHG-20261003-02 (C2): chốt journal/checksum/preflight, fail-closed partial DDL recovery, tenant transaction kernel và readiness tương thích trong physical-schema. Tách migration credential khỏi runtime, local provision chạy bằng root one-shot; không đổi business/API và không reset volume.

### S-20261003-02 — Kết quả

- SRC-004 IN_PROGRESS → VERIFYING → DONE. SRC-005 READY; 4/25 source tasks DONE. Không mở task mới.
- Deliverables: migration v1 Account/Tenant/journal, checksum/lock/preflight, UoW/tenant repository, privilege provision/migrate Compose gate, schema readiness và isolated real MySQL tests. CHG-20261003-02 resolved; không đổi API wire shape hoặc business lifecycle.
- 7 MySQL integration tests PASS; 3 contract tests PASS; Node 24 container typecheck/backend build/API smoke/contract drift PASS; full Next/Nest Docker build và dev 7 healthy PASS. Schema ready 1, rerun applied 0. [Evidence](details/SRC-004.md), artifacts/SRC-004/{integration,dev,verify}.log.
- Retry fixes: obsolete TypeORM connectorPackage; mysql2 collation handshake 278 → utf8mb4 handshake (table collation giữ nguyên); test datasource constructor và BIGINT assertions. Không đánh PASS trước lần chạy lại thành công.
- Cập nhật physical schema/dictionary, migration/local/Docker runbook, README, acceptance scope, tracker/checkpoint cùng phiên. Không Git/commit/push/deploy; working-tree files tại repository path. Secrets không ghi vào evidence.
- Services giữ chạy: gateway/web/api/worker/mysql/redis/keycloak healthy; db-provision/migrate exit 0. Dev volume giữ nguyên; MySQL test tmpfs cleanup. Không blocker. Next duy nhất: SRC-005.

## S-20261003-03 — SRC-005

- Claim SRC-005 IN_PROGRESS, Codex 2026-10-03; dependency SRC-004 DONE, design foundation Ready. Workspace không Git, không có diff/remote; không sửa migration v1.
- CHG-20261003-03 (C1): portable verify/CI dùng cùng script Node, lint AST với TypeScript đã pin (không thêm dependency), docs/schema validation và generated drift trước build. Docker source stage chuyển generate sang check để không che drift. Integration runner tạo credential ngẫu nhiên riêng cho MySQL tmpfs, không cần đọc credential dev. Không đổi business/API/schema persisted; không cần migration.

### S-20261003-03 — Kết quả

- SRC-005 IN_PROGRESS → VERIFYING → DONE; SRC-006 READY, 5/25 tasks DONE. CHG-20261003-03 resolved. Không claim task nghiệp vụ khác.
- Portable verify pipeline/container và GitHub adapter, AST lint, strict schema/docs checks, 4 tooling regression tests; Docker không còn auto-regenerate che contract drift. Integration random credential độc lập dev env.
- Canonical Linux ARM64 Node 24.21.0/pnpm 10.33.0: frozen install + 9 gates PASS; 4 tooling tests, 3 contract tests; Next/Nest build, typecheck, API smoke PASS. MySQL 8.4.11 integration 7 tests PASS, cleanup hoàn tất. Remote CI NOT_RUN (chưa Git/remote). [Evidence](details/SRC-005.md).
- Lỗi thử đầu chdir(URL) sửa bằng fileURLToPath, rerun PASS. `$id` schema optional dùng path fallback; không đổi health contract. Mermaid chỉ header check, không full render.
- Đồng bộ README/index/runbooks/Docker doc/acceptance/tracker/checkpoint. Không commit/push/deploy, workspace không Git; working directory reference trong evidence. 7 dev services vẫn healthy, volumes nguyên trạng; test/verify networks cleanup. Next duy nhất SRC-006; không blocker.

## S-20261003-04 — SRC-006

- Claim SRC-006 IN_PROGRESS, Codex 2026-10-03; SRC-005 DONE, design Ready. Fresh inspection: không Git, 7 dev containers healthy. Không sửa migration đã áp dụng.
- CHG-20261003-04 (C1/C2): auth contract bổ sung HMAC CSRF, encrypted Redis/CAS/refresh lock, redirect hardening, no auth access log và local auth-only fixture. Không đổi domain semantics; không có membership/tenant bootstrap; không cần migration. Triển khai và evidence đang thực hiện.

### S-20261003-04 — Kết quả

- SRC-006 IN_PROGRESS → VERIFYING → DONE; SRC-007 READY, 6/25 source tasks DONE. CHG-20261003-04 resolved. Không mở implementation task khác.
- OIDC PKCE/state/nonce + encrypted Redis session/CSRF/logout/refresh, Account upsert, five auth routes + generated schema/types/OpenAPI, auth UI và local Keycloak auth_demo fixture. Không membership/tenant seed, không sửa migration v1.
- Canonical Node 24.21.0 Linux ARM64: verify 9 gates PASS, 26 unit/contract + 4 tooling tests, Next/Nest build/typecheck/smoke PASS. MySQL isolated regression 7 tests PASS và cleanup. Browser Chrome 154 E2E auth/runtime PASS; host Node25 chỉ driver. [Evidence](details/SRC-006.md); artifacts/SRC-006/{build-final,verify-final,integration,e2e-final}.log và login/logout PNG.
- Browser run đầu fail do Keycloak reauth ẩn username; test sửa chờ password, chỉ fill username khi visible. Retry và final PASS; không che/xóa log fail. Network/Docker sandbox ban đầu cần escalation; retry authorized thành công, không phải code test failure.
- Redis outage test pause/unpause trong finally, 503 khi down và 200 sau phục hồi; missing session →401. Dev volume không reset. Account synthetic test random cleanup, auth_demo Account giữ để dùng local. Local session logout và provider revoke được kiểm.
- README, auth/API/identity contracts, local/verification/Docker runbooks, acceptance scope, toolchain/schema, tracker/checkpoint đồng bộ. Workspace không Git/branch/commit/remote; working-directory reference thật, remote CI NOT_RUN. Không blocker. 7 dev services healthy; next duy nhất SRC-007.

## S-20261003-05 — SRC-007

- Claim SRC-007 IN_PROGRESS, Codex 2026-10-03; SRC-006 DONE. Đã đọc Identity/security/dictionary/physical/API/AC-01/02. Workspace không Git; không ghi đè migration v1.
- CHG-20261003-05 (C2): làm rõ delivery boundary: SRC-007 xây Identity schema, authorization và admin application/API; durable audit/outbox/idempotency adapter vẫn SRC-008. Không gọi admin mutation đủ production guarantee trước SRC-008; không đổi dependency hoặc bỏ contract. Chia evidence SRC-007 thành A schema/quyền, B admin/last-admin/concurrency, C HTTP/contracts. Phiên này bắt đầu A; chỉ DONE toàn task khi A/B/C đủ evidence.
- Schema v2 additive; field_policy còn chờ object_type SRC-010. Field deny ở authorization core nhận policy từ application port, không giả có persisted field policy. AI/service entitlement chưa có persisted shape nên deny mặc định khi thiếu entitlement đã xác minh; không suy ra entitlement từ role.

### S-20261003-05 — Kết quả phần A

- SRC-007 giữ IN_PROGRESS, không đánh DONE: sub-scope A đã code/test, B/C còn TODO theo [evidence](details/SRC-007.md). CHG-20261003-05 boundary được ghi ở Identity/physical schema. Chưa mở task khác.
- Additive migration v2 9 bảng, authorization primitives, Human DB loader với tenant shared lock/live revision. V1 không đổi. Không public admin API, không seed/migration preview.
- Canonical Node24.21.0 Linux ARM64 full verify 9 gates PASS, 31 unit/contract và 4 tooling tests PASS, MySQL8.4.11 integration 10 tests PASS. Final runner exit0; disposable MySQL exit137 lúc Compose teardown và được cleanup. Artifact `artifacts/SRC-007/`. Docker sandbox yêu cầu escalation, authorized retry thành công.
- README/Identity/physical/migration runbook/acceptance/tracker/checkpoint/evidence đồng bộ. Không Git/commit/push/deploy. 7 preview services SRC-006 healthy, volumes không đổi. Bước tiếp tục duy nhất SRC-007 B admin application/last-admin/concurrency, sau đó C HTTP.

## S-20261003-06 — Hoàn thiện SRC-007

- Tiếp tục owner Codex 2026-10-03, SRC-007 IN_PROGRESS; đọc checkpoint, design/contracts/dictionary/AC. Không Git; giữ nguyên migration v1/v2 đã kiểm thử.
- CHG-20261003-06 (C2, resolved design): thay boundary tạm CHG-05 để loại vòng dependency. SRC-007 nhận phần storage/transaction port tối thiểu audit_entry/idempotency_record/outbox_event bằng migration v3 additive, phục vụ admin API đúng contract. SRC-008 tiếp tục relay/inbox/leases/replay hardening/privilege hardening; không claim task thứ hai. Không đổi business semantics.
- Exact admin wire contract, last-admin effective grants, revision propagation và pagination ghi tại contracts/identity-admin.md trước code. Tests: MySQL race/rollback/replay/revocation, HTTP validation/CSRF/tenant switching, canonical verify và local OIDC browser.

- Review cuối SRC-007 phát hiện v3 thiếu positive CHECK ở outbox schema_version/aggregate_version so với physical baseline; sửa bằng migration v4 mới, không sửa v3 đã áp dụng. Bổ sung real MySQL negative constraint tests.

### S-20261003-06 — Kết quả hoàn thiện SRC-007

- SRC-007 IN_PROGRESS → VERIFYING → DONE; SRC-008 READY; 7/25 tasks DONE. CHG-20261003-06 resolved; không khởi tạo task/agent song song.
- B/C hoàn thiện: admin application/HTTP + schema/client types, same-tenant FK/references, tenant locks/CAS/revision propagation, Human/AI atomic principal, last-admin guard cả concurrent demotion; signed pagination, CSRF, tenant selector; audit/outbox/receipt atomic qua kernel port.
- Additive migration v3 storage và v4 positive outbox versions; v1/v2/v3 đã áp dụng không sửa lịch sử. Local schema ready4, 7 services healthy sau rebuild. Không seed thường trực, synthetic browser tenants cleanup; volume/auth_demo giữ nguyên.
- Canonical Linux ARM64 Node24.21.0: 9 gates PASS, 34 unit/contract + 4 tooling tests; real MySQL15 tests PASS; Chrome154 OIDC/tenant switching/replay/cross-tenant/revoke/logout PASS. [Evidence](details/SRC-007.md), artifacts/SRC-007/.
- Retry: integration lần đầu fail trước tests do nested decorator; dùng Module(...)(TestModule), rerun PASS. Verify sạch fail package contracts chưa build trước unit; alias source trong Vitest, rerun 9 gates PASS. Browser driver Node25 không coi là supported app runtime. Final integration MySQL tmpfs teardown exit137, runner/test exit0, cleanup hoàn tất.
- README, module/Operations, dictionary/physical/schema, API/events/admin contract, UX/runbooks, build plan, acceptance sub-scope, tracker/detail/checkpoint đồng bộ. AC-01/02 chỉ phần Identity; CRM/query/export/job vẫn ở tasks sau, không đóng cả gate.
- Workspace không Git/branch/commit/remote; working directory reference thật. Không commit/push/deploy; remote CI/AMD64/Windows native NOT_RUN. Next duy nhất SRC-008; không blocker/decision pending.

## S-20261003-07 — SRC-008

- Claim SRC-008 IN_PROGRESS, Codex 2026-10-03; SRC-007 DONE. Đọc Operations/events/dictionary/AC-12 và implementation hiện có. Workspace không Git; migration v1–v4 giữ immutable.
- CHG-20261003-07 (C2): bổ sung physical inbox, indexes/receipt expiry và delivery execution contract. Relay M1 gọi consumer registry trong cùng process qua port; MySQL outbox là durable backlog, không phụ thuộc Redis để lưu event. BullMQ dành cho job wakeups ở modules workflow sau; chưa có business consumer CRM. Identity access consumer xác thực envelope và acknowledge vì authorization hiện đọc DB trực tiếp, không có cache cần invalidation. Không đổi event/domain semantics. Audit app grants chuyển từ database-wide DML sang table-specific, áp dụng sau migration bằng local operator one-shot.

### S-20261003-07 — Kết quả

- SRC-008 IN_PROGRESS → VERIFYING → DONE, SRC-009 READY; 8/25. CHG-20261003-07 resolved, ADR-014 transactional consumer registry. Không agent/task song song.
- Migration v5 additive/inbox/expiry, relay/fencing/retry và worker registry, mandatory response authorization callback; db-grants table privileges sau migrate. Local synthetic fixture cleanup chuyển migration operator, không nới audit app grants.
- MySQL20 tests PASS; canonical verify9 gates PASS (34 unit/contract +4 tooling); Chrome154 real OIDC/admin→worker/inbox PASS, synthetic fixture cleanup PASS. Preview schema5/checksums và7 services healthy; volumes giữ nguyên. [Evidence](details/SRC-008.md).
- AC-05/12 foundation và AC-17 relay sub-scope, không đóng workflow/provider/Redis end-to-end. No CRM consumers/public retry API. Sandbox Docker/Chrome yêu cầu escalation và authorized retry; không có code-test failure.
- Không Git/branch/commit/remote, không commit/push/deploy. Working directory source/config/docs/artifacts; remote CI/AMD64/Windows NOT_RUN. Không blocker/decision pending. Next duy nhất SRC-009.

## S-20261004-01 — SRC-009

Claim SRC-009 IN_PROGRESS, owner Codex 2026-10-04. Dependencies SRC-008 DONE; đọc README/build plan/tracker/checkpoint, Identity/schema/contracts/fixtures/acceptance. Workspace không có .git; giữ source/evidence hiện hữu, không commit/push.

CHG-20261004-01 (C2, SRC-009): làm rõ bootstrap Identity theo giai đoạn và local OIDC mapping/idempotency. Contract API cũ mô tả registry toàn bootstrap trong khi object_type chưa tồn tại tới SRC-010. Quyết định: SRC-009 chỉ Identity, seed registry ở SRC-010; không đổi schema/API công khai hoặc sửa migration v1–v5. Local-only operator command, deterministic UUID, tài khoản map issuer+subject; transaction MySQL atomic, provider retry riêng, rerun không khôi phục quyền đã bị operator thay đổi. Affected: identity module, bootstrap contract, healthcare fixtures, local runbook. Tests: MySQL atomicity/rerun/concurrency/guard + browser OIDC Alpha/Beta/tenant denial. Status: resolved (design), implementation/testing đang thực hiện.

SRC-009 verification interim: MySQL 24/24 PASS; phát hiện Keycloak default profile bỏ attribute chưa khai báo, seed fail closed ở IdP marker trước DB writes. Sửa provision khai báo managed crm_fixture admin-only + GET full user; thêm ba provider regression tests. Sửa marker đúng một alpha_admin vừa tạo bởi phiên này, giữ credential; sau đó seed preview tạo 2 tenant và rerun preserve 2 thành công. Các lỗi sandbox Docker/Chrome được rerun với approved escalation; không reset volume.

SRC-009 completed: 24/24 isolated MySQL tests, 9 canonical verify gates (34 unit/contract +7 tooling), six-user real OIDC E2E, preview seed initial/repeat + identical identity snapshot, 2 bootstrap audits/9 dispatched+inbox complete, schema5 and 7 healthy services. Browser harness waits for UI fetch completion to avoid concurrent AUTH_SESSION_BUSY; no auth contract change. Initial partially recovered synthetic alpha_admin profile restored without password reset; final fixture login all PASS. Evidence [SRC-009](details/SRC-009.md). Docs synced bootstrap/API/Identity/healthcare/local/Docker/verification/acceptance/index/README/tracker/checkpoint. No git/commit/push/deploy or volume reset. SRC-009 DONE, SRC-010 READY, no active task.

Final local AST lint68 files and docs check56 Markdown/230 links/25 acyclic tasks PASS after final harness and tracking edits. .env permission0600 verified; dockerignore excludes env/artifacts; runtime before/after cmp exit0.

## S-20261004-02 — SRC-010

Claim SRC-010 IN_PROGRESS, Codex 2026-10-04. Dependency SRC-009 DONE; đọc baseline, CRM/model/dictionary/security/API/events/AC. Workspace không Git.

CHG-20261004-02 (C2): chốt foundation boundary và exact registry contract tại contracts/registry.md trước code. Migration v6 additive cho registry/association/history/shares/field policies; không tạo subtype nghiệp vụ trước SRC-011/012. Registry application port chỉ tạo record khi module đã đăng ký subtype writer/verifier, transaction caller giữ audit/outbox atomic. Association cardinality one_to_many nghĩa một target chỉ thuộc một source; one_to_one giới hạn cả hai đầu. Metadata/association HTTP có receipt và pagination; assignment là internal port, public command/routing giữ SRC-017. Fixture registry v2 riêng, không sửa/reset seed Identity v1 hoặc ACL hiện hữu. UUID mới registry dùng v7, giữ nguyên UUID fixture và nguồn cũ. Tests cần MySQL FK/rollback/CAS/race/ACL, HTTP/contracts, seed repeat/upgrade. Status: design resolved; implementation in progress.

### S-20261004-02 — SRC-010 hoàn tất

SRC-010 IN_PROGRESS → VERIFYING → DONE; SRC-011 READY,10/25 source tasks DONE. CHG-20261004-02 resolved. Migration v6 additive, metadata/association HTTP/schema/client, transactional registry/subtype/ownership ports, persisted field-policy loader, append-only history grants và registry fixture v2. Không production subtype giả, không mở SRC-011 song song.

35/35 isolated MySQL PASS;9 canonical verify gates PASS (34 unit/contract+7 tooling); preview upgrade schema6/7 services healthy. Registry seed first2/repeat0 created;14 standard types. Identity fingerprint trước/sau upgrade giữ nguyên; registry/Identity repeat snapshot exact,2 registry bootstrap audits. Browser Chrome154 real OIDC Alpha/Beta admin+viewer, session/tenant/schema-role denial PASS; positive API/schema tested in real MySQL HTTP harness. [Evidence](details/SRC-010.md).

Initial33 tests PASS, bổ sung2 cases upgrade và association guards/replay rồi35 PASS; không code-test failures. Sandbox Docker/Chrome denied được rerun với escalation được duyệt. Canonical verify trước browser harness mới, final local lint/docs check bổ sung; host Node25 chỉ test driver, app/test canonical Node24.21.0 Linux ARM64.

AC-01/02/04/12 chỉ registry/association sub-scope; custom CRUD/index/form/view, CRM business subtype/UI và public assignment/routing/consumer còn task sau. Fixture v2 không regrant Identity ACL; schema APIs cần schema role explicit. Không Git/branch/commit/remote; working directory source/config/docs/artifacts. Không reset volume hoặc commit/push/deploy. Không blocker/decision pending. Next duy nhất SRC-011; không background automation/test runner active.
