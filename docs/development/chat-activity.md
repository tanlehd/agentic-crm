# SRC-034 — Snooze and activity operations

Additive backend slice, schema22 after schema21. Historical migrations and legacy Conversation DTOs are unchanged. Status and verification evidence: [SRC-034](../tracking/details/SRC-034.md). UI integration and full release remain SRC-036/037.

## Upgrade

Back up the target local database and quiesce writers before upgrading. Run the existing migration/grant entrypoints from [local runbook](local.md); migration CLI now runs both workspace and activity backfills. Start the current forward-compatible API/worker only after migrations/grants complete. Do not infer that the development database was upgraded from source-task completion.

Activity backfill takes the Conversation record lock shared by live writes. It reads batches of200 Messages, CRM note references and ownership history through application ports. Each Conversation commits its counter, provenance rows and `backfilled` marker together; interruption rolls that Conversation back and rerun deduplicates completed work. Source records and old journals remain untouched. No historical automation events are fabricated. `occurred_at` retains source time while `recorded_at` and the internal sequence reflect projection order.

## Deadline worker and monitoring

The existing worker polls the MySQL due index before delivery dispatch. It locks the Conversation and compares the scanned snooze revision with current state. Reschedule fences old work; a committed wake is not repeated after process restart. Redis is not part of this deadline path. Queue reads use the effective deadline and perform no writes, so a delayed worker cannot keep an expired conversation hidden.

Snooze never pauses AI/Workflow, changes owner, cancels a queued reply or marks a Human's messages read. Unique inbound, assignment/takeover and close clear it in the existing business transaction. Duplicate inbound exits before these hooks. Snooze reason remains in the protected resource; events/projections/audit carry no reason text.

Activity projections hydrate current message status/content and CRM note body. Automation items require current run read authorization through the source port. A missing grant omits the item; source failure returns partial metadata. Cursors encrypt internal positions and bind viewer, tenant, Conversation and current authorization for five minutes. Clients must refresh partial sections after recovery and continue status polling for visible messages.

## Rollout and rollback

`chat_workspace_rollout` supports tenant overrides keyed `snooze_v1` and `activity_v1`, with state `disabled`, `backfilling` or `ready`. Without an override, installed implementation readiness applies; activity capabilities additionally require completed backfill. This does not grant permissions. Operators may set overrides through the migration/operator connection; no public configuration bypass is added.

Flags gate reads/new commands, while writer hooks, source notifications and deadline draining remain active. To roll back UI/read paths, disable their flags and retain data. To replace writers, first quiesce business writers, use the current implementation to wake outstanding snoozes with audit and verify the due set is empty. Preserve forward-compatible counters/hooks; never drop tables or downgrade to a writer that ignores active schedules/read state. Full rollback drill is SRC-037.

Source notifications use producer outbox and consumer inbox/provenance dedup. Out-of-order events append historical activity without changing source lifecycle. CRM, Workflow and Chatflow remain source authorities; application ports are local monolith composition, to be replaced with versioned APIs/events at extraction.
