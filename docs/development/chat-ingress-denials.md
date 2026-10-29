# Native ingress denials — T05 candidate

CHG-20261021-03, Codex2026-10-21; SRC-109/T05 IN_PROGRESS. [Exact contract](../contracts/chat-ingress-denials.md), [evidence](../tracking/details/SRC-109.md). Extends organic/referral processing; no main route or automatic worker.

Three owner ingress-verdict routes are read-only and Chat-workload-only. CRM returns a typed canonical binding verdict without returning subject; Channels returns a typed connection verdict and current actor/team when valid; Identity verifies that service actor has integration.deliver/all and a valid Chat team under its open policy gate. Request/reply tenant, operation and request ID use existing native HTTP transport, and the result also binds the input digest. Infrastructure errors are not verdicts.

Chat ingress-denial.ts validates diagnosis; ingress.ts captures the processing command, recovers it to aborted, then uses received-state/version CAS with a Contact mutex to write failed and one minimized audit atomically. It rethrows the original denial, preserving current authorization for receipt access. A successful/failed receipt is never overwritten, a failed receipt never rearms automatically, and a committed-but-unsettled command is not converted to failed. Unknown cleanup/diagnostic/audit commit retains retryable state. Explicit adapters are required; without them prior fail-closed behavior remains.

No DDL or grant change. Existing inbox codes CONTACT_BINDING_STALE/REVOKED and audit_entry.reason are used. The reason contains only owner/code/input/verdict/intake digests, original version and optional aborted command reference. No subject, transcript, credentials or successful Message/session effects. Contact archive and connection disable setup in tests is explicit operator fixture work, not production operations.

Run with pinned toolchain:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs test:chat:ingress:denials
```

The command builds before running node scripts/identity-owner-native-test.mjs --focus="Chat ingress" --with-processor --with-referral --with-denials. Reuse already provisioned referral/ingress retained test fixtures; do not reset or print .local credentials. This run needs no new --provision. Full suite includes8accept/read,6organic,7referral and7denial groups. The denial cases create exactly2successful Messages for retry/concurrent-success checks; other new received receipts either fail or remain retryable as asserted. Existing organic/referral groups create20Messages combined. Native timeout stays2seconds; failures/exact-input retries remain logged.

Scenarios cover canonical mismatch/concurrent diagnosis, archived Contact, disabled connection, role revoke before/after referral stage, cleanup outage, metadata/transport/closing-gate/malformed verdict, successful processor beating stale denial, wrong receipt scope, audit rollback and lost response replay. Current authorization still gates read/accept, so an operator must restore legitimate configuration before retrieving a failed receipt through those candidate endpoints. No manual rearm API is delivered.

Next T05 work: mount connection-disable compatibility at Connector, then own-schema D2 send/workspace/notes/hydration/capability lineage. T06 remains gated. Actual test results live in SRC-109 and denials-* artifacts.
