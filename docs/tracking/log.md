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
