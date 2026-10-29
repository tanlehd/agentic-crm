# Native Chat and CRM notes acceptance

SRC-109/T05, CHG-20261023-01, Codex2026-10-23. [Contract](../contracts/chat-notes-candidate.md), [storage review](../data/chat-note-candidate.md). Candidate listeners only; no main Chat mount or T05 completion.

Read8 native groups PASS in artifacts/chat-extraction/continuation-20261022/notes-native-final-3.log: CRM-only body, archived exclusion, UUID pagination, independent Activity own/team/shared ACL, body redaction, native viewer, fresh Conversation denial, tenant/actor/strict-query checks, actual CRM outage, stale Chat snapshot, completed native logout and public native session.100synthetic notes of4000characters cross both owner hops in837ms. This is bounded local fixture evidence, not a production performance guarantee.

The native fixture retains105 Activity rows plus legacy CRM target registry references for read compatibility. New create acceptance uses a separate Chat-only Conversation with no corresponding CRM registry target. Dedicated read credentials have SELECT only on Activity/registry/object_type/shares and fail foreign Chat/password SQL. Temporary role/field/seat/team mutations restore their prior values. No note bodies enter Chat command requests/results.

Failures retained before final read PASS: missing exported policy type/typed SQL parameters; missing required private response correlation metadata; initial use of the Conversation-only permits helper incorrectly denied all Activity reads (replaced with the existing CRM read entitlement/grant semantics); reused active identity in bulk fixture (new retained identity assigned); response validator/client still used256KiB despite route allowance (both now use the exact same allowlist). These failures are not marked PASS.

```powershell
. ./scripts/dev-shell.ps1
pnpm build:chat
pnpm --filter @agentic-crm/backend build
node scripts/identity-owner-native-test.mjs --focus="Chat notes"
# Explicit first-time candidate provisioning and write/recovery acceptance:
node scripts/identity-owner-native-test.mjs --focus="Chat notes" --with-write --provision
```

Creation/recovery candidate13 native groups PASS in note-write-native-recovery.log (preceding10group evidence retained in note-write-native.log). Includes actual CRM listener outage after committed effect: native logout leaves the account barrier closing, then native drain completes after owner restoration; no duplicate note. Early logout before acceptance leaves an abort tombstone/no Activity. Closed Conversation adds no active-session contribution. These are staged crash-boundary/native outage tests, not an OS process kill. Detail8/history6 regressions PASS; generated196operations563schemas and docs459/4182links PASS. First native provision created the one reviewed receipt table and detached the exact related-record FK, preserving old Activity rows. Both builds passed in note-write-chat-build-2.log/note-write-backend-build-2.log. Focused57, boundary0added and lint983 PASS in focused-notes.log/boundary-notes.log/lint-notes.log. The scoped provisioning command is restricted to native_identity_test and the reviewed receipt table/related-record FK; do not run the broad T02 detachment file. Main43, historical migrations and T03 frozen fixtures remain unchanged. Canonical field-object bootstrap, Activity update/archive notification integration, activity-stream hydration and T06 consumer wiring remain required before runtime activation.
