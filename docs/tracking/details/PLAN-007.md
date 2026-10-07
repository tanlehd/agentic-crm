# PLAN-007 — Native Identity và database design standard

Owner Codex,2026-10-07. Dependencies PLAN-005/ENV-003 DONE. Scope design-only, CHG-20261007-02 / ADR-021. Status theo [tracker](../tasks.md).

## Kết quả

- Bỏ Keycloak khỏi target architecture; CRM Identity sở hữu MySQL credential/session/permission, shared account vẫn có nhiều membership tenant, Human/AI/service semantics giữ nguyên.
- Chuẩn mọi application table có tenant_id NOT NULL, kể cả account/root tenant/journals. Business và registered system tenant scopes riêng; system không wildcard. MySQL-owned system schemas không nằm trong application table scope.
-13 named service schemas; catalog writer/non-goals, table placement decision tree, projection/metadata/ownership partitions. Gateway không cần database.
- [Guideline](../../data/database-guidelines.md), [catalog](../../data/schema-catalog.md), [table template](../../templates/database-table.md), [native-auth contract](../../contracts/native-auth.md), [transition plan](../../planning/native-identity-data-plan.md), [research](../../references/crm-database-patterns.md).
- [Inventory](../../data/table-placement-inventory.md):74 CREATE TABLE trong monolith migrations1–22, backend journal và7 Connector tables được mapping. Account/tenant/hai migration journals cần tenant column retrofit; bảng split/technical không được chuyển nguyên khối tùy tiện.
- Đồng bộ AGENTS, governance/Ready gate, Identity/service descriptors, security/architecture, dictionary/model baseline markers, auth/bootstrap/API contracts, ADR, acceptance, index/build/extraction plans. Không sửa lịch sử OIDC evidence thành native PASS.

## Evidence

| Check | Command / môi trường | Kết quả / reference |
|---|---|---|
| Research nguồn primary | MySQL8.4; Frappe CRM docs/Deal DocType; EspoCRM entityDefs/Contact; OWASP password/session, web read2026-10-07 | Reviewed links và adoption decisions trong research note; không import upstream implementation |
| Baseline table mapping | Node24 đọc compiled migrations built trong ENV-003, không execute SQL; rà Connector schema source |74 monolith tables mapped không bỏ sót; artifacts/PLAN-007/table-inventory.json |
| Source preservation | SHA256 so entry với cuối phiên của509 files apps/services/scripts/packages/infra/Compose | PASS,0 changed; artifacts/PLAN-007/source-preservation.json; giữ nguyên ENV-003 dirty work |
| Doc links/fences/task DAG | `node scripts/check-docs.mjs` trên Windows Node24.21 | PASS; rerun sau tracking update |
| Whitespace | `git diff --check` | Initial trailing blanks corrected; final rerun PASS |
| Native auth, tenant retrofit, schema cutover | Không chạy source/runtime test cho design-only task | NOT_RUN, không dùng104 historical unit tests để claim native acceptance |

## Giới hạn và tiếp tục

PLAN-007 DONE chỉ là thiết kế chuẩn; native code/DDL/machine contracts và migration chưa có. PLAN-007A tiếp theo chốt exact contracts, password dependency compatibility, login/recovery UX, physical DDL/grants và journal bootstrap protocol trước source. PLAN-007B chốt scoped schema extraction manifests sau distributed contracts cần thiết. SRC-034 vẫn VERIFYING.

Main base134c9cb, working tree dirty (ENV-003 và tài liệu PLAN-007), không commit/push/deploy. Không chạy Docker/lifecycle/SQL/migration hoặc chạm private env trong phiên này. Runtime last-observed từ ENV-003: monitor PID37844, MySQL/Redis/Keycloak running, apps stopped, DB migration21; trạng thái hiện thời chưa re-probe. Loại Keycloak runtime chỉ sau native replacement acceptance, giữ volume/data/IDs và yêu cầu đăng nhập lại có kiểm soát.
