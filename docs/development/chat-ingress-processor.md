# Native organic ingress processor — T05

Continuation CHG-20261021-02: [referral candidate](chat-referral-saga.md) adds Channels-owned evidence/finalization and paid session links. The no-referral scope below records the prior verified slice; the new runbook/evidence records its extension.

Codex2026-10-21, CHG-20261021-01, SRC-109/T05 IN_PROGRESS. [Contract/scope](../contracts/chat-ingress-processor.md), [evidence](../tracking/details/SRC-109.md#t05--native-organic-processor-partial). This candidate processes retained text/rich inbox items without referral into real Message/session effects on the separate Chat database. It is explicitly caller-driven; main traffic, automatic worker and T06 remain unmounted. D3 stays2/6/local2/17.

ChatIngress.process accepts the existing ingress-read DTO as an internal application input; no new public exchange operation is added. It loads the stored body, obtains current CRM Contact/mapping, Channels connection and CRM conversation metadata, reserves all four references, then admits through native Identity integration.deliver/all. Each replay uses fresh authority. The command proof contains receipt/intake digests and metadata pins, not the transcript. Accept always returns received; read reports the actual processed/failed state.

services/chat/src/ingress-message.ts owns the local lifecycle transaction. It compares exact provider-message content/time/identity before dedup success, preserves rich JSON and baseline text projection, creates or reuses the thread, selects active/late/closed session boundaries, writes process/progress/opened contribution, membership, unread/waiting/activity/snooze and audit/outbox/dataset heads. Registry events keep current owner/team and cancellation/pause watermarks. Existing assigned threads require a matching retained Chat registry event to prove owner kind; missing imported projections/events fail closed. No Identity/CRM/Channels SQL or imported backend domain implementation is used by Chat.

Payload conflict is detected before any lifecycle mutation and atomically marks only the inbox failed/MESSAGE_PAYLOAD_CONFLICT. Transaction faults leave received. Denied current owner/service admission also leaves received in this slice; a separate durable terminal-denial policy remains part of full ingress completion. Referral processing returns DEPENDENCY_UNAVAILABLE and leaves received until Channels owns durable touchpoint creation/binding. No paid→organic fallback, synthetic source reference, active-ad split or fabricated processed receipt is permitted.

Run with the pinned local toolchain:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs test:chat:ingress:processor
```

The first operator test invocation used node scripts/identity-owner-native-test.mjs --focus="Chat ingress" --with-processor --provision. It added only SELECT(property_definition) to the existing CRM reference test account; Chat schema3/63tables/45FK and001–003 hashes remained unchanged. --provision is not required for subsequent runs. Native runtime credentials retain own-table grants; fixture operator uses existing synthetic tenant/Contact/connection/actor and a retained per-run identity/message namespace. No reset, migration rewrite, main credential or volume change.

The suite includes eight accept/read groups and six native processor groups. It asserts original/current receipt behavior, nine distinct real messages per successful run, exact dedup/concurrency, rich content conflict, late/equal-close/reopen, rollback after lifecycle inserts, lost terminal ACK/recovery, current revoke, metadata changes, owner preservation, snooze and missing prepared state. Close and assigned-owner setup are explicitly Chat-local/operator fixtures; full native Human assignment/close composition is a separate regression. Every result is retained; final cleanup uses native proof recovery and verifies no prepared ingress command or admitted Identity receipt remains. Transport deadline retries reuse the exact input, at most three attempts, and are logged; no deadline extension or retry of intentional domain errors.

Next: implement the Channels-owned touchpoint evidence/binding saga and compose referral processing. Durable terminal-denial classification, connection disable compatibility, own-schema D2 send, workspace/notes, remaining hydration and capability lineage also remain in T05. Do not mark T05 DONE or start T06.
