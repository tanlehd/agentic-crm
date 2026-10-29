# T05 referral evidence and binding saga

CHG-20261021-03 extends the coordinator with [terminal-denial classification](chat-ingress-denials.md). A failed processing attempt finalizes its aborted referral candidate before the inbox can become failed; unknown cleanup keeps received. Other T05 gates remain.

Ready scoped extension, CHG-20261021-02, Codex2026-10-21; SRC-109/T05 IN_PROGRESS, T04 DONE. Extends [processor](chat-ingress-processor.md) and preserves [Customer360](customer-360-session.md). Mock CTM only; no provider integration, main mount, worker activation or T06.

Legacy touchpoint has monolith foreign keys to Contact/Conversation and inbound_delivery. A new Channels-owned ledger stages immutable referral evidence per Chat command; only terminal Chat proof can confirm an observation. [Table design](../data/channel-ingress-touchpoint.md) precedes code. Baseline data/DDL, main42 and Chat001–003 remain unchanged.

Optional ingress_touchpoint binding pins candidate ID, receipt ID, provider-message digest, occurred_at and nullable ad/campaign IDs under the command digest alongside Contact/identity/connection/actor. No body/subject/credential in proof. After four current reference holds and Identity admission, Chat calls Connector touchpoint-prepare over authenticated HTTP. Channels independently verifies Chat proof, current Identity admission, own held connection reference and current actor/team/Page. RPCs finish outside SQL; terminal candidates never rearm.

Chat commits Message/session, session_touchpoint, source snapshot and processed inbox atomically using staged ID. Active session/source/queued work survive referral. First/reopened mock CTM episode uses paid source and exact ad/campaign/touchpoint. Late input retains Message with no session link/reopen. Message duplicates never use the new candidate, even if referral differs; conflict changes only inbox.

Optional ingress_result in committed referral command proof contains receipt/state, nullable Message/Conversation/session and used candidate IDs, derived only from durable result. Old optional-free digests stay compatible. Connector touchpoint-finalize reads proof: matching use becomes bound (session null for late), abort cancelled, commit without use discarded. Insert terminal row even if prepare absent to fence delayed prepare. Store immutable proof digest and terminal IDs atomically.

Identity admission-read permits Connector only for a prepared Chat ingress-process proof with a referral pin, matching service actor, empty fields and live native authorization under an open Identity gate. Connector cannot admit/settle Chat commands or read unrelated Human admissions. Existing Chat/Routing peer ownership checks remain.

Recovery finalizes before releasing references/settling admission. Lost ACK retries original command; unknown retains durable state. Terminal recovery works after revoke; new processing/replay needs fresh admission. This is a saga with visible pending interval, never cross-service atomic SQL.

Acceptance: native HTTP/MySQL prepare/finalize/replay; paid opening, active continuity, late/equal-close/reopen; organic/referral duplicate/conflict; concurrency/rollback; lost ACK/restart; abort-before-prepare; wrong tenant/digest/authority; restricted grants, schema pin and EXPLAIN. Executed referral/denial evidence is in SRC-109. Remaining T05 work is own-schema D2 send, connection-disable compatibility, workspace/notes/hydration/capability integration.
