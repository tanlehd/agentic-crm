# Connector connection barrier — filled table design

CHG-20261023-10, SRC-109/T05, Ready. [Contract](../contracts/chat-connection-disable.md), [guideline](database-guidelines.md), [template](../templates/database-table.md).

| Required item | Design |
|---|---|
| Task / requirement / acceptance | SRC-109/T05 global connection disable; current transport race and stale operator retries |
| Table / target schema | `connector_connection_barrier` in `crm_connector` |
| Physical current | Applied to retained native_connector_test by forward6; local connector_local remains5 until compatible rollout |
| Writer / aggregate | Connector connection status operator; connection status and receipt in one Connector transaction |
| Meaning / scope exclusions | Durable disable/re-enable identity; no Human permissions, credentials or delivery outcome |
| Data kind / tenant scope | Business control ledger, retained terminal receipts; authenticated workload tenant; system/zero/empty tenant denied |
| Columns | tenant_id, barrier_id, connection_id CHAR36 ASCII binary NOT NULL; state VARCHAR16 ASCII binary NOT NULL (`disabled`,`enabled`); version BIGINT UNSIGNED NOT NULL default1; disabled_at DATETIME(6) NOT NULL; enabled_at DATETIME(6) NULL iff disabled; updated_at DATETIME(6) NOT NULL. All UTC; no implicit tenant default |
| Keys / constraints | PK(tenant_id,barrier_id); INDEX(tenant_id,connection_id,state,barrier_id); business tenant/version/state/time CHECKs. Connection ID is a local logical reference to legacy mixed-collation connector_connection; repository locks and validates it before every receipt. No remote FK, deletion/cascade or historical table collation rewrite |
| Remote references | Channels control call binds canonical ID; no Channels SQL. Chat results unaffected; unknown remains unknown |
| Queries / indexes | PK barrier replay; tenant+connection+state active-barrier lookup LIMIT1. Connection lookup uses existing tenant_connection. EXPLAIN on retained barrier rows required; no unrelated attempt index added |
| Authorization | Caller Connector only via current workload registry; trusted existing operator port, not a public authorization bypass |
| Concurrency | Connection row lock precedes ledger/attempt lock. At most one disabled barrier per connection enforced under that shared serialization. Enable requires matching active barrier. Old enabled receipt cannot disable again; no TTL |
| Audit / outbox | Barrier disabled_at and terminal enabled_at are minimized durable control evidence; Channels existing audit records operator effects. No new status event subscriber is declared |
| PII / secret / retention | Only tenant/connection/barrier UUIDs and timestamps. Preserve all receipts through restore; no automatic purge/reset |
| Grants | Status role: connection SELECT/UPDATE(status), barrier SELECT/INSERT/UPDATE. Dispatch gate SELECT connection, existing attempt DML; no credential projection/foreign SQL/DDL |
| Migration | Additive Connector6 after unchanged1–5; no backfill fake receipts. Validate old journal/data hashes and retained delivery/attempt rows. Only operator applies |
| Compatibility / rollback | Schema5 binary cannot claim complete schema6 readiness. Deploy compatible image before activation, retain schema6 on rollback. Old sender must stop before activation; no downgrade/drop or resend unknown |
| Fixtures | Existing native tenant/user, unique retained connection/barrier per test round and second tenant negatives. Use dedicated runtime credential; never reset DB |
| Evidence | 17native groups and12outbound regression PASS; populated5→6 preservation and indexed query verified. [Runbook](../development/chat-connection-disable.md), artifacts/chat-extraction/continuation-20261022/disable-native-1.log and disable-migration-upgrade.json |

The append-only dispatch journal rows and existing migration checksums remain unchanged. New receipt state has one terminal transition `disabled → enabled`; status is not a delivery guarantee.
