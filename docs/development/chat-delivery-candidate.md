# Chat delivery and recovery candidate

SRC-109/T06, CHG-20261023-20/21, Codex2026-10-23. Implements the [event delivery contract](../contracts/chat-event-delivery.md) and [command recovery contract](../contracts/chat-command-recovery.md). T06 remains IN_PROGRESS; this is candidate boundary evidence, not an independent running Chat service. D3 remains2/6, local2/14. Follow the [owner scope](../governance/service-delivery-scope.md).

Chat writers now stage immutable per-subscription deliveries in the same transaction as their outbox. The relay has tenant selection, ordered claims, status-before-retry, fenced leases, backoff/quarantine and authenticated read/replay. Missing downstream endpoints retain backlog without blocking the producer mutation. Six local notification handlers and two Activity consumers share a route map. Activity recovery replays missing predecessors and retries source binding without duplicate effects. Frozen-epoch catch-up preserves old identity/sequence and refuses out-of-order history.

Command recovery has a bounded durable scheduler and74 explicit operation registrations. It aborts interrupted local-only commands or invokes the existing ingress/note/outcome reconciliation; known Routing/reference/Identity receipts are settled with original IDs. Unknown operations stay pending with an unsupported count. It never repeats the original Human request under a new actor. Snooze and outbound scanners require tenant lists. No migration or public API change.

## Verification

Windows PowerShell, project Node24.21.0/pnpm10.33.0; own Chat MySQL `test_crm_chat_owner` schema4, retained native Identity/CRM/Workflow and Connector fixtures. Use `. ./scripts/dev-shell.ps1`. Run native suites sequentially: they share retained fixtures. Logs below are under `artifacts/chat-extraction/t06-delivery/`.

| Command / scope | Result | Evidence |
|---|---|---|
| `pnpm build:chat` | PASS | `chat-build-7.log` |
| `node scripts/chat-event-delivery-native-test.mjs` |9 native groups PASS; own MySQL + actual authenticated TLS | `native-3.log`, `native.json` |
| `node scripts/identity-owner-native-test.mjs --focus="Chat activity" --with-notifications` |18 groups PASS:10 feed,5 consumer,3 recovery | `activity-recovery-native.log` |
| `node scripts/chat-command-recovery-native-test.mjs` |5 native scheduler groups PASS; synthetic callback explicitly isolated | `command-recovery-native.log`, `command-recovery-native.json` |
| `node scripts/identity-owner-native-test.mjs --focus="Chat recovery"` |4 native groups PASS, including actual Identity settlement and workload revocation | `command-reconciliation-native-2.log` |
| `node scripts/identity-owner-native-test.mjs --focus="Chat workspace"` |11 groups PASS, including tenant-scoped deadline scanner | `workspace-scanner-native.log` |
| `node scripts/identity-owner-native-test.mjs --focus="Chat outbound"` |12 groups PASS, tenant-scoped discovery plus native Identity/Connector regression | `outbound-scanner-native.log` |
| `node scripts/identity-owner-native-test.mjs --focus="Chat ingress" --with-processor --with-referral --with-denials` |27 groups PASS | `ingress-regression-2.log` |
| `node scripts/chat-owner-native-test.mjs` |5 groups PASS | `owner-regression.log` |
| `pnpm lint` / `pnpm architecture:chat` |PASS1061JS/TS /273edges,0added | `lint-final.log`, `boundary.log` |
| `node scripts/generate-chat-owner-contracts.mjs --check` |PASS237operations,668schemas | `contracts-final-2.log` |
| `pnpm docs:check` |PASS499Markdown/4420links/109acyclic tasks | `docs.log` |
| `node scripts/chat-runtime-inventory.mjs` |77 unique candidate operations /81 factory registrations;23 catalog entries unresolved/deferred/removed | `runtime-inventory.json`, `runtime-inventory.log` |

The event test receiver is a durable synthetic Workflow receipt receiver for a dedicated registered synthetic tenant; it does not certify Workflow business processing or ACK real main subscriptions. Activity replay uses a contract fixture over authenticated local owner HTTP; its original log labels one group HTTPS, but that harness run did **not** use `--tls`. The separate event suite did use TLS. Native command recovery settlement uses the actual Identity owner. Scheduler callback tests do not substitute for composed runtime acceptance of all74 handlers.

Failed attempts are retained: `chat-build.log` (generic type inference, repaired), `ingress-regression.log` (stale three-delivery assertion, updated for real fanout), `command-reconciliation-native.log` (new test focus missing from harness allowlist, repaired), `contracts-final.log` (incorrect script alias; the actual generator check passed in `contracts-final-2.log`). Do not cite the old harness success JSON after a failed run; use the identified final logs. The new source passes builds, but main mount, image, restart, cutover and post-write rollback have not run.

## Remaining delivery gates

The [writer inventory](../architecture/chat-writer-cutover.md) records baseline routes, jobs, subscriptions and operator entrypoints that must be routed/fenced. Its source scan is conservative; it is not a grants audit or proof those writers are disabled.

External Conversation/message reads now have [T06 boundary acceptance](../quality/t06-chat-boundary-acceptance.md). Reporting, Workflow and Sales consumer completion remains separate.

Next: T07 supplies the independent Chat API/worker/image; T08 verifies actual composition and T09 applies scoped local single-writer cutover. Existing user authorization remains valid.
