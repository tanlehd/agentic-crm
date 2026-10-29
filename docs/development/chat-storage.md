# Chat retained storage operator — T03

SRC-109/T03, Codex2026-10-19. [Tracker](../tracking/tasks.md), [evidence](../tracking/details/SRC-109.md#t03--retained-storage-complete), [normative design](../architecture/chat-data-migration.md). Only synthetic retained databases are eligible. Owner APIs/current authorization belong to T04–T06; main activation and composed downstream recovery remain T09.

## Final retained candidate

Explicit `CHAT_STORAGE_PROFILE=final` selects source `test_chat_source_final` baseline42/127tables/2,197rows and targets `test_crm_chat_final` / `test_crm_chat_final_restore`. Each target has Chat lineage `chat-owner-v1`, journal2/59tables/43localFKs and2,136selected rows including2,008messages. Snapshot `41fc1369-26ad-4a7d-b0d8-0d950dbc61f0`, UTC2026-10-19 01:24:58.988271, watermark `GTID_UNAVAILABLE_WRITERS_FENCED`; source writer locked/drained, target runs validated, gates shadow/epoch1.

Private files live under `.local/chat-extraction/final`: credentials, keys, fixture, encrypted exports/plans, signed exceptions and recovery evidence. Never print them. API/worker have own-table DML only; no source/main/restore SQL, DDL, journal or gate mutation. Exporter is read-only; migrator owns only the two targets. Original rehearsal schemas `test_chat_source`, `test_crm_chat`, `test_crm_chat_restore`, their2,066selected rows and old evidence remain intact under the default profile. Main remains42.

## Existing commands

Use pinned Node24.21.0/pnpm10.33.0 under `.local` with pinned Node on PATH. Initial provisioning was executed once:

```powershell
$env:CHAT_STORAGE_PROFILE='final'
pnpm --filter @agentic-crm/chat build
pnpm chat:storage provision
node scripts/chat-source-fixture.mjs
node scripts/chat-final-fixture.mjs
pnpm chat:storage snapshot
node scripts/chat-final-approvals.mjs
pnpm chat:storage migrate
pnpm chat:storage copy
pnpm chat:storage reconcile
pnpm chat:storage grants
```

Fixture scripts explicitly write/unlock only their synthetic source; do not rerun after export merely to inspect status. Final enrichment creates native actors, terminal pinned Workflow, note backlog gaps, milestones and queued/unknown D2 bindings. It corrects the basic fixture's untyped Human actor field before export; old rehearsals stay untouched. The approval script creates six exact **test-only** Ed25519 reviewer decisions, not human approvals; these keys cannot authorize main migration.

For existing data use `pnpm chat:storage status`, `copy`, `reconcile`, `recovery-check` or `recovery-check --restore` with the same explicit profile. `migrate` installs001; exact reconciliation installs002 and marks runs validated without activating writers. `snapshot` reuses the immutable complete export. Incomplete exports are retained and rejected; no snapshot resumes across lost source connections.

## Integrity, imports and references

AES-GCM chunks bind run/file identity; HMAC manifests bind source instance/schema/journal/metadata/time/tenants. Lossless JSON, uint64, DECIMAL, DATETIME(6), Unicode, NULL and generated columns survive native readback. Keyset ordering uses physical typed columns, not CAST aliases.

`chat-plan.mjs` binds every selected row/empty table, dictionary, disposition, encrypted owner mapping, code/build/config/Node, source and destination. Ordinary copy/reconcile reject drift. Explicit `adopt-plan` / `adopt-plan --restore` accepts only identical rows/mappings/dictionary/dispositions with shadow gates and copying/validated runs, after native candidate/checkpoint/journal validation against prior authenticated evidence. Immutable adoption intent precedes binding/version update. Changed derived rows require a separate candidate, never reset or adoption.

Final code-only adoption added resource-team/outbound-message and recovery journal/PK checks, preserving2,136rows/checkpoints in each target. Final bindings are destination `08d21858b75470585be5257d7a8f0bfbe6bdc0928d27f76fa57f9d6c84d6a4ed`, restore `e007874795364b088d5105446590e2c172db2ec13e68cb332ad29e25e9f50cae`. Final acceptance/preservation follows this adoption.

`chat-events.mjs` derives every registered subscription, including missing inboxes, with per-producer/tenant/consumer/aggregate sequences and contiguous ACK. Completed receipt3 cannot hide missing receipt2. Remote outboxes stay remote; encrypted mappings carry owner stream/delivery imports. Four minimized registry seeds initialize three control subscribers. Workflow selection/run/version IDs are preserved without reenrollment; runtime owner application remains T06.

`chat-references.mjs` checks source-backed actor/account/team, reply/membership/milestone, contribution/Sales/follow-up and D2 intent/attempt/grant/claim/message/JSON bindings. Unknown sends retain a same-attempt reconciliation-only route, never a resend. Active `agent_execution`, Chatflow or Workflow work without trustworthy owner pins returns NO_GO; drain or prove it at its owner before export. New generation counters never prove historical work. Terminal fixture graphs are preserved, not executed.

Unknown receipts/events need exact row-hash/source-site/owner-evidence signatures. A known corrupted rule cannot use this exception. Immutable unknown audits require an archive decision. `readAuditArchive` reads authenticated encrypted snapshot rows, requires a current tenant/principal `audit.read` adapter on every bounded page and returns five minimized fields. It is an operator library, not a production authorization endpoint or baseline SQL fallback.

## Recovery and verification

`recovery-check` rechecks127source tables, source journal/columns/PKs, exact hashes and source fence, then target journal/candidate/shadow gates. Signed evidence proves storage prerequisites. Source switching remains `NO_GO_INCOMPLETE_EFFECT_PROOFS`: T03 cannot attest provider/downstream effects. The pure decision primitive allows pre-effect eligibility only with complete fenced no-effect proofs from every owner; effects, uncertainty or drift require freeze/forward recovery or NO_GO. It never changes routing, unlocks source, reverse-copies or manufactures remote attestations. T09 tests actual composed recovery.

```powershell
$env:CHAT_STORAGE_PROFILE='final'
$env:CHAT_STORAGE_EVIDENCE_DIR='artifacts/chat-extraction/t03/final'
node scripts/chat-storage-native-test.mjs
node scripts/chat-storage-final-test.mjs
```

11baseline native groups +9completion groups and89focused cases pass. Native fault flags record actual DDL interruption, pre-commit rollback, post-commit lost ACK and incomplete export on the final profile; later runs reuse data. Completion covers persisted backlog/control/D2, logical negatives, signatures/archive scope, tenant writes/jobs, EXPLAIN, frozen source/recovery and zero-insert replay of both targets. Durations are measured in reports; no production RTO/cardinality claim.

Evidence is retained in `artifacts/chat-extraction/t03/final`: native/acceptance/checks/source-manifest JSON, logs, EXPLAIN, adoption and failure artifacts. Baseline `t03Complete:false` describes that harness alone; completion acceptance and final checks are separate. Earlier binding evidence remains historical. No secrets/transcript/patient data in public artifacts. Temporary pools close; existing Docker MySQL/Redis/Reporting/D1/D2 containers remain running.
