# Marketing authority backend — SRC-056

Implemented in Channels under monolith API, target Connector after extraction. Schema27 is additive; existing Marketing database remains v1. [Protocol](../contracts/marketing-metadata-sync.md), [tables](../contracts/marketing-sync-tables.md), [evidence](../tracking/details/SRC-056.md).

Private routes are `/internal/v1/marketing-authority/{graph-read,page-check,admit,receipts/:id}`; no `/api/v1` prefix. Admin routes retain `/api/v1/admin/channels/marketing/credentials` and Page marketing-admission route. Native auth/CSRF plus integration permissions protect admin mutations; private registry supplies tenant and credential allowlist. Responses/errors and malformed JSON never expose provider token. Provider adapter only issues fixed GETs to Graph v25.0, bounded response, selected fields/nested allowlists and sanitized error codes. Constructor-injected transport is for tests; no environment fake endpoint switch.

Required private API configuration when enabling actual integration:

- MARKETING_APP_ID: app namespace matching registered Pages.
- MARKETING_KEY_ID, MARKETING_TOKEN_ENCRYPTION_KEY: key ID and64hex AES key; separate from Page token key.
- MARKETING_OPERATION_KEY: separate64hex HMAC key for credential command idempotency.
- MYSQL_MARKETING_USER / MYSQL_MARKETING_PASSWORD: dedicated authority role, distinct from generic runtime.
- MARKETING_AUTHORITY_INTEGRATIONS: JSON array of connection_id,tenant_id,consumer=`marketing`,audience=`marketing-authority`,credential_ids,token_hashes (one or two SHA256 digests),active. Bearer secrets live in consuming service private configuration, never DB/provider fields or browser.

Missing configuration leaves these endpoints unavailable; starting the CRM API does not enable Meta calls. Account token is submitted through native authenticated credential API and verified against account identity/read capability; it is stored encrypted with tenant/id/app/account/purpose/key AAD. Token values are never placed in example commands, URLs, generic command bodies or tracker. Credentials from another app namespace are unavailable. Key removal/change without explicit reencryption makes old ciphertext unavailable; keep old material recoverable until an explicit key rotation is complete.

Local forward upgrade: build backend; stop API/worker via service monitor; run existing `scripts/native-local-upgrade.mjs` (backup and old-column preservation); run `scripts/marketing-authority-grants.mjs`; start API/worker. No seed/reset is required. Grant helper only adds private DB role settings to host API env; it does not activate app/provider configuration. Normal runtime/auth grant helpers exclude both Marketing authority tables.

Authority role has Identity reads for the existing monolith authorization port, own credential DML, receipt SELECT/INSERT, column-scoped Page admission updates, minimized audit INSERT and command receipts. MySQL requires schema LOCK TABLES privilege for existing tenant FOR UPDATE authorization serialization without granting Identity writes. No Contact/Chat/Marketing database access, no DDL or credential/receipt DELETE. Source uses credentials when constructing DataSource; changing options afterward can retain a driver initialized with the old user.

Persistent synthetic checks, using pinned Node24:

```powershell
.local/node-v24.21.0-win-x64/node.exe node_modules/typescript/bin/tsc -p apps/backend/tsconfig.json
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-authority-test.mjs
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-authority-grants.mjs --test
.local/node-v24.21.0-win-x64/node.exe scripts/marketing-authority-test.mjs
.local/node-v24.21.0-win-x64/node.exe scripts/generate-marketing-authority.mjs --check
```

On a new test setup, existing native fixture setup must precede these commands. The first test run can apply migration before the dedicated test role exists; its final role group then requires the grant command and a rerun. Fixtures remain in native_seed_test, new runs use unique app/Page IDs. No real Meta configured in tests. HTTP tests use actual Nest listener with injected synthetic Graph transport; native authorization uses persisted memberships/grants, while wire-layer auth rejection is isolated separately.

SRC-051 worker/scheduling/read model remains the next dependency consumer. Current backend can authorize/proxy/admit; it does not itself schedule scans or populate Marketing replicas. Live account verification is NOT_RUN until real credentials/config are supplied through supported setup.
