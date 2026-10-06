# Checkpoint — điểm tiếp tục

Updated 2026-10-06, S-20261006-21. SRC-032/033 DONE. ENV-002 local database upgrade DONE, Codex. User authorized migration and committing completed changes; no push requested. Full Agent Chat remains incomplete: SRC-034…037 TODO, sample UI not rebuilt. No background agents or automation. [Tracker](tasks.md) · [ENV-002](details/ENV-002.md).

## Current delivery

SRC-032: schema20 sequence/read cutoff/coverage, atomic writer hooks, resumable backfill, per-Human read markers, server queries/counts and signed cursors. PASS203 MySQL,99 unit, canonical9/9. [Evidence](details/SRC-032.md), CHG-20261006-20.

SRC-033: schema21 saved/shared inbox, Conversation tags/links, snippets, versioned/idempotent CRUD, Identity target port, strict schemas/generated contracts, events and queue/sidebar filters. PASS209 full MySQL,13 final workspace cases (196 intentionally skipped),102 unit,7 tooling and canonical9/9. [Evidence](details/SRC-033.md), CHG-20261006-21. No open test failure.

ENV-002: current backend/dev images built. API/worker quiesced before backup and schema20 cutoff. Forward19→21 applied,0 Conversations backfilled; repeated migration applied0/backfilled0. All60 existing business-table checksums unchanged (journal excluded);9 principals,0 Conversations/0 Messages retained. Sidecar/sequence/cutoff/cohort inconsistency counts0. Existing business roles preserved. Restricted ignored backup and command evidence under artifacts/ENV-002. No reset, volume deletion or production access. Runtime verification PASS: seven development services healthy; API readiness and web HTTP200. Initial Compose wait reported API unhealthy and first gateway request502 during startup; later logs confirmed successful startup and fresh health/HTTP checks passed without source/config changes. No known remaining failure.

Files: workspace source/migrations/tests; Identity port/grants/fixtures; generated contracts; ENV config/scripts; UX/contract/data/module/service/acceptance/planning/tracking documentation and user-provided reference PNG. All completed changes selected for authorized commit on main, parent1531c2a; delivery revision is the Git commit containing this checkpoint (resolve with git log). Private .env, backups, dependencies and artifacts excluded. No push/deploy requested. Preserve this distinction from historical source-task evidence written before local migration.

## Development environment

Open [local app](http://localhost:18080). Docker local MySQL schema21; Redis/Keycloak and existing fixtures preserved. Windows bind8080 restriction: private .env uses LOCAL_GATEWAY_PORT18080 and matching APP_ORIGIN; shared default8080. Credentials remain private in .env, never copied into logs/chat. New workspace grants in seed code do not automatically modify existing stored roles.

Portable Node24.21.0/pnpm10.33.0 in ignored .local; host defaults unchanged. Run `. ./scripts/dev-shell.ps1` in new PowerShell terminals. [Runbook](../development/local.md). Before any future schema20 upgrade of another existing database, stop writers and back up before cutoff capture. This local empty-chat upgrade does not substitute nonempty upgrade regression or full SRC-037 release gates.

## Next action

Read SRC-034 contract/data/module/service acceptance, claim SRC-034 (dependency SRC-033 DONE), then implement durable snooze/activity/source notifications. Continue SRC-035 Contact context, SRC-036 UI and SRC-037 release sequentially. Do not restart completed SRC-032/033 or report the sample UI complete. Earlier screenshot request produced no capture; no new browser acceptance claimed.

M3 continuation remains pending after UX priority: configured Pages/signed capture via CRM Contact resolution to Chat, actual provider ingestion/provisioning and release gates. Live Meta credentials not initialized; independent Connector not started. Baseline Channels remains source owner until extraction tasks DONE. No task/schedule started automatically.
