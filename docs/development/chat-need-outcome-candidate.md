# Native Chat Human need outcome saga

SRC-109/T05, CHG-20261023-07. [Contract](../contracts/chat-need-outcome-candidate.md). Working tree on main/base21eaadd0e8d1e9163bfb7721390c2e6b385b1b42; Windows PowerShell, Node24.21.0/pnpm10.33.0. Main remains baseline43; Chat candidate remains4. No runtime cutover.

Chat now issues a fresh delivery admission, validates active Contact and expected assessment version, inspects the current Sales source, and resumes a stable effect command. Sales owns actual Lead/Deal context validation and an atomic link/permanent receipt or abort tombstone. Chat owns the assessment mutation fence, audit/public receipt, and the resolver used by Identity account/policy drains. No remote SQL or network operation inside a local transaction. Linking does not increment assessment version. Current rights/version are checked even for successful old receipts.

Exactly the reviewed sales_owner_command table was installed in retained native_identity_test. The helper checks both reviewed and installed DDL hashes and preserves the existing link count. Restricted t05_sales_outcome_test has read-only registry/Lead/Deal/context access, SELECT+INSERT links, and SELECT+INSERT+UPDATE its command receipt. It cannot read Chat/Identity tables or update Sales registry. No FK was detached, historical migration changed or fixture reset. Physical table review is synchronized in the dictionary/catalog.

Evidence under artifacts/chat-extraction/continuation-20261022:

| Command after . ./scripts/dev-shell.ps1 | Evidence |
|---|---|
| pnpm build:chat; pnpm --filter @agentic-crm/backend build | PASS outcome-chat-build.log, outcome-chat-build-2.log, outcome-backend-build-4.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat need" --with-outcomes --provision | Scoped receipt schema/preservation verified; first fixture failure retained outcome-native.log |
| node scripts/identity-owner-native-test.mjs --focus="Chat need" --with-outcomes --outcomes-only | 12groups PASS outcome-native-final.log; previous11group pass and recovery of retained account barrier in outcome-native-6.log |

Coverage: actual Lead/Deal rows with same Contact/context, closed session, natural link dedup across keys, concurrent same-key retry, request conflict, current Sales/Conversation/Contact/field rights, wrong tenant/session/Contact/version, restricted grants and primary-key EXPLAIN, immutable source race, lost Sales ACK, abort-before-link and in-flight apply losing to tombstone, actual Sales outage preserving assessment fence, resumed native logout barrier, logout after remote commit, old receipt top-level alias adaptation and public session/CSRF/ETag.

Failed runs retained: unquoted Lead fixture table, SELECT-only credential with unnecessary FOR UPDATE, EXPLAIN for a nonexistent const key, and the test trying to reuse a revoked logout session. Repairs use quoted identifier, shared source locks without broader grants, an existing receipt for EXPLAIN, and durable NativeAccountDrain.drain. The retained closing barrier was recovered through actual Sales terminal proof on the next run, without resetting it. Temporary diagnostic logs contain error codes/stack locations only and are removed from final test source.

Full assessment/outcome composition plus deferred-enrichment compatibility is being verified separately in need-composed-native.log. Enrichment provider execution remains deferred. T06 must apply the pending-need fence to Workflow recovery and mount owner producer/consumer integrations; T07 must mount the recovery resolver in independent runtime; T09 must provision/reconcile the reviewed receipt with main cutover. Candidate evidence does not close T05 or change D3 2/6/local2/14.

Final composed verification2026-10-23:25native groups PASS in need-composed-native.log (assessment11, deferred-enrich2, outcome12); structured review need-composed-review.json. Builds PASS enrich-chat-build.log/enrich-backend-build.log; focused27 PASS focused-outcome.log; lint1010/boundary0added/generated220operations620schemas PASS in *outcome* logs. Classification/contribution13regression PASS classification-need-regression.log. Docs470Markdown/4250links before this final synchronization and scoped whitespace pass; no main/runtime activation. Prior pending notes above are superseded for this verified need slice.
