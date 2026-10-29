# Reporting private draft storage — local runbook

Current packaging SRC-090: [independent image/Compose and operational runbook](reporting-container.md). Provisioning below remains the explicit local migration entrypoint; image startup never migrates. Dated initial draft-only scope below is historical; current source/schema7 and acceptance are in the deployment audit and feature evidence.

SRC-057 / PLAN-022C. [Contract and table dictionary](../contracts/reporting-persistence.md), [generated OpenAPI](../contracts/reporting-storage.openapi.json), [evidence](../tracking/details/SRC-057.md). Draft storage began with6 business tables; SRC-058 now adds5 [mock projection tables](reporting-projections.md) in schema2,11 business tables+system journal. Native CRM API is the only browser-facing entry; Reporting receives short-lived signed admissions over private HTTP. No report execution, publish, dashboard UI, connected data ingestion or outbox relay.

## Provision and build

Use Node24/pnpm pinned in the repository. On Windows, executables are `.local/node-v24.21.0-win-x64/node.exe` and `.local/tooling/node_modules/pnpm/bin/pnpm.cjs`; prepend that Node directory to PATH for pnpm subprocesses.

```powershell
node scripts/reporting-db.mjs
node scripts/reporting-db.mjs --test
pnpm --filter @agentic-crm/reporting build
pnpm --filter @agentic-crm/backend build
node scripts/generate-reporting-storage.mjs --check
```

Operator requires local Docker MySQL `agentic-crm-mysql-1`, localhost13306 and existing registered Identity system tenant. It restricts exact DB/user names, writes private generated credentials once to ignored `.local/reporting.env` / `.local/reporting-test.env`, backs up existing Reporting database, checks fingerprints, applies SHA256-journaled forward DDL and requires rerun0. It does not reset existing rows, CRM, Redis or volumes. Never edit applied001; follow-up DDL uses a new reviewed forward migration and runner manifest. An existing table without a journal step fails closed; inspect backup/journal before repair.

## Launch configuration

Reporting entrypoint exists at `services/reporting/dist/main.js`. For local host development:

```powershell
node --env-file=.local/reporting.env services/reporting/dist/main.js
```

Default bind127.0.0.1:3004; override REPORTING_HOST/REPORTING_PORT only through trusted operator config. Service runtime reads REPORTING_DB_HOST/PORT/NAME and REPORTING_RUNTIME_USER/PASSWORD, never operator credentials. Provision file contains operator credentials for setup; a deployed runtime environment must contain only runtime DB credentials and the admission key. No production container/health/SLO deployment gate is claimed.

Configure CRM API process with `REPORTING_SERVICE_URL=http://127.0.0.1:3004` and the same `REPORTING_ADMISSION_KEY` from private config. Never print or check in this key. Absence of bridge config returns sanitized503 REPORTING_NOT_CONFIGURED. Remote HTTP requires HTTPS; no request-supplied destination is accepted. Native API routes are registered under `/api/v1/reporting/definitions`; restart through normal service manager when activation is intended. This implementation session did not restart existing API/worker/web or leave a Reporting server running.

Grant explicit native Identity resource `report_definition`, actions read/design, scope own/all. Read needs read seat capability; design additionally needs configure (currently admin seat). Default roles are unchanged. Team scope/sharing/source-field policy is not implemented by this API. Private metadata ownership does not grant query/source-record access.

Client sends native crm_session cookie; writes also send configured Origin, session CSRF and UUID Idempotency-Key. Update/archive need strong If-Match from current ETag. Retry uncertain writes with the same command key and payload after renewed authorization. Archive `{archived:true}` and restore `{archived:false}` advance revision but preserve latest edit version. All saved definitions stay unvalidated/nonexecutable, including structurally valid semantic definitions.

Signed admission is valid at most5s. Revocation after issuance can allow an admitted commit within that window; CRM rechecks authorization revision and session before returning data. A denied/lost response can therefore follow a committed command. Do not create a fresh key to reconcile that case. History and durable receipts survive service restart; current owner/read/design permissions still gate replay.

## Verification and recovery

```powershell
node scripts/reporting-storage-test.mjs
node scripts/reporting-native-test.mjs
pnpm exec vitest run --exclude **/*.integration.test.ts
pnpm -r typecheck
node scripts/lint.mjs
node scripts/check-docs.mjs
```

Tests require retained `.local/native-auth-test.env` targeting native_identity_test and test_crm_reporting provisioned above. Each harness checks local target first. Synthetic contexts/account/password fixtures stay in ignored `.local/reporting-*-fixture.json`; existing users/passwords and default roles are untouched. MySQL tests retain rows, reopen connections, verify all fingerprints on warm migration and exercise runtime privilege denials. Native harness opens temporary real HTTP listeners, uses actual NativeAuthService/IdentityAuthorization, then closes listeners and restores only its dedicated test role/seat. Evidence JSON is under ignored artifacts/reporting-storage; backups/provision evidence under artifacts/reporting-database. These are local test artifacts, not committed credentials or customer facts.

Rollback activation by removing bridge config/stopping Reporting through its process owner; preserve DB/history/receipts. No reset or destructive downgrade. Backup restore drill, production monitoring/deployment, query projections and connected integrations remain later gates.
