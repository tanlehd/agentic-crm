# Repository relocation — CHG-20261021-12

2026-10-21, Codex. DONE MOVE-01…04: bounded implementation of [ADR-028 / repo map](../architecture/repository-map.md), explicitly requested by the user after PLAN-059 DONE. Completed cleanup sub-scope of SRC-109; T05 domain work remains incomplete.

## Compatibility and acceptance

- MOVE-01: move `services/workflow-core` to `packages/workflow-definition`, and `apps/backend` to `services/core-baseline`; one canonical source at each new path. Keep workspace names `@agentic-crm/workflow-core` and `@agentic-crm/backend` and root commands compatible.
- MOVE-02: update actual imports, generators, workspace lock importers, test discovery, CI/Docker/Compose/local launch paths and current doc links. Normalize the Chat boundary baseline paths only; do not add dependency edges or suppress checks. Historical evidence and frozen storage hashes remain unchanged.
- MOVE-03: affected builds/typechecks, unit/script suites, contracts/docs/lint/boundary checks and affected Docker packaging smoke pass on the moved tree. Test selection follows [testing policy](testing-policy.md); no business/native database suite or browser journey required solely for path changes unless failures expose a behavior change.
- MOVE-04: migrations/source preserved, no data reset/migration or runtime config rotation. Inspect local processes before relocation; restart only affected local processes if needed, restore their prior running state from new paths and record health. Update tracker/log/checkpoint with actual evidence and remaining gates.

Package paths change; wire URLs/env variables/ports/schema names/IDs/receipts and package exports stay stable. Existing database migration files move with the package but their bytes/ordering do not change. No symlink compatibility tree or duplicated source. Frontend stays `apps/web`; business extraction into each future backend service remains separately gated.

## Execution and verification

Source relocation and verification are complete under `artifacts/repository-relocation/`. Environment: Windows PowerShell, pinned Node24.21.0/pnpm10.33.0, Docker Desktop Linux images. Working tree on main/base21eaadd0e8d1e9163bfb7721390c2e6b385b1b42, including all prior dirty work; no commit/push or production deployment.

Current source roots are `apps/web`, `services/core-baseline`, `packages/workflow-definition`; no source or symlink remains at the two old package roots. Updated direct imports and relative frontend test imports, script generators/native harnesses, lockfile importers, Docker COPY/development ownership, Compose binds, local launcher, Vitest discovery, current docs and historical link targets. Root command names and package exports stay compatible. CI consumes the updated Dockerfile/scripts; no check was removed. Docker context now excludes `.next-*`, TypeScript build info and `.pnpm-store` generated caches.

Preservation PASS: all 1746 recorded source/config/doc files still exist at their mapped paths; 256 moved implementation files, 62 migration files and 252 shared package files are byte-identical. Dependency versions and lockfile content are unchanged apart from the two importer paths. Frozen Chat storage snapshots remain byte-identical. Chat dependency baseline changes only path prefixes; guard reports 273 current edges, zero added, ten previously removed. Historical signed evidence is resolved through an explicit path alias at read time; signatures/digests/owner checks are unchanged. A synthetic isolated regression covers old/new signed paths, signature tampering, wrong owner and changed source hash.

| Check | Result / evidence |
|---|---|
| Offline frozen install | PASS, all 11 projects including workspace root; `install-restored.log` |
| Workflow library build | PASS at relocated path; `library-build.log` |
| Backend and dependency builds | PASS; `backend-build-final.log` |
| Workspace typecheck | PASS all 10 packages; `typecheck-final.log` |
| Unit tests | 454 passed in full run; two stale-import suites repaired and all 8 affected tests passed (462 covered); `unit.log`, `unit-paths-fixed.log` |
| Script tests | 149 passed in full run; incomplete contract fixture repaired, four verification cases plus signed relocation regression passed (151 covered); `scripts.log`, `scripts-final.log` |
| Schemas/contracts | PASS 38 strict schemas; generated contracts unchanged, Chat 182operations/527schemas; `schemas.log`, `contracts.log` |
| Lint / Chat boundary | PASS; `lint-final.log`, `boundary.log`; no new dependency edges |
| API startup smoke | PASS isolated no-DB liveness/degraded readiness/404; `smoke-api.log` |
| Production backend image | PASS build and network-disabled/non-root production dependency/import smoke; `image-backend.log`, `image-smoke.log`; tag agentic-crm-backend:repo-relocation-check |
| Development image / Compose | PASS build, network-disabled tsx/import/new-path/non-root write check and Compose config validation; `image-development-final.log`, `development-smoke.log`, `compose.log`; tag agentic-crm-development:repo-relocation-check |
| Docs / whitespace / final preservation | PASS source DAG/local links, scoped diff/new-file whitespace and source preservation; `docs-final.log`, `whitespace.log`, `preservation.json` |

Resolved failures are retained in logs, not reported as initially passing: Windows directory relocation traversed dependency junctions; pnpm retained their contents in `.ignored_*` directories. Restored original targets using checked atomic directory/file moves, reinstalled offline and verified shared/source hashes before accepting builds. No Git reset or restoration from an older commit was used. Initial sandboxed monitor could not manage Docker/children; restored monitor with its prior host permissions and confirmed API/worker readiness. Initial typecheck/unit failures were two frontend test imports; script fixture lacked external OpenAPI input and architecture output directory, both now provided without weakening drift assertions. Initial development-image build was intentionally stopped while uploading generated UI caches and restarted with corrected `.dockerignore`.

Future Windows package moves must use a checked atomic directory rename or exclude/reinstall node_modules junctions; do not recursively relocate a dependency tree. A full-file whitespace audit also found existing whitespace on an unchanged line in reporting-storage-test.mjs; preserved it and verified the actual changed diff plus new files instead of changing unrelated code.

Only local monitor/API/worker were restarted for this path change. API3001 and worker3002 ready from new paths; web18080 remains stopped as before. Reporting3004 and Connector3010/3011 were not restarted. No DB migration/provision/reset, data/credential rotation, or provider action was run. Native database/business/browser/full-production-web suites NOT_RUN because implementation and public behavior did not change; existing unit/native history is not relabeled as fresh evidence.

Next: resume SRC-109/T05 Human D2 on Chat-owned storage from the new baseline path. R2 build optimization and owner extraction beyond the moved packages remain separate gates; moving files does not close T05, T06–T09 or increase extracted-service count.
