# Chat session source boundary

SRC-109/T06, CHG-20261023-24, Codex2026-10-23, C2 Ready. Implements existing session-source for Sales/Workflow only. It returns immutable acquisition attribution under current Conversation/Contact/field permissions; it neither links a Sales record nor authorizes a later mutation. Sales orchestration is accepted by Sales; no reverse outcome callback is required.

Human requests use native delegation/current session and record ACL; service requests use the active native service actor and all-scope grants, delegation_id equal to principal_id. Identity requires Conversation read and contact_id/channel/channel_id/page_id/attribution field reads; CRM reuses session-contact-read to require the bound active Contact under its current record policy. No caller-supplied Access or permission projection is accepted. Current command admission and final local snapshot guard disclosure, including closed historical sessions.

Same Contact is mandatory. An explicit session must belong to the Conversation. Null selects its active session; when only historical sessions exist, return SESSION_SELECTION_REQUIRED. With no session history, preserve baseline attribution from the owning Connector's channel/source read. Add the narrow connector/source-channel-read endpoint, Chat-only, returning current channel metadata plus the earliest bound touchpoint ID, without credentials or transcript. Existing Connector detail routes are unchanged. No synthetic acquisition session is created by a read.

The existing OwnerSessionSource shape remains, except session_revision permits zero to represent absent session; present sessions retain their positive version. No runtime caller currently uses the unmounted session-source candidate. Preserve the existing wire operation and nullable session_id, generated contracts and consumer description. No table/event/migration changes. A later state-changing command must validate its own rights/current session and source revision.

Required acceptance: native owner HTTP/current Human and service rights, Contact mismatch, exact/active/closed/no-history selection, field denial, source outage, local race, tenant isolation, no source mutation, final admission recovery. This is Chat source acceptance, not Sales/Workflow business acceptance or a deployment gate for their services.

Candidate acceptance: [eight native groups and builds](../development/chat-session-source-candidate.md) PASS. Runtime/cutover remains pending.
