# Runbook — External API

[Developer documentation](../developer/README.md) · [OpenAPI](../developer/openapi.json) · [contract / table / acceptance](../contracts/external-api.md) · [evidence](../tracking/details/SRC-088.md).

Open `http://localhost:18080/developer`, or **API** in the CRM header. Documentation is public; app administration requires native login and tenant super admin. No app or credential is created automatically. A synthetic test app may exist, explicitly named and left disabled. Choose a tenant, create app, select object/property/team grants, then generate a credential with finite lifetime. Copy once to integration secret storage. Never paste secrets into tickets/logs or browser storage.

Source: NestJS `modules/external-api` transport, Identity `external-apps` authority, CRM `external-port` and `CrmRecords.readForService` application port, Next.js `/developer`. Persistent quota120/minute and live credential checks use Identity-owned table `external_app`, target crm_identity. Physical monolith forward37 adds one table; no backfill or historical migration change. Local runtime role receives SELECT/INSERT/UPDATE, no DELETE. Extraction requires replacing local ports with versioned service APIs.

## Local commands

Use pinned Node24 (`.local/node-v24.21.0-win-x64/node.exe` on this Windows workspace). Build backend before scripts importing `dist`.

```sh
node node_modules/typescript/bin/tsc -p apps/backend/tsconfig.json
node node_modules/vitest/vitest.mjs run apps/backend/src/modules/external-api/external-api.test.ts
node scripts/external-api-native-test.mjs
node scripts/external-api-contract.mjs --check
node scripts/external-api-browser.mjs
node scripts/external-conversations-test.mjs
node scripts/external-conversations-browser.mjs
```

`external-api-contract.mjs` without --check updates the reviewable OpenAPI artifact from the backend schema. It compiles request/response schemas and checks parameter coverage and operation IDs. Native tests require the existing retained `native_seed_test` fixture, private test operator environment `.local/native-auth-test.env`. They reuse only their named synthetic app and Beta contact, preserve existing users/credentials/records, and do not reset MySQL or Redis. Test-only fixture reactivation is not a public revoke bypass.

Explicit local upgrade: `node scripts/external-api-local-upgrade.mjs` requires development `agentic_crm`, loopback18080 and monitor3020. It stops managed API/worker, saves private SQL backup, compares every existing table, applies forward migrations, verifies rerun0, grants new-table DML, and restarts API/worker. Never invoke against production or as routine startup. If upgrade fails, inspect its error and monitor state before restarting writers; no automatic destructive rollback. Older binary can ignore this additive table. Keep table/audit for forward fix.

## Operations

App config uses CAS; rotation invalidates old token immediately and does not reset quota. Lost response: reload current version, issue another token. Disable for temporary suspension; revoke terminally erases verifier. MySQL errors fail closed503, invalid credentials401, scope403.429 Retry-After60 uses shared app quota across processes. Correlation IDs help support; audit stores action/changed-field names only. Table retention is manual/operator-controlled; production retention, perimeter abuse controls, MFA/recovery and load acceptance follow deployment gates. No production SLO is claimed.

R1 is read integration. External writes require proper service actor ownership/domain audit, not the Human generic writer. OAuth distribution/consent/refresh, webhooks/signing/replay and bulk writes remain PLAN-052, independently of this bounded delivery.

SRC-089 adds Chat `conversation/external-port.ts` and four Conversation/message read routes; no database migration. Select Conversation first, then Conversation messages and text only when needed. Both team grants restrict the parent. Tests reuse named synthetic teams/closed conversations/messages/apps in native_seed_test and leave apps disabled. Only the named test app's quota is reset for repeatability; existing customer/user records are untouched. The browser script uses local Alpha and leaves its app disabled. [Contract](../contracts/external-conversations.md) · [Evidence](../tracking/details/SRC-089.md).
