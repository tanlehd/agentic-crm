# Chat-owned workspace state candidate

CHG-20261022-02 continuation, SRC-109/T05 IN_PROGRESS, Codex2026-10-22. [Scoped contract](../contracts/chat-workspace-candidate.md). New source: services/chat/src/record-action.ts and workspace-state.ts; public candidate adapter services/core-baseline/src/gateway/chat-workspace-bff.ts. Identity retains all current authorization decisions; Chat uses only owning SQL. No DDL or main route activation.

Read-state preserves cohort cutoff and per-Human monotonic markers. Snooze/get/wake uses current Identity admission, version CAS, public receipts and own activity/outbox; deadline recovery is fenced by writer epoch and snooze revision even when the feature is disabled. Tag attach/detach adds current field rights, archived/quota checks and atomic revisions. Public candidate uses native session, Origin, CSRF, idempotency and ETag. Queue/sidebar, catalog definitions/sharing, activity/notes and session hydration remain open.

Artifacts: artifacts/chat-extraction/continuation-20261022. Environment: Windows PowerShell, Node24.21.0/pnpm10.33.0, retained native_identity_test43/test_crm_chat_owner4 and restricted credentials. Dirty main at HEAD21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 retained; no commit/push, reset, migration, production deploy or persistent candidate worker.

| Executed check | Result |
|---|---|
| pnpm --filter @agentic-crm/chat build | PASS workspace-chat-build-final.log after one corrected route typing error |
| pnpm --filter @agentic-crm/backend build | PASS workspace-backend-build.log and workspace-bff-build.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat workspace" | Initial fixture referenced nonphysical rollout_id; corrected to retained schema. PASS8 groups workspace-native-second.log |
| Same command after public adapter | PASS9 groups workspace-native-public.log; native public read/mark/snooze/wake/session/CSRF |

The physical unread cohort stores tenant/principal/created_at and tenant/conversation/baseline_inbound_seq; rollout_id is conceptual historical documentation, not an added column. Exact Chat migration/schema dictionary remains authoritative. Synthetic fixture rows are retained, temporary role/policy/feature/writer-gate mutations restored. The deadline test waits for original DB due time; it does not shorten production timers. Final tag/public extension PASS11 groups in workspace-native-tags.log, with tag quota20, archive/detach/replay, current field denial and ETag. Both affected builds PASS in workspace-tags-chat-build.log/workspace-tags-backend-build.log.

Scope remains candidate only. T05 is not DONE, D3 stays2/6/local2/14. T06 consumers/old writers, T07 runtime, T08 parity and T09 local cutover/restart/rollback/reapply remain dependency-gated under the user's authorization to finish Chat.
