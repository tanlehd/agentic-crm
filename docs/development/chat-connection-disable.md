# Global connection-disable candidate evidence

SRC-109/T05, CHG-20261023-10. [Contract](../contracts/chat-connection-disable.md), [schema template](../data/connector-connection-barrier.md). Candidate only; no main restart/cutover.

Executed in Windows PowerShell with project Node24.21.0/pnpm10.33.0:

```powershell
. ./scripts/dev-shell.ps1
pnpm --filter @agentic-crm/contracts build
pnpm --filter @agentic-crm/workload-transport build
pnpm --filter @agentic-crm/backend build
pnpm --filter @agentic-crm/crm-connector build
node scripts/identity-owner-native-test.mjs '--focus=Chat references' --with-status --with-transport --provision
node scripts/identity-owner-native-test.mjs '--focus=Chat outbound'
```

`artifacts/chat-extraction/continuation-20261022/disable-native-1.log`: **17groups PASS**, comprising8reference,3scoped Channels status and6global transport groups. `disable-outbound-regression.log`: **12groups PASS**, real native Identity/Chat/Connector HTTP and synthetic provider, including lost begin/consume ACK, completed logout and retained unknown/late sent. The global local-start race uses real Connector MySQL with injected consume/send callbacks; it is integration evidence, not deployed E2E or a real provider test.

`disable-migration-upgrade.json` records populated native_connector_test5→6 with all old table/journal hashes preserved; the repeat evidence is `disable-migration.json`. Main connector_local remains5, baseline main43 and Chat4 unchanged. New runtime role is scoped to Connector connection status, barrier and dispatch test tables; credentials and foreign SQL denied. Channels operator can SELECT only the audit identity columns needed to reject an already-enabled barrier, alongside its existing append grant. No secret/body is written to evidence.

Builds, generated225operations630schemas, lint1017files and boundary0added PASS. Logs use `disable-` in the same directory. All native listeners close after harness completion. Workspace main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 dirty, prior work preserved; no commit/push, DB reset or main process restart.

Operational composition: `NativeChannelStatus` receives authenticated transport callbacks; `connectorDispatchServer` mounts the matching status routes and injects `lockActiveConnection` into its AttemptStore. Direct repository construction without that gate is a primitive test seam, not an approved runtime composition. T07 must use the composed server; T09 must stop old senders before activation. Existing Connector rollout scripts still pin the historical schema5 D1 image and require reviewed schema6 compatibility at T09, not an untested main migration now.

T05 remains IN_PROGRESS. Final handler review found public lifecycle transitions still missing: the T04 `prepareClose` effect has no mounted full transition response, and open/pending transitions have no owner handler. Complete that existing T05 requirement before closing the task. T06 additionally owns Contact-channel/generic collection consumers and automatic relays; no new consumer delivery is claimed here.

Additional Connector attempt primitive regression completed with exit0 (`disable-attempt-regression.log`). Its result does not replace the composed global/native outbound evidence above. Lifecycle completion and current T05 status are in [T05 acceptance](../quality/t05-human-acceptance.md).
