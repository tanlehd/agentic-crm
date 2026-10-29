# Chat-owned tag and snippet catalog candidate

CHG-20261022-02 continuation, SRC-109/T05 IN_PROGRESS. [Contract](../contracts/chat-catalog-candidate.md). Tag/snippet list/get/create/update/archive now use Chat storage, native current Identity admission/policy and public candidate session/CSRF adapters. Definitions, normalized name/shortcut uniqueness, archived identities, receipts, version/ETag and current allowed_actions are preserved. Inbox/sharing has its own verified candidate below; queue remains unfinished scope.

Source: services/chat/src/catalog.ts, baseline gateway/chat-catalog-bff.ts, Identity owner-authority/admission/http, generated owner protocol. Additive admission-catalog-policy only exposes finite decisions for the admitted tenant catalog; no arbitrary Access/roles, Conversation grants or transcript. Transport public-code allowlist is centralized, retaining exact status/envelope validation. No DDL or cross-service SQL; no main mount.

Evidence under artifacts/chat-extraction/continuation-20261022, retained native_identity_test43/test_crm_chat_owner4, Windows/Node24.21.0/pnpm10.33.0. Existing dirty main HEAD21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 retained. No commit/push, database reset/migration or persistent process activation.

| Check | Actual result |
|---|---|
| node scripts/generate-chat-owner-contracts.mjs | PASS183operations/529schemas, catalog-generate.log; counts reflect retired Chatflow |
| pnpm build:chat | First catalog compile exposed unknown/optional SQL parameter types; fixed using validated concrete values |
| pnpm --filter @agentic-crm/chat build | PASS catalog-chat-build-final.log |
| pnpm --filter @agentic-crm/backend build | PASS catalog-backend-build.log and catalog-bff-build.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat catalog" | PASS10groups catalog-native-final.log, repeated after shared authority/BFF changes in catalog-inbox-regression.log |

Ten groups verify actual HTTP create/replay/event minimization, namespace uniqueness/version/archive/tenant, signed pagination/prefix/query binding, current manage revoke, field deny, settlement loss/policy outage, concurrent-key deduplication, completed native logout, public native CSRF CRUD/ETag and writer/actor fences. Fixture roles/field policy/writer gates are restored; synthetic definitions and history retained.

Inbox source: services/chat/src/inbox.ts, shared candidate catalog BFF, native admission-inbox-policy and Channels catalog-connection-read. Generated protocol now185operations/534schemas (inbox-generate.log). Chat/backend builds PASS (inbox-chat-build.log, inbox-backend-build.log). Native command `node scripts/identity-owner-native-test.mjs --focus="Chat inbox"` PASS9groups, inbox-native-final.log: own/shared/manager visibility, creator-only sharing, active targets/field filtering, disabled historical connection, retained replay after reference deactivation, transfer/archive/version, same-key/quota concurrency, signed cursor/team revocation, lost ACK/logout and public session/CSRF/ETag/fences. Fixture-only role/team/status edits are restored. Synthetic definitions are archived for quota reuse; records/receipts/events retained. Workspace regression PASS11groups, workspace-inbox-regression.log.

Failed attempts retained: inbox-chat-build.log originally exposed inferred predicate/SQL parameter types (fixed); inbox-native-debug.log identified UPDATE-lock privilege rejection on SELECT-only writer gate. Implementation now uses a bounded tenant advisory mutex before the transaction, preserving runtime inability to change writer mode/epoch. inbox-native-debug2.log exposed fixture-only team_member.created_at mismatch, corrected without DDL. No secrets/content logged and no main mount.

T05 remains partial and D3 2/6/local2/14. Continue authorized queue/detail/activity/notes/session and generic hydration, connection-disable compatibility/lineage, then T06 consumers, T07 runtime, T08 parity and T09 local cutover/recovery under existing user authorization.
