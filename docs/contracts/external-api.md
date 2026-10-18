# External API v1 — private apps

PLAN-051 / SRC-088, 2026-10-18. Status: Ready for implementation, bounded read integration. [Developer guide](../developer/README.md). Product group: Platform administration; tenant administrator configures access, integration developer consumes data.

## Architecture and access

Identity owns private app identity, grants, token verifier and quota. External API is a transport/application module in the baseline NestJS monolith; target Identity credential API plus authorized owning-service record APIs. No shared SQL/UoW across extracted services. CRM Core/Sales remain record authorities. An app is a service actor, never a Human, never a record owner and never a tenant super admin. Admin config requires live Human admin seat + tenant_admin. App credentials cannot use browser/admin APIs; cookies cannot use external APIs.

R1 exposes Contact, Company, Lead, Deal and implemented custom records, read only. [PLAN-053 Conversation extension](external-conversations.md) adds separately granted Conversation metadata and message text reads through Chat. Excludes internal Activity/notes, credentials, workflow execution, schema mutation, archives, associations and write operations. Existing generic writers assume Human ownership; API writes require a separate service-actor/domain-command gate, not impersonation. Public/multi-tenant OAuth, consent/refresh, marketplace, webhooks and bulk writes are follow-up design, not runtime claims.

App configuration: name 1–120 chars; description <=1000; 1–20 grants. Each grant has exact object key, `scope=crm.objects.<object>.read`, 1–100 explicitly selected property keys, and record scope `all` or `teams` (1–20 active team UUIDs). No wildcard scopes/fields. Teams restrict primary team or existing explicit record-team share. App policy is an independent admin-approved service grant; creator Human rights are not impersonated. Suspension of tenant/app, expired token and scope/field changes take effect on next request. New fields are never auto-added. App ACL is the upper bound; owning record port still checks tenant, archive, object and field permissions. Removed teams stop granting access.

## HTTP contract

Base `/api/v1`. Browser management uses native session + X-Tenant-Id, Origin/CSRF for writes: GET `external-apps/catalog`, GET/POST `external-apps`, PATCH `external-apps/:id`, POST `external-apps/:id/token`, POST `external-apps/:id/revoke`. Create accepts client-generated UUID `id` for safe create retry; duplicate returns409 (never reissues token). Configuration update/revoke/token issuance requires quoted If-Match version; stale409, absent428. Tokens are issued separately, never stored in idempotency responses. Successful token issuance/rotation returns secret once; lost response requires fetching current version and rotating again. Revoke is terminal; recreate a new app when needed. Disabled app can be enabled through config PATCH. Config changes bump version, invalidate cursors, keep current credential until rotation/revoke. GET list is bounded100; tenant maximum100 apps, including revoked entries.

External calls: Authorization Bearer `eapi_<tenant UUID>_<app UUID>_<32 random bytes base64url>`; tenant/app identifiers are selectors, never authority. SHA-256 verifier stored tenant-bound and compared constant-time. Optional X-Tenant-Id must match credential tenant. Reject query credentials, extra query parameters, cookies as substitute and unknown fields. Token lifetime1–365 days, default90. No token retrieval endpoint. HTTPS required outside local development ingress.

GET `external/crm/objects/:object` accepts limit1–100(default50), signed cursor; GET `external/crm/objects/:object/:id`; GET `external/crm/properties/:object`. All require corresponding exact read scope. Result records contain id, object_key, version, selected `properties` only; no owner/team/tenant/internal fields unless deliberately part of a later contract. Cursor bound to app+version+object+tenant. No filter/sort/search in R1, preventing inference through excluded properties. `next_cursor=null` ends pagination. GET `external/scopes` returns current approved grants (authenticated). No cross-object expansion.

Errors JSON `{error:{code,message,retryable},meta:{correlation_id}}`:400 invalid request/cursor,401 invalid/expired/revoked token,403 missing scope,404 missing/inaccessible record,409 version/create conflict,428 missing version,429 quota,503 dependency unavailable. No secrets or values in errors/audit. Cache-Control no-store. X-Correlation-Id; 429 Retry-After60. Durable per-app quota120 successful admissions/minute, serialized app lock, survives restart. No in-memory-only security state. MySQL outage fails closed. Admissions are counted before record execution, including valid-token scope/data errors; malformed/invalid tokens do not consume victim quota. Read data transaction rechecks credential/config under lock, so revoke cannot interleave with protected selection. No automatic retry of writes.

## Filled table design — external_app

| Template item | Decision |
|---|---|
| Task / acceptance | SRC-088; EA-01…08 below |
| Table / schema / current | external_app; target crm_identity; physical agentic_crm forward37, baseline monolith only |
| Writer / aggregate / kind | Identity private app; authoritative mutable config+credential+quota |
| Scope | business; authenticated admin TenantContext or verified token; explicit NOT NULL ASCII tenant UUID; system/zero rejected |
| Columns | tenant_id,id CHAR36 ascii_bin; name VARCHAR120; description VARCHAR1000; grants JSON strict version1-shaped array bounded20; status VARCHAR16 active/disabled/revoked; token_hash CHAR64 ascii_bin NULL; token_expires_at DATETIME(6) NULL; version BIGINT UNSIGNED default1 >=1; quota_minute BIGINT UNSIGNED default0 epoch minute; quota_count INT UNSIGNED default0; created_at,updated_at DATETIME(6) UTC |
| Keys / constraints | PK(tenant_id,id); CHECK status/version/business scope/token pair; no cross-service FK; no implicit tenant default |
| References | Object/property catalog through CRM-owned port; teams through Identity; absent objects/properties fail closed; no remote calls under transaction after extraction |
| Query / indexes | PK exact credential/CAS; tenant prefix bounded list <=100 sorted in memory; no global scan; EXPLAIN in native tests |
| Permissions | management live tenant super admin only; external credential strict grants; no Human privilege inheritance |
| Concurrency | tenant lock then app FOR UPDATE; CAS version; quota changes do not bump config version; token rotate atomic |
| Audit / outbox | atomic existing tenant audit for management with field names only, no token/hash/grants values; no new event consumer, live verification authoritative |
| Secret / retention | SHA256 random256-bit verifier; raw token once; revoked config retained for audit, verifier erased; no automatic purge; operator retention follow-up before production |
| DB grants | Identity-owned baseline runtime SELECT/INSERT/UPDATE on new table; no DELETE; migration operator DDL; separated credential custody follows Identity extraction |
| Migration / compatibility | additive forward37; no backfill/old data mutation; older binary ignores new table; rollback disables routes, retains audit; forward fixes only |
| Fixtures / evidence | retained synthetic Alpha/Beta; tokens in process memory only; tests/artifact references in SRC-088 evidence, NOT_RUN before execution |

## Acceptance

- EA-01 admin creates/lists/configures app; nonadmin and app token denied; CAS/unknown keys validated.
- EA-02 only verifier persisted; expiry, rotation, revoke, disabled tenant/app fail closed; restart preserves access/quota.
- EA-03 scope/object/field/team/tenant isolation; no wildcard/new-field expansion or hidden-field filter; current policy invalidates cursor.
- EA-04 real records via owner port; detail/list/property selection and pagination; missing/inaccessible404.
- EA-05 concurrent admission quota120,429/retry header, DB unavailable503; safe error and audit content.
- EA-06 Developer Portal app controls and responsive developer docs; raw token only transient display, never localStorage/URL.
- EA-07 OpenAPI reference matches live routes/examples; docs explain boundaries, errors, rotation and pagination.
- EA-08 forward migration rerun0 and preexisting tables preserved; synthetic fixtures retained; builds/regression checks.

Parser compatibility: shared pre-route JSON/size rejection returns400 with error.code and retryable only; message/meta are optional in OpenAPI error schema for that case. Route responses keep the correlation envelope. Deal amount is decimal-string metadata in the selected-property catalog, currency is ISO currency text.
