# Chat extraction — completed local handoff

SRC-109/T01–T09 DONE, Codex 2026-10-27. D3 Human-first 6/6; independent local delivery3/14 (Reporting, Connector, Chat). Legacy Conversation graph retired; main baseline46/crm_chat4, both Chat tenant gates active epoch2 after accepted post-write freeze/forward recovery. Source data and original receipts retained. Production, AI native, live-provider delivery and other-owner business consumers remain outside this acceptance. No commit/push/reset.

[Checkpoint](checkpoint.md) gives current endpoints/processes and retained exceptions. [Main runtime runbook](../development/chat-main-local-runtime.md) gives pinned images, private Compose overlays, startup and same-database recovery. [T09 evidence](details/SRC-109.md#t09-legacy-retirement-and-main-cutover--2026-10-27) records actual commands/results. [T08 acceptance](../quality/t08-chat-parity-acceptance.md) remains the independent parity evidence.

Final fenced source43 snapshot,6,053row reconciliation, baseline44–46/Chat3–4 and367owner bootstrap rows are complete. Six old accounts remain locked; old D2 Chat/coordinator/Identity containers are removed without volumes. Both tenant gates are active epoch2. Never restore stale baseline writers or rerun initial import/provisioning.

Main Human smoke, public/non-Chat reads, tenant/CSRF negatives, restart, freeze/forward recovery, original receipt replay and fresh local event/inbox checks passed. App is available on localhost18080 via Windows local API13001. Original Beta expired-grant attention is preserved and must not be automatically retried. Other-owner consumer business, AI native and live providers remain separate scope. No next task claimed.
