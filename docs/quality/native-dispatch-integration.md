# Native three-authority dispatch acceptance — PLAN-007C7

SRC-108 superseding evidence: owning HTTP process tests, public native command/worker, sender crash/logout recovery and main Alpha image activation/restart/rollback/reapply now verified. [6/6 evidence](../tracking/details/SRC-108.md), [runbook](../development/human-outbound-local.md). The injected harness below remains historical component coverage; it is not the runtime evidence used for D2.

SRC-103 extends this acceptance with `pnpm test:dispatch:results`:29native groups now reach Chat sent/unknown with atomic result audit/outbox/coverage. [Result contract](../data/chat-dispatch-result.md). The SRC-102-only sending limitation below remains historical to its narrower scope; authenticated transport/provider/worker activation still not implemented.

2026-10-18 / CHG-20261018-17. Ready SRC-102; dependencies SRC-098/100/101 DONE. [Protocol](../contracts/chat-dispatch-v1.md), [Identity ledger](../data/identity-dispatch-ledger.md), [Chat claim](../data/chat-dispatch-claim.md), [Connector lifecycle](../data/connector-attempt-ledger.md).

No new table/DDL/remote endpoint. Compose real native repositories in the retained test harness: native session→Identity grant→Chat-owned payload transfer→Connector payload/prepare→Chat owner claim→Connector begin→native Identity consume with actual Chat proof→one synthetic provider call→Connector durable result. Identity and Chat use distinct narrow DB roles in native_identity_test; Connector uses its own narrow role and database native_connector_test. Each repository has its own local transaction; callbacks outside SQL model transport, never share a TransactionScope. Connector never SELECTs Identity/Chat SQL. Exact tenant/connection fixture is registered in both owners through operator-only test provisioning; connection status is read from Connector's own table.

Sender remains synthetic; no Meta, HTTP/mTLS, broker or main traffic. Chat message remains sending until the separate authenticated result application gate; Connector sent status is not represented as UI delivered. New test account password/fixture persists and is not rotated on rerun. Existing schemas/rows/journals preserved; no reset. Runtime roles cannot query foreign service DB/tables. Evidence must name injected transport versus real storage/authority.

## NDI-01…07

1. Native success with actual grant/claim/consume and separate Connector database; exact payload delivered once to synthetic sender; Connector state sent and Identity consumed, Chat claim durable.
2. Concurrent duplicate begin and replay/new executor produce at most one consume/send; no receipt reconstructs capability.
3. Native logout/authorization revision before consume produces no send; successful native consume followed by revoke has explicit in-flight semantics. Do not promise recall.
4. Actual Connector connection disable before start denies I/O; postconsume check prevents send; restored connection and replay cannot rearm unknown.
5. Actual Chat takeover before claim rejects; after claim retains stable proof and allows already-admitted operation under current Identity rights.
6. Injected loss of native consume ACK after commit produces unknown/zero send, replay never resends. Synthetic provider failure produces unknown; positive matching reconciliation only can mark sent.
7. Native SQL role isolation, retained evidence, unit/static/docs checks and progress. Packages2/17, active local1/17; this is not a fourth independent service or production rollout.

Run `pnpm test:dispatch:native`; artifacts/native-dispatch. It includes SRC-101's12native groups plus the added integration groups; source fixture/helper reuse avoids diverging authorization test scaffolds. Main daemon/API/worker remain untouched. Next gate is authenticated Connector result application to Chat, then transport/workload authentication and activation.
