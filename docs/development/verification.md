# Portable verification và CI

Status: SRC-005 implemented/tested 2026-10-03. Scope: foundation tooling, không phải M1/M2 business gate.

## Chạy local

Docker Desktop/Engine với Compose v2+ đang chạy; không cần `.env` hoặc dev stack cho hai lệnh này:

```sh
pnpm verify:container
pnpm test:integration
```

Nếu host chưa có pnpm, dùng `docker compose -p agentic-crm-verify -f compose.verify.yaml run --rm --build --no-deps verify` rồi `node scripts/integration.mjs`. Node host chỉ điều phối Docker; code/test app dùng image Node 24.21.0 đã pin. Không dùng `compose config` đầy đủ trong evidence vì có thể in credential đã interpolate; dùng `config --quiet`.

Native Linux/macOS với Node 24.21.0 và pnpm 10.33.0:

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`verify` kiểm đúng runtime/toolchain, chạy tuần tự fail-fast: lint → docs → schema → generated drift → verification script regression → unit/contract tests → build → typecheck → API smoke. Build trước typecheck để Next sinh route types và packages có declaration trên checkout sạch. `test:unit` loại MySQL integration; `test:integration` là gate riêng bắt buộc trong CI. `pnpm test` cũ vẫn giữ nguyên; integration bị skip khi thiếu test environment không được coi là integration PASS.

- Lint: TypeScript AST parser cho JS/TS/TSX; chặn parse error, debugger, var, direct eval, ts-ignore/nocheck và domain import Nest/HTTP/web. Đây là foundation rules tối thiểu, chưa có React accessibility hoặc full ESLint rule set.
- Docs: đích local link tồn tại, code fence, JSON examples parse, Mermaid header nhận diện, task status/dependency/cycle/single-active. Chưa kiểm anchor, link mạng hoặc parse/render Mermaid đầy đủ.
- Schemas: mọi JSON trong contracts/schemas được strict Ajv compile, dialect draft-07/2020-12 explicit; duplicate `$id` và reference lỗi bị chặn. Generated OpenAPI/TS phải khớp generator. Health và auth contract hiện hữu được kiểm, không suy diễn coverage API nghiệp vụ chưa tạo.
- Docker `source` stage kiểm generated contracts trước compile, không regenerate để che drift. Chạy `pnpm contracts:generate` explicit khi sửa schema/generator.
- Verify container project riêng, chỉ mount artifacts; không dùng volume hoặc credential dev. Integration tạo credential random mỗi lần chạy, MySQL tmpfs, project riêng theo PID, cleanup trong finally. Không cần seed/reset dev.

## Evidence và GitHub adapter

[Workflow](../../.github/workflows/verify.yml) chạy cùng Compose verify và integration runner trên Ubuntu, timeout 30 phút, contents:read, không deploy; upload artifacts cả khi thất bại. Log từng bước và `summary.json` nằm trong `artifacts/verify/`; workflow lưu thêm build/container và integration logs. Output build lỗi trước khi vào runner chỉ có container log, không giả có summary PASS.

Sau local verify có thể dọn network không dùng nữa:

```sh
docker compose -p agentic-crm-verify -f compose.verify.yaml down
```

Không thêm `--volumes`. Local ARM64 pass không chứng minh AMD64/remote pass. Workspace chưa Git/remote tại SRC-005: remote CI **NOT_RUN** tới khi workflow thực sự được GitHub chạy. Không tự commit/push để tạo evidence. Windows native chưa được kiểm chứng; trên Windows dùng Docker qua WSL2.

## Auth gate riêng

SRC-006 thêm unit tests crypto/redirect/state/session/JWT; nằm trong verify canonical. `pnpm test:auth` kiểm Chrome → Keycloak thật → private backchannel → MySQL Account → encrypted Redis session và logout/expiry/revocation/Redis outage. Cần local stack/provision theo [local runbook](local.md); gate này chưa chạy trên GitHub adapter. Không suy diễn browser local PASS thành remote CI PASS.

## Identity gate SRC-007

`pnpm test:identity`: browser OIDC thật, chọn Alpha/Beta, cookie session + X-Tenant-Id, same-key replay, cross-tenant reference reject, last-admin và live revocation; fixture tự cleanup. `pnpm test:integration`: MySQL kernel + Identity/admin/HTTP tests, gồm hai admin concurrent self-demotion, transaction rollback khi outbox lỗi, service/principal revision và replay denied sau revoke. HTTP integration stub chỉ auth transport; browser gate kiểm auth thật. Decorator test module áp dụng qua `Module(...)(TestModule)` để test transpiler không giữ nested decorator chưa compile.

SRC-008: MySQL integration thêm atomic inbox/side-effect rollback, duplicate sau crash-before-dispatched, concurrent claims, expired/stale fencing, retry5/terminal failure, BIGINT precision, receipt expiry/replay authorization và actual app-user audit grants. `E2E_ARTIFACT_DIR=artifacts/SRC-008 pnpm test:identity` kiểm worker thật sau admin mutation; fixture dùng local migration one-shot để cleanup audit/inbox, không nới quyền runtime.

SRC-009: `pnpm seed:dev` explicit local fixture, `pnpm test:seed` kiểm sáu user OIDC thật, Alpha/Beta selector, foreign tenant 403/foreign team PATCH404 và Beta unchanged. MySQL integration thêm environment/input guards, transaction rollback cả Alpha audit/outbox khi lỗi Beta, concurrent seed serialize, repeat snapshot exact, existing Account preservation và revoke preservation. Provider tooling tests bảo đảm managed marker admin-only, không overwrite credentials/status/user/profile config, reject collision. [Evidence](../tracking/details/SRC-009.md).

SRC-010: MySQL integration kiểm registry/subtype rollback (synthetic subtype chỉ trong test), source/target ACL, same-tenant FK, CAS/history/outbox rollback, Human/AI/NULL ownership, cardinality races, same-key replay, field deny loader, runtime append-only history, HTTP request/response schemas, v5→v6 preservation và fixture v2 atomic/repeat/preserve. HTTP harness stub auth transport; không coi đó là browser/OIDC gate. Production Contact/custom CRUD vẫn tiếp tục SRC-011/012.
