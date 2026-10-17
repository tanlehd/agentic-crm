# Need assessment and follow-up

[Exact contract](../contracts/need-follow-up.md) · [Evidence](../tracking/details/SRC-081.md). Canonical Conversation API and Inbox use `/api/v1/conversations` and `conversation_id`; handling episodes use `session_id`. [Identity alignment](../contracts/conversation-identity.md) specifies forward34 and compatibility for deprecated /threads, v1 events and persisted workflow/receipt artifacts.

## Use in Inbox

1. Select the handling session, then register/select its need under **Nhu cầu và bằng chứng hành vi**. Closed sessions support review-time need registration; this does not create a milestone. Legacy untracked sessions get partial coverage, never retrospective full coverage.
2. **Đánh giá nhu cầu** shows assessment status, clarity, intent, product interest and unresolved reason. Saving a Human value pins that field. **Cho phép AI cập nhật** explicitly releases a pin.
3. **AI đánh giá nhu cầu** invokes the configured provider with that need and session's evidence. AI values fill unpinned fields and its proposal/provenance remains visible. Supporting evidence IDs must refer to inbound messages in that session. Insufficient evidence and missing provider are explicit; neither becomes a clear buying need.
4. **Object & Properties → Nhu cầu trong phiên → Thuộc tính** adds typed custom fields. Optional, no defaults/indexes; AI may fill permitted custom fields just like defaults. System provenance is read-only. No Contact sentiment object or global conversion probability is introduced.
5. After creating/linking a Lead or Deal through Related objects, use **Liên kết Lead / Deal của nhu cầu** to bind it to the exact need. Unmapped session outcomes block follow-up until resolved. This is a conservative guard, not absence of a Lead.

## Configure a workflow

Choose trigger **Nhu cầu được đánh giá / phiên đóng**, select connection, optional **Trì hoãn**, then **Mở phiên follow-up**. Use **Đọc đánh giá nhu cầu** and **Rẽ nhánh** to select a scenario from status/clarity/intent/product_interest/unresolved_reason; test current=true before using the snapshot. Recovery independently revalidates. Generic custom-field workflow bindings remain a separate Object Platform gate. Select destination team, Human/AI/any preference, minimum AI confidence, cooldown since close and maximum evidence age. Human-confirmed decision fields do not need an AI confidence threshold. Use a delay at least as long as cooldown; cooldown does not itself schedule another retry.

The execution service actor needs conversation read/update/assign, contact read and readable need decision fields. Publish rechecks its role; execution reloads current authority. Existing actors are not silently granted these permissions. No workflow is enabled by migration or seed.

Recovery only opens when the original need/version still qualifies, the Thread and latest source session remain closed, no newer inbound evidence exists, and no exact/unmapped outcome blocks it. Success creates a new empty handling session, unknown acquisition source and immutable source-need receipt, then routes through existing eligibility. No eligible owner rolls back opening. One recovery per original need across all workflows.

Output: `outcome`, `conversation_id`, nullable new `session_id` and `owner_id`. Use **Rẽ nhánh** with `outputs.<recover node>.outcome = recovered` before starting a Chatflow. New Chatflow actions use `conversation_id`; old stored `thread_id` graphs remain valid. Assignment alone sends no message. Real channel delivery and general autonomous AI runtime retain their own gates.

Skipped outcomes include thread_open, newer_session, newer_evidence, assessment_changed, stale_evidence, cooldown, outcome_exists, outcome_unmapped, already_recovered, not_assessed, need_not_clear, no_unresolved_reason and confidence_too_low. They are durable action results, not successful conversions. After a skipped condition changes, save a fresh assessment to emit a new event; never edit an immutable workflow run.

## Provider protocol and local operation

Configure API process environment `NEED_AI_URL`, `NEED_AI_MODEL`, `NEED_AI_CONFIG_VERSION`, optional `NEED_AI_KEY`. Credentials remain in operator-managed private environment, not CRM fields. HTTPS is required except loopback HTTP for local tests. The URL must point to a provider/gateway implementing `crm.need-assessment.v1`; it is not a direct generic chat-completions URL. No vendor credential or live provider is bundled or activated.

POST JSON contains protocol, model, config_version, fixed assessment instructions and input with need ID/label, permitted typed field definitions, and bounded session messages. Return exactly `{values, confidence, evidence_ids}`. `values` must contain all five builtin fields; optional custom values must match current metadata. Status unassessed is not a valid provider result. Assessed requires at least one inbound evidence ID; confidence is 0–1 and is not a conversion probability. Unknown fields/tool instructions are rejected. The adapter neither executes tools nor follows customer text instructions.

Limits:100 session messages/100KB evidence,128KB response,20-second network timeout; oversize evidence requires Human assessment. I/O runs outside SQL transactions. Live authority, owner/session revision, metadata, evidence, assessment version and provider config are rechecked before save. Concurrent provider requests can occur, but only one CAS effect is accepted; there is no exactly-once provider billing claim. This slice invokes enrichment on demand through native API/UI; it does not run an automatic model call on every inbound/close. A saved assessment and later close both emit the orchestration event.

Forward33 adds four tenant-scoped tables and conversation_need metadata. `node scripts/conversation-identity-local-upgrade.mjs` verifies local development target, stops managed API/worker, saves private SQL backup, hashes all prior tables, applies forward migration and grants only required table operations, checks repeat0 and restarts. Never reset MySQL/Redis. Keep backup/artifacts ignored. Current code requires schema34, which renames four relationship columns to conversation_id; applied33 remains immutable. On upgrade failure keep writers stopped until resolved; rollback means disabling new workflows and using the compatible binary, preserving new data.

Validation commands (Node24/pnpm10): backend build; `node scripts/need-follow-up-test.mjs`; `node scripts/need-follow-up-browser.mjs`; unit/types/contracts/schema/docs/lint and isolated web production build. Test endpoints, messages and HTTP provider are synthetic. Native retained fixtures and failure/fix history are recorded in evidence, not represented as live AI or Facebook acceptance.
