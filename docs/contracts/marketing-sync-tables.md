# Marketing backend control tables — PLAN-011E

Status: SRC-056 authority schema27 applied; SRC-051 control schema v2 plus forward v3 UUID validation applied locally. HTTP service/ingestion remain IN_PROGRESS. [Metadata protocol](marketing-metadata-sync.md), [database guideline](../data/database-guidelines.md), [original table template](../templates/database-table.md). SRC-054 database v1 stays immutable. These are the reviewed schema additions implemented by SRC-056 and the storage foundation of SRC-051; source acceptance is tracked separately.

## Filled common table template

| Item | Decision for every row below |
|---|---|
| Requirement / acceptance | PLAN-011E; SRC-056/MKT-SYNC-01 or SRC-051/MKT-SYNC-02/03 |
| Writer / scope | Owner in inventory; business TenantContext only; tenant_id CHAR36 ascii_bin NOT NULL, valid UUID, rejects zero/platform tenant; no default tenant |
| Shape | UUID columns CHAR36 ascii_bin; opaque IDs VARCHAR255 ascii_bin; hashes BINARY32; timestamps UTC DATETIME6; BIGINT UNSIGNED revisions/fences/counts; bounded codes/enums; mutable rows version>=1 and created_at/updated_at |
| Keys / relationships | PK tenant/id unless natural tenant clock; same-schema FK includes tenant/account when account-scoped; remote resource references logical only |
| Remote unavailable | Credential/Page authority failure defers/pause; no fallback credentials/tenant. Already issued admission receipt is immutable authorization evidence |
| Rights | Native integration.configure(all)/read(all) for BFF; private tenant+audience+credential allowlisted service auth for authority; worker context from claimed schedule |
| Concurrent writes | CAS version; fixed local lock order; no network inside SQL transaction. Authority locks credential then Page; Marketing locks schedule then tenant clock then object keys in deterministic order. Grant commit precedes Marketing local transaction |
| Audit / events | Authority changes audit minimized reference/status/actor; receipt stores grant fact. Marketing accepted object mutation+observation+change+checkpoint atomic. No token, foreign content or rejected payload in audit/events |
| PII / retention | Only selected ad metadata; no chats/customer audience members. Credential encryption specified separately. No automatic purge in this slice; receipts/history retained until explicit retention/consumer recovery policy |
| Grants | Provision/migration role separate. Channels credential repository alone gets credential read/write (not generic Reporting/CRM read paths); authority receipt INSERT/SELECT only. Marketing worker own mutable control DML; immutable events INSERT/SELECT only; no cross-service grants |
| Migration / compatibility | Source chooses next free forward monolith version (27 if unchanged) for Channels; Marketing lineage2 for control additions. Backfill explicit tenant mapping from existing owner only. Old binaries tolerate additive nullable fields; old journal/checksums unchanged. No schema auto-sync |
| Rollback | Disable new endpoints/worker, retain data; forward fix. Never drop v1/history, reassign Page or reset persistent test DB |
| Evidence | NOT_RUN until source tasks; schema/FK/ACL/encryption/concurrency/restart/idempotency/EXPLAIN/preservation fixtures required. Design checks alone do not close source acceptance |

## Channels authority tables — SRC-056

Physical current `agentic_crm` within Channels baseline; target `crm_connector`. This is the same ownership boundary as existing facebook_page/credential handling, not a new Marketing credential writer. Extraction remains separately gated.

### channel_marketing_credential

Meaning: verified tenant/account read credential, source-of-truth at Channels. Entity aggregate, mutable. Fields: tenant_id,id; app_id VARCHAR255 NOT NULL; external_account_id VARCHAR255 NOT NULL; token_ciphertext TEXT NOT NULL (versioned AES256GCM envelope); key_id VARCHAR64 NOT NULL; status VARCHAR16 NOT NULL CHECK active/revoked/attention; verified_at DATETIME6 NOT NULL; version BIGINT UNSIGNED NOT NULL DEFAULT1; created_at/updated_at NOT NULL. Ciphertext bound to purpose/tenant/id/app/account AAD; encryption key lives outside MySQL; key_id not secret. No plaintext token or unsalted token digest column.

PK(tenant_id,id); UNIQUE(tenant_id,app_id,external_account_id); index(tenant_id,updated_at,id). Shared external account across tenants allowed. No FK to Marketing account. Read shape tenant/id, or native metadata list tenant/id cursor; never list ciphertext. Rotation replaces encrypted value and increments version atomically after provider verification and fresh native permission check. Revocation changes status/version; no implicit token reuse. Runtime generic list selects explicit metadata columns. Source tests ensure different AAD tenant/account fails decryption and user-facing error/log capture contains no submitted secret.

### facebook_page additions

Existing Channels Page binding retains UNIQUE(app_id,page_id), owner/connection immutable. Add marketing_admission_state VARCHAR16 NOT NULL DEFAULT enabled CHECK enabled/revoked, marketing_admission_version BIGINT UNSIGNED NOT NULL DEFAULT1 CHECK>=1. Existing bindings are registered Pages under the same owner, so explicit forward migration backfills them enabled without using messaging status. This does not subscribe/send messages. Marketing admission revoke increments its independent version; reconnect/token/name changes do not accidentally invalidate Page ownership revision. No Page transfer route in scope.

Add native POST `/api/v1/admin/channels/facebook/pages/:id/marketing-admission` with `{operation_id,expected_version,enabled}`; integration.configure(all),CSRF, tenant/Page lock, durable receipt/audit, version CAS. Status applies to future admission grants. Existing grant receipts remain historic. Revocation does not disable messaging, and disabled messaging does not revoke Marketing ownership.

### channel_marketing_admission_receipt

Meaning: immutable accepted authority decision; rejected/foreign Ads have no receipt. Fields tenant_id,id; operation_id CHAR36; credential_id CHAR36; credential_revision BIGINT UNSIGNED; page_connection_id CHAR36; page_revision BIGINT UNSIGNED; app_id,external_account_id,page_id,external_ad_id VARCHAR255; run_id CHAR36 logical Marketing ref; fence BIGINT UNSIGNED; payload_sha256 BINARY32; request_sha256 BINARY32; policy_version VARCHAR32; fetched_at,admitted_at DATETIME6; all NOT NULL, positive revisions/fence.

PK(tenant_id,id); UNIQUE(tenant_id,operation_id); FK(tenant_id,credential_id) same owner credential; FK(tenant_id,page_connection_id) existing facebook_page(tenant_id,connection_id). Index(tenant_id,credential_id,admitted_at,id). Read exact own operation; no foreign lookup/global dump. In authority transaction, verify credential account/app/active revision and Page owner/admission revision match, then insert once. On duplicate compare normalized request digest; same body returns immutable original even if credential later revoked, because it reports historical grant. New operation always checks live permissions. Page/admin mutation and admission use shared row locks, so revoke-before-grant is deterministically denied. Never cascade-delete credential/Page while referenced.

## Marketing control tables — SRC-051

Physical/target `crm_marketing`, sole writer Marketing. They inherit all common template items and no remote FK. Existing22 business tables remain; these extend operational storage only.

### marketing_sync_schedule

Mutable account/profile queue authority. Fields tenant_id,id,account_id,binding_id; profile VARCHAR64 NOT NULL (object_metadata_v1); enabled BOOLEAN NOT NULL DEFAULT0; state VARCHAR16 NOT NULL CHECK idle/running/retry/attention/paused; interval_seconds INT UNSIGNED NOT NULL DEFAULT21600 CHECK900..604800; next_due_at DATETIME6 NOT NULL; active_run_id CHAR36 NULL; lease_owner CHAR36 NULL; lease_until DATETIME6 NULL; fence BIGINT UNSIGNED NOT NULL DEFAULT0; consecutive_errors INT UNSIGNED NOT NULL DEFAULT0; last_success_at DATETIME6 NULL; error_code VARCHAR64 NULL; version/created_at/updated_at standard.

PK tenant/id; UNIQUE tenant/account/profile; UNIQUE tenant/account/id; FK tenant/account to marketing_account; FK tenant/account/binding to marketing_account_binding; FK tenant/account/active_run to marketing_sync_run. CHECK lease owner/until both null or both present; running requires active_run. Index(enabled,state,next_due_at,tenant_id,id) is the explicit bounded dispatcher cross-tenant scan exception; row claim becomes tenant context. Secondary tenant/account lookup. EXPLAIN and two competing connections must verify index/claim fencing. Pause/revoke increments fence, clears lease and preserves run/checkpoint. Scheduler toggles are not provider token changes.

### marketing_operation_receipt

Immutable own API command result. Fields tenant_id,id (operation UUID); action VARCHAR64; target_id CHAR36 NULL for account creation until result known; request_sha256 BINARY32; http_status SMALLINT UNSIGNED; response_json JSON <=64KiB; created_at DATETIME6, all except target_id NOT NULL. PK tenant/id; index tenant/created_at/id. Response excludes credentials/provider content; request only public refs/settings, never raw token. SELECT/INSERT only. Source transaction commits receipt with actual binding/schedule effect; same-key conflicting digest409. Remote validation occurs before this local transaction; duplicate completed receipt can return without redoing mutation.

### marketing_change_clock

Mutable per-tenant commit-order counter. Fields tenant_id PK, last_sequence BIGINT UNSIGNED NOT NULL DEFAULT0, version BIGINT UNSIGNED NOT NULL DEFAULT1, created_at/updated_at NOT NULL. No id needed for one row per tenant. Explicitly initialize for tenant when verified first binding is installed. Row locked until metadata commit; increment for each emitted change in the same transaction. This serializes accepted changes within one tenant without requiring cross-service or global locks. Do not substitute AUTO_INCREMENT allocation for commit order: concurrent account transactions could otherwise expose a later watermark before an earlier sequence commits.

### marketing_change_event

Immutable pull-delivered outbox. Fields tenant_id,id UUID; sequence BIGINT UNSIGNED NOT NULL; account_id CHAR36; object_type VARCHAR32; external_object_id VARCHAR255; observation_id CHAR36; revision BIGINT UNSIGNED; event_type VARCHAR64 fixed marketing.object.observed.v1; payload JSON <=64KiB; created_at DATETIME6, all NOT NULL. PK tenant/id; UNIQUE tenant/sequence; UNIQUE tenant/account/observation_id/event_type; FK tenant/account to marketing_account; FK tenant/account/observation to marketing_object_observation; FK tenant to change_clock. Index tenant/account/object_type/external_object_id/sequence for snapshot-as-of lookup; forward stream index tenant/sequence. Every key and cursor is tenant scoped; global sequence is not exposed.

Payload includes identity/ref/revision/coverage/scope descriptors only, no ad body/credential/foreign content. Mutation transaction takes clock lock before object writes, updates clock to committed high-watermark, appends events, then commits. Snapshot captures clock watermark W and selects latest event<=W for each object; hydrates its immutable observation by tenant/account/id. Snapshot exposes exactly that observation's selected fields/coverage; it must not hydrate a newer mutable row. Subsequent tail after W cannot miss older concurrently committing rows because the clock lock orders commits. API reports missing fields explicitly; consumers must not infer zeros or overwrite CRM source.

### Existing Marketing additions

- marketing_sync_run: add error_code VARCHAR64 NULL, completed_at DATETIME6 NULL; durable checkpoint JSON stays versioned/bounded. Complete_with_gaps is presentation of complete+counter values, not rewriting deployed CHECK enum. Existing runs get NULL metadata; no historical invented completion time.
- marketing_object_observation: add admission_receipt_ref CHAR36 NULL, admission_request_sha256 BINARY32 NULL, admission_authority VARCHAR64 NULL. New accepted Ad writes require all three at producer validation; non-Ad and preexisting v1 fixtures remain nullable. Explicitly distinguish legacy/unverified receipts in reads; do not backfill fake authority grants. Forward CHECK may enforce all-null or all-present, not demand fabricated historical values.
- marketing_ad: no remote credential FK or copied token. Existing current evidence must equal accepted Ad observation. Authorization receipt details resolve through Marketing observation and logical authority reference.

Marketing v2 runner must register new immutable steps while verifying every v1 checksum, back up existing schema and compare unchanged v1 fields/rows. Provisioner grants new history tables SELECT/INSERT, mutable control tables only needed DML. Persistent synthetic tests remain; fixture teardown never resets CRM/test databases. Full field dictionary must be regenerated after actual DDL, not mark these proposed columns as applied now.
