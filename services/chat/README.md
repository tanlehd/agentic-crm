# Chat independent runtime

SRC-109/T01–T09 DONE; main local Chat API/worker use crm_chat4 and epoch2. Human-first D3 6/6/local3/14. [Main runtime runbook](../../docs/development/chat-main-local-runtime.md) is the source for current pinned config/start/recovery; do not replace it with candidate fixture config. [T08 parity](../../docs/quality/t08-chat-parity-acceptance.md) and [runtime contract](../../docs/contracts/chat-runtime-composition.md) define accepted scope.

## Build and run

From the repository root, activate the project toolchain (`. ./scripts/dev-shell.ps1` in PowerShell), then:

```text
pnpm build:chat
node --env-file=.local/chat/api.env services/chat/dist/main.js api
node --env-file=.local/chat/worker.env services/chat/dist/main.js worker
```

Create these private environment/config files from the retained environment being operated. They are not created by startup. Required fields:

| Setting | Meaning |
|---|---|
| CHAT_DB_HOST, CHAT_DB_PORT, CHAT_DB_NAME | Owning schema `crm_chat`; isolated native acceptance uses `test_crm_chat_owner` |
| CHAT_DB_USER, CHAT_DB_PASSWORD | Separate restricted API/worker credentials; no foreign schema or operator grants |
| CHAT_TENANTS, CHAT_WRITER_EPOCH | Explicit comma-separated business tenant UUIDs and active epoch; never wildcard/default tenant |
| CHAT_HOST, CHAT_PORT | Authenticated owner API listener; host defaults to loopback |
| CHAT_HEALTH_HOST, CHAT_HEALTH_PORT | Liveness/readiness/aggregate metrics listener; host defaults to loopback |
| CHAT_ENDPOINTS_FILE | JSON object with `owners`, `dispatch`, `receivers`; each maps service name to its base URL |
| CHAT_CURSOR_KEYS_FILE | JSON hex values for `history`, `catalog`, `workspace`, `activity`, `external`; retain existing keys |
| WORKLOAD_* | Existing workload transport/material and signed registry configuration |
| CHAT_TICK_MS | Worker interval, default1000ms |
| CHAT_WORKER_JOBS | Optional explicit job list; defaults `ingress,outbound,snooze,recovery,events,activity`. Subset activation is reported in metrics and does not claim full worker parity |

`owners` requires Identity/CRM/Connector/Routing. Sales and Workflow are configured for dependent reads/commands when available; their deployment is separate acceptance. `dispatch` requires Identity and Connector dispatch URLs, which may differ from owner API URLs. `receivers` contains only accepted event delivery endpoints; absent subscribers retain durable backlog. Never point real subscriptions at a synthetic receiver.

HTTP-local requires APP_ENV=test/development, WORKLOAD_TRANSPORT=http-local and the retained WORKLOAD_HTTP_KEYS_FILE. TLS uses WORKLOAD_CA_FILE, WORKLOAD_CERT_FILE and WORKLOAD_KEY_FILE. Both use WORKLOAD_REGISTRY_URL, WORKLOAD_AUTHORITY_KEY_ID and WORKLOAD_AUTHORITY_PUBLIC_KEY_FILE. Config paths and credentials stay outside version control.

GET `/health/live` checks process liveness; `/health/ready` checks Chat lineage/epoch and API peer readiness or completed worker rounds. `/metrics` exposes aggregate backlog and worker counters/jobs, without business data. Private workload readiness checks this service's storage only, avoiding dependency cycles. Readiness failure never falls back to baseline SQL.

## Image and candidate lifecycle

```text
docker build --target chat -t agentic-crm-chat:candidate-20261025 -f infra/docker/Dockerfile .
```

Pin the resulting immutable image ID in CHAT_IMAGE. `compose.chat.yaml` runs only Chat API and worker. Supply CHAT_ENV_FILE, CHAT_CONFIG_DIR, CHAT_API_DB_USER/PASSWORD and CHAT_WORKER_DB_USER/PASSWORD through a private Compose environment file; config paths inside the container use `/run/chat/`. The config directory is read-only. Host ports are loopback13020/13021/13022 by default. No other service is rebuilt or started.

```text
docker compose --env-file .local/chat/compose.env -f compose.chat.yaml up -d
docker compose --env-file .local/chat/compose.env -f compose.chat.yaml ps
docker compose --env-file .local/chat/compose.env -f compose.chat.yaml logs --tail 100
docker compose --env-file .local/chat/compose.env -f compose.chat.yaml stop
```

These are candidate operations, not main cutover. Use the exact tested config/image pins and retained synthetic schema during T07. Containers run non-root with read-only filesystem, bounded resources/logs and45second graceful stop. Restart retains MySQL commands, inbox/outbox, messages/sessions and receipts; in-memory cursors/metrics carry no business authority.

## Operator migration

Initial versions1/2 require the existing T03 export/import/reconciliation flow. Runtime never imports the migration runner or provisions grants. `node dist/migration-main.js status` verifies the complete packaged lineage using explicit CHAT_MIGRATION_USER/PASSWORD; `upgrade` applies existing forward3/4 only after reconciled1/2. No reset, auto-sync or automatic migration at startup.

## Evidence and remaining acceptance

See [T07 execution](../../docs/planning/chat-extraction/07-runtime.md) and [tracker](../../docs/tracking/tasks.md). Evidence under `artifacts/chat-extraction/t07-20261025` distinguishes host-process tests, image builds and container tests. Partial composition/smoke does not establish T08 parity, T09 single-writer fencing or a deployed third service. Identity owns policy; CRM owns Contact/metadata/notes; Routing owns capacity; Connector owns provider transport; Reporting/Workflow/Sales downstream completion remains separate.
