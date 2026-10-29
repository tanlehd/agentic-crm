# T06 — Chat boundary acceptance

SRC-109/T06 DONE, Codex 2026-10-25. D3-03 accepted; D3 3/6, local 2/14. This accepts owner implementations and boundary evidence. Independent process/image, composed runtime parity and main single-writer cutover remain T07/T08/T09.

## Evidence by responsibility

| Chat responsibility | Implementation and evidence |
|---|---|
| Authorization, ownership and registry | [T04](t04-human-acceptance.md): current Identity admission, revoke/drain, Chat CAS/proof, retained metadata/registry and tenant negatives |
| Persisted conversation/session/message, attribution, lifecycle and workspace | [T05](t05-human-acceptance.md), [workspace source](../development/chat-workspace-source.md): ingress late/duplicate/session behavior, Human send, history, close, notes/needs/source and workspace |
| Existing Routing boundary | [directory](../development/chat-assignment-directory-candidate.md), [reconciliation](../development/chat-routing-reconciliation-candidate.md), [dispatch](../development/chat-routing-dispatch-candidate.md), [reply facts](../development/chat-routing-facts-candidate.md): current Identity policy, Chat final owner decision and durable receipt/recovery |
| Durable producer and eight local consumers | [Delivery acceptance](../development/chat-delivery-candidate.md): transactional subscription staging, immutable IDs, status-before-retry, replay/gap/quarantine and native local notification/activity recovery; downstream business processing is not accepted here |
| Deadline and command recovery | Same delivery evidence: tenant-bounded snooze/outbound and command scheduler; new external read operations use existing abort/Identity settlement recovery, no transcript replay |
| Four existing external reads | [Contract](../contracts/chat-external-reads.md); `services/chat/src/external-reads.ts`, Identity app admission and Gateway forwarding; 11 native groups below |
| Baseline writer isolation plan | [Exact entrypoint disposition](../architecture/chat-writer-cutover.md), current inventory 68 SQL candidate files / 39 inbound legacy imports. Activation and actual bidirectional grant/fence verification belong to T09; source inventory does not claim writers are already disabled |

No open Chat catalog group remains in the reviewed candidate factories: 84 operations / 88 registrations. Seventeen unmounted entries have explicit dispositions: 10 other-owner (9 Reporting, 1 Workflow), 3 AI deferred, 2 archive removed, 1 superseded, 1 unnecessary Sales outcome mirror. Eighty command recovery registrations. These counts describe source coverage, not live routes or feature percentages.

## External read verification

Windows PowerShell, Node 24.21.0 / pnpm 10.33.0; retained synthetic Identity `native_identity_test` and Chat `test_crm_chat_owner` schema4. Native app admission and actual authenticated owner HTTP; the final group also uses the real public Nest controller on an ephemeral localhost listener. No main routing change, DDL, reset or deployment.

`node scripts/identity-owner-native-test.mjs '--focus=Chat external'`: **11 groups PASS**, `artifacts/chat-extraction/external-20261025/native-focused-4.log`:

- Four list/detail reads, positive selected-field projection and service forwarding.
- Original HMAC cursor, microsecond ties, tamper and parent mismatch.
- Independent Conversation/message team grants and record shares.
- Metadata-only output, missing scope and old app-version cursor rejection.
- Archived/wrong parent, foreign tenant, invalid query and unauthorized actor.
- Quota charged once; token and response body absent from Chat journal.
- Lost prepare/admit ACK dedup and token rotation draining held admission.
- Identity outage, app disable and concurrent read/no response replay.
- Expired token/admission, wrong workload and cross-tenant prepare denial.
- Rotation after policy acquisition fences the delayed read.
- Four actual public GET paths, 401/404/no-store, redaction and >256KiB message page within existing message constraints.

Contracts/Chat/backend/transport builds PASS. Forty-two focused contract/scope/boundary tests PASS (`focused-contracts.log`); deterministic generator 240 operations / 675 schemas (`contracts-drift.log`); lint1073 (`lint.log`); architecture guard no new edges (`boundary.log`); inventory (`inventory.log`). Docs check is recorded in the execution log after synchronization.

Failed attempts retained: `native-focused-1.log` omitted required inbound provider ID; `native-focused-3.log` used an overlength synthetic message. Both fixture errors were repaired without altering constraints or migrations. The earlier `native-first.log` accidentally ran the existing general suite due to a malformed focus argument; it is not external read acceptance.

External read policy expiry now returns explicit REVOKED; message page transport uses the existing bounded history response limit. Public DTO/token/cursor behavior remains compatible. The candidate is not mounted in the main ExternalRuntime until the scoped cutover composition is ready.

## Handoff

T07 builds Chat-only composition/API/worker/image using current versioned HTTP contracts and restricted own DB credentials. Preserve retained cursor keys, writer epochs and all pending receipts. T08 accepts actual runtime behavior; T09 fences legacy access and switches only necessary local units. Workflow, Sales and Reporting consumer completion/deployment remains outside Chat gates.
