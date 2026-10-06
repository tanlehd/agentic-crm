# Connector durable HTTP ingress bridge v1

PLAN-006A / CHG-20261006-08 / ADR-018. Ready contract implemented in SRC-028; evidence/status in tracker. This is an independent ingress service with its own DB, not complete Connector/Chat extraction. Mock normalized messages only; production Facebook, remote outbound, delegated Human tools/owner permits and broker remain PLAN-006/004 gates.

## Boundary and transport

`services/crm-connector`: NestJS TypeScript, own MySQL database/user/migration journal, separate API/worker entrypoints and release image. No import backend domain code/ORM and no access monolith tables. Reuse generated JSON Schemas/TS from contracts package only. REST is a durable command transport in this first slice; delivery table is an HTTP work outbox, not a JetStream implementation. Shared UoW ends at monolith compatibility receiver.

POST `/connector/v1/deliveries` accepts existing intake-request strict DTO, Header X-Connection-Id + Bearer64hex. No Cookie, Origin, X-Tenant-Id or query accepted. Validated payload64KiB max, UTC calendar timestamp canonicalized, no plaintext credential in payload. GET `/connector/v1/deliveries/{uuid}` uses same credential, no raw payload exposure. Responses preserve `data.delivery_id,status` (202 POST), status read includes id/status/attempts/error_code/remote_delivery_id; forwarded is intermediate; completed/blocked/attention terminal. POST same provider_event_id+canonical payload digest returns same local ID; changed payload409. Forwarded means remote ingress durably accepted, not Chat completion; worker continues to remote processed receipt before local completed. Sanitized errors400/401/403/404/409/422/503; no stack/SQL/raw body in logs.

States queued→forwarded→completed; transient remote errors retry same event/body/key, eventual attention after10 consecutive failures; auth/binding/validation conflict terminal blocked. Forwarded polling does not consume error retry budget on success. Worker lease30s with monotonic fence, at most one claimed job per tick, remote request deadline5s, retry delays1/5/30/120/600s capped. Expired lease may duplicate network call but receiving event key is stable. Every DB status update checks lease token and active connection. No external I/O during SQL transaction. Crash after remote commit/before local receipt re-POSTs same event ID, remote dedup returns original delivery. Remote receipt failed is blocked (operator remediation future), processed→completed. Pending remote status polls5s. No blind provider send here.

## Tenant binding / security

Own connector_connection stores tenant_id,id,ingress_token_hash,remote_connection_id,remote_token_env,status. Provisioning is explicit CLI/input env, idempotent for identical binding; no public admin endpoint. Token hash unique; remote secret value read from environment variable name prefixed CONNECTOR_REMOTE_TOKEN_, not stored in DB. Remote origin is trusted global config, no payload-supplied URL. HTTPS required except explicit local/test HTTP setting; no redirects, URL credentials/path/query fragments forbidden. No generated defaults/secrets in repo.

Before each remote dispatch/poll, authenticated GET `/api/v1/integrations/mock-messenger/binding` checks current monolith connection/service actor/status/token and returns tenant_id,connection_id,platform mock_messenger. Connector compares both tenant and remote connection ID with local immutable binding, fails closed on mismatch before sending content. Token validates body tenant nowhere. Monolith rechecks binding auth on each accept/read, blocking revoked tokens. This is connection-scoped integration authority, not Human delegation or provider control authorization. No real tenant cutover by default; only explicitly provisioned local/test connections in this task.

## Own schema version1

`connector_schema_migration` version PK,name/checksum,state applying/applied; partial DDL failure fails closed pending manual repair; advisory lock serializes migration. Independent lineage, not monolith19; monolith1–18 unchanged.

`connector_connection`: id UUID ascii PK,tenant_id UUID,token_hash CHAR64 unique,remote_connection_id UUID,remote_token_env VARCHAR128,status active/disabled; unique tenant+id. tenant_id logical reference, no cross-db FK.

`connector_delivery`: id UUID PK,tenant_id+connection_id composite FK local; provider_event_id VARCHAR255 with utf8mb4_0900_as_cs; payload_hash CHAR64,payload JSON OBJECT, status queued/forwarded/completed/blocked/attention; attempts/errors uint, lease_until/next_attempt_at datetime6,fencing_token BIGINT,remote_delivery_id UUID nullable,error_code nullable sanitized; timestamps; UNIQUE tenant+connection+provider_event_id; work index status,next_attempt_at,lease_until. Status read scoped tenant+connection+id.

`connector_audit`: UUID PK,tenant_id,connection_id,delivery_id,action,status,time; local audit IDs/status only, no body/secret; composite tenant+connection+delivery FK. Intake and completion state+audit transaction atomic. Runtime user SELECT/INSERT/UPDATE on own connection/delivery, SELECT/INSERT audit, SELECT journal; no DDL/other DB grants. Migration/provision user separate. No schema auto-sync/startup auto-DDL. Payload retention/scrubbing and admin remediation production gate; no production enable claim.

## Operations and compatibility

API liveness process-only; readiness DB reachable + schema1 applied. Remote outage does not make durable ingress unavailable; queue age/error metrics via status/audit and production alerting still follow-up. Worker non-overlapping tick; shutdown waits bounded request then closes pool. API/worker deployed same compatible version. Opt-in compose file and runbook, no default preview route switch. Migration/provision explicit, no reset/drop volumes. Source task needs deployable container + independent DB negative grants and actual HTTP roundtrip, not empty scaffold.

## Acceptance SRC-028

Own fresh migration/no-op/journal check; invalid payload/auth/spoof tenant denied; same event duplicate/changed payload conflict; own tenant isolation; own user cannot query monolith DB. Real HTTP Connector→monolith binding+intake→durable worker→message-content read, including rich extracted text. Lost response after remote ACK and restart/lease recovery no duplicate remote delivery/message; stale fence rejected; inactive/mismatched binding must not forward payload; HTTP outage queues then recovers. Canonical unit/schema/build/typecheck + MySQL integration. Production/broker/HA/cutover/provider tests NOT_RUN.

Implementation/runbook: [service README](../../services/crm-connector/README.md). Machine contracts: intake.json and connector.json with generated OpenAPI. Local connection disable prevents new claims, dispatch checks and completions; a request already in flight cannot be retracted. Downstream binding authentication is rechecked on accept/read; immutable binding remap is unsupported. This is ingress, not a provider-side dispatch revocation guarantee.

SRC-029 adds [Messenger capture](messenger-ingress.md) in independent tables under Connector migration2. Current binary requires journal1–2; migration1 and bridge protocol remain unchanged. Upgrade/grant commands must precede this binary; old binary readiness rejects the additional migration. The mock worker never reads provider capture rows.

## SRC-030 worker compatibility

The current worker adds cache→CRM lookup→resolve on confirmed absence before forwarding to contact-bound deliveries-v2; see [exact contract](contact-resolution-local.md). Public Connector ingress DTO and local schema2 remain unchanged. Upgrade backend API and backend worker first, then Connector worker; older backends cannot serve these new endpoints. Do not roll backend workers back while version2 inbound_delivery payloads remain pending. Existing forwarded rows retain status polling behavior; legacy received payloads remain readable. Resolve operation_id uses durable Connector delivery ID for retries. Raw signed Messenger events remain outside this bridge.

Before upgrading the Connector worker, stop accepting new mock deliveries and drain the old worker queue (including lost-ACK retries). Legacy and v2 payload hashes intentionally differ for the same provider_event_id, so a partially forwarded legacy delivery must be reconciled/drained with the old worker rather than blindly replayed using v2. Resume ingress after backend and Connector upgrades.
