# Checkpoint — điểm tiếp tục

Updated: 2026-10-04. Session S-20261004-02.

## Trạng thái thực tế

- **SRC-001…010 DONE:10/25. SRC-011 READY**, không task active. [SRC-010 evidence](details/SRC-010.md).
- Preview localhost:8080: OIDC, Identity admin API/tenant selector, reliability worker và registry metadata/association API. Chưa có record CRUD hoặc CRM UI.
- Schema v6 ready; v1–v5 immutable. Migration registry v6 additive tạo object_type/crm_record/association_type/association/history/shares/field_policy. Runtime history và audit chỉ SELECT/INSERT.
- Registry fixture v2 qua `pnpm seed:registry`:14 standard object types cho Alpha/Beta; first2 created/repeat0 created2 preserved,2 system bootstrap audits. No CRM records. Identity fingerprint exact trước/sau upgrade:6 OIDC users,7 memberships,9 principals,14 roles,4 teams,2 policies/AI configs,2 service actors giữ nguyên; credentials/volumes không đổi.
- Fixture admin grants vẫn Identity-only; registry CLI không regrant ACL. Muốn quản lý metadata dùng Identity role API gán schema.read/create/update all. Viewer không configure/write. Browser kiểm default grants403 đúng thiết kế.
- 35 MySQL integration PASS;9 canonical verify gates PASS (34 unit/contract+7 tooling), Node24.21.0/pnpm10.33.0 Linux ARM64/MySQL8.4.11. Chrome154 OIDC Alpha/Beta admin+viewer/registry authorization smoke PASS; positive HTTP registry/schema tests dùng MySQL harness stub auth. Host Node25 chỉ driver.
- AC-01/02/04/12 registry/association sub-scope, không full M1 gate, custom/property/query/index/form/view/UI hoặc public assignment/routing.
- Không blocker/decision pending. Không Git/branch/commit/remote; working directory có source/config/docs/artifacts mới, không có Git status để phân loại dirty. Không commit/push/deploy. Remote CI/AMD64/Windows native NOT_RUN.

## Điểm nối source

- `apps/backend/src/modules/crm/platform.ts`: metadata/association commands, source CAS, receipt, same-tenant endpoint ACL/cardinality, signed visible-only pagination. HTTP writes tenant exclusive lock như Identity; reads authorization shared lock.
- `registry.ts`: composable record create/update/assign trong caller UoW. Adapters insert+exists/eligible/assigned đăng ký tại composition, không từ request. Hiện chưa production adapter; test-only synthetic subtype không phải Contact/custom implementation. Module domain phải ghi creation event trong cùng transaction.
- `access.ts`: object-key own/team/all evaluator, persisted field denies qua Identity role IDs. SRC-011 phải áp dụng vào read/write/filter/sort/export, không chỉ gọi loader. Identity ownership reference port kiểm Human/AI active, cùng tenant và team; domain eligibility thuộc adapter/module sau.
- `seed.ts`/`seed-cli.ts` và scripts/seed-registry.mjs: fixture v2 atomic+advisory lock+completion marker, repeat preserves metadata/ACL. Không sửa Identity seed v1 để regrant. Standard IDs dùng fixtureId(`${label}:object:${key}`).
- `packages/contracts/schemas/registry.json`, generator/OpenAPI/generated types: object-types/association-types/associations routes. `If-Match` POST association là source version; tăng source version, owner_revision giữ nguyên.
- `record.assigned` outbox chỉ internal assignment port; chưa consumer nghiệp vụ/cancellation, preview chưa có record nên chưa phát. Metadata/association chưa phát arbitrary workflow events.
- Tests: apps/backend/tests/registry-cases.ts + seed-cases.ts; `pnpm test:registry` OIDC permission smoke. Artifacts/SRC-010 có test/build/verify/runtime/seed/schema/service evidence.

## Next action

Claim **SRC-011** sau khi đọc properties/custom record/typed index/form/view design, data dictionary, contracts và AC-04/M1+AC-13/M1. Dependency SRC-010 DONE; không khởi chạy task/agent song song. Bổ sung exact contract/schema gaps qua change entry trước code; thêm migration mới, không sửa v6 đã áp dụng.

## Runtime / recovery

7 preview services gateway/web/API/worker/MySQL/Redis/Keycloak healthy; API/worker image SRC-010, schema6. Volumes/auth_demo/Identity Alpha/Beta giữ nguyên. Không test runner hoặc background automation active; disposable integration project cleaned.

[Local runbook](../development/local.md), [registry contract](../contracts/registry.md), [verification](../development/verification.md). `pnpm verify:container`; `pnpm test:integration` isolated; `pnpm seed:registry` local only; `pnpm test:registry` needs preview+Chrome+existing seed credentials. Lost .env/realm hoặc partial migration không tự reset/reseed; theo runbook operator.
