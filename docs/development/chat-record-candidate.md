# Generic Conversation record candidate

SRC-109/T05, CHG-20261023-09. [Contract](../contracts/chat-record-candidate.md). Candidate GET/PATCH uses Chat-owned registry/Conversation, CRM metadata and native Identity over authenticated local HTTP. Main remains baseline; generic collection/batch consumers and runtime selection follow in T06/T07.

Run after successful affected builds:

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs '--focus=Chat custom' --with-records
```

Final native evidence: `artifacts/chat-extraction/continuation-20261022/record-native-final.log`, 16groups PASS (8existing custom/metadata and8generic composition). Covers typed writes, full/filtered envelope, current field and tenant negatives, concurrent replay/conflict, retained metadata after publication, original response after later edits, source CAS, Identity outage, lost result ACK, native HTTP session/CSRF/ETag/bounds and logout after admission. Retained closed synthetic Conversations are reused/preserved; no table or migration change. A preliminary run emitted after a TypeScript recursive-return annotation error is not final build evidence; the final run follows repaired build exit0. Failed build/log retained.

Build logs: `record-chat-build-final.log`, `record-backend-build.log`. Contract, generated, lint and boundary result logs use the `record-` prefix in the same evidence directory. Working tree main at21eaadd0e8d1e9163bfb7721390c2e6b385b1b42, dirty; no commit/push. Test listeners close in harness finally. No main process restarted.

`createChatRecordBff` is a candidate CRM facade for GET/PATCH `/api/v1/objects/conversation/records/:id`; its callback must use CRM workload identity to Chat. It does not enable list/create/archive or standard-field mutation. `ChatGenericRecords.patch` recovers original metadata before evaluating a retry; `ChatCustomValues` stores immutable filtered standard/custom fields atomically. Optional hydrated mode leaves old private receipts unchanged. No separate public owner proof/body endpoint exists.

Remaining T05 work: global connection-disable composition and final capability mapping. T06 adds CRM consumer selection and bounded record-batch use; T07 mounts the runtime. T05 remains IN_PROGRESS; D3 2/6 and local2/14 unchanged.
