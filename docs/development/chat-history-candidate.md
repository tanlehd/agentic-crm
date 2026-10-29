# Native Chat history candidate

SRC-109/T05 IN_PROGRESS, Codex2026-10-19, CHG-20261019-27. [Contract](../contracts/chat-history-candidate.md). This implements five public read routes against Chat's own database; it is not the complete T05 or a main cutover.

| Public route | Handler / owning dependency |
|---|---|
| GET /api/v1/conversations/{id}/messages | ChatHistory timeline; native Identity admission and legacy cursor subject |
| GET /api/v1/conversations/{id}/message-envelopes | Same timeline; Channels history-platform-read over owner HTTP |
| GET /api/v1/conversations/{id}/message-envelopes-v3 | Chat-local message_content and same-conversation reply resolution; Channels platform |
| GET /api/v1/conversations/{id}/outbound-intents/{intentId} | Chat-local original intent/message; remote_unknown exposed as unknown, no sender |
| GET /api/v1/conversations/{id}/acquisition-sessions | Chat-local sessions; current mandatory source-field rights and uint64 sequence pagination |

The candidate gateway at services/core-baseline/src/gateway/chat-history-bff.ts validates native session/tenant/query and sends a delegation reference to Chat. No cookie/session verifier crosses the owner boundary. services/chat/src/history.ts owns reads and short local transactions; Identity admission/recovery and Channels platform calls happen outside Chat SQL. An explicit listener factory is used in native tests; no main module registration or persistent listener is created by import.

Identity's admission-cursor-subject resolves only a currently admitted Human timeline command, using its stored native account. The cursor key must be the retained legacy key; synthetic acceptance has its own persistent key under .local/chat-ownership/history-fixture.json. Never copy that test key into main. Text/read denial omits text, reply and attachment; source-field denial rejects acquisition reads. Every retry obtains fresh admission and local ACL/version CAS. The ledger stores minimized terminal proof, not returned messages.

Channels' candidate endpoint stays in its baseline owner and receives a SELECT-only channel_connection credential. Chat cannot read that table. Historical disabled connections remain readable; outage returns503. Text v1 does not require a platform lookup. All timeline representations retain the existing IDs, received_at/id cursor ordering and shared legacy cursor binding. Only their response budget is8MiB; all request bodies and other owner response limits stay unchanged.

Run with pinned Node24/pnpm from the workspace:

```powershell
$env:PATH = "$PWD\.local\node-v24.21.0-win-x64;$env:PATH"
node .local/tooling/node_modules/pnpm/bin/pnpm.cjs test:chat:history:native
```

Prerequisites are the retained T04 test fixtures: native_identity_test and test_crm_chat_owner schema2, reviewed owner tables/grants, .local/native-auth-test.env and .local/chat-ownership. The test only creates/reuses a dedicated synthetic Channels SELECT user and retained rows. No reset, migration, main credentials or real provider call. Temporary listeners/pools close on completion. Test results are metadata only under artifacts/chat-extraction/t05; keep private fixture files local.

Verified: six native HTTP/MySQL groups,29focused contract/HTTP cases,12optional TLS regression groups, affected package builds and generated kit check. See [exact commands and evidence](../tracking/details/SRC-109.md#t05--native-history-candidate-partial). Full browser/D3 parity NOT_RUN. Native history read from retained candidate data is not evidence of new ingress, dispatch or unknown-send reconciliation execution.

Remaining T05: Core Contact/identity/liveness and channel attribution binding; ingress/dedup/session writers; D2 intent/job/claim/result/coordinator on own schema; generic detail/queue/Page-filter/transition responses; unread/coverage, inbox/share, tags/snippets/snooze/activity and Core note receipt reconciliation; classification/process/progress/need/custom-value hydration and capability-lineage checks. T06 consumers and T07–T09 runtime/parity/cutover remain gated. Next action: implement canonical Contact/connection reference admission and native ingress on the existing T01/T02 contracts.
