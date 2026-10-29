# Native dispatch authorization — PLAN-007C4

2026-10-18 / CHG-20261018-14. Ready scoped prerequisite to the Identity grant ledger. Implements [dispatch v1](chat-dispatch-v1.md) native Human authorization serialization in the existing monolith; not a new service or remote endpoint. No table/migration is needed for this prerequisite.

## Authority and locks

The internal Identity application port accepts a session verifier reference held only by Identity, a strict issue DTO and optionally the issue-time principal/security revisions. Never accept the verifier from a private dispatch body: delegation resolution must supply it in the later ledger. A reference is not a cached permission. AI is explicitly rejected until execution delegation has its own native gate.

Within READ COMMITTED, acquire business tenant FOR SHARE, system account FOR SHARE, then system auth_session FOR SHARE. Session lookup before locking only locates account; locked rows must agree on account, active status, security revision, nonrevocation, idle and absolute expiry. Sample MySQL time after lock acquisition, never before waiting. Native logout updates the session and waits for that lock; password reset/change locks account before sessions; Identity admin changes hold tenant FOR UPDATE. No remote I/O inside this transaction. The callback may write only the Identity ledger under the same transaction, and must not send a provider request.

Load current Human membership/principal/seat/roles/teams under the tenant lock, verify principal against the binding, then evaluate conversation read/reply and text read/write against the Chat-admitted resource owner/revisions/team/shares. Reject owner/revision mismatch. Expected principal authorization revision and account security revision must match exactly; restoring rights does not revive old grants. The existing tenant-super-admin exception remains restricted to active Human admin seat plus tenant_admin role.

Field policy is a required application port executed under the same baseline transaction. Existing CRM `withFieldPolicies` resolves the current monolith field_policy/object_type mapping. Identity does not import CRM implementation. This approved monolith port is NOT an extracted-service adapter: moving Identity requires Identity-owned policy resource keys/metadata references and removal of this shared transaction dependency first. Never pass an empty/no-op policy adapter in runtime composition. Until the ledger/composition is implemented the port is not wired into HTTP/worker.

## Acceptance NIA-01…06

1. Real retained MySQL native login; active Human authorization succeeds with current native revisions. Wrong/system tenant, principal, malformed DTO, AI, expired/revoked session fail before callback.
2. Current seat/role/team/scope and text field denial checked; super-admin exception tested separately. No cached authority across calls.
3. Deterministic lock barriers: consume-side transaction first blocks logout/role change; revoke first blocks admission and then denies it. No wall-clock sleep used as the only ordering evidence.
4. Security and authorization revisions, idle/absolute expiry, account disable and foreign session denied. Current session reads do not extend idle TTL.
5. Callback failure rolls back local effect and releases locks; database failure produces no callback effect. No provider or remote service calls.
6. Build, focused native tests, existing unit/static boundary checks, tracker/log/checkpoint. Retain synthetic fixtures; no reset or app restart. Service progress remains packages2/17, active local1/17.

## Compatibility and next gate

Additive internal code only. Existing native login/public APIs and dispatch wire schema unchanged. Runtime roles are not expanded by this task; tests use the retained local test operator. Narrow Identity-only credential/session SELECT grants and ledger DML are required for the future composition. This task does not claim grant persistence, mTLS, Chat claim validity, AI authorization, full extraction or production deployment.
