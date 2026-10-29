# Native ingress acceptance candidate — T05

Current2026-10-21: [organic processor extension](chat-ingress-processor.md) is now implemented and verified separately. The accept/read-only description below retains its original scope; explicit process invocation supports non-referral Message/session effects, with no main worker/mount.

SRC-109/T05, Codex2026-10-20, CHG-20261020-02. [Contract](../contracts/chat-ingress-candidate.md), [table templates](../data/chat-ingress-storage.md), [evidence](../tracking/details/SRC-109.md#t05--native-ingress-acceptance-candidate-partial). T04 dependency DONE; T05 remains IN_PROGRESS. This candidate accepts and reads durable received receipts. It has no message/session processor or persistent runtime mount. D3 remains2/6; packages/local2/17.

## Boundary and handlers

| Surface | Owning implementation | Current behavior |
|---|---|---|
| POST /internal/v1/chat-exchange/ingress-accept | services/chat/src/ingress.ts, ChatIngress.accept | Exact normalized inbox plus event/source/request dedup in one Chat transaction; returns received |
| POST /internal/v1/chat-exchange/ingress-read | Same, ChatIngress.read | Fresh business admission/reference holds and exact binding; returns current minimized receipt |
| POST /internal/v1/owners/connector/connection-ingress-read | Channels owner-reference.ts | Current active mock connection with configured service actor/team/channel; no credentials |
| Identity admit/settle | Existing owner-admission.ts with owner-authority.ts ingress branch | Native requireService integration.deliver/all and active team, under existing tenant policy gate/drain |
| Explicit interrupted command recovery | ChatIngress.recover | Recover uncertain admission, abort prepared command, release references from terminal proof, settle known admission |

Existing owner command dependencies now record Contact, mapping and connection receipts separately. Independent reservations/releases run concurrently and all outcomes are awaited before proceeding. HTTP retains2second deadlines and signed current workload admission; no bypass, larger timeout or cached business authority. A lost ACK can leave a durable command requiring explicit recovery; no automatic worker is enabled. Retry the same exchange request after recovery. Original received ACK is stable even if a future processor changes the current receipt state.

The request ledger is scoped by tenant+connection+operation+request ID; accept/read keys cannot collide across operations. Same key with changed canonical body conflicts. Source aliases and requests are append-only; runtime uses shared locking reads after insert, without granting UPDATE on either table. Contact mutex and inbox require SELECT/INSERT/UPDATE. Runtime has no DDL/DELETE or remote schema access.

## Retained native verification

Use Node24.21.0/pnpm10.33.0 from the existing local toolchain:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs test:chat:ingress:native
```

The explicit first-time operator step is node scripts/identity-owner-native-test.mjs --focus="Chat ingress" --provision, after affected builds. It applies forward003 only to retained test_crm_chat_owner and grants only the four reviewed own tables. It never resets data. The first native application deliberately interrupted after the second table, recorded a failed journal, resumed and verified applied/no-op. Later runs validate the applied checksum and table metadata. Old001–002 files, checksums and journal rows remain unchanged. Main42 and frozen T03 databases are untouched. The T03 runner deliberately rejects lineage3; use the explicit ingress migration adapter for this candidate.

Private .local/chat-ownership/ingress-fixture.json retains synthetic actor/role IDs; existing reference fixture holds owner credentials. Never copy these files into logs. Tests temporarily configure the synthetic connection's actor/credential hash together, then restore both; role changes use actual native Identity barriers. Synthetic Contact guard setup tests the Chat fence only, not an implemented CRM archive writer. Test listeners and pools close after each run.

Evidence covers duplicate/concurrent accepts, normalized dates, atomic alias conflicts, receipt request conflicts, current binding/tenant/role checks, owner outage, lost settle ACK, revoke before commit, Contact closing gate, minimized proofs, forward migration resume, runtime grants, CHECK/FK constraints and natural-key EXPLAIN. Message count must remain unchanged, and explicit recovery must leave no prepared ingress command or admitted Identity receipt for this fixture. Reference model tests for processing are not evidence of a native processor.

## Remaining scope

Next implement the real inbox processor with exact message dedup and atomic thread/session/workspace/process/contribution/audit/outbox effects, including Channels-owned attribution evidence. Do not mark a received inbox processed without those effects. CRM archive/connection-disable writer mounting, D2 own-schema send, workspace/notes, remaining session/detail/queue hydration and capability lineage also remain within T05. T06 and main cutover stay gated.
