# Main local Chat runtime — T09

Accepted task: [SRC-109/T09](../tracking/details/SRC-109.md#t09-legacy-retirement-and-main-cutover--2026-10-27), D3 Human-first6/6/local3/14. [Checkpoint](../tracking/checkpoint.md) records current processes. This runbook concerns the existing local development databases only. The user explicitly approved provisioning and continuation of local cutover on 2026-10-27 after the initial automatic approval review rejected provisioning.

## Data and writer boundary

The source43 final fenced snapshot contains 122 tables / 7,824 rows. Snapshot digest: `5038359c7993df35b99ee180034a4d9902f76bafe47843f2b555ee30e2ee6d39`. Import reconciled 6,053 rows across 59 Chat tables. Baseline forward44–46 and Chat forward3–4 were applied, followed by 367 owner bootstrap rows. Both tenant writer gates were activated at epoch1, then frozen and forward-recovered on the same crm_chat to active epoch2. See artifacts/chat-extraction/t09-20261027-02: main-data.json, main-import.json, main-runtime-provision.json, main-peers.json, main-activate.json, main-freeze.json and main-recover.json.

Six source accounts remain locked: crm_app, crm_auth, marketing_authority_local, outbound_chat, outbound_identity and outbound_worker. Retained baseline Chat data is historical. Never reactivate the source writer after destination writes. Do not rerun source43 preflight/export/bootstrap/import or initial runtime provisioning against the active runtime.

Runtime credentials are separate by owner and Chat API/worker. Main Identity has `UPDATE(status)` on its own tenant table because MySQL requires an UPDATE privilege for the existing admission `FOR UPDATE` locking read. The repair changes no tenant rows; its actual locking read and old/new Chat denial checks are in `main-lock-grant.json`. No wildcard or cross-schema runtime grants were added.

## Pinned units and network

- Baseline public API: `sha256:3f1b34d062a9d22c6e6d82b2831caae0301e8830d72a649d37a3402622a257c1`. Shared worker, dispatch and six owner adapters remain `sha256:a4c1ca6ec771ef0957a2a4e403bd5f17cc39cb36bea422ea24fd9ac7fe61d30b`.
- Chat API/worker: `sha256:cd3d2dbb4c6cc086109c1f5a47cf3cc86c6d5168a60f659f20e34c13e81f93a3`, database crm_chat schema4. Baseline agentic_crm schema46.
- Existing Connector dispatch image and connector_local database remain pinned by `.local/human-outbound/images.env`. The existing synthetic Beta channel now also has a matching outbound binding. Its separate ingress token is private; this does not claim a new D1 Beta ingress deployment or a live provider.
- Identity/CRM/Channels/Routing/Sales/Workflow endpoints are adapters inside the baseline deployment, not independently extracted business services.

Private Compose configuration is `.local/chat-main/compose.baseline.json`. Private-network RPC uses `agentic-crm-chat-main_default`; MySQL and Redis use the existing `agentic-crm_default`. Chat adds those external networks through `.local/chat-main/compose.chat-network.json`. Channels uses alias `channels-owner` to avoid colliding with Connector transport's Compose service name. Transport uses `transport-connector`.

Public API uses Docker host networking on internal port13101, preserving Reporting's HTTP loopback contract and the Docker clock. A credential-free TCP entry container publishes127.0.0.1:3001 for Docker/WSL. Windows access to published Docker ports remained unavailable after Desktop restart under mirrored WSL; binding Windows3001 returned EADDRINUSE. The Windows-only script scripts/chat-main-windows-entry.mjs listens127.0.0.1:13001 and tunnels raw TCP through docker exec to that existing API. FIX-20261027-01 replaces per-connection processes with one persistent docker exec and bounded raw TCP multiplexing (64connections,64KiB frames, backpressure,60second idle). It has no credentials, HTTP parsing, business effect or retry. Restart the Windows relay after recreating the baseline API container; its persistent pipe belongs to the old container and exits when that container stops. The previous Windows API writer is stopped. No global WSL/firewall setting was changed.

Next web listens127.0.0.1:18080; .local/services/web.env sets API_INTERNAL_URL=http://127.0.0.1:13001. Full authenticated replay/tenant/CSRF/non-Chat smoke passed through web18080. Owner ports13111–13116, dispatch3012, shared worker3002, Chat13020/13021/13022 and Connector3014 remain Docker-local endpoints. Reporting keeps its loopback3004 public contract and uses existing direct MySQL network via .local/chat-main/compose.reporting-network.json. MySQL healthcheck uses root SELECT1 because the old application account is intentionally locked.

CHG-20261027-05 restart follow-up: Next's bundled rewrite proxy has its own upstream keepalive pool, independent of httpAgentOptions. Direct relay reads passed42/42 while web reads had two immediate ECONNRESET/500 responses. For the exact Windows relay target above, apps/web/proxy.ts sends Connection: close on upstream API/auth exchanges to avoid idle pooled sockets racing remote close across the extra pipe. This does not retry requests or change owner RPC pooling, authorization, request body or API schemas. Other API targets retain normal behavior. Verification is recorded in the active Inbox task evidence.

Initial host API JavaScript matched all256image JavaScript files, but that host deployment was superseded. Windows/Docker clock differences and Docker clock jumps caused admission failures; do not relax expiry or freshness checks. Direct Compose networking avoids repeated Windows host crossings. The initial configuration generator now refuses to overwrite an already staged main environment, protecting a recovered writer epoch.

## Start existing configuration

Use the pinned Node24 runtime for scripts. These commands reuse private configuration and data; they do not seed or regenerate credentials.

```text
docker compose -f .local/chat-main/compose.baseline.json -f .local/chat-main/compose.inbox-baseline.json -f .local/chat-main/compose.inbox-realtime-baseline.json up -d --no-build
docker compose -p agentic-crm-human-outbound --env-file .local/human-outbound/images.env -f compose.human-outbound.yaml -f .local/chat-main/compose.connector-network.json up -d --no-build --no-deps connector
docker compose --env-file .local/chat/compose.env -f compose.chat.yaml -f .local/chat-main/compose.chat-network.json -f .local/chat-main/compose.inbox-chat.json -f .local/chat-main/compose.inbox-realtime-chat.json up -d --no-build
docker compose --env-file .local/reporting-container.env -f compose.reporting.yaml -f .local/chat-main/compose.reporting-network.json up -d --no-build --no-deps reporting
docker compose -f .local/chat-main/compose.acceptance.json run --rm operator scripts/chat-main-status.mjs
docker compose -f .local/chat-main/compose.acceptance.json run --rm smoke smoke beta stable
```

The acceptance/operator image retains its accepted T09 pin; runtime units use the newer Inbox pins above. The operator mounts only the required local source/config/evidence paths and does not seed. It is also the SQL operator entry while Windows13306 is unavailable. Start existing MySQL/Redis and connector MySQL containers before app units after a Desktop restart; keep their volumes. Chat restart policy is no, so start its exact Compose overlay explicitly after infrastructure is ready.

Windows processes (run from repository root after checking existing PIDs/listeners):

```powershell
$nodePath = (Resolve-Path '.local/node-v24.21.0-win-x64/node.exe').Path
Start-Process -FilePath $nodePath -ArgumentList 'scripts/chat-main-windows-entry.mjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput '.local/chat-main/windows-entry.stdout.log' -RedirectStandardError '.local/chat-main/windows-entry.stderr.log'
Start-Process -FilePath $nodePath -ArgumentList @('scripts/local.mjs','run','web') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput '.local/chat-main/web.stdout.log' -RedirectStandardError '.local/chat-main/web.stderr.log'
$env:CHAT_MAIN_PUBLIC_PORT = '18080'
& $nodePath scripts/chat-main-smoke.mjs replay beta stable
```

Do not run the old local init/API/worker generator against this main configuration. D2 Identity/Chat/coordinator containers were removed; do not recreate them. Stop only verified relay/web PIDs (and web child) when needed; a PID file alone is not process identity. Docker stop/recreate uses the units above without volumes. The main config generators are initial provisioning utilities, not restart commands; never overwrite recovered chat.env or its epoch.

## Post-write recovery

This drill passed on main after writes. For another explicit drill, capture before evidence with the operator, stop baseline shared worker, run operator scripts/chat-main-writer-mode.mjs freeze and smoke frozen beta stable. Public mutation must fail503. Stop Chat API/worker. Run operator scripts/chat-main-writer-mode.mjs recover to activate the same crm_chat at the next epoch and update .local/chat-main/chat.env. Recreate both Chat containers with the network overlay so they receive that epoch; a plain restart does not reload env files. Restore shared worker and replay beta stable with original keys, then run operator scripts/chat-main-recovery-evidence.mjs after. Use a new evidence directory for a new drill rather than overwriting the accepted epoch1→2 evidence.

If recovery commits but writing the env file fails, reconcile the config to the recorded database epoch before starting Chat. Never lower the database epoch or restore stale baseline traffic. Verify original intent/message/note IDs and durable effect counts before declaring recovery accepted.

## Evidence and retained limits

Evidence lives under `artifacts/chat-extraction/t09-20261027-02`. Private smoke state and credentials live under `.local/chat-main`; never copy session cookies, tokens, note bodies or transcripts into evidence. Failed smoke rounds are retained with sanitized status/error/step only.

Alpha's default mock channel is outside its configured Routing queue and the takeover request was rejected. Both Alpha takeover commands were rejected; a new key was used only after checking terminal aborted proof. The first Beta intent remains queued/unclaimed at payload/attention25 with an expired grant; v1 forbids silent grant extension or a second attempt. Retain it for investigation. A separate explicit beta-stable round on the existing native admin/channel reached sent and passed recovery; do not replace its private keys.

main-recovery-before/after.json verify identical hashes for36historical source tables and stable effect counts (2messages,1intent/job/note,4contributions,5activity). main-events.json verifies a fresh public tag replay produces1dispatched event,1acked delivery and1applied local inbox. main-runtime-final.json records exact images,12fresh owner checks, six worker jobs progressing, locks, removed D2 containers and public auth boundaries. Diagnostic preloads are disabled. AI native, real-provider delivery and downstream business consumers remain outside T09; unconfigured receivers retain durable backlog rather than being acknowledged as delivered.

## Inbox refinement and clock limitation — 2026-10-27

FIX-20261027-01 source is running via the compose.inbox and compose.inbox-realtime overlays above; never omit them on recreation or older images will return. Private diagnostic overlays are not active. Evidence: [Inbox performance and realtime](../tracking/details/FIX-20261027-01.md), artifacts/inbox-realtime/images.json. Schema46/4 and writer epoch2 unchanged. No current authorization caching or timestamp tolerance increase.

## Inbox socket and fallback configuration — CHG-20261027-06

The current local web environment `.local/services/web.env` sets `NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS=300000` and `NEXT_PUBLIC_INBOX_REALTIME_ENABLED=true`. The fallback interval applies to Inbox queries and child panes; non-Inbox screens retain their existing cadence. Public examples are in `apps/web/.env.example`. Development web must restart after env changes. Production NEXT_PUBLIC values are embedded at build time: rebuild web with Docker build arguments `--build-arg NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS=300000 --build-arg NEXT_PUBLIC_INBOX_REALTIME_ENABLED=true`; setting only runtime env on an already built web image does not change them.

The realtime baseline overlay enables `CHAT_REALTIME_ENABLED=true` on the API. The Chat overlay enables it on API/worker and sets `CHAT_REALTIME_REDIS_HOST=agentic-crm-redis-1`, `CHAT_REALTIME_REDIS_PORT=6379`. The baseline uses its existing host-network Redis endpoint127.0.0.1:16379. Optional Redis/password configuration is documented in `infra/docker/chat-realtime.env.example`; keep credentials private. Restart/recreate the affected processes after backend env changes, then restart the Windows relay after recreating baseline API.

Same-origin WebSocket upgrades at `/api/v1/inbox-realtime` pass through the relay and Next rewrite; the local HTTP Connection-close workaround explicitly excludes upgrades. Chat publishes ephemeral tenant hints after commit. The authenticated gateway pushes generic invalidation frames; initial/history and refreshed data use existing authorized paginated APIs. Redis is not the durable event bus. Hidden/inactive Inbox closes its socket; visible/reconnect reconciles. Pub/sub failures do not fail committed writes and the five-minute fallback reconciles missed hints. See [protocol and limits](../contracts/inbox-realtime-v1.md). Live Redis outage and production capacity drills were not run.

User-approved temporary clock experiments did not remove wall-clock steps: Ubuntu systemd-timesyncd is restored active, clocksource restored to hyperv_clocksource_tsc_page. No boot config modified. Application list/message latency improved, but rare concurrent detail/notes503 remain; do not treat a successful short probe as infrastructure recovery. Review WSL/Hyper-V time synchronization before further deadline changes. A subsequent user-approved shared WSL/Docker restart was performed; all19original containers and the relay were recovered without reset. Restart did not remove clock steps. A further temporary Hyper-V implicit-sync experiment was reverted to Y; Ubuntu NTP and the original clocksource are active. User requested handoff with Windows time unchanged: W32Time remains stopped/manual. No more infrastructure action is pending. Final42request probe has no500 but two message503; task remains open. See the final handoff in the evidence above.
