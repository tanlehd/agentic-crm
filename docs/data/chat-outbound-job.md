# Chat durable Human outbound job — forward42

SRC-108 / CHG-20261018-25,2026-10-18. Ready implementation design within [D2](../contracts/human-outbound-runtime.md), not deployment evidence. Read against [catalog](schema-catalog.md), [guidelines](database-guidelines.md), [template](../templates/database-table.md).

Execution complete: forward42 applied to retained native_identity_test and main agentic_crm with old values/journal preserved; native/public/main activation/recovery/ops accepted in [SRC-108](../tracking/details/SRC-108.md). Physical Chat extraction remains D3.

| Required review | Decision |
|---|---|
| Task/acceptance | SRC-108 D2-03/04/05; durable public Human command and recovery |
| Table/schema | chat_outbound_job, target crm_chat; current baseline agentic_crm/test native_identity_test |
| Writer/aggregate | Chat command inserts with outbound_intent/message/public receipt; Chat coordinator owns phase/lease |
| Meaning/type | Durable source of orchestration progress for one immutable Human intent, not a provider authorization or second message body |
| Scope | Business TenantContext, tenant_id NOT NULL, no system/default/wildcard tenant |
| Columns | tenant_id,intent_id,conversation_id,attempt_id,delegation_id,principal_id CHAR(36) ASCII binary NOT NULL; binding_json/resource_json JSON NOT NULL with object+size checks; phase VARCHAR(16) NOT NULL initially issue; status VARCHAR(16) NOT NULL initially pending; grant_id/claim_id/lease_token nullable CHAR(36); lease_until nullable DATETIME(6); next_attempt_at/created_at/updated_at DATETIME(6) NOT NULL UTC; failures INT UNSIGNED NOT NULL DEFAULT0; version BIGINT UNSIGNED NOT NULL DEFAULT1; last_error nullable VARCHAR(64) ASCII binary |
| Keys/constraints | PK(tenant_id,intent_id); UNIQUE(tenant_id,attempt_id); FK(tenant_id,intent_id,conversation_id) to own Chat outbound_intent; no remote FK. phase in issue,payload,prepare,claim,begin,deliver; status pending,done,attention; version>=1; lease token/until both null or both nonnull; binding<=8192bytes,resource<=8192bytes |
| Remote references | Identity delegation/grant; Connector attempt; verified through version1 owner RPCs. IDs never imply remote existence; outage leaves durable phase for retry |
| Queries/indexes | Dispatcher bounded25 rows with status=pending,next_attempt_at<=now ordered due/tenant/intent; index(status,next_attempt_at,tenant_id,intent_id). Claim tenant+intent row FOR UPDATE with expired/no lease; writes CAS lease_token+version. Same-owner intent lookup PK. EXPLAIN and actual schema test pending |
| Authorization | Public ACL+current ownership+text fields+CSRF unchanged. Local enrollment checks native session/principal; issue/consume check live rights and revisions. Worker carries opaque IDs only |
| Concurrency | Tenant→conversation registry→intent for command/claim/result; job worker transactions only lock job, release before remote calls. UUID lease30s, CAS writes, stable request IDs and fixed attempt per intent; idempotent remote receipts protect stale worker |
| Audit/outbox | Existing command audit/public receipt atomic with job. Existing claim/result audit/outbox remain authoritative business transitions; phase tracking contains no text/token. No new business event |
| PII/retention | No token/verifier/text duplicated; resource IDs and ACL snapshot minimized. Retain with intent/receipts, no automatic purge/rearm. Identity delegation/session retention remains Identity-owned |
| DB grants | Chat runtime SELECT,INSERT,UPDATE; coordinator SELECT,UPDATE. No DELETE/DDL/Identity credential access. Migration operator only DDL. Identity enrollment uses separately configured Identity credential |
| Migration | New forward42; no historical edits/backfill/re-route. Add job table and expand outbound_intent CHECK only; preserve every existing row/journal. Native test first, main only at rollout |
| Compatibility/rollback | New jobs use remote internal states, excluded even by old sender predicates. Old rows untouched. Disable enrollment to stop new traffic; retained jobs drain or remain attention. Do not drop table, convert remote to legacy or roll back DDL. Compatible candidate retains UI normalization/recovery |
| Fixtures | Reuse native Identity/Chat/Connector synthetic tenant/user; distinct run IDs; wrong tenant and preexisting rows retained |
| Evidence | artifacts/human-outbound/schema-upgrade.json and app.json; artifacts/human-outbound-local/main-migration.json and acceptance.json. Queue index EXPLAIN, old values/journal, native public atomic job/recovery and main3send operations verified |

## Existing table change review: outbound_intent

Owner remains Chat. Forward42 replaces verified baseline `outbound_intent_chk_4` with named `ck_outbound_intent_dispatch_status`, preserving queued/sending/sent/failed/unknown/cancelled and adding remote_queued/remote_sending/remote_unknown. VARCHAR(16), tenant keys, columns/indexes/grants otherwise unchanged. Verified constraint name and clause against retained native_identity_test before implementation; no historical migration change. CHECK replacement is one ALTER statement. New status use requires an atomic same-tenant job insert; no old rows are backfilled. Message statuses and public API enums remain unchanged. Public mapping strips the remote prefix; cancellation includes remote_queued, claim performs remote_queued→remote_sending, result performs remote_sending→remote_unknown/sent or remote_unknown→sent. Every legacy dispatch/expiry/reconcile/retry path is exercised against these persisted states before gate D2-03 passes.

## Existing Identity delegation local enrollment

No DDL change. Existing identity_dispatch_delegation stores tenant/id/principal/session verifier/principal_revision/security_revision/created_at. Add an application method restricted to trusted native public-controller composition; it validates active tenant and locked native session before insertion. Enrollment is committed before Chat mutation, so crash can leave only an inert delegation. No new private RPC accepts a verifier. Chat stores only returned principal/delegation IDs. Grant issue checks resource ACL and session before any external effect. Separate Identity credential; no Chat SQL reads Identity session tables.
