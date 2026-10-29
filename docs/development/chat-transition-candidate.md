# Human lifecycle candidate evidence

SRC-109/T05, CHG-20261023-11. [Contract](../contracts/chat-transition-candidate.md). Candidate handlers only; no main mount, migration, restart or cutover.

Executed in Windows PowerShell, Node24.21.0/pnpm10.33.0:

```powershell
. ./scripts/dev-shell.ps1
pnpm --filter @agentic-crm/chat build
pnpm --filter @agentic-crm/backend build
pnpm --filter @agentic-crm/workload-transport build
node scripts/identity-owner-native-test.mjs '--focus=Chat detail' --with-transitions
node --test scripts/tests/chat-owner-contract.test.mjs scripts/tests/workload-http.test.mjs
node scripts/generate-contracts.mjs --check
```

`artifacts/chat-extraction/continuation-20261022/transition-native-final.log`: **20 groups PASS**, comprising12lifecycle and8detail regression groups. Actual native Identity/CRM/Channels/Routing HTTP and own Chat MySQL verify open↔pending, close, full field-safe response, original/new receipt replay, current rights, tenant/CAS denial, concurrent identical open/close commands, dependency outages, queued-only cancellation, session/need events, snooze/wait cleanup, confirmation recovery, native logout and public Origin/CSRF/ETag/bounds. The after-close logout fault pauses the in-process coordinator at its commit boundary; all owning peers remain real HTTP. It is not an OS-crash or deployed E2E test.

The close child stores the public receipt atomically with its existing close effects. The parent holds an independent current admission until response commit. A completed logout may leave close committed while forbidding response delivery; a fresh session replays only after current field checks. Public retry also reconciles committed close confirmation. Existing private close input has unchanged request/digest semantics when the optional internal response is absent.

Affected Chat/backend/transport builds PASS (`transition-chat-build-3.log`, `transition-backend-build.log`, `transition-transport-build.log`);30focused contract/HTTP cases PASS (`transition-focused.log`); generated225operations/630schemas unchanged (`transition-generated.log`). Native final follows successful builds. Failed attempts are retained: initial fixture lacked mandatory last_message_at; the first with-transitions run selected only8detail cases because labels did not match focus;2s generic deadline caused concurrent composition and injected-logout timeouts. The route now has a scoped10s deadline, with existing individual dependency budgets unchanged. Only the final20-case run counts as lifecycle acceptance.

Main baseline43, Chat4 and Connector main5 are unchanged. Synthetic fixtures are retained under `.local/chat-ownership/transition-fixture.json`; no secrets or message bodies are included in evidence. Main branch remains a dirty working tree based on21eaadd0e8d1e9163bfb7721390c2e6b385b1b42; no commit/push. Harness servers close on completion. Automatic workers, operational consumers and main single-writer cutover remain T06–T09.

Original T04 ownership regression also PASS: `node scripts/identity-owner-native-test.mjs --focus="Chat assignment"`, `transition-ownership-regression-final.log`. The first regression failed while recovering an unrelated session fixture with no activity backfill. Recovery selection now requires a retained routing-assignment/takeover command before closing a fixture; it no longer closes other suites' sessions. The failed log remains retained.
