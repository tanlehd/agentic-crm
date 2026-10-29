# Native CRM metadata and Chat custom values — T04

**T04 DONE — 2026-10-19, CHG-20261019-25/26:** Human candidate registry/ownership, CRM custom values và public Routing configuration đã hoàn tất; final25nhóm native HTTP,5Chat,6Routing và12TLS tùy chọn PASS. TLS local đã được thay bằng HTTP có service keys/current Identity; D2 readiness và gửi Human synthetic đạt. AI native deferred. D3 vẫn2/6, local2/17; bước tiếp theo T05, chưa claim. [Current acceptance](../quality/t04-human-acceptance.md). The implementation-stage notes below are historical; their pending T04 items are superseded by this acceptance. Main mounting/consumer integration remains downstream.

CHG-20261019-24, 2026-10-19. SRC-109/T04 remains IN_PROGRESS under [Human-first scope](../planning/human-first-omni-crm.md). Candidate only; main generic record routes/metadata writers remain unchanged.

## Implemented boundary

CRM [NativeCrmOwnerMetadata](../../services/core-baseline/src/modules/crm/owner-metadata.ts) reads only CRM definitions and owns T02 reference gates/reservations. Private metadata-schema-read returns canonical tenant/object ID/key, schema revision, at most200typed properties and digest. No record values or user permission claims. Native workload registry/TLS authorizes the Chat caller per request; existing public descriptor remains unchanged.

[ChatCustomValues](../../services/chat/src/custom-values.ts) stores the immutable snapshot and binding.metadata. CRM reserves the exact live schema after authenticated Chat proof. A held reservation survives additive publication; unreserved stale snapshots reject. Internal CRM close/drain blocks new holds and aborts pending Chat commands over TLS, waiting for terminal proof. Outage retains the barrier. cancelClose cancels that retirement intent; it is not a deployed archive API. Main destructive metadata writer composition remains pending.

Native Identity checks current Human read/update and field rights. One Chat-only transaction updates custom JSON, typed indexes, record/registry version, audit and all five dataset heads. Owner/control revisions remain unchanged. Required/null/unknown/scalar rules follow [CRM records](../contracts/crm-records.md); decimal strings/safe integer precision preserved. Index failure rolls back the entire effect. No RPC/foreign SQL under Chat locks.

Private CRM-to-Chat custom-values-patch returns immutable registry envelope/custom_values after a fresh Identity read admission and Chat ACL/version CAS. Its fields object is empty: full generic Conversation hydration/public routing remains T05 composition. Denied stored fields deny delivery, including retries; committed command is not a read grant. Concurrent requests retain original delegation/schema and one effect. RPC deadline stays2seconds; native same-request retries are logged.

## Storage and operation

Only native_identity_test adds reviewed T02 crm_reference_gate/reservation and their local tenant/resource FK. DDL comes from immutable owner-additions-v1.sql; SHA256 pin at .local/chat-ownership/crm-metadata-schema.json. No numbered baseline migration or historical DDL changed. CRM runtime has SELECT on object_type/property_definition and SELECT/INSERT/UPDATE on its two reference tables. No Identity/Chat record access or metadata mutation grant. Chat uses existing test_crm_chat_owner schema2 and own grants. Main42 and frozen T03 stores unchanged.

Private reusable fixture/credentials: .local/chat-ownership/crm-metadata-fixture.json; never print contents. Tests retain synthetic data; a separate rollback-test credential lacks index INSERT, without revoking normal runtime privileges. Earlier failed artifacts remain. No reset/volume deletion or persistent daemon.

Windows PowerShell, pinned Node24.21.0/pnpm10.33.0; actual scripts:

```powershell
node scripts/generate-chat-owner-contracts.mjs --check
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat custom"
node --test scripts/tests/chat-owner-contract.test.mjs scripts/tests/owner-workload-fixture.test.mjs
```

First explicit fixture provision adds --provision to the native command. It applies only reviewed retained-test additions/workload CHECK expansion. Tests close temporary listeners/pools.

## Evidence and remaining work

Eight final custom groups PASS: schema/least privilege, typed write/index/replay, invalid/field/stale negatives, publication pinning, native role-revoke race, private HTTP concurrency/fresh result rights, retirement/outage/late reservation, index rollback/lost settlement. Evidence: artifacts/chat-extraction/t04/custom-native-final.log and identity-focused-Chat-custom.json. Complete Identity20groups passed before the final private receipt adapter (custom-composed-identity.log); it is not a full final-source rerun. Final affected assignment/history and Chat command regressions are recorded in [SRC-109](../tracking/details/SRC-109.md).

Resolved failures: metadata lookup initially used a user-read envelope, corrected to workload-only reference metadata; concurrent private calls hit the2second RPC deadline, then same-command retry verified completion without relaxing timeouts/identity. Initial TypeScript missing exports/unknown scalar types corrected; subsequent builds PASS. No permission/rate-limit bypass.

Remaining T04: public Routing configuration/current authority/writer composition and full Human candidate closure. Contact/mapping reservation kinds, full public record hydration and main metadata writer mounting are not claimed by this metadata-only implementation. Follow T05–T09 dependencies before main activation.
