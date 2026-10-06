# M2 release smoke và bàn giao local

Status: SRC-025 DONE,2026-10-06; M2 local/mock release gate PASS on native ARM64 and emulated AMD64. [Evidence](../tracking/details/SRC-025.md) · [task tracker](../tracking/tasks.md). No production deployment. [Release matrix](../quality/m2-release-gate.md).

## Reproduce

Requires Docker Compose v2, a local Chrome installation, repository dependencies, Git history containing baseline f575a8e, free Docker disk space and network access for pinned image/dependency downloads. Host Node orchestrates Docker/Playwright; app builds use pinned Node24.21.0/pnpm10.33.0.

```sh
pnpm release:smoke
```

The build script extracts historical M1 commit `f575a8e` to a temporary directory and builds its backend, then current backend and standalone web using the repository Dockerfile. Tags `agentic-crm-src025-m1:local`, `agentic-crm-src025-backend:local`, `agentic-crm-src025-web:local` do not replace preview tags. The smoke script checks non-root users, records image IDs/architecture and creates separate upgrade/cold Compose projects with fresh private credentials and port18080. Existing localhost8080 preview is not changed.

For already-built images run `node scripts/release-smoke.mjs`. Override `RELEASE_BACKEND_IMAGE`, `RELEASE_WEB_IMAGE`, `RELEASE_M1_IMAGE`, `RELEASE_ARTIFACT_DIR` for an explicitly tested alternate architecture. The smoke runner derives each service platform from the inspected image. Cross-built AMD64 running on ARM64 Docker is emulation, not native AMD64 evidence.

```sh
docker buildx build --platform linux/amd64 --load -f infra/docker/Dockerfile --target backend -t agentic-crm-src025-backend:amd64 .
docker buildx build --platform linux/amd64 --load -f infra/docker/Dockerfile --target web -t agentic-crm-src025-web:amd64 .
RELEASE_BACKEND_IMAGE=agentic-crm-src025-backend:amd64 RELEASE_WEB_IMAGE=agentic-crm-src025-web:amd64 RELEASE_ARTIFACT_DIR=artifacts/SRC-025/amd64 node scripts/release-smoke.mjs
```

The legacy M1 baseline remains ARM64 in this cross-architecture upgrade scenario; current app/migration artifacts run AMD64. Infrastructure services keep their pinned native images.

The upgrade project provisions historical schema8 with Alpha/Beta Identity and CRM metadata, creates10 standard/custom/Lead records and associations, fingerprints all31 existing business/metadata tables, upgrades through17, compares old rows/journal and checks migration no-op. Current release runs real OIDC, API, worker and browser M2 scenarios. Stop/start all services preserves hashes; a persisted timer run completes after worker restart. A second project tests empty database startup/current seed and repeats the browser demo.

## Demo steps

1. Login with synthetic Alpha admin from the gate's private `.env`; choose Alpha. No credentials are printed or included in artifacts.
2. Configure a published qualification Chatflow and Workflow through APIs. Private fixture setup installs a mock connection/service actor/AI policy; there is no public credential-provisioning API in M2.
3. Post credential-only mock CTM messages: service interest, administrative need, `messenger`, explicit `đồng ý`. Duplicate opening event must return the same delivery ID.
4. Let the worker route AI ownership, consume stored messages, qualify one Lead and hand it to the Sales team.
5. Login as `sales_binh`, open Sales, filter the synthetic team and click **Nhận Lead**. Verify accepted handoff and completed parent; Conversation remains AI-owned and Contact remains prospect.
6. Open another synthetic Conversation in Chat as admin, choose **Tiếp quản hội thoại**, fill the Human qualification form with an actual affirmative message as evidence, then **Hoàn tất nhu cầu**. The Lead is handed off and Conversation stays Human-owned.
7. Inspect Operations/Workflow run through its authorized API or UI. Tenant-negative reads must fail. SRC-023 healthcare suite separately verifies KPI12/4/3 and2/3; SRC-024 verifies crash/fencing/unknown/Redis faults.

Screenshots and sanitized IDs/counts/hashes go under artifacts/SRC-025 (or override). No browser traces, raw transcript export or real patient data are collected. The scripted demo is the reproducible implementation of these steps; its output is the evidence, not this checklist.

## Cleanup, restart và upgrade limits

The runner downs only its test containers/network. Named volumes are deliberately retained and listed in release-summary.json, with the private credential directory for inspection. Each new run uses a new project so cold-start evidence never reuses data. Do not reset preview or delete volumes to make a failed gate pass. If interrupted, use the exact project/Compose paths in the report to stop only that test stack.

Production upgrades need their own backup/restore/recovery approval and infrastructure. Historical migration statements stay immutable; schema downgrade is unsupported. M1 app rollback after M2 migration is not validated. Partial DDL follows [migration repair runbook](migrations.md). Keycloak start-dev, HTTP loopback cookies and mock Messenger/AI are local testing scope only. M3 Meta/real runtime, M4 Deal/won/Customer/appointments and M5 builders/report APIs remain outside M2.
