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

## S-20261004-03 — Đồng bộ GitHub theo yêu cầu người dùng

- Khởi tạo Git `main`, remote `git@github.com:tanlehd/agentic-crm.git` (cùng repository HTTPS người dùng cung cấp). Remote ban đầu trống. Initial commit `7c05518` gồm 207 file đã push thành công; `main` tracking `origin/main`.
- HTTPS push thất bại vì không có credential; SSH xác thực đúng tài khoản tanlehd, chuyển remote sang SSH và push thành công. Không force push, không deploy, không thay đổi source hoặc trạng thái SRC-001…011.
- Kiểm tra trên macOS host: `node scripts/check-docs.mjs` PASS (58 Markdown/242 links/25 acyclic tasks); `node scripts/generate-contracts.mjs --check` PASS; `node scripts/lint.mjs` PASS (80 JS/TS); `git diff --cached --check` PASS. Rà 207 candidate files với private-key/token patterns và giá trị secret local không tìm thấy match; không xuất giá trị secret. `git check-ignore` xác nhận .env/artifacts/node_modules/.cache ngoài Git.
- Không chạy lại integration/browser/full build cho tác vụ đồng bộ; evidence implementation giữ ở các session trước. Remote CI chưa kiểm tra kết quả. Artifacts evidence vẫn local theo .gitignore.
- Cập nhật tracker/checkpoint/log trong commit tài liệu tiếp theo. Runtime không bị thao tác trong phiên; trạng thái 7 services là checkpoint trước, chưa kiểm tra lại. Không blocker/decision pending; next implementation task SRC-011.

## S-20261004-04 — SRC-011 → SRC-013 implementation

SRC-011 claimed Codex 2026-10-04; SRC-012/013 chờ dependency. Workspace main sạch trước claim.

CHG-20261004-03 (C2, SRC-011): bổ sung exact property/form/view/custom-record contract, typed query/null sort/cursor và replay field ACL; migration v7 additive, không sửa v1–v6. Docs: contracts/crm-records.md, api.md, dictionary, physical schema. Thiết kế resolved trước code; implementation/tests pending.

SRC-011 DONE:45 integration tests,9 verify gates PASS; evidence details/SRC-011.md. SRC-012 claimed sau dependency DONE. Preview v6 chưa đổi. CHG-20261004-04 C2: exact standard record/Lead contract và v8 bổ sung; M2 references fail closed, manual consent stamped server-side, Sales/CRM references qua UoW ports. Design resolved trước code.

SRC-012 DONE:52 MySQL integration,9 verify gates PASS; details/SRC-012.md. SRC-013 claimed, dependency DONE. CHG-20261004-05 C2: UI context/record descriptor endpoint để renderer nhận readable/writable fields và action capabilities mà không cần schema-admin grant; chuẩn ACL backend vẫn authoritative. M1 seed extension v3 chỉ additive grants/schema, không sửa seed v1/v2 hoặc quyền người dùng tùy chỉnh. Thiết kế theo contracts/crm-ui.md trước implementation.

CHG-20261004-06 / DEF-001 (Defect phát hiện SRC-013): browser nhiều request đọc/touch cùng session gây AUTH_SESSION_BUSY ngay lập tức ở SRC-006. Sửa bằng bounded lock wait, giữ live reread/CAS/logout revocation; không đổi TTL hoặc nới CSRF. Regression concurrent touch/refresh và logout race, real Chrome gate phải pass trước đóng. Không sửa evidence lịch sử SRC-006.

### S-20261004-04 — Hoàn tất SRC-013 / M1

SRC-013 IN_PROGRESS → VERIFYING → DONE, SRC-014 READY; 13/25 DONE, không task active. CHG-03/04/05/06 resolved; DEF-001 regression PASS. CRM/Admin UI theo descriptor và tenant cache isolation, seed v3 additive. SRC-011/012 evidence giữ riêng, [SRC-013 final evidence](details/SRC-013.md).

Final 53 real MySQL integration PASS; 9 canonical Linux ARM64 verify gates PASS (40 unit/contract +7 tooling). Latest preview rebuild, real Chrome154 browser M1, tmpfs cold v1–v8+seed+OIDC và preview stop/start giữ Contact/Appointment/qualified Lead hai tenant đều PASS. V6→v8 exact fingerprint13 bảng cũ trước seed; M1 seed first2/repeat0 created. 7 preview services healthy, volume/credential giữ nguyên; disposable projects cleanup.

Browser iterations phát hiện AUTH_SESSION_BUSY, accessible selector và chờ response metadata save; đã sửa nguyên nhân/harness và chạy lại gate thật. Screenshot desktop xem trực tiếp, mobile overflow assert PASS. Artifacts local SRC-013; secrets không log. Schema8 immutable sau apply. M1 sub-scopes AC-03/04/13 đạt, không mở rộng M2/M4/M5. Unknown domain outbox giữ failed tới khi có consumer thật theo ADR-014.

README/index, contracts/data/modules/UX/runbooks, acceptance/tracker/details/checkpoint đồng bộ. Working tree main dirty sau7c05518, chưa commit/push/deploy; remote CI/AMD64/Windows NOT_RUN. Không blocker/decision pending/background automation. Next SRC-014 khi người dùng tiếp tục M2.

## S-20261004-05 — Commit/push M1 theo yêu cầu

Người dùng yêu cầu commit và push toàn bộ SRC-011…013 đã nghiệm thu. Target `main` → `origin/main`, SSH remote tanlehd/agentic-crm; không force push/deploy. Kiểm tra diff whitespace và quét candidate files với secret local/private-key/token patterns PASS; .env/artifacts/cache/dependencies tiếp tục ngoài Git. Evidence kiểm thử M1 ở S-20261004-04, không chạy lại application tests chỉ để đồng bộ Git. Commit chứa entry này là working-tree handoff M1; kết quả push được xác minh với remote sau thao tác.

## S-20261004-05 — SRC-014 (DONE)

Claim Codex 2026-10-04; dependency SRC-013 DONE; working tree sạch lúc bắt đầu. Không agent song song, không commit/push/deploy.

CHG-20261004-07 (C2, resolved design): bổ sung physical v9 và [Conversation contract](../contracts/conversation.md) trước code. Migration additive connection/identity/conversation/message/outbound/mock receipt; v1–v8 không sửa, Lead M2 references vẫn guarded. Internal UoW ports cho Channels/CRM, không public intake ở SRC-014. Durable sending timeout 60s chuyển unknown, không tự resend; mock receipt persisted theo tenant+intent, reconcile qua internal port. Hooks close/assignment chuẩn bị cho SRC-017/020, chưa engine. Tests/evidence bổ sung cuối phiên.

S-20261004-05 kết thúc: SRC-014 DONE, SRC-015 READY. Source Conversation domain/http/outbound, Channels reference/mock sender, CRM ports/archive guard, migration v9 và generated contracts. `pnpm test:integration` PASS67 (14 Conversation mới); `pnpm verify:container` PASS9 gates/42 unit+7 tooling, Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11. Preview rebuild PASS, Schema ready9, 7 services healthy; fingerprint27 bảng M1 trước/sau giữ exact count/hash. Evidence [SRC-014](details/SRC-014.md), artifacts/SRC-014/{integration.log,verify.log,verify-summary.json,preview-build.log,upgrade-check.json,migration-status.log,services.log,worker.log}. Host Node25 chỉ driver; Docker sandbox denial rerun với escalation. Không browser inbox test (SRC-016), không provider thật/remote CI, không commit/push/deploy.

Docs sync: module Conversation/Channels, dictionary/model/physical v9, Conversation/API contracts, migration/local runbook, AC sub-scope, README/index, tracker/detail/checkpoint. Working tree main sau f575a8e dirty chứa task này. Không blocker/pending decision, test projects cleanup; preview giữ chạy. Next: claim SRC-015, đọc Channels/normalized intake/service-actor binding/referral trước code.

## S-20261004-06 — SRC-014 Git và SRC-015

Theo yêu cầu người dùng, commit SRC-014 `8cceb22` đã tạo (không push). Working tree sạch sau commit. Claim SRC-015 IN_PROGRESS, Codex 2026-10-04; dependency SRC-014 DONE.

CHG-20261004-08 (C2, resolved design): bổ sung [mock intake contract](../contracts/mock-intake.md), physical v10 và permission mapping trước code. Credential SHA256 gắn connection/tenant/service actor, service role ingress riêng để không đổi ctm_automation v1. Durable received ACK, worker lease60s/fencing, atomic identity/contact/conversation/message/touchpoint; connection row serialize identity resolution M2. Human operator admin seat+integration.read/retry all. Seed additive two-tenant channel fixture, random tokens private .env/stdin; không reset credential/quyền cũ. V1–v9 immutable; v10 nullable config không tự kích hoạt connection cũ. Tests và evidence bổ sung cuối phiên.

S-20261005-01 tiếp tục S-20261004-06 theo yêu cầu “thử lại”: hai lệnh trước đã exit0, MySQL80/80 và verify9 gates PASS. Commit SRC-014 vẫn `8cceb22`. Tiếp tục preview v10/seed+real worker E2E và docs sync; chưa đánh DONE trước các kiểm tra cuối.

S-20261005-01 hoàn tất SRC-015 DONE; SRC-016 READY. Evidence [SRC-015](details/SRC-015.md): test:integration PASS80; verify:container final PASS9/44 unit+7 tooling; preview v10, seed first2/repeat0, HTTP→real worker E2E PASS. Fingerprint27 bảng M1 exact trước/sau upgrade trước seed; migration status10/7 services healthy/worker không tick error. Compatibility paths/schemas cũ giữ nguyên ngoài attribution optional. Docker commands qua escalation do socket sandbox; không reset volume.

Docs sync: Channels/Conversation, contracts API+mock intake+bootstrap, dictionary/model/physical v10, local/migration runbook, acceptance, README/index, tracker/detail/checkpoint. Artifact refs artifacts/SRC-015/{integration.log,verify.log,verify-summary.json,preview-build.log,upgrade-check.json,seed-first.log,seed-repeat.log,e2e.log,e2e-facts.json,services.log,worker.log,migration-status.log,compatibility.json,docs-final.log}. Không credential/content thật trong evidence.

Git SRC-014 commit8cceb22 đã thực hiện; SRC-015 giữ working tree dirty, không commit/push/deploy thêm. Preview giữ chạy với synthetic channel records; test projects cleanup, không automation/runner, không blocker/quyết định pending. Next duy nhất: claim SRC-016 và xây inbox UI theo API.

## S-20261005-02 — SRC-016

Claim SRC-016 IN_PROGRESS, Codex 2026-10-05; SRC-015 DONE. Existing dirty SRC-015 files preserved; no parallel agents or commit/push.

CHG-20261005-01 (C2, resolved design): inbox needs readable internal notes and accurate owner/action controls. Add GET Conversation notes through CRM port (conversation.read plus independent Activity read/field ACL), optional owner_kind via Identity port and allowed_actions evaluated by backend. Notes cursor UUID in ascending ID order, UI sorts loaded notes by created_at/id; limit 1–100. No schema migration; existing APIs compatible. Queue uses existing state/owner/team filters, prefix search in loaded queue pages; no attention/handoff/qualification claims before SRC-017/020/021. Synthetic browser-only owner fixtures may use internal registry assignment port with audit, never public assignment endpoint. Tests/evidence pending.

CHG-20261005-02 (C2, resolved design): existing admin fixture has no Conversation grant. Add idempotent local inbox_operator role for Alpha/Beta admins via Identity-owned seed; preserve existing permissions/revocations on repeat. No public assignment route; browser-only synthetic ownership harness uses registry UoW and cancelQueued hook. No migration.

CHG-20261005-01 refinement: optional latest_message projection (same Conversation text ACL) supplies queue preview and actual received time/status. Read review revision remains in tenant memory across detail navigation/error reload; pending send retains exact original payload/key.

S-20261005-02 hoàn tất SRC-016 DONE; SRC-017 READY, 16/25 DONE. CHG-20261005-01/02 resolved. [Evidence SRC-016](details/SRC-016.md): 82 MySQL integration PASS; 9 Linux ARM64 verify gates PASS (44 unit/contract +7 tooling); canonical preview build and Chrome154 inbox E2E PASS. Final one-line textarea aria-label fix verified by preview build/browser plus host lint/typecheck; full verify preceded that label-only fix. Browser iterations corrected select/textarea accessible names.

Real tests cover intake→timeline, non-owner note, owner poll/review, quick reply no auto-send, lost ACK after commit→same-key retry exactly one message, signed message cursor, sent status, retained stale draft, Alpha/Beta/viewer isolation. Unknown/403 UI states use declared fault injection. Desktop/mobile screenshots inspected, overflow assertion PASS. Local inbox seed first2/repeat0; revocation preservation tested. No migration; latest-message snapshot replay rechecks field read.

Docs sync: README/index, Conversation/UX, API/Conversation/bootstrap contracts, dictionary, local runbook, acceptance/task detail/tracker/checkpoint. Artifacts local ignored `artifacts/SRC-016/` include integration/verify/preview/e2e logs, verify-summary/browser-facts, screenshots, seed runs, services/worker, final docs check. Head8cceb22 on main; dirty SRC-015 + SRC-016 retained, no commit/push/deploy. Seven preview services healthy; schema v10 unchanged; no test runner/automation active, no blocker/pending decision. Next: claim SRC-017 per Agent/Routing design.

## S-20261005-03 — Git handoff SRC-015/016

Người dùng yêu cầu commit Git. Gom source/contracts/tests/docs SRC-015 và SRC-016 đã nghiệm thu vào một commit trên main; không push/deploy. Trước staging: 70 candidate files, whitespace check và đối chiếu credential local/private-key marker PASS; .env/artifacts/dependencies ngoài Git. Evidence chức năng giữ ở SRC-015/016; không chạy lại application suite chỉ cho thao tác Git. Commit chứa entry này là snapshot handoff; hash thực lấy từ `git log -1`, trạng thái được kiểm tra sau commit.


## S-20261005-04 — SRC-017

Claim SRC-017 IN_PROGRESS, Codex 2026-10-05; dependency SRC-016 DONE; working tree clean. No parallel agents, commit/push/deploy.

CHG-20261005-03 (C2, resolved design): assignment wire contract, additive v11 routing cursor/capacity reservations/attention. Identity-owned eligibility projection, CRM ownership UoW port, Conversation cancellation port. Session/runtime cancellation hooks integrate at SRC-018/020; no fabricated engine state. See routing contract and physical schema. Tests pending.


S-20261005-04 hoàn tất SRC-017 DONE; SRC-018 READY, 17/25 DONE. CHG-20261005-03 resolved. Source/API/UI routing/assignment/takeover, v11 cursor/capacity/attention; Identity/CRM/Conversation UoW ports; service actor history; durable owner-revocation attention consumer. Seed routing additive, no AI policy auto-enable. Runtime/session hooks remain SRC-018/020.

[Evidence SRC-017](details/SRC-017.md): `pnpm test:integration` PASS96; `pnpm verify:container` PASS9 gates/46 unit+7 tooling, Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11. Preview v11 build/migrate/grants PASS, fingerprint13 existing tables exact count/hash before seed, routing seed first2/repeat0. `pnpm test:routing` Chrome154/OIDC PASS takeover/assignment, disabled eligibility, lost ACK same key/version one ownership revision, stale review, viewer403/cross-tenant404 and responsive viewport. No fabricated session/AI execution validation; capacity tested through real DB reservation port. First integration failure exposed string numeric expiry truthiness; corrected Number(live) and expired/released regression; test-order assertion and upgrade-count assumptions corrected.

Artifacts `artifacts/SRC-017/`: integration.log, verify.log/verify-summary.json, preview-build.log, upgrade-{before,after,check}.json, seed-{first,repeat}.log, e2e.log/browser-facts.json/screenshots, services.log/worker.log/migration-status.log/docs-final.log. Worker sample no tick failure; seven preview services healthy. Docker socket/Chrome require sandbox escalation, no automatic approval rejection. Test projects cleaned, no automation. No volume reset or v1–v10 changes.

Docs sync: README/index, Agents/Conversation, routing/API/events/registry/bootstrap/Conversation contracts, model/dictionary/physical schema, local/migration runbooks, acceptance, tracker/detail/checkpoint. Main HEAD153a1e4; working tree dirty SRC-017, no commit/push/deploy. No blocker/pending decision. Next only: claim SRC-018 and integrate deterministic Agent Runtime using capacity/cancellation ports.

## S-20261005-05 — Git handoff SRC-017

Người dùng yêu cầu commit/push SRC-017 và tiếp tục SRC-019. Trước Git: 64 candidate files, diff whitespace và quét credential local/private-key marker PASS; .env/artifacts/dependencies ignored. Evidence application giữ theo S-20261005-04, không chạy lại suite chỉ để đồng bộ Git. Commit chứa entry này gom SRC-017 trên main, target origin/main (không force push/deploy); kết quả push được kiểm tra sau thao tác. SRC-019 vẫn TODO do dependency SRC-018 READY chưa DONE; đang xác nhận phạm vi tiếp tục 018 trước 019, chưa claim task sai dependency.


## S-20261005-06 — SRC-018

Người dùng xác nhận chỉ thực hiện SRC-018. SRC-017 commit a8462e8 đã push origin/main, working tree sạch. Claim SRC-018 IN_PROGRESS Codex 2026-10-05; dependency SRC-017 DONE. Không parallel agent hoặc commit/push/deploy mới.

CHG-20261005-04 (C2, design refinement): physical v12 agent_execution/tool_execution, private runtime protocol và ChatflowSessionPort fail closed tới SRC-020. Runtime nhận context redacted qua Conversation/CRM ports; tools giữ UoW, max5/deadline30s/live auth-owner-policy. Không tạo Chatflow table/engine giả trong production; test harness riêng dùng session port synthetic. Xem runtime contract.

S-20261005-06 hoàn tất SRC-018 DONE,18/25; SRC-019 dependency READY chưa claim. CHG-20261005-04 resolved. [Evidence SRC-018](details/SRC-018.md): v12 execution/tool ledger, private schema/generated protocol, deterministic mock, fail-closed session port, live permission/owner/policy/service guards, transaction tool replay, capacity/deadline/late-result fencing, takeover/close/disable cancellation và bounded worker recovery. Không fake production Chatflow hoặc public fixture endpoint.

Final `pnpm test:integration` PASS115 (19 runtime +96 regression); `pnpm verify:container` PASS9 gates (50 unit/contract +7 tooling), Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11. `pnpm preview:up` build/v12/grants PASS, fingerprint13 tables exact count/hash; `pnpm test:routing` Chrome154/OIDC PASS sau v12. Schema12, seven services healthy, worker sample no tick error. Initial112/113 failed synthetic fixture missing provider_message_id, corrected; final115 includes terminal replay/current Contact redaction/nonblocking worker checks. Artifacts local ignored `artifacts/SRC-018/`, commands/logs linked in detail.

Docs synchronized README/index, Agent/Conversation modules, runtime contract, dictionary/model/physical schema, local/migration runbooks, acceptance sub-scope, task/detail/checkpoint. Full AC-07/08/M2 remains pending real Chatflow SRC-020. Main HEAD a8462e8, dirty SRC-018 retained without new commit/push/deploy. No blocker/pending decision, parallel agent, automation, volume reset or historical migration change. Preview retained; test runners complete; remote CI/native AMD64/Windows/production provider NOT_RUN.

## S-20261005-07 — Git handoff SRC-018

Người dùng yêu cầu commit và push Git. Snapshot source/contracts/tests/docs SRC-018 DONE trên main; target origin/main, không force push/deploy. Kiểm tra working tree, whitespace và credential local/private-key marker trước staging; .env/artifacts/dependencies không đưa vào Git. Evidence application giữ tại S-20261005-06 (115 MySQL tests,9 verify gates, Chrome/OIDC regression), không chạy lại application suite chỉ cho Git handoff. Commit chứa entry này là snapshot bàn giao; hash và kết quả remote được kiểm tra sau thao tác. SRC-019 dependency READY, chưa claim.

## S-20261005-08 — SRC-019

Claim SRC-019 IN_PROGRESS, Codex 2026-10-05; SRC-018 DONE, clean working tree. No parallel agents/automation/commit/push/deploy.

CHG-20261005-05 (C2, design refinement): additive v13 Workflow storage, exact automation wire contract, typed DAG validation, execution-role pinning, durable action ledger and wait predicate port. Definition/event selection tombstone prevents replay selecting a newer version. Child ports fail closed until SRC-020/021; synthetic child state is test-only. Compatibility: v1–v12 immutable; new tables/routes only. Tests pending. See workflow contract and physical schema.

Tiếp tục S-20261005-08 theo yêu cầu người dùng; giữ nguyên bản nháp chưa commit, sửa checkpoint stale. CHG-20261005-05 refinement: child cancellation durable request + worker UoW retry tối đa5 lần/15s, attention giữ sau exhaustion; v13 thêm cancel_attempts/cancel_retry_at trước lần áp dụng đầu. Bổ sung API/schema/client, worker consumers, graph checks và MySQL synthetic child harness. Host typecheck/lint/schema và4 graph tests PASS diagnostic Node25; canonical Docker đang chạy, chưa DONE.

S-20261005-08 hoàn tất SRC-019 DONE,19/25; SRC-020 READY chưa claim. CHG-20261005-05 resolved. [Evidence SRC-019](details/SRC-019.md): v13 seven Workflow tables, exact typed DAG/schema/OpenAPI/client, API session/CSRF/ACL/CAS/receipt, durable starter/version pinning/action ledger, fenced steps, wait predicate polling and bounded child cancel. Production child ports fail closed; no Chatflow/Sales fake implementation.

Final MySQL132/132 PASS (17 Workflow +115 regression),9 verify gates PASS (54 unit/contract +7 tooling), Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11. Registry metadata stalled normal builds; interrupted commands NOT PASS, fallback cached pinned dependency image plus current source with unchanged lockfile, no install/network. Release backend built from final source; Compose no-build upgrade v13/grants PASS, fingerprint13 exact count/hash. Chrome154/OIDC Workflow API and intake→worker→timer smoke PASS, fixture role detached and definitions disabled. Test harness corrected membership role route and cookie-free bearer intake; source unchanged after final canonical tests.

Artifacts local ignored `artifacts/SRC-019/`: integration-final.log, verify-final.log/summary, offline/release Dockerfiles and build logs, exact offline runner, preview-up.log, upgrade-check, API E2E/facts, services/worker/migration-status, docs-final.log. Standard Docker socket access required escalation; one combined preview action automatic approval review timed out before execution, split retry succeeded. No unresolved block or pending decision.

Docs sync README/index, Workflow/API/events, dictionary/model/physical schema, migration runbook, acceptance/detail/tracker/checkpoint. Main HEAD a34e3bc, working tree dirty SRC-019; no commit/push/deploy. Seven preview services retained healthy; disposable tests cleaned, no agent/automation or database reset/volume deletion. Remote CI/native AMD64/Windows/production provider NOT_RUN. Next only: SRC-020 Chatflow/session/turn/Human completion.

## S-20261005-09 — Git handoff SRC-019

Người dùng yêu cầu commit và push SRC-019. Kiểm tra44 candidate files trên main: diff whitespace và quét credential local/private-key marker PASS; .env/artifacts/dependencies ngoài Git. Gom source/contracts/generated/tests/docs đã nghiệm thu SRC-019 trong một commit; target origin/main, không force push/deploy. Evidence chức năng giữ tại S-20261005-08 và task detail (132 MySQL tests,9 verify gates, Chrome/OIDC Workflow smoke); không chạy lại suite chỉ cho Git handoff. Commit chứa entry này là snapshot bàn giao; hash và trạng thái remote kiểm tra sau thao tác. SRC-020 READY chưa claim, không task active.

## S-20261005-10 — SRC-020

Claim SRC-020 IN_PROGRESS, Codex 2026-10-05; dependency SRC-019 DONE, workspace clean. Scope chia tuần tự: A graph/consent contract + validation; B durable schema/session/turn + owning-module ports; C API/Human panel + integration/acceptance. Không agent song song, lịch nền, commit/push/deploy.

CHG-20261005-06 (C2, pending): bổ sung exact Chatflow graph contract, field provenance/explicit consent, bounded node validation trước engine. Compatibility additive; không sửa migration v1–v13. Planned v14 chỉ apply sau khi storage/ports đồng bộ và MySQL validation. Runtime/provider và Sales SRC-021 không mở rộng. Contract/evidence tại SRC-020 detail.

S-20261005-10: SRC-020-A graph/consent foundation implemented/verified; SRC-020 remains IN_PROGRESS,19/25 DONE. Schema/generated contract plus DAG/template/typed answer parser;11 Chatflow unit tests. Canonical Node24.21.0/pnpm10.33.0 Linux ARM64 verify PASS9 gates (65 unit/contract +7 tooling), artifacts `artifacts/SRC-020/verify-final/summary.json`, task detail includes exact commands/build logs. First host tuple inference typecheck failure corrected; initial Docker socket sandbox denial retried with approved escalation. Final docs/whitespace PASS. No MySQL/browser Chatflow evidence; B durable engine/ports and C API/Human panel pending. CHG-20261005-06 partial resolved A, overall pending. Main HEAD f4a6c27, dirty source/docs/generated retained, no commit/push/deploy. Preview unchanged v13/seven services healthy at inspection; verify runner complete. No blocker or pending business decision; next action SRC-020-B.

S-20261005-10 continuation: user requests completion of all remaining SRC-020. Retain A changes. CHG-20261005-06 extends physical v14 and transport before code; synchronous node effects+outcome atomic, private module ports, parent-pinned service role, polling recovery and exact execution callback binding. No parallel agent, schedule or commit/push/deploy.

Initial engine MySQL regression:129/132 PASS,3 CRM failures originating from nullable composite FK allowing a non-null session with null conversation. V14 already exercised in disposable DB; preserve its statements and add v15 `chatflow_binding_guards` CHECK, rather than rewrite applied migration. Follow-on two CRM failures were interrupted fixture setup; rerun pending. No preview migration performed yet.

Runtime integration review found proposed_reply must remain proposal-only until successful execution completion. Add v16 private node proposal field without rewriting applied v14/v15, move intent creation to guarded complete callback. Regression asserts no outbound effect from proposal tool or late completion after takeover. 146 MySQL tests passed before this additional hardening; final rerun pending.

SRC-020 A/B/C source complete, status VERIFYING. Final MySQL150 PASS (18 Chatflow+132 regression), canonical verify9 PASS (66 unit/contract+7 tooling), release backend/web builds PASS; details/artifacts recorded. OpenAPI pre-existing paths/schemas unchanged by structural comparison. Fixed queued-parent continuation, exclusive read lock ordering, inert runtime proposals, async revocation recovery, nullable composite-FK guard and draft-to-qualified same Lead; historical migrations preserved.

Automatic approval review rejected preview Compose up before execution because persistent v14–v16 schema/grants mutation needed explicit authorization. Async user approval requested; preview still SRC-019/schema13. Read-only before fingerprint saved thirteen tables; after comparison and browser Human form NOT_RUN. Browser script prepared; task not DONE pending gate. No workaround/retry without approval, no reset/volume deletion/commit/push/deploy/agent/automation. Source main starting HEAD f4a6c27 dirty retained.

S-20261005-10 completion: user explicitly “cho phép” authorized local preview v14–v16 migration/runtime grants, resolving earlier automatic rejection. Compose up succeeded, schema16 and seven healthy services.13 existing table counts/hashes exactly unchanged before browser fixtures. Chrome154 real OIDC/CSRF/permission/CAS/replay, actual intake→Workflow→Chatflow, Human takeover/form/explicit consent, qualified Lead, unchanged Human owner and parent completion PASS. Harness retries fixed missing tenant selection and exact select labels; source application unchanged; failed logs retained. Synthetic test workflow/service disabled and temporary role detached after each run. Final evidence and commands at [SRC-020 detail](details/SRC-020.md).

CHG-20261005-06 resolved. SRC-020 VERIFYING→DONE;20/25 DONE, SRC-021 READY unclaimed. README/index/acceptance/tracker/checkpoint synchronized. Canonical150 MySQL+9 gates retained; docs/whitespace final checks refreshed. Main starting HEAD f4a6c27, dirty SRC-020 source/docs/generated; no new commit/push/production deploy, reset, volume deletion, agents or automation. Preview stays running schema16; no unresolved blocker/decision. Full M2/Sales gate remains open.

## S-20261005-11 — Git sync và SRC-021

Theo yêu cầu user, commit SRC-020 `69ce348` và push `origin/main` thành công (f4a6c27..69ce348). Fresh docs check PASS76 files/326 links; git diff --check PASS. Evidence test SRC-020 giữ nguyên, không chạy lại hoặc nhận là evidence mới. Claim SRC-021 IN_PROGRESS, Codex 2026-10-05; dependency SRC-020 DONE.

CHG-20261005-07 (C2, SRC-021): bổ sung exact handoff transaction/DTO/schema và application ports trước code. Lead routing hiện kiểm qualify, không đáp ứng Sales accept; chỉ Lead handed_off chuyển eligibility sang read+accept/sales, qualification giữ nguyên. Handoff authorize lead.handoff, accept authorize lead.accept + live team membership + sales seat, owner/assign rule và version/owner revision. CRM port thực hiện share Contact read và ownership atomically; service chỉ target team literal trong pinned Workflow graph. V17 additive lead_handoff, durable attention, parent/action binding, không sửa v1–16. Cancel parent giữ pending handoff (module Workflow đã chốt không xóa Lead/handoff; cancel business chưa có quyết định). Contract sales-handoff là nguồn exact mới; test và evidence pending.

SRC-021 implementation now VERIFYING: v17 schema, CRM ownership/share port, Sales selection with read+accept, API/generated contract, Workflow child composition, overdue tick. Contact share grants read only, preserving field denial; no Contact/Conversation owner mutation. Race loser with stale owner/version returns409 after read/team checks; assigned-other current version still403 without assign. Initial integration159/163: fixture invalid availability `away`, corrected to `unavailable`. Next159/165: team revoke correctly hides record404 but test expected403, aborting fixture restoration and causing five follow-on failures; expectation corrected and fixture reset added. Canonical verify9/9 PASS on first source; final race-conflict adjustment under re-verification. No failed invocation called PASS.

Final SRC-021 DONE:166/166 MySQL integration (15 Sales +1 cross-module +150 regression), final canonical verify9/9 (66 unit/contract +7 tooling) PASS. Actual Chatflow→Workflow→Sales accepted keeps Conversation owner/revision/team/version and Lead source/session refs. Schema17 cold/additive upgrade tested on disposable tmpfs only; v1–16 unchanged. CHG-20261005-07 resolved; docs/contract/model/migration/AC synchronized; [task evidence](details/SRC-021.md). SRC-022 READY unclaimed, no active task. Working tree dirty SRC-021 on main69ce348; no second commit/push. Preview remains schema16, no rollout/reset; test containers/network cleaned.

## S-20261005-12 — Git sync SRC-021 và SRC-022

User yêu cầu commit/push và xác nhận tiếp tục SRC-022. Commit `8497cf2` pushed origin/main từ69ce348; fresh docs78/337 và whitespace PASS, prior166 integration/verify9 evidence retained. Claim SRC-022 IN_PROGRESS Codex2026-10-05, SRC-021 dependency DONE.

CHG-20261005-08 C2: SRC-022 cần exact Sales queue projection/list và operations failed delivery/run list, chưa có trong source. Bổ sung contract trước code; reuse existing commands and owning module ports. Operations retry endpoint mới có reason code, giữ legacy integration retry empty body tương thích; không retry outbound unknown, không sửa raw payload. No schema change planned.

SRC-022 VERIFYING: Sales/Operations projection APIs, generated schemas, owning ports and UI implemented; Agent Runtime attention included per SRC-018 contract.171 MySQL tests PASS and final verify9/9 PASS (66 unit/contract+7 tooling), release backend/web builds PASS. Initial169/170: assertion expected async rejection for sync validation; corrected test then170 PASS, final Agent projection171 PASS. Preview upgraded from16 to17 with volumes preserved; count/hash13 old tables match before fixtures. Initial browser race harness callback failed, then browser caught real retry submit button bug (missing type=submit on local Button primitive); fixed app, rebuilt/retested. Final browser pending. Temporary harness role cleanup recovery added after interrupted callback.

SRC-022 DONE: final171/171 MySQL, verify9/9, release backend/web and real Chrome154 Sales/Operations PASS. Browser fixed retry submit defect and correctly handles empty Agent Runtime; race409 and cached-detail403 intentionally fault-injected, backend actual races remain MySQL. Tenant deselect/reselect tested, no broad claim of new two-tenant browser test. Preview schema17 with13-table fingerprint preservation PASS. Cleanup check confirms zero temporary role/team bindings, active test actors/enabled test workflows; synthetic history retained. CHG-20261005-08 resolved. [Evidence SRC-022](details/SRC-022.md); SRC-023 READY unclaimed. Dirty SRC-022 source/docs retained on main8497cf2; no new commit/push.

## S-20261005-13 — Git SRC-022 và SRC-023

User authorized commit/push SRC-022 and continuation SRC-023. Committed `7583d6e`, pushed origin/main from8497cf2. Fresh docs check80 files/346 links PASS and git diff --check PASS; existing SRC-022 canonical evidence reviewed. SRC-023 claimed IN_PROGRESS, Codex2026-10-05, dependency SRC-022 DONE.

CHG-20261005-09 (SRC-023, C2): fixture narrative consent sentence is incompatible with the approved exact consent parser; use `đồng ý` / `không đồng ý` as actual evidence. A/D exercise AI prompt→Human takeover/completion (three inbound); C uses four collect answers; B uses short refusal graph. Business outcomes/counts unchanged. Metric verification is private test-only SQL over disposable synthetic DB, not a production report module/API. MySQL session clock controls persisted timestamps; no historical row rewrite. First sent time comes from durable message.sent outbox occurred_at, not queued message occurred_at. No migration/wire change. Contract and healthcare/reporting docs refined before implementation; verification pending.

SRC-023 completed same session. Source: healthcare-cases.ts + private fixtures/healthcare-metrics.ts; portable test:healthcare selector in integration runner/Compose; contract and cold walkthrough added. CHG-20261005-09 resolved. Final176/176 MySQL PASS; scoped cold walkthrough5 PASS/171 intentionally skipped; canonical verify9/9 PASS. Exact as_of equality refinement followed by final full regression; docs-only final updates checked separately. Initial reserved-table SQL failure retained, corrected without schema change. KPI12 inbound/4 conversations/3 CTM/3 qualified,2/3 ratios,180s median acceptance/30s response. Preview seven services healthy, no test containers remain; no preview writes, no production provider or release deployment. Working tree main7583d6e dirty with SRC-023, no second commit/push. SRC-024 promoted READY, unclaimed. [Detail](details/SRC-023.md).

## S-20261006-01 — Git sync SRC-023

User explicitly requested commit/push. SRC-023 committed `92d3ed6` and pushed origin/main from7583d6e. Fresh docs check83 files/356 links and git diff --check PASS; previous176 integration and9/9 canonical verify evidence reviewed, not rerun. No implementation/task status change; SRC-024 remains READY, unclaimed. Services untouched; last runtime evidence remains S-20261005-13. This Git checkpoint update is recorded in the following docs commit.

## S-20261006-02 — SRC-024 claim

Codex2026-10-06; dependency SRC-023 DONE, relevant M2 designs/contracts Ready, clean working tree at session start. SRC-024 IN_PROGRESS. Preview7 services healthy; no preview mutation authorized or needed. Add real transport outage and process crash boundaries, then run full permission/race/fault regression in disposable test infrastructure. No subagents/automation/commit/push.

CHG-20261006-01 (SRC-024, C1): fault harness uses dedicated ephemeral Redis and MySQL plus a test-local TCP cut and SIGKILL child processes running compiled application services. Existing M2 worker polls MySQL directly (no BullMQ transport in this scope); test outage must assert actual Redis unavailability, durable intake and recovery without claiming a Redis queue implementation. No schema/API/event change or migration; verification plan in docs/quality/m2-fault-suite.md. Status resolved;180 MySQL tests and9 canonical gates PASS.

### S-20261006-02 completion

SRC-024 DONE; SRC-025 READY, unclaimed. Added four fault cases and test-only process/TCP helpers, ephemeral Redis in integration Compose, compiled-service runner and fault matrix/runbook. Initial179/180 with one new SQL assertion failure (action_key table mismatch), corrected; final180/180 PASS. Canonical verify9/9 (66 unit/contract,7 tooling) PASS in pinned Linux ARM64 Node24.21.0/pnpm10.33.0/MySQL8.4.11/Redis7.4.11. Commands/artifacts and precise injection limits at [SRC-024](details/SRC-024.md). Final docs check after status edits. README/index/acceptance/tracker/checkpoint synchronized; stale SRC-023 READY in index corrected. No production code/schema/API change, no commit/push/deploy; dirty working tree on main d4a4506. Seven preview services healthy and untouched; test containers/network cleaned. No blocker, no pending decision, no automation/subagents. Next action: claim SRC-025 release images/upgrade smoke/M2 demo.

## S-20261006-03 — Git sync SRC-024 và SRC-025 claim

User explicitly requested commit/push SRC-024 and complete SRC-025. Commit3476707 pushed origin/main from d4a4506. SRC-025 IN_PROGRESS owner Codex2026-10-06, dependency SRC-024 DONE; release scope Ready in build/Docker plan and M2 contracts. CHG-20261006-02 (C1): add reproducible isolated release smoke, seeded M1 schema8 upgrade to17 with fingerprints, real browser/API/worker M2 demo and restart persistence. No new product API/schema or production deployment.

SRC-025 verification progress: native backend/web and historical M1 release builds PASS; schema8→17 preserves31 old tables and10 CRM records. First browser login failed while Docker32GB disk reached100%; retained evidence. Diagnostics confirmed MySQL unable to resize redo/temporary files. Removed unused build cache older than1h only (13.96GB reported; disk now65% used/11GB free); no image tag/database volume deleted. Existing test volume recovered and real OIDC login passed on the same data. AMD64 backend/web builds PASS; runtime smoke pending.

ARM64 final gate PASS: artifacts/SRC-025/arm64-final/release-summary.json; actual M1 historical build→schema17,31 tables preserved, migration no-op, real OIDC/worker/Sales accept/Human completion, all-table persistence through whole-stack stop/start and one resumed timer completion, separate cold project repeats demo. Earlier harness failures (Sales label, prefilled textarea label, unique mock credential fixture) retained and corrected without product/spec changes. AMD64 equivalent gate running.

### S-20261006-03 completion

SRC-025 DONE; all25 M1–M2 source tasks DONE and local/mock M2 release gate PASS. Native ARM64 and emulated AMD64 full release gates passed (arm64-final/ and amd64/ release-summary.json); real historical M1 f575a8e schema8→17,31 old tables preserved, no-op rerun, whole-stack hash equality and persisted timer completion, isolated cold start, real Chrome/OIDC/worker/AI-owned qualification/Sales accept/Human UI completion.180 regression and9 canonical gates PASS; final AST/docs/whitespace checks after harness refinements/closeout. CHG-20261006-02 resolved; no product source/schema/API/event change. Seven preview services healthy; no test containers remain; named test volumes deliberately retained with inventory. Source/evidence/commands/failures/environment at [SRC-025](details/SRC-025.md). SRC-0243476707 pushed as requested; SRC-025 changes uncommitted on main3476707, no production deploy. No blocker/unresolved decision, no automation/subagents. Next action: review/prioritize M3 design gate before any real Meta/AI integration implementation.

## S-20261006-04 — Git sync SRC-025

User explicitly requested commit/push. SRC-025 committed `f35ea60` and pushed origin/main from3476707. Fresh docs check88 files/381 links, AST lint205 files and git diff --check PASS; previous release/regression/canonical evidence retained, runtime suites not rerun for Git-only sync. All25 tasks remain DONE. Services untouched; runtime evidence remains S-20261006-03. This checkpoint/evidence sync is recorded in the following docs commit.


## S-20261006-05 — PLAN-002 M3 provider/connector direction

Claim PLAN-002 IN_PROGRESS, Codex 2026-10-06, dependency SRC-025 DONE. User explicitly directs AI Agent provider selection (Meta Business Agent case study), provider conversation routing, common message envelope and local official documentation snapshots. Scope Ready for this planning task only; production contracts remain Draft.

CHG-20261006-03 (C3 direction authorized by user, C2 contract refinement pending): M2 in-process execute/cancel protocol is insufficient as the only abstraction for a hosted agent platform. Separate AI Agent provider configuration/lifecycle, CRM Connector transport/routing and platform-specific message rendering. Keep M2 contracts/migrations intact; future additive/versioned contracts require design gates. Update module designs, dictionary, contract draft, architecture/ADR, roadmap/build plan, acceptance, tracker/checkpoint and provider source manifest. Direction resolved via ADR-016 and updated docs; exact provider contract gaps remain PLAN-003/004, no product implementation.

### S-20261006-05 completion

PLAN-002 DONE (doc-only); PLAN-003 READY unclaimed, PLAN-004 TODO. CHG-20261006-03 direction resolved, production contract refinements remain Draft with named gaps. Added M3 provider plan, common-message envelope draft and 20 official Meta Markdown snapshots plus2 llms indexes, provenance/date/byte length/SHA-256 manifest. Updated runtime boundary, Agents/Channels/Conversation, data/architecture/ADR/UX, roadmap/build plan, acceptance, README/index and tracking. Meta overview WhatsApp eligibility excludes Health; preserve healthcare mock and use synthetic catering/retail for future provider case study. Messenger app routing and WhatsApp Agent thread control explicitly distinct.

Final `node scripts/check-docs.mjs` PASS92 Markdown/451 local links/3 JSON examples/5 Mermaid headers/25 source task dependency graph; `git diff --check` PASS; Python byte/hash/provenance check PASS22 source files. Host macOS ARM64 Node25.9.0 for docs only; no product runtime test. Artifacts: `artifacts/PLAN-002/docs-check.log`, `checksums.log`, `whitespace.log`; details at [PLAN-002](details/PLAN-002.md). Initial sandbox curl DNS failed then approved public fetch succeeded; upstream encoded JSON failed doc parse, so raw immutable vendor Markdown saved as .md.txt without changing checker. Intermediate missing detail link fixed and final check rerun. No failed invocation reported PASS.

Read-only Docker inspection returned7 existing services healthy; a later attempt to redirect the same snapshot to artifact failed sandbox socket access, not a new health result. Prior successful observation preserved in `artifacts/PLAN-002/services.log`; services untouched. All M3 sandbox/account eligibility/runtime acceptance NOT_RUN. Main starting HEAD1111839, dirty docs only, no commit/push/deploy/source/schema change. No agent or automation. Next action: claim PLAN-003 provider documentation/capability gap review; do not claim source integration on Draft design.


## S-20261006-06 — PLAN-003 provider dossier

User yêu cầu tiếp tục. Claim PLAN-003 IN_PROGRESS, Codex 2026-10-06; dependency PLAN-002 DONE, research scope Ready. Existing dirty PLAN-002 docs retained, starting HEAD1111839; no source implementation. Read plan/module/contract/dictionary/acceptance and source gaps before research.

CHG-20261006-04 (C2, PLAN-003): bổ sung official WhatsApp/Agent references, per-surface API version/capability mapping và gap dispositions, giữ implementation Draft. Không schema/API/event/migration change; sandbox evidence NOT_RUN.

### S-20261006-06 completion

PLAN-003 DONE (research only), PLAN-004 READY unclaimed. CHG-20261006-04 resolved as research refinement with explicit remaining integration gates. Added33 Markdown+1 WhatsApp index; total56 downloaded snapshots preserve byte lengths/SHA-256,4 unusable HTML responses recorded failed. Graph versions/release notes observed in browser; selected v26.0, Agent config2.0.0 and Thread Control1.0.0. Generated16-endpoint URL/method/header version matrix; capability/source/disposition and sandbox case mapping. Updated source docs, plan, runtime/message drafts, modules, dictionary, ADR, acceptance and trackers; no product changes.

`node scripts/check-docs.mjs` and `git diff --check` PASS; Python verification56 source snapshots+16 endpoint rows PASS. Final doc counts in `artifacts/PLAN-003/docs-check.log`; source hashes in `sources-check.log`, whitespace in `whitespace.log`. Evidence environment/commands/failures and gap ownership: [PLAN-003](details/PLAN-003.md). Sandbox/account eligibility/control/tool/runtime checks NOT_RUN; no new M3 AC PASS. G-04 control host/path, G-05 exact WA handover payload, G-08 hosted tool callback binding remain release/design gates; PLAN-004 can proceed independent scopes.

Read-only docker ps reports7 preview services healthy; observation at artifacts/PLAN-003/services-observation.log, no lifecycle action. Main HEAD1111839 with existing PLAN-002+new PLAN-003 docs dirty; no commit/push/deploy/reset/source/schema/migration change. No agents/automation/background jobs. Next action: claim PLAN-004 exact contracts/UX/data/backlog with unresolved sub-scopes kept Draft.

## S-20261006-07 — PLAN-004A và SRC-026

Owner Codex, ngày2026-10-06. User yêu cầu implement. Claim PLAN-004A IN_PROGRESS; chỉ một task active.

### CHG-20261006-05 — Tách gate độc lập cho message envelope

C2, PLAN-004A/SRC-026: PLAN-004 rộng còn nhiều design/sandbox gaps; tách legacy read-only projection để code phần Ready. Contract/module/dictionary/physical-schema/AC/build-plan/tracker được cập nhật trước code. Không đổi migration, API messages v1, ownership hoặc integration mock. PLAN-004 còn TODO; rich/config/routing/tools không được coi DONE. Tests pending; quyết định design resolved.

PLAN-004A DONE sau docs check96 files/568 links (host Node25 doc-only). SRC-026 claimed IN_PROGRESS trước source edits. Implement GET message-envelopes, strict generated contract và tenant-bound Channels history port. Initial integration command bị sandbox chặn Docker socket (artifacts/SRC-026/integration.log); retry elevated đã được duyệt, đang chạy. Fixture trạng thái inactive được sửa đúng enum disabled trước build. Canonical verify và MySQL suite pending; không claim PASS.

SRC-026 DONE: canonical verify9/9 PASS (67 unit/contract +7 tooling), MySQL regression181/181 PASS, isolated container cleanup exit0. Evidence artifacts/SRC-026/{integration-retry.log,verify.log,verify/summary.json}; final docs/whitespace và services observation cùng thư mục. AC chỉ đóng text foundation, không rich/provider/UI. PLAN-004A doc gate DONE; PLAN-004 phần còn lại TODO. Main HEAD1111839 dirty (preserved PLAN-002/003); không commit/push/deploy/migration. Preview không lifecycle mutation. Next: exact rich persistence/renderer design trong PLAN-004. [Task detail](details/SRC-026.md).

## S-20261006-08 — Rich message foundation

Owner Codex2026-10-06. Claim PLAN-004B IN_PROGRESS, dependency SRC-026 DONE; existing dirty source/docs preserved.

### CHG-20261006-06 — Rich content sidecar và passive rendering

C2: schema v2 null-only không mở rich ngầm; tạo v3 endpoint và sidecar migration18. Phát hiện Chatflow đọc mọi inbound text; filter qua Conversation port để fallback/CSAT không là consent. Chốt normalized rich mock transport, reply resolution, media metadata-only và render passive theo rich-messages contract; cập nhật module/data/UX/AC/plans trước code. Remote media resolver/live provider riêng Draft. Design resolved; tests pending.

User steering S-20261006-08: text của media là extracted/preview, automation được đọc để dự đoán; UI parse JSON content. Điều chỉnh CHG-20261006-06 trước tests: bỏ blanket nontext exclusion, bổ sung text_source, inference accepts rich và consent original-only. Không cần hỏi lại. Chưa chạy migration18; thiết kế sidecar không đổi.

SRC-027 implementation: schema18 sidecar + typed rich mock intake, v3 projection/reply resolution, passive inbox renderer và text_source original/extracted/preview. Original-only consent; inference dùng text mọi type. Initial tests: verify.log FAIL JSX transform; integration.log181 PASS/2 FAIL do rich fixture chạy trước baseline-empty tests; sửa cấu hình Oxc JSX và chuyển fixture. verify-retry.log9/9 PASS, integration-retry.log183 PASS trước refinement preview. Refinement tạo preview từ JSON title/name/prompt thay fixed label; verify-final/verify-complete và integration-final/integration-complete FAIL build vì TypeScript narrowing. Sửa bằng hai guard riêng; host Node25 contracts build/backend typecheck preflight PASS (không canonical runtime evidence). Canonical validated runs đang chạy, chưa đóng task. Browser fixture từ component SSR thật PASS desktop1100/mobile390, no remote fetch/action/overflow; screenshots và browser.log ở artifacts/SRC-027; không login/full-stack browser claim.

SRC-027 DONE: integration-validated.log183/183 PASS; verify-validated.log9/9 PASS gồm73 unit/contract/renderer+7 tooling. Browser component desktop/mobile PASS, screenshots inspected; full-stack browser/Meta/media resolver/release NOT_RUN. Final docs/whitespace evidence cùng artifacts/SRC-027. Main1111839 dirty preserved, no commit/push/deploy; preview7 healthy, test cleanup exit0, schema18 chỉ disposable test. PLAN-004B DONE; next authenticated media reference/resolver design. [Evidence](details/SRC-027.md).

## S-20261006-09 — Enterprise microservices blueprint

Claim PLAN-005 IN_PROGRESS, Codex2026-10-06; SRC-027 DONE. Read current README/build plan/tracker/checkpoint, architecture/modules/data/contracts/change control; dirty prior work preserved.

### CHG-20261006-07 — Microservices architecture direction

C3 architectural boundary change, explicitly authorized by user: mỗi module có phạm vi, kiến trúc và data model rõ; enterprise microservices là target thay modular monolith. Không hỏi lại định hướng đã yêu cầu. PLAN-005 chốt logical boundaries, data ownership và distributed invariants; exact transport/security/migration implementation gates theo follow-up. Không đổi business Human/AI/tenant semantics. ADR-017 supersedes future monolith/shared-UoW rules, retains current source/migrations1–18 and prior test evidence. Docs affected: system/modules/services/contracts/data/decisions/planning/tracking. Source/runtime changes NOT_RUN/not in doc-only task.

PLAN-005 DONE doc-only:14 per-service descriptors,11 module→service links, service-owned data/registry partition, distributed contract/saga/authorization gates và extraction roadmap. ADR-017 replaces target architecture; baseline source retained. Boundary checker368 source/config SHA256 unchanged; docs/links/DAG/whitespace PASS, artifacts/PLAN-005. No app/broker/deploy tests, no source changes/commit/push; old dirty work retained. PLAN-006 READY design task; source extraction not Ready. Checkpoint updated with current-vs-target, services last-known state và next first-slice exact contracts.

## S-20261006-10 — First independent Connector ingress

Claim PLAN-006A IN_PROGRESS, Codex2026-10-06. User requests implementation. Existing dirty source/docs preserved; current source baseline monolith, PLAN-005 docs DONE.

### CHG-20261006-08 — Scope first extraction prerequisite

C2 architecture implementation refinement: split independent durable HTTP ingress bridge before broker/full domain extraction. PLAN-006A exact connection-scoped binding/intake/receipts/own DB/lease/auth protocol; remaining006 dispatch/Human delegation/sagas/JetStream not DONE. No owner/control or real provider mutation scope; no change public legacy messages. Separate service schema1, no edit monolith migrations1–18. Source task follows doc Ready gate. Tests pending.

PLAN-006A DONE: docs check PASS120 Markdown/739 links; scoped contract Ready. Claim SRC-028 IN_PROGRESS, Codex2026-10-06; deps SRC-027 DONE.

SRC-028 implementation: independent Nest API/worker, private schema1/journal, explicit grant/provision, durable HTTP binding/dedup/retries/receipts, non-root image and opt-in Compose/runbook. Initial integration FAIL load decorator in test fixture; retry FAIL MySQL BIGINT advisory-lock string; lock-fix FAIL reserved SQL alias in grant. Corrected each; integration-grant-fix.log184/184 PASS. Initial verify9/9 PASS, image build PASS; image-smoke first attempt failed at old grant alias, own project cleaned. Final audit composite FK, concurrent replay and generated error schema validation pending; status VERIFYING. No preview changes.

SRC-028 DONE: final verify9/9 PASS (77 unit/contract/renderer,7 tooling), integration-final.log184/184 PASS, image-smoke-final.log release image/private MySQL/non-root/HTTP/API restart PASS and cleanup exit0. Own audit FK tenant-bound, canonical concurrent replay tested, worker child process recovery/shutdown tested. One final integration approval review timed out; permitted retry succeeded. Protected monolith migrations match pre-turn PLAN-005 hashes. Docker ps7 preview healthy, no test containers; no preview schema/route/traffic change, no commit/push/deploy. Docs/checkpoint/task/AC updated; remaining PLAN-006 TODO and production/Meta/broker NOT_RUN.

## S-20261006-11 — M3 local completion

User yêu cầu hoàn thiện M3 và chọn local trước, chưa có sandbox. Read checkpoint/tracker/plans/module/service/data/acceptance and provider snapshots; HEAD1111839, existing dirty work preserved. Claim PLAN-004C IN_PROGRESS, Codex2026-10-06, SRC-028/PLAN-003 DONE. No agent/background automation/commit/push/deploy.

### CHG-20261006-09 — Signed Messenger ingress before domain cutover

C2 scoped additive gate: independent Connector can capture authenticated real-format Page events without Chat extraction or calling mock APIs. Exact raw signature/challenge, immutable Page→tenant binding, atomic batch retention, message/replay identity, unknown/echo/standby quarantine, local schema2 and fault tests. Source must never reinterpret provider-managed echoes/control as inbound customer turns or silently drop unsupported messages. Remaining domain ingestion/dispatch/media/provider UI not promoted by this gate. User chose local synthetic verification; actual Meta sandbox NOT_RUN.

PLAN-004C DONE scoped design, docs check PASS (artifacts/SRC-029/design-docs.log). Claim SRC-029 IN_PROGRESS, Codex2026-10-06. Implementation/test pending.

SRC-029 initial canonical verify PASS; MySQL184 PASS/1 FAIL: SELECT FOR UPDATE on read-only Page binding returned503. Fix uses SELECT FOR SHARE on bindings + ordered event unique-key no-op inserts; runtime still cannot mutate Page/tenant. Final verification pending. Logs retained artifacts/SRC-029.

SRC-029 VERIFYING: final MySQL185/185 PASS; canonical9/9 PASS (86 unit/contract/renderer +7 tooling). Initial integration permission bug fixed without Page UPDATE grant; retry reached assertion failure because DataSource COUNT returns string, corrected with numeric normalization. Image smoke passed signed capture/replay and API restart; final rebuild pending after timestamp validation refinement. Logs retained. Full M3 local remains incomplete; no sandbox or preview mutation.

SRC-029 DONE: final canonical9/9 (86 unit+7 tooling), MySQL185/185, final release-image signed capture and restart PASS, cleanup exit0. Seven preview services healthy. Existing dirty work preserved at HEAD1111839; no commit/push/deploy. [Evidence](details/SRC-029.md). M3 local is not complete; next exact domain-ingestion/dispatch gate in PLAN-006.

## S-20261006-12 — Clear contact resolution responsibilities

Claim PLAN-006B IN_PROGRESS, Codex2026-10-06; dependencies PLAN-005/SRC-029 DONE. User explicitly assigns Connector provider profile enrichment/cache, CRM Core contact resolution and required CRM Contact ID on inbound/outbound Chat message contracts. Existing dirty workspace preserved; source snapshot artifacts/PLAN-006B/source-before.json. No implementation or runtime change planned in this design turn.

### CHG-20261006-10 / ADR-019

C3 target authority refinement explicitly authorized by user: canonical external-identity→Contact mapping belongs to CRM Core; Connector owns provider identity observations and reconstructible resolution/profile caches. Replaces PLAN-005 ownership row grouping contact_identity with Connector; monolith physical ownership unchanged until a future migration/cutover. New versioned Chat message interfaces require crm_contact_id on both directions. No modification of strict shipped schemas or old migration history. Exact auth/physical schema/provider endpoint and dispatch gates remain PLAN-006/004; no repeated business approval required.

PLAN-006B DONE design-only: [contract](../contracts/contact-resolution.md), ADR-019 and service/module/data/API/event/UX/planning/AC documents synchronized. Canonical mapping CRM, observations/cache Connector; required crm_contact_id both directions including customer recipient for echo. Profile cache24h/resolution5min baseline, failure fallback and authoritative Chat binding validation specified; exact DTO/auth/DDL/provider endpoints still gated. `node scripts/check-docs.mjs`, `git diff --check`, Python source/config SHA256 comparison PASS, artifacts/PLAN-006B. No source/runtime test or service lifecycle operation, no commit/push/deploy; main HEAD1111839 dirty preserved. Checkpoint records next exact design gate; no task active.

## S-20261006-13 — DB-backed cache-aside resolution

Claim PLAN-006C IN_PROGRESS, Codex2026-10-06; PLAN-006B DONE. User clarifies Chat/Connector load caches from persisted DB mappings, call CRM Core to create Contact+identity only when absent. CHG-20261006-11 (C2): replace forced per-message CRM validation and cache-miss-implies-create with cache→DB lookup→confirmed absent→idempotent CRM resolve/create. Cache TTL is not authorization validity. Module port versus service API follows ADR-017; no new cross-service SQL or source implementation. Prior dirty work preserved; doc-only.

PLAN-006C DONE design-only: cache-aside lookup/hydration for both services, authoritative DB-miss-only create, no per-message CRM mapping RPC on valid hits, separate dispatch authorization, mismatch/error behavior and nonblocking enrichment recorded. Replay created flag preserves stored receipt. Docs/service/data/ADR/AC/tracker/checkpoint synchronized. Docs/whitespace PASS under artifacts/PLAN-006C; runtime NOT_RUN, no source or lifecycle change, dirty work preserved, no commit/push/deploy. Next exact auth/schema/cache invalidation/fencing gate remains PLAN-006.

## S-20261006-14 — Cache-aside implementation

Claim PLAN-006D IN_PROGRESS, Codex2026-10-06. User requests implementation of approved cache→DB→CRM resolve/create and contact-bound Chat. Existing dirty main1111839 preserved. CHG-20261006-12 (C2): scoped authenticated compatibility APIs on existing immutable mock connections; own Connector cache/remote CRM port, monolith CRM-owned identity application port and Chat cache/required-contact ingress/outbound command. No migration or domain extraction, real Facebook capture not routed into mock. Remaining provider enrichment/live mapping invalidation/merge/dispatch gates separate.

PLAN-006D DONE scoped design check PASS; claim SRC-030 IN_PROGRESS.

SRC-030 initial canonical verify9/9 PASS; MySQL187/188 PASS, one failure: Nest POST default201 disagreed with lookup/resolve contract200. Explicit response status fixed; final verification pending. Added concurrent first-contact race, failed-transaction cache isolation and cross-contact duplicate-message fence tests. Scoped docs and backend-first rollout/rollback constraint synchronized.

SRC-030 VERIFYING: final MySQL188/188 PASS, canonical9/9 PASS (89 unit/contract/renderer +7 tooling). Fix preserves explicit200 lookup/resolve contract; rollback/cache/concurrent-first-contact/cross-contact duplicate regressions passed. Release-image smoke running; no preview deployment or migration.

SRC-030 DONE: canonical9/9 (89 unit+7 tooling), MySQL188/188, release-image smoke/restart PASS; disposable projects cleaned exit0. Final docs/whitespace checked; seven preview containers healthy, not upgraded. [Evidence](details/SRC-030.md). Main HEAD1111839 dirty preserved, no commit/push/deploy. Full M3, real Messenger→Chat, profile enrichment and new contact-bearing event family remain pending; checkpoint records one next design/source gate.

## S-20261006-15 — Facebook configuration and channel-aware inbox

User requests Admin Channels→Facebook Page list/Connect, DB-managed Page tokens and Conversation channel/channel_id filters. Explicit follow-up chooses real OAuth Page discovery now. CHG-20261006-13 (C2 authorized scope): exact OAuth/credential/schema19/API/UI contract, baseline Channels authority pending service extraction; real messaging transport remains separate. Preserve dirty main1111839. Claim PLAN-004D IN_PROGRESS, dependencies SRC-030/PLAN-003 DONE.

PLAN-004D design check PASS, SRC-031 IN_PROGRESS. Implemented schema19, fixed-origin OAuth adapter and Page token encryption, Admin UI and channel filters. Initial MySQL195/195 and host preflight94 unit tests PASS; additional field-policy/filter/UI cases and final canonical verification pending. No live Meta call, credential inspection or preview change.

SRC-031 DONE: final canonical9/9 (96 unit+7 tooling), MySQL196/196, desktop/mobile Next+Chrome synthetic OAuth/catalog/filter smoke and pinned nginx config PASS. [Evidence](details/SRC-031.md), [runbook](../development/facebook-configuration.md). Secrets never exposed; no real Meta request during tests. Disposable projects and temporary3101 server stopped; seven preview services healthy/schema17 unchanged. Main HEAD1111839 dirty preserved; no commit/push/deploy. Full M3/capture→Chat/subscription/send/profile and live OAuth acceptance remain pending.

## S-20261006-16 — User-authorized Git handoff

User explicitly requests commit and push current work, then will continue task-by-task. Scope includes accumulated SRC-026…031 source, contracts, service/M3 design and tracking evidence. Verified previous final SRC-031 evidence:196 MySQL,96 unit,9 canonical gates and browser/gateway checks PASS; tests not rerun for Git handoff. Restore next-env.d.ts production generated paths after isolated dev server; retain Next-generated agent guide files. No preview update; schema17/running images remain unchanged. Commit/push outcome recorded in conversation; this entry is included in the handoff commit.

Handoff review:246 staged files before this log update; ignored .env/artifacts excluded. Sensitive-pattern scan matched only literal PEM header syntax in public Meta connector documentation, no key material. Staged whitespace check passes excluding immutable upstream *.txt snapshots; preserve their original whitespace/checksums. Fetch confirmed HEAD and origin/main aligned before commit.

## S-20261006-17 — Initialize development on Windows

Claim ENV-001 IN_PROGRESS, Codex 2026-10-06, dependency SRC-031 DONE. User requests local environment initialization for continued development. Clean main HEAD1531c2a at entry; Docker Desktop Linux/amd64 Engine29.2.0 and Compose5.0.2 available, no containers/volumes. Host defaults Node18.15.0/pnpm11.19.0 mismatch; use pinned container toolchain and supported Node24 orchestration. No production connection, volume reset, commit/push or background automation.

CHG-20261006-14 (C1, ENV-001): Windows core.autocrlf=true changed generated contracts from repository LF to working-tree CRLF; contracts:check failed on health.ts before unit tests. Add scoped .gitattributes LF rules for generated contract files/OpenAPI, normalize only those checkout files without changing content or upstream reference snapshots. No schema/API migration or business change. Recheck and build evidence pending.

CHG-20261006-15 (C1, ENV-001): Docker could not bind Windows loopback8080 (socket permission error); initial dev startup failed before migration, db:status therefore NOT_READY. Add optional LOCAL_GATEWAY_PORT with existing8080 default; machine .env uses18080 and matching APP_ORIGIN. No API/schema/business change or Windows network reservation removal; preserve all local volumes.


CHG-20261006-16 (C1, ENV-001): seed preflight diagnostics returned schema19 but Docker process ETIMEDOUT at30069ms while completing container teardown. Increase only seed-dev schema preflight timeout30→120s; unchanged local-target/schema/credential/ownership guards and domain transactions. Retry uses idempotent fixture. Initial seed attempts had no provider/DB fixture writes.


CHG-20261006-17 (C1, ENV-001): native tooling regression suite3/7 PASS,4 FAIL because subprocess paths used URL.pathname (/D:/...) instead of Windows filesystem paths. Replace both test-runner pathname conversions with node:url fileURLToPath; production behavior unchanged. Final native/container tooling checks pending.


ENV-001 DONE: project Node24.21.0/pnpm10.33.0/frozen dependencies; Windows build/typecheck96 unit +7 tooling tests, lint/contracts PASS. Docker dev images built; final7 services healthy/schema19 and HTTP200. OIDC provision/six seeds PASS; Identity repeat0 created/2 preserved. Chrome154 six-user OIDC/admin tenant UI/403/404/Beta unchanged PASS. [Evidence](details/ENV-001.md). Initial bind/health timeout/path failures retained. Seven dev services running localhost18080; Connector not started. Main1531c2a dirty, unrelated UX PNG untouched; no commit/push/automation. Next source remains provider-ingestion design gate; M3 incomplete.

## S-20261006-18 — Agent Chat UX specification

Claim UX-001 IN_PROGRESS, Codex 2026-10-06; dependency SRC-031 DONE. User requests rewriting UX specification from supplied layout image. Read baseline plans/tracker/checkpoint, module/service/data ownership/dictionary/contracts/AC; inspected docs/ux/agent_workspace_chat_layout_sample.png. Existing main HEAD1531c2a dirty ENV-001/config/generated files preserved; no application source changes.

CHG-20261006-18 (C2, UX-001): replace three-column Chat wireframe for future rebuild with app rail, Inbox sidebar, conversation list/search/filter, conversation header, messaging console, context drawer/tool rail. Specify responsive sizes, interactions, permissions, draft/idempotency, API binding, visual system and UX-CHAT-01…12. Image-only unread/snooze/custom inbox/media actions remain Deferred without contracts. Affected: UX spec/workspaces, module Conversation, docs index, acceptance and tracking. No schema/API/event/business-state change or migration; existing implementation evidence retained. Design discrepancy resolved by marking old wireframe historical. Document checks pending; runtime NOT_RUN.

UX-001 DONE (design-only): final docs check PASS, 137 Markdown files; scoped git diff --check PASS (LF/CRLF warnings only). Manual image/contract review complete; new UX runtime/browser cases NOT_RUN. Evidence: details/UX-001.md. No API/schema migration; no app source changes. Main HEAD1531c2a dirty preserved; no commit/push/deploy. Docker status inspection denied by sandbox, services not modified or freshly verified. Next: scoped UI rebuild task using UX-CHAT-01…12; remaining M3 provider work separate.

## S-20261006-19 — Complete Agent Chat product contracts

Claim UX-002 IN_PROGRESS, Codex 2026-10-06; UX-001/SRC-031 DONE. User explicitly authorizes adding suitable metrics, entities and flows from the sample and revising contracts to complete design. CHG-20261006-19 (C2 additive contracts plus user-authorized product behavior): replace UX-001 API-only constraint with designed unread/counts, queue search/sort, custom/shared inbox, conversation tags, durable snooze, activity timeline and snippets/contact navigation. Preserve existing owner/tenant/closed-state/unknown-send rules. Exact scope, ownership/migration and acceptance to be synchronized before design completion; runtime remains NOT_RUN. Existing dirty workspace preserved, no source implementation or background tasks.

UX-002 DONE, design-only: final docs check PASS — 141 Markdown files, 918 local links, 3 JSON examples, 10 Mermaid headers (not rendered), 37 acyclic source tasks. Scoped docs whitespace check PASS (Git LF/CRLF warnings only). Artifacts: artifacts/UX-002/docs-check.txt and whitespace-check.txt; evidence details/UX-002.md. Manual review resolved viewer ACL counts, partial waiting metrics, no GET mutation for overdue snooze, activity hidden-sequence leakage, source-run event mapping and immutable unread rollout cohort/cutoff. CHG-20261006-19 resolved with synchronized UX/contract/data/module/services/security/AC/build docs. Runtime/DB/browser NOT_RUN, no schema/API implementation claim. Main HEAD1531c2a dirty preserved, no commit/push/deploy or service changes. Next SRC-032; SRC-032…037 all TODO, none active.

## S-20261006-20 — Implement Agent Chat workspace

User requests code implementation of approved UX-002. SRC-032 promoted READY (SRC-031/UX-002 DONE), claimed IN_PROGRESS by Codex 2026-10-06; remaining tasks sequential. Main HEAD1531c2a existing ENV/UX dirty changes preserved. Docker read-only check confirmed seven healthy dev services. No commit/push/deploy; new code hot reload is local development, schema upgrade not yet run there.

CHG-20261006-20 (C2 compatible refinement): SRC-032 exact schema20 sidecars/read cutoff, strict workspace schema/OpenAPI/generated clients, namespace/read-event and repeatable-read query UoW option. Older schema writers detect schema20 within transaction and keep existing behavior until migration; upgrade requires quiesced writers to capture immutable principal/conversation cutoff, then resumable per-Conversation backfill with bounded200-message reads under registry lock. New messages dual-write atomically after preparation. Product prefix normalization refined from generic Unicode casefold to exact NFC + locale-independent lowercase (no accent stripping/wildcards). Features not yet implemented remain false in capabilities; no placeholder UI claim. Unit/HTTP/MySQL regression pending; new source task not DONE.

SRC-032 initial verification: native backend typecheck PASS, strict21 schema compile/generated contract check PASS,98 unit tests PASS. First Docker MySQL run FAILED before collection (new test-local decorator syntax unsupported by test transform); no MySQL acceptance claimed. Replaced with repo's Module(...)(TestModule) harness; native integration collection now203 cases, SKIPPED intentionally without test database env. Added registered validating read-marker consumer and field-filter guards; final regression rerun pending. Initial log preserved artifacts/SRC-032/integration-initial.txt. Development data/schema not upgraded.

SRC-032 DONE: final isolated MySQL203/203 PASS exit0; canonical Docker9/9 PASS,99 unit/7 tooling/build/typecheck/API smoke. C1 test corrections: manifest-relative upgrade count and measured12.006s healthcare fixture timeout30s; no KPI change. Evidence details/SRC-032.md and artifacts/SRC-032. Development schema19 unchanged, seven dev services freshly healthy; test project removed. No commit/push/deploy. SRC-033 promoted READY then claimed IN_PROGRESS, Codex2026-10-06; only active task, dependencies satisfied.

CHG-20261006-21 (C2 additive, SRC-033): exact schema21 catalog/link/share constraints, signed cursor and authorization/quotas, Identity reference port, normalized uniqueness clarified to same NFC/lowercase as SRC-032. UX-002 semantics preserved. Source implementation/tests in progress, no acceptance claim.

SRC-033 verification: full isolated MySQL209/209 PASS; initial canonical9/9 PASS with102 unit tests. Final source adds catalog collection create permission, strict quoted ETag parsing and rejects unsupported snooze-only saved views. Focused13-case workspace rerun and final canonical running; no DONE claim yet. C1 --workspace selector added to existing integration runner, preserving default full regression and isolated cleanup. Artifacts under artifacts/SRC-033. Development schema19 retained; no commit/push/deploy.

SRC-033 DONE: full209 MySQL regression PASS exit0, final13 workspace cases PASS (196 intentionally skipped) exit0, final canonical9/9 PASS including102 unit and7 tooling/build/typecheck/API smoke. Test projects cleanup completed. Schema21/API/catalog/queue integration and docs/evidence synchronized; details/SRC-033.md. Main1531c2a dirty with prior ENV/UX plus SRC-032/033 source, no commit/push/deploy; development schema19 not migrated. Full requested Chat rebuild incomplete: next SRC-034, then035/036/037 sequentially. No task beyond033 claimed and no agent/automation left working.

## S-20261006-21 — Local database upgrade and authorized commit

User explicitly requests local database migration and commit of completed changes. ENV-002 claimed IN_PROGRESS, Codex 2026-10-06, dependencies SRC-033/ENV-001 DONE. Preserve volumes/data and existing role permissions; stop API/worker before schema20 cutoff capture, backup before migration, use freshly built images. No push requested. Full UI scope SRC-034…037 remains TODO.

ENV-002 migration verification PASS: freshly built images, quiesced API/worker, restricted ignored backup with matching SHA-256; schema19→21 applied2/backfill0; repeat applied0/backfill0; status ready21. All60 original application-table checksums unchanged,9 principals and empty chat retained; all checked workspace invariant discrepancies0. Existing business roles unchanged. Runtime recreation/health pending. Local empty-chat verification does not claim nonempty backfill or SRC-037 release completion.

ENV-002 DONE: all7 development containers healthy, readiness API and web HTTP200 after startup settled. Initial Compose wait exit1/API unhealthy and first HTTP502 retained in evidence, followed by successful logs and fresh Docker/HTTP verification; no source/config change was needed. Contracts/doc/whitespace checks PASS, staged credential/path scan0 findings. Backup/data preservation and schema21 validated. Completed ENV/UX/SRC-032/033 changes prepared for the user-authorized commit on main, parent1531c2a; delivery reference is the commit containing this entry, no invented hash or push. No active task/agent/automation; next SRC-034. Full sample UI remains pending.
# S-20261006-22 — SRC-034 claim

Codex 2026-10-06. SRC-033 DONE, scoped design Ready, workspace clean. SRC-034 IN_PROGRESS; no parallel agents/schedule, commit/push/deploy or development migration. CHG-20261006-22 (C2): schema22 exact physical snooze/activity/index design, Workflow source activity revision and application-port hydration/backfill, additive opt-in routes. Historical migrations and source authority unchanged. Tests pending; details/SRC-034.md.

## S-20261007-01 — SRC-034 handoff and authorized commit/push

User requests committing/pushing current changes and stopping Docker validation; local runtime will be rebuilt by user. SRC-034 VERIFYING, not DONE. Final source individual Windows gates PASS (104 unit,7 tooling,23 schemas,build/typecheck and recovered API smoke). Earlier MySQL217/222 with five failures fixed; final rerun interrupted by Docker500/timeouts and incomplete test migration. No final MySQL acceptance. Authorized Docker restart failed on inaccessible runtime sockets; runtime-only directory preserved, no volume reset or dev schema22 migration. Current services/test cleanup unverified. Source/contracts/docs staged for commit on main parent696dec1 and push origin; delivery reference is this entry's commit. See details/SRC-034.md and checkpoint.md.

## S-20261007-02 — ENV-003
CHG-20261007-01 (C2, user authorized): persistent infra lifecycle separate from host applications; per-unit env and independent loopback monitor. Design/acceptance Ready in development/service-manager.md before implementation. ENV-003 claimed Codex2026-10-07; SRC-034 verification deferred, no parallel work. Preserve schema/history/volumes. Kafka config reserved pending broker design, not integrated. Working tree clean at entry.

ENV-003 DONE: per-unit env, host lifecycle, loopback monitor and persistent infra override delivered.10 tooling/104 unit tests, backend+web build/typecheck, lint/docs, Docker config, Windows monitor UI and actual MySQL/Redis stop/start retention verified. Source22 readiness503 on preserved schema21 remains expected; no schema upgrade or SRC-034 completion.3 infra services + monitor left running, app test processes stopped. Evidence details/ENV-003.md and artifacts/ENV-003. Main base134c9cb dirty, no commit/push/deploy. macOS/Linux runtime and Connector provisioning NOT_RUN. CHG resolved within local tooling scope.

## S-20261007-03 — PLAN-007

CHG-20261007-02 (C3 authorized explicitly by user): remove Keycloak from target, CRM-owned authentication/authorization in MySQL, tenant_id on all application tables, named schema ownership and reusable DB design guideline. Claim PLAN-007 Codex2026-10-07 after PLAN-005/ENV-003 DONE. Design-only; runtime cutover requires native auth/migration acceptance, not deleting provider from Compose before replacement. Existing ENV-003 dirty changes preserved; no agents/parallel source work.

PLAN-007 DONE design-only: ADR-021 native CRM Identity,13 schema catalog, all application tables tenant_id including registered system scope, guideline/table template/research and74-table baseline mapping plus journals/Connector. Primary research MySQL/Frappe/EspoCRM/OWASP read; docs/DAG and509-file SHA256 source preservation PASS, no runtime/source behavior changes. Native auth/schema retrofit tests NOT_RUN. Next PLAN-007A exact contracts/DDL; PLAN-007B extraction manifest follows scoped distributed gate. ENV-003 dirty work preserved; main134c9cb, no commit/push/deploy/SQL/container action. Historical Keycloak runtime remains until safe replacement, no production claim.

## S-20261007-04 — Native Identity implementation

User authorizes implementation. PLAN-007A claimed Codex2026-10-07; existing ENV-003/PLAN-007 dirty work preserved. No parallel agents. First slice native authentication and tenant-column retrofit in baseline monolith, not unsafe physical extraction. Exact scoped contract precedes source; Argon2 dependency2.2.2 pinned.

CHG-20261007-03: PLAN-007A exact contract ready/DONE (native-auth-implementation.md), Argon2id2.2.2 pinned, explicit system compatibility defaults only. SRC-038 claimed IN_PROGRESS. SRC-034 BLOCKED on changed auth/runtime regression fixtures, prior fixes/evidence retained. No parallel active source task. Schema split remains separate PLAN-007B.

SRC-038 DONE: native MySQL auth/Argon2/UI/operator recovery, migration23+all-table tenant retrofit, restricted auth DB grants and provider-free Compose/monitor/proxy. Warm21→23 backup preserved71 original tables/6 account IDs and permissions; repeat0 migrations/0 enrollments,6 credentials and81 tables preserved. Final222/222 MySQL regression,16 native MySQL,104 unit,10 tooling,24 schemas, build/type/lint/contracts/docs/smoke PASS. Native browser domain ACL/write/replay/CSRF/logout/return path and actual API restart session PASS; Linux Argon2 hash/verify PASS. Evidence details/SRC-038.md and artifacts/SRC-038. Initial regression199/222 and native test fixture-selection failures retained in session evidence; fixed and rerun, no dev cleanup. SRC-034 pending backend regression now DONE, not full workspace UI/release. Keycloak stopped with volume retained. Runtime monitor50204 + MySQL/Redis/API/worker/web ready; Connector unconfigured. Main134c9cb dirty, no commit/push/deploy/agents/scheduled job. Next PLAN-007B design or SRC-035 per user priority; no active task.

## S-20261007-05 — Authorized Git sync

User explicitly requests commit and push. Bundle completed ENV-003/PLAN-007/SRC-038 changes on main, parent134c9cb, origin GitHub tanlehd/agentic-crm. Existing test evidence retained; this turn checks docs/whitespace/staged scope and private-secret exclusion, no source behavior changes or runtime/deployment actions. Next-generated dev-only route paths normalized to tracked build paths. Delivery reference is this entry's commit; push outcome verified against remote after commit. No private env, tooling, SQL backup or test artifacts included.
