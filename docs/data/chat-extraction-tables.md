# Chat extraction exact table templates — v1

SRC-109/T02, design-only. Generated from [source metadata](chat-extraction/source-v42.json) and scripts/lib/chat-data-design.mjs; reviewed semantics, partition and initialization rules are in [migration design](../architecture/chat-data-migration.md). No applied migration.

## crm_chat.audit_entry

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.audit_entry; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Chat-owned accepted/denied audit, immutable; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Chat-owned accepted/denied audit, immutable; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id → tenant: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | UNIQUE KEY `tenant_id` (`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.tenant_id; see source dictionary and normative lifecycle |
| actor_kind | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.actor_id; see source dictionary and normative lifecycle |
| action | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.action; see source dictionary and normative lifecycle |
| resource_type | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.resource_type; see source dictionary and normative lifecycle |
| resource_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline audit_entry.resource_id; see source dictionary and normative lifecycle |
| outcome | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.outcome; see source dictionary and normative lifecycle |
| changed_fields | json | NOT NULL; no default | Preserved baseline audit_entry.changed_fields; see source dictionary and normative lifecycle |
| reason | text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline audit_entry.reason; see source dictionary and normative lifecycle |
| correlation_id | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline audit_entry.correlation_id; see source dictionary and normative lifecycle |
| occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline audit_entry.occurred_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline audit_entry.created_at; see source dictionary and normative lifecycle |

CHECK: `(`actor_kind` in (_utf8mb4'human',_utf8mb4'ai',_utf8mb4'service',_utf8mb4'system'))`; `(`outcome` in (_utf8mb4'accepted',_utf8mb4'denied'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.chat_claim_request

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_claim_request; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; D2 claim request digest replay identity; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | D2 claim request digest replay identity; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`request_id`); KEY `tenant_id` (`tenant_id`,`intent_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `tenant_id` (`tenant_id`,`intent_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_claim_request.tenant_id; see source dictionary and normative lifecycle |
| request_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_claim_request.request_id; see source dictionary and normative lifecycle |
| intent_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_claim_request.intent_id; see source dictionary and normative lifecycle |
| request_digest | char(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_claim_request.request_digest; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_claim_request.created_at; see source dictionary and normative lifecycle |

CHECK: `(`tenant_id` <> _utf8mb4'01900000-0000-7000-8000-000000000001')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: chat_claim_request_ibfk_1: (tenant_id,intent_id) → chat_dispatch_claim(tenant_id,intent_id).

## crm_chat.chat_dispatch_claim

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_dispatch_claim; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; D2 immutable intent/attempt/grant claim proof; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | D2 immutable intent/attempt/grant claim proof; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | UNIQUE KEY `chat_claim_attempt` (`tenant_id`,`attempt_id`); UNIQUE KEY `chat_claim_id` (`tenant_id`,`claim_id`); PRIMARY KEY (`tenant_id`,`intent_id`); KEY `tenant_id` (`tenant_id`,`intent_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `chat_claim_attempt` (`tenant_id`,`attempt_id`); UNIQUE KEY `chat_claim_id` (`tenant_id`,`claim_id`); KEY `tenant_id` (`tenant_id`,`intent_id`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_dispatch_claim.tenant_id; see source dictionary and normative lifecycle |
| intent_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_dispatch_claim.intent_id; see source dictionary and normative lifecycle |
| attempt_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_dispatch_claim.attempt_id; see source dictionary and normative lifecycle |
| claim_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_dispatch_claim.claim_id; see source dictionary and normative lifecycle |
| grant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_dispatch_claim.grant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_dispatch_claim.conversation_id; see source dictionary and normative lifecycle |
| binding_json | json | NOT NULL; no default | Preserved baseline chat_dispatch_claim.binding_json; see source dictionary and normative lifecycle |
| resource_json | json | NOT NULL; no default | Preserved baseline chat_dispatch_claim.resource_json; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_dispatch_claim.created_at; see source dictionary and normative lifecycle |

CHECK: `(`tenant_id` <> _utf8mb4'01900000-0000-7000-8000-000000000001')`; `(json_type(`binding_json`) = _utf8mb4'OBJECT')`; `(json_type(`resource_json`) = _utf8mb4'OBJECT')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: chat_dispatch_claim_ibfk_1: (tenant_id,intent_id,conversation_id) → outbound_intent(tenant_id,id,conversation_id).

## crm_chat.chat_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_inbox; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Saved inbox predicate and creator; never Conversation ACL; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Saved inbox predicate and creator; never Conversation ACL; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `inbox_creator` (`tenant_id`,`creator_principal_id`,`archived_at`,`id`); PRIMARY KEY (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `inbox_creator` (`tenant_id`,`creator_principal_id`,`archived_at`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_inbox.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_inbox.id; see source dictionary and normative lifecycle |
| creator_principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_inbox.creator_principal_id; see source dictionary and normative lifecycle |
| name | varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_inbox.name; see source dictionary and normative lifecycle |
| predicate_schema_version | smallint | NOT NULL; DEFAULT 1 | Preserved baseline chat_inbox.predicate_schema_version; see source dictionary and normative lifecycle |
| predicate | json | NOT NULL; no default | Preserved baseline chat_inbox.predicate; see source dictionary and normative lifecycle |
| sort | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_inbox.sort; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline chat_inbox.version; see source dictionary and normative lifecycle |
| archived_at | datetime(6) | NULL; no default | Preserved baseline chat_inbox.archived_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_inbox.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_inbox.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` > 0)`; `(`predicate_schema_version` = 1)`; `(`sort` in (_utf8mb4'latest_message_desc',_utf8mb4'latest_message_asc',_utf8mb4'waiting_longest'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.chat_inbox_share

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_inbox_share; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Inbox definition recipients only; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Inbox definition recipients only; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `inbox_recipient` (`tenant_id`,`target_kind`,`target_id`,`inbox_id`); PRIMARY KEY (`tenant_id`,`inbox_id`,`target_kind`,`target_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `inbox_recipient` (`tenant_id`,`target_kind`,`target_id`,`inbox_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE/DELETE; chat_worker: SELECT/INSERT/UPDATE/DELETE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_inbox_share.tenant_id; see source dictionary and normative lifecycle |
| inbox_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_inbox_share.inbox_id; see source dictionary and normative lifecycle |
| target_kind | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_inbox_share.target_kind; see source dictionary and normative lifecycle |
| target_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_inbox_share.target_id; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_inbox_share.created_at; see source dictionary and normative lifecycle |

CHECK: `(`target_kind` in (_utf8mb4'principal',_utf8mb4'team'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: chat_inbox_share_ibfk_1: (tenant_id,inbox_id) → chat_inbox(tenant_id,id).

## crm_chat.chat_outbound_job

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_outbound_job; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Durable D2 orchestration and scheduler lease; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable D2 orchestration and scheduler lease; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_chat_outbound_intent` (`tenant_id`,`intent_id`,`conversation_id`); KEY `ix_chat_outbound_due` (`status`,`next_attempt_at`,`tenant_id`,`intent_id`); PRIMARY KEY (`tenant_id`,`intent_id`); UNIQUE KEY `uq_chat_outbound_attempt` (`tenant_id`,`attempt_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `fk_chat_outbound_intent` (`tenant_id`,`intent_id`,`conversation_id`); KEY `ix_chat_outbound_due` (`status`,`next_attempt_at`,`tenant_id`,`intent_id`); UNIQUE KEY `uq_chat_outbound_attempt` (`tenant_id`,`attempt_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_outbound_job.tenant_id; see source dictionary and normative lifecycle |
| intent_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_outbound_job.intent_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_outbound_job.conversation_id; see source dictionary and normative lifecycle |
| attempt_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_outbound_job.attempt_id; see source dictionary and normative lifecycle |
| delegation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_outbound_job.delegation_id; see source dictionary and normative lifecycle |
| principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_outbound_job.principal_id; see source dictionary and normative lifecycle |
| binding_json | json | NOT NULL; no default | Preserved baseline chat_outbound_job.binding_json; see source dictionary and normative lifecycle |
| resource_json | json | NOT NULL; no default | Preserved baseline chat_outbound_job.resource_json; see source dictionary and normative lifecycle |
| phase | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; DEFAULT issue | Preserved baseline chat_outbound_job.phase; see source dictionary and normative lifecycle |
| status | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; DEFAULT pending | Preserved baseline chat_outbound_job.status; see source dictionary and normative lifecycle |
| grant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline chat_outbound_job.grant_id; see source dictionary and normative lifecycle |
| claim_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline chat_outbound_job.claim_id; see source dictionary and normative lifecycle |
| lease_token | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline chat_outbound_job.lease_token; see source dictionary and normative lifecycle |
| lease_until | datetime(6) | NULL; no default | Preserved baseline chat_outbound_job.lease_until; see source dictionary and normative lifecycle |
| next_attempt_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_outbound_job.next_attempt_at; see source dictionary and normative lifecycle |
| failures | int unsigned | NOT NULL; DEFAULT 0 | Preserved baseline chat_outbound_job.failures; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline chat_outbound_job.version; see source dictionary and normative lifecycle |
| last_error | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline chat_outbound_job.last_error; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_outbound_job.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_outbound_job.updated_at; see source dictionary and normative lifecycle |

CHECK: `((json_type(`binding_json`) = _utf8mb4'OBJECT') and (length(`binding_json`) <= 8192))`; `(((`lease_token` is null) and (`lease_until` is null)) or ((`lease_token` is not null) and (`lease_until` is not null)))`; `(`phase` in (_utf8mb4'issue',_utf8mb4'payload',_utf8mb4'prepare',_utf8mb4'claim',_utf8mb4'begin',_utf8mb4'deliver'))`; `((json_type(`resource_json`) = _utf8mb4'OBJECT') and (length(`resource_json`) <= 8192))`; `(`status` in (_utf8mb4'pending',_utf8mb4'done',_utf8mb4'attention'))`; `(`version` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_chat_outbound_intent: (tenant_id,intent_id,conversation_id) → outbound_intent(tenant_id,id,conversation_id).

## crm_chat.chat_read_rollout_conversation

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_read_rollout_conversation; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Retained unread baseline per Conversation; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Retained unread baseline per Conversation; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_read_rollout_conversation.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_read_rollout_conversation.conversation_id; see source dictionary and normative lifecycle |
| baseline_inbound_seq | bigint unsigned | NOT NULL; no default | Preserved baseline chat_read_rollout_conversation.baseline_inbound_seq; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: chat_read_rollout_conversation_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.chat_read_rollout_principal

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_read_rollout_principal; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Retained Human unread rollout enrollment; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Retained Human unread rollout enrollment; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`principal_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_read_rollout_principal.tenant_id; see source dictionary and normative lifecycle |
| principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_read_rollout_principal.principal_id; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_read_rollout_principal.created_at; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.chat_result_request

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_result_request; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; D2 immutable result request digest replay; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | D2 immutable result request digest replay; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`request_id`); KEY `tenant_id` (`tenant_id`,`intent_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `tenant_id` (`tenant_id`,`intent_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_result_request.tenant_id; see source dictionary and normative lifecycle |
| request_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_result_request.request_id; see source dictionary and normative lifecycle |
| intent_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_result_request.intent_id; see source dictionary and normative lifecycle |
| request_digest | char(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_result_request.request_digest; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_result_request.created_at; see source dictionary and normative lifecycle |

CHECK: `(`tenant_id` <> _utf8mb4'01900000-0000-7000-8000-000000000001')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: chat_result_request_ibfk_1: (tenant_id,intent_id) → chat_dispatch_claim(tenant_id,intent_id).

## crm_chat.chat_snippet

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_snippet; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Versioned text snippet catalog; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Versioned text snippet catalog; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`shortcut`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `tenant_id` (`tenant_id`,`shortcut`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_snippet.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_snippet.id; see source dictionary and normative lifecycle |
| title | varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_snippet.title; see source dictionary and normative lifecycle |
| shortcut | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_snippet.shortcut; see source dictionary and normative lifecycle |
| text | text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_snippet.text; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline chat_snippet.version; see source dictionary and normative lifecycle |
| archived_at | datetime(6) | NULL; no default | Preserved baseline chat_snippet.archived_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_snippet.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_snippet.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` > 0)`; `(char_length(`text`) between 1 and 4000)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.chat_workspace_rollout

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_workspace_rollout; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Business-tenant feature rollout checkpoint; not migration journal; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Business-tenant feature rollout checkpoint; not migration journal; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`feature_key`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline chat_workspace_rollout.tenant_id; see source dictionary and normative lifecycle |
| feature_key | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_workspace_rollout.feature_key; see source dictionary and normative lifecycle |
| state | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline chat_workspace_rollout.state; see source dictionary and normative lifecycle |
| watermark | json | NOT NULL; DEFAULT json_object() | Preserved baseline chat_workspace_rollout.watermark; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline chat_workspace_rollout.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`state` in (_utf8mb4'disabled',_utf8mb4'backfilling',_utf8mb4'ready'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.consumer_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.consumer_inbox; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Eight Chat handler legacy dedup receipts; producer is logical; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Eight Chat handler legacy dedup receipts; producer is logical; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`event_id`); KEY `tenant_id` (`tenant_id`,`event_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+event_id → outbox_event: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `tenant_id` (`tenant_id`,`event_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline consumer_inbox.tenant_id; see source dictionary and normative lifecycle |
| consumer_name | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline consumer_inbox.consumer_name; see source dictionary and normative lifecycle |
| event_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline consumer_inbox.event_id; see source dictionary and normative lifecycle |
| status | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline consumer_inbox.status; see source dictionary and normative lifecycle |
| processed_at | datetime(6) | NULL; no default | Preserved baseline consumer_inbox.processed_at; see source dictionary and normative lifecycle |

CHECK: `(((`status` = _utf8mb4'processing') and (`processed_at` is null)) or ((`status` = _utf8mb4'completed') and (`processed_at` is not null)))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.conversation

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Thread lifecycle and canonical Contact/connection binding; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Thread lifecycle and canonical Contact/connection binding; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_conversation_channel` (`tenant_id`,`connection_id`,`channel`); KEY `ix_conversation_channel` (`tenant_id`,`channel`,`opened_at`,`record_id`); KEY `ix_conversation_channel_id` (`tenant_id`,`channel_id`,`opened_at`,`record_id`); KEY `ix_conversation_queue` (`tenant_id`,`opened_at`,`record_id`); PRIMARY KEY (`tenant_id`,`record_id`); UNIQUE KEY `tenant_id` (`tenant_id`,`active_identity_key`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`record_id`,`connection_id`); KEY `tenant_id_3` (`tenant_id`,`contact_identity_id`,`contact_id`,`connection_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+contact_identity_id+contact_id+connection_id → contact_identity: owner API reserve/admit/proof; see75-FK manifest; tenant_id+connection_id+channel → channel_connection: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `fk_conversation_channel` (`tenant_id`,`connection_id`,`channel`); KEY `ix_conversation_channel` (`tenant_id`,`channel`,`opened_at`,`record_id`); KEY `ix_conversation_channel_id` (`tenant_id`,`channel_id`,`opened_at`,`record_id`); KEY `ix_conversation_queue` (`tenant_id`,`opened_at`,`record_id`); UNIQUE KEY `tenant_id` (`tenant_id`,`active_identity_key`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`record_id`,`connection_id`); KEY `tenant_id_3` (`tenant_id`,`contact_identity_id`,`contact_id`,`connection_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation.tenant_id; see source dictionary and normative lifecycle |
| record_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation.record_id; see source dictionary and normative lifecycle |
| contact_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation.contact_id; see source dictionary and normative lifecycle |
| contact_identity_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation.contact_identity_id; see source dictionary and normative lifecycle |
| connection_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation.connection_id; see source dictionary and normative lifecycle |
| status | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; DEFAULT open | Preserved baseline conversation.status; see source dictionary and normative lifecycle |
| active_identity_key | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; GENERATED (case when (`status` in (_utf8mb4'open',_utf8mb4'pending')) then `contact_identity_id` else NULL end) | Preserved baseline conversation.active_identity_key; see source dictionary and normative lifecycle |
| opened_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation.opened_at; see source dictionary and normative lifecycle |
| closed_at | datetime(6) | NULL; no default | Preserved baseline conversation.closed_at; see source dictionary and normative lifecycle |
| channel | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; DEFAULT mock_messenger | Preserved baseline conversation.channel; see source dictionary and normative lifecycle |
| channel_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; GENERATED `connection_id` | Preserved baseline conversation.channel_id; see source dictionary and normative lifecycle |

CHECK: `(`status` in (_utf8mb4'open',_utf8mb4'pending',_utf8mb4'closed'))`; `(((`status` = _utf8mb4'closed') and (`closed_at` is not null)) or ((`status` <> _utf8mb4'closed') and (`closed_at` is null)))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_ibfk_1: (tenant_id,record_id) → crm_record(tenant_id,id).

## crm_chat.conversation_acquisition_session

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_acquisition_session; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Immutable episode/source and active-session uniqueness; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable episode/source and active-session uniqueness; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_acquisition_active` (`tenant_id`,`active_conversation_key`); UNIQUE KEY `uq_acquisition_binding` (`tenant_id`,`id`,`conversation_id`); UNIQUE KEY `uq_acquisition_sequence` (`tenant_id`,`conversation_id`,`sequence`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_acquisition_active` (`tenant_id`,`active_conversation_key`); UNIQUE KEY `uq_acquisition_binding` (`tenant_id`,`id`,`conversation_id`); UNIQUE KEY `uq_acquisition_sequence` (`tenant_id`,`conversation_id`,`sequence`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_acquisition_session.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_acquisition_session.id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_acquisition_session.conversation_id; see source dictionary and normative lifecycle |
| sequence | bigint unsigned | NOT NULL; no default | Preserved baseline conversation_acquisition_session.sequence; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline conversation_acquisition_session.version; see source dictionary and normative lifecycle |
| status | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_acquisition_session.status; see source dictionary and normative lifecycle |
| opening_reason | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_acquisition_session.opening_reason; see source dictionary and normative lifecycle |
| close_reason | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline conversation_acquisition_session.close_reason; see source dictionary and normative lifecycle |
| opened_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_acquisition_session.opened_at; see source dictionary and normative lifecycle |
| opening_occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_acquisition_session.opening_occurred_at; see source dictionary and normative lifecycle |
| closed_at | datetime(6) | NULL; no default | Preserved baseline conversation_acquisition_session.closed_at; see source dictionary and normative lifecycle |
| source_classification | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_acquisition_session.source_classification; see source dictionary and normative lifecycle |
| source_channel | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline conversation_acquisition_session.source_channel; see source dictionary and normative lifecycle |
| source_page_id | varchar(255) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_acquisition_session.source_page_id; see source dictionary and normative lifecycle |
| source_ad_id | varchar(255) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_acquisition_session.source_ad_id; see source dictionary and normative lifecycle |
| source_campaign_id | varchar(255) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_acquisition_session.source_campaign_id; see source dictionary and normative lifecycle |
| source_connection_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_acquisition_session.source_connection_id; see source dictionary and normative lifecycle |
| source_touchpoint_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_acquisition_session.source_touchpoint_id; see source dictionary and normative lifecycle |
| policy_version | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_acquisition_session.policy_version; see source dictionary and normative lifecycle |
| active_conversation_key | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; GENERATED (case when (`status` = _utf8mb4'active') then `conversation_id` else NULL end) | Preserved baseline conversation_acquisition_session.active_conversation_key; see source dictionary and normative lifecycle |

CHECK: `(((`status` = _utf8mb4'active') and (`closed_at` is null) and (`close_reason` is null)) or ((`status` = _utf8mb4'closed') and (`closed_at` is not null) and (`close_reason` is not null)))`; `(`sequence` >= 1)`; `(`version` >= 1)`; `(`status` in (_utf8mb4'active',_utf8mb4'closed'))`; `(`opening_reason` in (_utf8mb4'first_inbound',_utf8mb4'new_referral',_utf8mb4'after_close'))`; `((`close_reason` is null) or (`close_reason` in (_utf8mb4'agent_closed',_utf8mb4'new_referral')))`; `(`source_classification` in (_utf8mb4'organic',_utf8mb4'paid',_utf8mb4'unknown'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_acquisition_conversation: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.conversation_activity

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_activity; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Minimized source reference timeline, not remote note body; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Minimized source reference timeline, not remote note body; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | UNIQUE KEY `activity_order` (`tenant_id`,`conversation_id`,`activity_seq`); UNIQUE KEY `activity_provenance` (`tenant_id`,`source_service`,`source_kind`,`source_id`,`source_revision`,`conversation_id`); PRIMARY KEY (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `activity_order` (`tenant_id`,`conversation_id`,`activity_seq`); UNIQUE KEY `activity_provenance` (`tenant_id`,`source_service`,`source_kind`,`source_id`,`source_revision`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_activity.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_activity.id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_activity.conversation_id; see source dictionary and normative lifecycle |
| activity_seq | bigint unsigned | NOT NULL; no default | Preserved baseline conversation_activity.activity_seq; see source dictionary and normative lifecycle |
| source_service | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_activity.source_service; see source dictionary and normative lifecycle |
| source_kind | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_activity.source_kind; see source dictionary and normative lifecycle |
| source_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_activity.source_id; see source dictionary and normative lifecycle |
| source_revision | bigint unsigned | NOT NULL; no default | Preserved baseline conversation_activity.source_revision; see source dictionary and normative lifecycle |
| kind | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_activity.kind; see source dictionary and normative lifecycle |
| actor_kind | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline conversation_activity.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_activity.actor_id; see source dictionary and normative lifecycle |
| occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_activity.occurred_at; see source dictionary and normative lifecycle |
| recorded_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_activity.recorded_at; see source dictionary and normative lifecycle |
| payload | json | NOT NULL; no default | Preserved baseline conversation_activity.payload; see source dictionary and normative lifecycle |

CHECK: `(`activity_seq` > 0)`; `(`source_revision` > 0)`; `(`source_service` in (_utf8mb4'chat',_utf8mb4'crm',_utf8mb4'workflow',_utf8mb4'chatflow'))`; `(`kind` in (_utf8mb4'message',_utf8mb4'note',_utf8mb4'assignment',_utf8mb4'lifecycle',_utf8mb4'snooze',_utf8mb4'tags',_utf8mb4'automation'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_activity_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.conversation_activity_counter

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_activity_counter; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Per-thread activity sequence allocator; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-thread activity sequence allocator; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_activity_counter.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_activity_counter.conversation_id; see source dictionary and normative lifecycle |
| last_seq | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline conversation_activity_counter.last_seq; see source dictionary and normative lifecycle |
| backfilled | tinyint(1) | NOT NULL; DEFAULT 0 | Preserved baseline conversation_activity_counter.backfilled; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_activity_counter_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.conversation_read_state

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_read_state; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Monotonic per-Human read marker; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Monotonic per-Human read marker; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`,`principal_id`); KEY `read_principal` (`tenant_id`,`principal_id`,`conversation_id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `read_principal` (`tenant_id`,`principal_id`,`conversation_id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_read_state.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_read_state.conversation_id; see source dictionary and normative lifecycle |
| principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_read_state.principal_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_read_state.id; see source dictionary and normative lifecycle |
| last_read_inbound_seq | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline conversation_read_state.last_read_inbound_seq; see source dictionary and normative lifecycle |
| revision | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline conversation_read_state.revision; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_read_state.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`revision` > 0)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_read_state_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.conversation_snooze

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_snooze; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Deadline overlay; not ownership/lifecycle; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Deadline overlay; not ownership/lifecycle; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`); KEY `snooze_due` (`until_at`,`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `snooze_due` (`until_at`,`tenant_id`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_snooze.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_snooze.conversation_id; see source dictionary and normative lifecycle |
| until_at | datetime(6) | NULL; no default | Preserved baseline conversation_snooze.until_at; see source dictionary and normative lifecycle |
| revision | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline conversation_snooze.revision; see source dictionary and normative lifecycle |
| actor_principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline conversation_snooze.actor_principal_id; see source dictionary and normative lifecycle |
| reason | varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline conversation_snooze.reason; see source dictionary and normative lifecycle |
| last_cause | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_snooze.last_cause; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_snooze.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`revision` > 0)`; `(`last_cause` in (_utf8mb4'scheduled',_utf8mb4'rescheduled',_utf8mb4'deadline',_utf8mb4'inbound',_utf8mb4'manual',_utf8mb4'assignment',_utf8mb4'closed'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_snooze_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.conversation_tag

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_tag; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Versioned tenant tag definitions including archived; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Versioned tenant tag definitions including archived; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`normalized_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `tenant_id` (`tenant_id`,`normalized_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_tag.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_tag.id; see source dictionary and normative lifecycle |
| name | varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_tag.name; see source dictionary and normative lifecycle |
| normalized_name | varbinary(256) | NOT NULL; no default | Preserved baseline conversation_tag.normalized_name; see source dictionary and normative lifecycle |
| color | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline conversation_tag.color; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline conversation_tag.version; see source dictionary and normative lifecycle |
| archived_at | datetime(6) | NULL; no default | Preserved baseline conversation_tag.archived_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_tag.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_tag.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` > 0)`; `(`color` in (_utf8mb4'gray',_utf8mb4'blue',_utf8mb4'green',_utf8mb4'amber',_utf8mb4'red',_utf8mb4'purple'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.conversation_tag_link

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_tag_link; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Conversation tag membership; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Conversation tag membership; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`,`tag_id`); KEY `tag_conversations` (`tenant_id`,`tag_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `tag_conversations` (`tenant_id`,`tag_id`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE/DELETE; chat_worker: SELECT/INSERT/UPDATE/DELETE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_tag_link.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_tag_link.conversation_id; see source dictionary and normative lifecycle |
| tag_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_tag_link.tag_id; see source dictionary and normative lifecycle |
| actor_principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_tag_link.actor_principal_id; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_tag_link.created_at; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_tag_link_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id); conversation_tag_link_ibfk_2: (tenant_id,tag_id) → conversation_tag(tenant_id,id).

## crm_chat.conversation_workspace

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.conversation_workspace; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Retained unread/coverage/waiting projection; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Retained unread/coverage/waiting projection; no replica authorization or remote business authority |
| Loại dữ liệu | retained projection |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`); KEY `workspace_latest` (`tenant_id`,`last_message_at`,`conversation_id`); KEY `workspace_snooze` (`tenant_id`,`snoozed_until`,`conversation_id`); KEY `workspace_waiting` (`tenant_id`,`waiting_since`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `workspace_latest` (`tenant_id`,`last_message_at`,`conversation_id`); KEY `workspace_snooze` (`tenant_id`,`snoozed_until`,`conversation_id`); KEY `workspace_waiting` (`tenant_id`,`waiting_since`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_workspace.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline conversation_workspace.conversation_id; see source dictionary and normative lifecycle |
| latest_inbound_seq | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline conversation_workspace.latest_inbound_seq; see source dictionary and normative lifecycle |
| answered_inbound_seq | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline conversation_workspace.answered_inbound_seq; see source dictionary and normative lifecycle |
| last_message_at | datetime(6) | NOT NULL; no default | Preserved baseline conversation_workspace.last_message_at; see source dictionary and normative lifecycle |
| waiting_since | datetime(6) | NULL; no default | Preserved baseline conversation_workspace.waiting_since; see source dictionary and normative lifecycle |
| waiting_metric_state | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; DEFAULT ready | Preserved baseline conversation_workspace.waiting_metric_state; see source dictionary and normative lifecycle |
| tag_set_revision | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline conversation_workspace.tag_set_revision; see source dictionary and normative lifecycle |
| snoozed_until | datetime(6) | NULL; no default | Preserved baseline conversation_workspace.snoozed_until; see source dictionary and normative lifecycle |
| snooze_revision | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline conversation_workspace.snooze_revision; see source dictionary and normative lifecycle |

CHECK: `(`answered_inbound_seq` <= `latest_inbound_seq`)`; `(`waiting_metric_state` in (_utf8mb4'ready',_utf8mb4'unavailable'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: conversation_workspace_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.crm_record

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.crm_record; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Conversation-only local metadata/owner/version/custom values; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Conversation-only local metadata/owner/version/custom values; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `ix_record_owner` (`tenant_id`,`object_type_id`,`owner_principal_id`,`updated_at`,`id`); KEY `ix_record_team` (`tenant_id`,`object_type_id`,`team_id`,`updated_at`,`id`); PRIMARY KEY (`id`); KEY `tenant_id` (`tenant_id`,`owner_principal_id`); KEY `tenant_id_2` (`tenant_id`,`team_id`); UNIQUE KEY `tenant_id_3` (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+object_type_id → object_type: owner API reserve/admit/proof; see75-FK manifest; tenant_id+owner_principal_id → principal: owner API reserve/admit/proof; see75-FK manifest; tenant_id+team_id → team: owner API reserve/admit/proof; see75-FK manifest; tenant_id → tenant: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `ix_record_owner` (`tenant_id`,`object_type_id`,`owner_principal_id`,`updated_at`,`id`); KEY `ix_record_team` (`tenant_id`,`object_type_id`,`team_id`,`updated_at`,`id`); KEY `tenant_id` (`tenant_id`,`owner_principal_id`); KEY `tenant_id_2` (`tenant_id`,`team_id`); UNIQUE KEY `tenant_id_3` (`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline crm_record.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline crm_record.tenant_id; see source dictionary and normative lifecycle |
| object_type_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline crm_record.object_type_id; see source dictionary and normative lifecycle |
| owner_principal_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline crm_record.owner_principal_id; see source dictionary and normative lifecycle |
| team_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline crm_record.team_id; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline crm_record.version; see source dictionary and normative lifecycle |
| owner_revision | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline crm_record.owner_revision; see source dictionary and normative lifecycle |
| custom_values | json | NOT NULL; DEFAULT json_object() | Preserved baseline crm_record.custom_values; see source dictionary and normative lifecycle |
| archived_at | datetime(6) | NULL; no default | Preserved baseline crm_record.archived_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline crm_record.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline crm_record.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `(`owner_revision` >= 1)`; `(json_type(`custom_values`) = _utf8mb4'OBJECT')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.idempotency_record

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.idempotency_record; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Exact legacy HTTP receipt identity/expiry/result; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Exact legacy HTTP receipt identity/expiry/result; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `ix_receipt_expiry` (`expires_at`); PRIMARY KEY (`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`actor_kind`,`actor_id`,`route_key`,`key`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id → tenant: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `ix_receipt_expiry` (`expires_at`); UNIQUE KEY `tenant_id` (`tenant_id`,`actor_kind`,`actor_id`,`route_key`,`key`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE/DELETE; chat_worker: SELECT/INSERT/UPDATE/DELETE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.tenant_id; see source dictionary and normative lifecycle |
| actor_kind | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.actor_id; see source dictionary and normative lifecycle |
| route_key | varchar(512) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.route_key; see source dictionary and normative lifecycle |
| key | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.key; see source dictionary and normative lifecycle |
| request_hash | char(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.request_hash; see source dictionary and normative lifecycle |
| status | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline idempotency_record.status; see source dictionary and normative lifecycle |
| response_status | int | NULL; no default | Preserved baseline idempotency_record.response_status; see source dictionary and normative lifecycle |
| response_body | json | NULL; no default | Preserved baseline idempotency_record.response_body; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline idempotency_record.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline idempotency_record.updated_at; see source dictionary and normative lifecycle |
| expires_at | datetime(6) | NULL; no default | Preserved baseline idempotency_record.expires_at; see source dictionary and normative lifecycle |

CHECK: `(`actor_kind` in (_ascii'human',_ascii'ai',_ascii'service',_ascii'system'))`; `(`status` in (_ascii'pending',_ascii'completed'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.message

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.message; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Original message timeline and outbound state; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Original message timeline and outbound state; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `ix_message_timeline` (`tenant_id`,`conversation_id`,`received_at`,`id`); PRIMARY KEY (`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`connection_id`,`provider_message_id`); UNIQUE KEY `tenant_id_3` (`tenant_id`,`outbound_intent_id`); KEY `tenant_id_4` (`tenant_id`,`conversation_id`,`connection_id`); KEY `tenant_id_5` (`tenant_id`,`outbound_intent_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_message_timeline` (`tenant_id`,`conversation_id`,`received_at`,`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`connection_id`,`provider_message_id`); UNIQUE KEY `tenant_id_3` (`tenant_id`,`outbound_intent_id`); KEY `tenant_id_4` (`tenant_id`,`conversation_id`,`connection_id`); KEY `tenant_id_5` (`tenant_id`,`outbound_intent_id`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message.conversation_id; see source dictionary and normative lifecycle |
| connection_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message.connection_id; see source dictionary and normative lifecycle |
| provider_message_id | varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline message.provider_message_id; see source dictionary and normative lifecycle |
| outbound_intent_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline message.outbound_intent_id; see source dictionary and normative lifecycle |
| direction | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline message.direction; see source dictionary and normative lifecycle |
| text | text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline message.text; see source dictionary and normative lifecycle |
| occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline message.occurred_at; see source dictionary and normative lifecycle |
| received_at | datetime(6) | NOT NULL; no default | Preserved baseline message.received_at; see source dictionary and normative lifecycle |
| status | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline message.status; see source dictionary and normative lifecycle |

CHECK: `(`direction` in (_utf8mb4'inbound',_utf8mb4'outbound'))`; `(char_length(`text`) between 1 and 4000)`; `(`status` in (_utf8mb4'received',_utf8mb4'queued',_utf8mb4'sending',_utf8mb4'sent',_utf8mb4'failed',_utf8mb4'unknown',_utf8mb4'cancelled'))`; `(((`direction` = _utf8mb4'inbound') and (`status` = _utf8mb4'received') and (`outbound_intent_id` is null) and (`provider_message_id` is not null)) or ((`direction` = _utf8mb4'outbound') and (`status` <> _utf8mb4'received') and (`outbound_intent_id` is not null)))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: message_ibfk_1: (tenant_id,conversation_id,connection_id) → conversation(tenant_id,record_id,connection_id); message_ibfk_2: (tenant_id,outbound_intent_id,conversation_id) → outbound_intent(tenant_id,id,conversation_id).

## crm_chat.message_acquisition_membership

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.message_acquisition_membership; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Message to episode resolution; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Message to episode resolution; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_acquisition_member_session` (`tenant_id`,`session_id`,`conversation_id`); KEY `ix_acquisition_message` (`tenant_id`,`session_id`,`message_id`); PRIMARY KEY (`tenant_id`,`message_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `fk_acquisition_member_session` (`tenant_id`,`session_id`,`conversation_id`); KEY `ix_acquisition_message` (`tenant_id`,`session_id`,`message_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_acquisition_membership.tenant_id; see source dictionary and normative lifecycle |
| message_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_acquisition_membership.message_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_acquisition_membership.conversation_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline message_acquisition_membership.session_id; see source dictionary and normative lifecycle |
| resolution | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline message_acquisition_membership.resolution; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline message_acquisition_membership.created_at; see source dictionary and normative lifecycle |

CHECK: `(((`resolution` = _utf8mb4'assigned') and (`session_id` is not null)) or ((`resolution` <> _utf8mb4'assigned') and (`session_id` is null)))`; `(`resolution` in (_utf8mb4'assigned',_utf8mb4'unresolved_late',_utf8mb4'unresolved_legacy'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_acquisition_member_session: (tenant_id,session_id,conversation_id) → conversation_acquisition_session(tenant_id,id,conversation_id); fk_acquisition_message: (tenant_id,message_id) → message(tenant_id,id).

## crm_chat.message_content

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.message_content; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Versioned original rich message JSON; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Versioned original rich message JSON; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`message_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_content.tenant_id; see source dictionary and normative lifecycle |
| message_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_content.message_id; see source dictionary and normative lifecycle |
| content | json | NOT NULL; no default | Preserved baseline message_content.content; see source dictionary and normative lifecycle |

CHECK: `(json_type(`content`) = _utf8mb4'OBJECT')`; `(length(`content`) <= 65536)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: message_content_ibfk_1: (tenant_id,message_id) → message(tenant_id,id).

## crm_chat.message_workspace

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.message_workspace; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Inbound sequence and reply coverage evidence; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Inbound sequence and reply coverage evidence; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`message_id`); UNIQUE KEY `tenant_id` (`tenant_id`,`conversation_id`,`inbound_seq`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `tenant_id` (`tenant_id`,`conversation_id`,`inbound_seq`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_workspace.tenant_id; see source dictionary and normative lifecycle |
| message_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_workspace.message_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline message_workspace.conversation_id; see source dictionary and normative lifecycle |
| inbound_seq | bigint unsigned | NULL; no default | Preserved baseline message_workspace.inbound_seq; see source dictionary and normative lifecycle |
| reply_through_inbound_seq | bigint unsigned | NULL; no default | Preserved baseline message_workspace.reply_through_inbound_seq; see source dictionary and normative lifecycle |

CHECK: `((`inbound_seq` is null) or (`inbound_seq` > 0))`; `((`inbound_seq` is null) or (`reply_through_inbound_seq` is null))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: message_workspace_ibfk_1: (tenant_id,message_id) → message(tenant_id,id); message_workspace_ibfk_2: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.need_assessment

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.need_assessment; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Current need values, Human pins and AI proposal; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Current need values, Human pins and AI proposal; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_need_assessment_need` (`tenant_id`,`session_id`,`need_id`); PRIMARY KEY (`tenant_id`,`need_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `fk_need_assessment_need` (`tenant_id`,`session_id`,`need_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment.tenant_id; see source dictionary and normative lifecycle |
| need_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment.need_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment.conversation_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment.session_id; see source dictionary and normative lifecycle |
| values_json | json | NOT NULL; no default | Preserved baseline need_assessment.values_json; see source dictionary and normative lifecycle |
| pinned_json | json | NOT NULL; no default | Preserved baseline need_assessment.pinned_json; see source dictionary and normative lifecycle |
| proposal_json | json | NOT NULL; no default | Preserved baseline need_assessment.proposal_json; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; no default | Preserved baseline need_assessment.version; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline need_assessment.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline need_assessment.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_need_assessment_need: (tenant_id,session_id,need_id) → session_need(tenant_id,session_id,id).

## crm_chat.need_assessment_revision

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.need_assessment_revision; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Immutable assessment revision history; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable assessment revision history; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`need_id`,`version`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment_revision.tenant_id; see source dictionary and normative lifecycle |
| need_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment_revision.need_id; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; no default | Preserved baseline need_assessment_revision.version; see source dictionary and normative lifecycle |
| values_json | json | NOT NULL; no default | Preserved baseline need_assessment_revision.values_json; see source dictionary and normative lifecycle |
| pinned_json | json | NOT NULL; no default | Preserved baseline need_assessment_revision.pinned_json; see source dictionary and normative lifecycle |
| proposal_json | json | NOT NULL; no default | Preserved baseline need_assessment_revision.proposal_json; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_assessment_revision.actor_id; see source dictionary and normative lifecycle |
| recorded_at | datetime(6) | NOT NULL; no default | Preserved baseline need_assessment_revision.recorded_at; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.need_follow_up

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.need_follow_up; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Permanent original-need dedup and recovery episode; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Permanent original-need dedup and recovery episode; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`need_id`); UNIQUE KEY `uq_need_follow_up_session` (`tenant_id`,`session_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_need_follow_up_session` (`tenant_id`,`session_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_follow_up.tenant_id; see source dictionary and normative lifecycle |
| need_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_follow_up.need_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_follow_up.conversation_id; see source dictionary and normative lifecycle |
| source_session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_follow_up.source_session_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_follow_up.session_id; see source dictionary and normative lifecycle |
| run_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline need_follow_up.run_id; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline need_follow_up.created_at; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.outbound_intent

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.outbound_intent; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Durable actor/owner-bound send intent, unknown delivery retained; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable actor/owner-bound send intent, unknown delivery retained; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `account_id` (`account_id`); KEY `ix_outbound_work` (`status`,`created_at`,`id`); PRIMARY KEY (`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`id`,`conversation_id`); UNIQUE KEY `tenant_id_3` (`tenant_id`,`actor_id`,`idempotency_key`); KEY `tenant_id_4` (`tenant_id`,`conversation_id`); KEY `tenant_id_5` (`tenant_id`,`chatflow_session_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+actor_id → principal: owner API reserve/admit/proof; see75-FK manifest; account_id → account: owner API reserve/admit/proof; see75-FK manifest; tenant_id+chatflow_session_id+conversation_id → chatflow_session: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `account_id` (`account_id`); KEY `ix_outbound_work` (`status`,`created_at`,`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`); UNIQUE KEY `tenant_id_2` (`tenant_id`,`id`,`conversation_id`); UNIQUE KEY `tenant_id_3` (`tenant_id`,`actor_id`,`idempotency_key`); KEY `tenant_id_4` (`tenant_id`,`conversation_id`); KEY `tenant_id_5` (`tenant_id`,`chatflow_session_id`,`conversation_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbound_intent.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbound_intent.tenant_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbound_intent.conversation_id; see source dictionary and normative lifecycle |
| actor_kind | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline outbound_intent.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbound_intent.actor_id; see source dictionary and normative lifecycle |
| account_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline outbound_intent.account_id; see source dictionary and normative lifecycle |
| owner_revision | bigint unsigned | NOT NULL; no default | Preserved baseline outbound_intent.owner_revision; see source dictionary and normative lifecycle |
| text | text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline outbound_intent.text; see source dictionary and normative lifecycle |
| status | varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline outbound_intent.status; see source dictionary and normative lifecycle |
| idempotency_key | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbound_intent.idempotency_key; see source dictionary and normative lifecycle |
| provider_message_id | varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline outbound_intent.provider_message_id; see source dictionary and normative lifecycle |
| error_code | varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NULL; no default | Preserved baseline outbound_intent.error_code; see source dictionary and normative lifecycle |
| dispatch_token | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline outbound_intent.dispatch_token; see source dictionary and normative lifecycle |
| sending_at | datetime(6) | NULL; no default | Preserved baseline outbound_intent.sending_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline outbound_intent.created_at; see source dictionary and normative lifecycle |
| chatflow_session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline outbound_intent.chatflow_session_id; see source dictionary and normative lifecycle |

CHECK: `(`status` in (_utf8mb4'queued',_utf8mb4'sending',_utf8mb4'sent',_utf8mb4'failed',_utf8mb4'unknown',_utf8mb4'cancelled',_utf8mb4'remote_queued',_utf8mb4'remote_sending',_utf8mb4'remote_unknown'))`; `(`actor_kind` in (_utf8mb4'human',_utf8mb4'ai'))`; `(`owner_revision` >= 1)`; `(char_length(`text`) between 1 and 4000)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: outbound_intent_ibfk_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.outbox_event

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.outbox_event; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Chat-produced legacy events and scheduler state; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Chat-produced legacy events and scheduler state; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `ix_outbox_lease` (`status`,`lease_until`); KEY `ix_outbox_ready` (`status`,`next_attempt_at`); PRIMARY KEY (`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id → tenant: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `ix_outbox_lease` (`status`,`lease_until`); KEY `ix_outbox_ready` (`status`,`next_attempt_at`); UNIQUE KEY `tenant_id` (`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.tenant_id; see source dictionary and normative lifecycle |
| event_type | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.event_type; see source dictionary and normative lifecycle |
| schema_version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline outbox_event.schema_version; see source dictionary and normative lifecycle |
| aggregate_type | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.aggregate_type; see source dictionary and normative lifecycle |
| aggregate_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.aggregate_id; see source dictionary and normative lifecycle |
| aggregate_version | bigint unsigned | NOT NULL; no default | Preserved baseline outbox_event.aggregate_version; see source dictionary and normative lifecycle |
| payload | json | NOT NULL; no default | Preserved baseline outbox_event.payload; see source dictionary and normative lifecycle |
| correlation_id | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.correlation_id; see source dictionary and normative lifecycle |
| causation_id | varchar(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline outbox_event.causation_id; see source dictionary and normative lifecycle |
| actor_kind | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.actor_id; see source dictionary and normative lifecycle |
| occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline outbox_event.occurred_at; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline outbox_event.created_at; see source dictionary and normative lifecycle |
| status | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline outbox_event.status; see source dictionary and normative lifecycle |
| attempts | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline outbox_event.attempts; see source dictionary and normative lifecycle |
| next_attempt_at | datetime(6) | NULL; no default | Preserved baseline outbox_event.next_attempt_at; see source dictionary and normative lifecycle |
| lease_until | datetime(6) | NULL; no default | Preserved baseline outbox_event.lease_until; see source dictionary and normative lifecycle |
| fencing_token | bigint unsigned | NOT NULL; DEFAULT 0 | Preserved baseline outbox_event.fencing_token; see source dictionary and normative lifecycle |

CHECK: `(`aggregate_version` >= 1)`; `(`schema_version` >= 1)`; `(`actor_kind` in (_ascii'human',_ascii'ai',_ascii'service',_ascii'system'))`; `(`status` in (_ascii'pending',_ascii'processing',_ascii'dispatched',_ascii'failed'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.ownership_history

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.ownership_history; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Conversation-only immutable owner/team history; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Conversation-only immutable owner/team history; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`id`); UNIQUE KEY `tenant_id` (`tenant_id`,`record_id`,`owner_revision`); KEY `tenant_id_2` (`tenant_id`,`from_owner_id`); KEY `tenant_id_3` (`tenant_id`,`to_owner_id`); KEY `tenant_id_4` (`tenant_id`,`from_team_id`); KEY `tenant_id_5` (`tenant_id`,`to_team_id`); UNIQUE KEY `tenant_id_6` (`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+from_owner_id → principal: owner API reserve/admit/proof; see75-FK manifest; tenant_id+to_owner_id → principal: owner API reserve/admit/proof; see75-FK manifest; tenant_id+from_team_id → team: owner API reserve/admit/proof; see75-FK manifest; tenant_id+to_team_id → team: owner API reserve/admit/proof; see75-FK manifest; tenant_id → tenant: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | UNIQUE KEY `tenant_id` (`tenant_id`,`record_id`,`owner_revision`); KEY `tenant_id_2` (`tenant_id`,`from_owner_id`); KEY `tenant_id_3` (`tenant_id`,`to_owner_id`); KEY `tenant_id_4` (`tenant_id`,`from_team_id`); KEY `tenant_id_5` (`tenant_id`,`to_team_id`); UNIQUE KEY `tenant_id_6` (`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline ownership_history.id; see source dictionary and normative lifecycle |
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline ownership_history.tenant_id; see source dictionary and normative lifecycle |
| record_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline ownership_history.record_id; see source dictionary and normative lifecycle |
| from_owner_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline ownership_history.from_owner_id; see source dictionary and normative lifecycle |
| to_owner_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline ownership_history.to_owner_id; see source dictionary and normative lifecycle |
| from_team_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline ownership_history.from_team_id; see source dictionary and normative lifecycle |
| to_team_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline ownership_history.to_team_id; see source dictionary and normative lifecycle |
| owner_revision | bigint unsigned | NOT NULL; no default | Preserved baseline ownership_history.owner_revision; see source dictionary and normative lifecycle |
| reason | text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline ownership_history.reason; see source dictionary and normative lifecycle |
| actor_kind | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline ownership_history.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline ownership_history.actor_id; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline ownership_history.created_at; see source dictionary and normative lifecycle |

CHECK: `(`owner_revision` >= 1)`; `(`actor_kind` in (_utf8mb4'human',_utf8mb4'ai',_utf8mb4'service',_utf8mb4'system'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: ownership_history_ibfk_1: (tenant_id,record_id) → crm_record(tenant_id,id).

## crm_chat.property_index_value

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.property_index_value; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Conversation typed custom-value query index; Core definitions remote; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Conversation typed custom-value query index; Core definitions remote; no replica authorization or remote business authority |
| Loại dữ liệu | retained projection |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `ix_property_boolean` (`tenant_id`,`property_id`,`boolean_value`,`record_id`); KEY `ix_property_date` (`tenant_id`,`property_id`,`date_value`,`record_id`); KEY `ix_property_datetime` (`tenant_id`,`property_id`,`datetime_value`,`record_id`); KEY `ix_property_decimal` (`tenant_id`,`property_id`,`decimal_value`,`record_id`); KEY `ix_property_integer` (`tenant_id`,`property_id`,`integer_value`,`record_id`); KEY `ix_property_string` (`tenant_id`,`property_id`,`string_value`,`record_id`); PRIMARY KEY (`tenant_id`,`record_id`,`property_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+property_id → property_definition: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `ix_property_boolean` (`tenant_id`,`property_id`,`boolean_value`,`record_id`); KEY `ix_property_date` (`tenant_id`,`property_id`,`date_value`,`record_id`); KEY `ix_property_datetime` (`tenant_id`,`property_id`,`datetime_value`,`record_id`); KEY `ix_property_decimal` (`tenant_id`,`property_id`,`decimal_value`,`record_id`); KEY `ix_property_integer` (`tenant_id`,`property_id`,`integer_value`,`record_id`); KEY `ix_property_string` (`tenant_id`,`property_id`,`string_value`,`record_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE/DELETE; chat_worker: SELECT/INSERT/UPDATE/DELETE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline property_index_value.tenant_id; see source dictionary and normative lifecycle |
| record_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline property_index_value.record_id; see source dictionary and normative lifecycle |
| property_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline property_index_value.property_id; see source dictionary and normative lifecycle |
| value_kind | varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline property_index_value.value_kind; see source dictionary and normative lifecycle |
| string_value | varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin | NULL; no default | Preserved baseline property_index_value.string_value; see source dictionary and normative lifecycle |
| integer_value | bigint | NULL; no default | Preserved baseline property_index_value.integer_value; see source dictionary and normative lifecycle |
| decimal_value | decimal(20,6) | NULL; no default | Preserved baseline property_index_value.decimal_value; see source dictionary and normative lifecycle |
| boolean_value | tinyint | NULL; no default | Preserved baseline property_index_value.boolean_value; see source dictionary and normative lifecycle |
| date_value | date | NULL; no default | Preserved baseline property_index_value.date_value; see source dictionary and normative lifecycle |
| datetime_value | datetime(6) | NULL; no default | Preserved baseline property_index_value.datetime_value; see source dictionary and normative lifecycle |

CHECK: `(((((((`string_value` is not null) + (`integer_value` is not null)) + (`decimal_value` is not null)) + (`boolean_value` is not null)) + (`date_value` is not null)) + (`datetime_value` is not null)) = 1)`; `(((`value_kind` = _utf8mb4'string') and (`string_value` is not null)) or ((`value_kind` = _utf8mb4'integer') and (`integer_value` is not null)) or ((`value_kind` = _utf8mb4'decimal') and (`decimal_value` is not null)) or ((`value_kind` = _utf8mb4'boolean') and (`boolean_value` is not null)) or ((`value_kind` = _utf8mb4'date') and (`date_value` is not null)) or ((`value_kind` = _utf8mb4'datetime') and (`datetime_value` is not null)))`; `((`boolean_value` is null) or (`boolean_value` in (0,1)))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: property_index_value_ibfk_1: (tenant_id,record_id) → crm_record(tenant_id,id).

## crm_chat.record_team_access

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.record_team_access; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Conversation-only explicit team shares; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Conversation-only explicit team shares; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`record_id`,`team_id`); KEY `tenant_id` (`tenant_id`,`team_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | tenant_id+team_id → team: owner API reserve/admit/proof; see75-FK manifest |
| Query patterns / indexes | KEY `tenant_id` (`tenant_id`,`team_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline record_team_access.tenant_id; see source dictionary and normative lifecycle |
| record_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline record_team_access.record_id; see source dictionary and normative lifecycle |
| team_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline record_team_access.team_id; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: record_team_access_ibfk_1: (tenant_id,record_id) → crm_record(tenant_id,id).

## crm_chat.session_classification

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_classification; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Episode custom values and version; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Episode custom values and version; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`session_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_classification.tenant_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_classification.session_id; see source dictionary and normative lifecycle |
| values_json | json | NOT NULL; no default | Preserved baseline session_classification.values_json; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline session_classification.version; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline session_classification.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline session_classification.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_session_classification_session: (tenant_id,session_id) → conversation_acquisition_session(tenant_id,id).

## crm_chat.session_contribution

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_contribution; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Immutable source/version handling evidence; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable source/version handling evidence; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `ix_session_contribution_thread` (`tenant_id`,`conversation_id`,`session_id`); PRIMARY KEY (`tenant_id`,`session_id`,`revision`); UNIQUE KEY `uq_session_contribution_source` (`tenant_id`,`session_id`,`kind`,`source_id`,`source_revision`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_session_contribution_thread` (`tenant_id`,`conversation_id`,`session_id`); UNIQUE KEY `uq_session_contribution_source` (`tenant_id`,`session_id`,`kind`,`source_id`,`source_revision`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.tenant_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.session_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.conversation_id; see source dictionary and normative lifecycle |
| revision | bigint unsigned | NOT NULL; no default | Preserved baseline session_contribution.revision; see source dictionary and normative lifecycle |
| kind | varchar(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.kind; see source dictionary and normative lifecycle |
| source_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.source_id; see source dictionary and normative lifecycle |
| source_revision | varchar(20) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_contribution.source_revision; see source dictionary and normative lifecycle |
| actor_kind | varchar(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_contribution.actor_kind; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_contribution.actor_id; see source dictionary and normative lifecycle |
| owner_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_contribution.owner_id; see source dictionary and normative lifecycle |
| team_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_contribution.team_id; see source dictionary and normative lifecycle |
| owner_revision | bigint unsigned | NOT NULL; no default | Preserved baseline session_contribution.owner_revision; see source dictionary and normative lifecycle |
| payload | json | NOT NULL; no default | Preserved baseline session_contribution.payload; see source dictionary and normative lifecycle |
| recorded_at | datetime(6) | NOT NULL; no default | Preserved baseline session_contribution.recorded_at; see source dictionary and normative lifecycle |

CHECK: `(`revision` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_session_contribution_session: (tenant_id,session_id) → conversation_acquisition_session(tenant_id,id).

## crm_chat.session_milestone_event

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_milestone_event; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Append-only need milestone correction chain; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Append-only need milestone correction chain; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_milestone_need` (`tenant_id`,`session_id`,`need_id`); KEY `fk_milestone_parent` (`tenant_id`,`session_id`,`supersedes_id`); KEY `ix_milestone_asof` (`tenant_id`,`session_id`,`recorded_at`); PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_milestone_correction` (`tenant_id`,`supersedes_id`); UNIQUE KEY `uq_milestone_revision` (`tenant_id`,`session_id`,`revision`); UNIQUE KEY `uq_milestone_session` (`tenant_id`,`session_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `fk_milestone_need` (`tenant_id`,`session_id`,`need_id`); KEY `fk_milestone_parent` (`tenant_id`,`session_id`,`supersedes_id`); KEY `ix_milestone_asof` (`tenant_id`,`session_id`,`recorded_at`); UNIQUE KEY `uq_milestone_correction` (`tenant_id`,`supersedes_id`); UNIQUE KEY `uq_milestone_revision` (`tenant_id`,`session_id`,`revision`); UNIQUE KEY `uq_milestone_session` (`tenant_id`,`session_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_milestone_event.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_milestone_event.id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_milestone_event.session_id; see source dictionary and normative lifecycle |
| need_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_milestone_event.need_id; see source dictionary and normative lifecycle |
| revision | bigint unsigned | NOT NULL; no default | Preserved baseline session_milestone_event.revision; see source dictionary and normative lifecycle |
| milestone_key | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_milestone_event.milestone_key; see source dictionary and normative lifecycle |
| kind | varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline session_milestone_event.kind; see source dictionary and normative lifecycle |
| supersedes_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_milestone_event.supersedes_id; see source dictionary and normative lifecycle |
| message_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_milestone_event.message_id; see source dictionary and normative lifecycle |
| reason | varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline session_milestone_event.reason; see source dictionary and normative lifecycle |
| occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline session_milestone_event.occurred_at; see source dictionary and normative lifecycle |
| recorded_at | datetime(6) | NOT NULL; no default | Preserved baseline session_milestone_event.recorded_at; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_milestone_event.actor_id; see source dictionary and normative lifecycle |

CHECK: `(((`kind` = _utf8mb4'record') and (`supersedes_id` is null)) or ((`kind` in (_utf8mb4'replace',_utf8mb4'retract')) and (`supersedes_id` is not null)))`; `(`kind` in (_utf8mb4'record',_utf8mb4'replace',_utf8mb4'retract'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_milestone_need: (tenant_id,session_id,need_id) → session_need(tenant_id,session_id,id); fk_milestone_parent: (tenant_id,session_id,supersedes_id) → session_milestone_event(tenant_id,session_id,id).

## crm_chat.session_need

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_need; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Need identity within episode; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Need identity within episode; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_session_need` (`tenant_id`,`session_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_session_need` (`tenant_id`,`session_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_need.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_need.id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_need.session_id; see source dictionary and normative lifecycle |
| label | varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline session_need.label; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline session_need.created_at; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_need.actor_id; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_need_progress: (tenant_id,session_id) → session_progress(tenant_id,session_id).

## crm_chat.session_process_head

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_process_head; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Tenant process publication head; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Tenant process publication head; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_process_head.tenant_id; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; no default | Preserved baseline session_process_head.version; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline session_process_head.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline session_process_head.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.session_process_version

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_process_version; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Immutable pinned process definition; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable pinned process definition; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`version`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_process_version.tenant_id; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; no default | Preserved baseline session_process_version.version; see source dictionary and normative lifecycle |
| definition | json | NOT NULL; no default | Preserved baseline session_process_version.definition; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline session_process_version.created_at; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Preserved baseline session_process_version.actor_id; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.session_progress

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_progress; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Episode stage/process/version and coverage; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Episode stage/process/version and coverage; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_session_progress_process` (`tenant_id`,`process_version`); PRIMARY KEY (`tenant_id`,`session_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `fk_session_progress_process` (`tenant_id`,`process_version`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_progress.tenant_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_progress.session_id; see source dictionary and normative lifecycle |
| process_version | bigint unsigned | NOT NULL; no default | Preserved baseline session_progress.process_version; see source dictionary and normative lifecycle |
| stage_key | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_progress.stage_key; see source dictionary and normative lifecycle |
| version | bigint unsigned | NOT NULL; DEFAULT 1 | Preserved baseline session_progress.version; see source dictionary and normative lifecycle |
| coverage | varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline session_progress.coverage; see source dictionary and normative lifecycle |
| created_at | datetime(6) | NOT NULL; no default | Preserved baseline session_progress.created_at; see source dictionary and normative lifecycle |
| updated_at | datetime(6) | NOT NULL; no default | Preserved baseline session_progress.updated_at; see source dictionary and normative lifecycle |

CHECK: `(`version` >= 1)`; `(`coverage` in (_utf8mb4'full',_utf8mb4'partial'))`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_session_progress_process: (tenant_id,process_version) → session_process_version(tenant_id,version); fk_session_progress_session: (tenant_id,session_id) → conversation_acquisition_session(tenant_id,id).

## crm_chat.session_stage_event

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_stage_event; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Immutable stage transition evidence; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable stage transition evidence; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_stage_revision` (`tenant_id`,`session_id`,`revision`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_stage_revision` (`tenant_id`,`session_id`,`revision`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_stage_event.tenant_id; see source dictionary and normative lifecycle |
| id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_stage_event.id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_stage_event.session_id; see source dictionary and normative lifecycle |
| revision | bigint unsigned | NOT NULL; no default | Preserved baseline session_stage_event.revision; see source dictionary and normative lifecycle |
| from_stage | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_stage_event.from_stage; see source dictionary and normative lifecycle |
| to_stage | varchar(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_stage_event.to_stage; see source dictionary and normative lifecycle |
| reason | varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs | NOT NULL; no default | Preserved baseline session_stage_event.reason; see source dictionary and normative lifecycle |
| actor_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_stage_event.actor_id; see source dictionary and normative lifecycle |
| recorded_at | datetime(6) | NOT NULL; no default | Preserved baseline session_stage_event.recorded_at; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_stage_progress: (tenant_id,session_id) → session_progress(tenant_id,session_id).

## crm_chat.session_touchpoint

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.session_touchpoint; owner chat |
| Physical current | agentic_crm42; unchanged source retained until T09 |
| Service writer / aggregate | chat only; Immutable Connector touchpoint references; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable Connector touchpoint references; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | KEY `fk_session_touchpoint_session` (`tenant_id`,`session_id`,`conversation_id`); KEY `ix_session_touchpoint` (`tenant_id`,`session_id`,`touchpoint_id`); PRIMARY KEY (`tenant_id`,`touchpoint_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `fk_session_touchpoint_session` (`tenant_id`,`session_id`,`conversation_id`); KEY `ix_session_touchpoint` (`tenant_id`,`session_id`,`touchpoint_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_touchpoint.tenant_id; see source dictionary and normative lifecycle |
| touchpoint_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_touchpoint.touchpoint_id; see source dictionary and normative lifecycle |
| session_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_touchpoint.session_id; see source dictionary and normative lifecycle |
| conversation_id | char(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Preserved baseline session_touchpoint.conversation_id; see source dictionary and normative lifecycle |
| occurred_at | datetime(6) | NOT NULL; no default | Preserved baseline session_touchpoint.occurred_at; see source dictionary and normative lifecycle |
| recorded_at | datetime(6) | NOT NULL; no default | Preserved baseline session_touchpoint.recorded_at; see source dictionary and normative lifecycle |

CHECK: `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_session_touchpoint_session: (tenant_id,session_id,conversation_id) → conversation_acquisition_session(tenant_id,id,conversation_id).

## crm_chat.schema_migration

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.schema_migration; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Own schema lineage, not copied baseline journal; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Own schema lineage, not copied baseline journal; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Registered deployment system tenant 01900000-0000-7000-8000-000000000001; operator/native account gate only; no default |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`version`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT; chat_worker: SELECT; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Bootstrap system journal; record real Chat001/002 checksums only, never baseline42 entries. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Explicit registered platform system tenant; never business API context or default |
| version | INT UNSIGNED | NOT NULL; no default | Chat DDL version |
| name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Migration artifact name |
| checksum | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | SHA256 exact migration bytes |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | started/applied/failed |
| started_at | DATETIME(6) | NOT NULL; no default | UTC operator start |
| applied_at | DATETIME(6) | NULL; no default | UTC verified completion |
| error_code | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Sanitized failure category |

CHECK: `state IN ('started','applied','failed')`; `tenant_id = '01900000-0000-7000-8000-000000000001'`; `version >= 1`.

## crm_chat.chat_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_owner_command; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_chat_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_chat_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_chat_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_chat_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_owner_dependency

CHG-20261023-21 / T06 adds the explicit local `recovery` scheduling slot described in [command recovery](../contracts/chat-command-recovery.md), using existing columns/indexes/grants. It has remote_owner=`chat`, receipt_id=NULL, a minimized original command ref and only prepared/released states; it is excluded from remote proof dependencies. This is no physical schema or historical migration change. The T02 design table below is retained; native scheduler evidence is recorded separately under artifacts/chat-extraction/t06-delivery.

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_owner_dependency; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_chat_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_chat_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_chat_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_chat_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_chat_owner_dependency_1: (tenant_id,command_id) → chat_owner_command(tenant_id,command_id).

## crm_chat.chat_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_owner_selection; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT; chat_worker: SELECT/INSERT; chat_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_chat_owner_selection_1: (tenant_id,command_id) → chat_owner_command(tenant_id,command_id).

## crm_core.crm_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_owner_command; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_crm_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_crm_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_crm_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_crm_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_core.crm_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_owner_dependency; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_crm_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_crm_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_crm_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_crm_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_crm_owner_dependency_1: (tenant_id,command_id) → crm_owner_command(tenant_id,command_id).

## crm_core.crm_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_owner_selection; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT; crm_worker: SELECT/INSERT; crm_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_crm_owner_selection_1: (tenant_id,command_id) → crm_owner_command(tenant_id,command_id).

## crm_connector.connector_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_connector.connector_owner_command; owner connector |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | connector only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_connector_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_connector_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_connector_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_connector_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner connector workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | connector_api: SELECT/INSERT/UPDATE; connector_worker: SELECT/INSERT/UPDATE; connector_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_connector.connector_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_connector.connector_owner_dependency; owner connector |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | connector only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_connector_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_connector_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_connector_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_connector_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner connector workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | connector_api: SELECT/INSERT/UPDATE; connector_worker: SELECT/INSERT/UPDATE; connector_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_connector_owner_dependency_1: (tenant_id,command_id) → connector_owner_command(tenant_id,command_id).

## crm_connector.connector_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_connector.connector_owner_selection; owner connector |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | connector only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner connector workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | connector_api: SELECT/INSERT; connector_worker: SELECT/INSERT; connector_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_connector_owner_selection_1: (tenant_id,command_id) → connector_owner_command(tenant_id,command_id).

## crm_routing.routing_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_owner_command; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_routing_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_routing_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_routing_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_routing_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT/UPDATE; routing_worker: SELECT/INSERT/UPDATE; routing_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_routing.routing_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_owner_dependency; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_routing_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_routing_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_routing_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_routing_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT/UPDATE; routing_worker: SELECT/INSERT/UPDATE; routing_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_routing_owner_dependency_1: (tenant_id,command_id) → routing_owner_command(tenant_id,command_id).

## crm_routing.routing_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_owner_selection; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT; routing_worker: SELECT/INSERT; routing_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_routing_owner_selection_1: (tenant_id,command_id) → routing_owner_command(tenant_id,command_id).

## crm_sales.sales_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_sales.sales_owner_command; owner sales |
| Physical current | CHG-20261023-07: exact reviewed receipt table installed only in retained native_identity_test candidate; main not created. Installed DDL hash pinned in .local/chat-ownership/outcome-schema.json. |
| Service writer / aggregate | sales only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_sales_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_sales_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_sales_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_sales_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner sales workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | sales_api: SELECT/INSERT/UPDATE; sales_worker: SELECT/INSERT/UPDATE; sales_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_sales.sales_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_sales.sales_owner_dependency; owner sales |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | sales only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_sales_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_sales_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_sales_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_sales_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner sales workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | sales_api: SELECT/INSERT/UPDATE; sales_worker: SELECT/INSERT/UPDATE; sales_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_sales_owner_dependency_1: (tenant_id,command_id) → sales_owner_command(tenant_id,command_id).

## crm_sales.sales_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_sales.sales_owner_selection; owner sales |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | sales only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner sales workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | sales_api: SELECT/INSERT; sales_worker: SELECT/INSERT; sales_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_sales_owner_selection_1: (tenant_id,command_id) → sales_owner_command(tenant_id,command_id).

## crm_ai.ai_runtime_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_ai.ai_runtime_owner_command; owner ai-runtime |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | ai-runtime only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_ai_runtime_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_ai_runtime_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_ai_runtime_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_ai_runtime_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner ai-runtime workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | ai-runtime_api: SELECT/INSERT/UPDATE; ai-runtime_worker: SELECT/INSERT/UPDATE; ai-runtime_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_ai.ai_runtime_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_ai.ai_runtime_owner_dependency; owner ai-runtime |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | ai-runtime only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_ai_runtime_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_ai_runtime_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_ai_runtime_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_ai_runtime_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner ai-runtime workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | ai-runtime_api: SELECT/INSERT/UPDATE; ai-runtime_worker: SELECT/INSERT/UPDATE; ai-runtime_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_ai_runtime_owner_dependency_1: (tenant_id,command_id) → ai_runtime_owner_command(tenant_id,command_id).

## crm_ai.ai_runtime_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_ai.ai_runtime_owner_selection; owner ai-runtime |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | ai-runtime only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner ai-runtime workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | ai-runtime_api: SELECT/INSERT; ai-runtime_worker: SELECT/INSERT; ai-runtime_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_ai_runtime_owner_selection_1: (tenant_id,command_id) → ai_runtime_owner_command(tenant_id,command_id).

## crm_workflow.workflow_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_owner_command; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_workflow_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_workflow_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_workflow_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_workflow_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_workflow.workflow_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_owner_dependency; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_workflow_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_workflow_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_workflow_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_workflow_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_workflow_owner_dependency_1: (tenant_id,command_id) → workflow_owner_command(tenant_id,command_id).

## crm_workflow.workflow_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_owner_selection; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT; workflow_worker: SELECT/INSERT; workflow_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_workflow_owner_selection_1: (tenant_id,command_id) → workflow_owner_command(tenant_id,command_id).

## crm_reporting.reporting_owner_command

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_reporting.reporting_owner_command; owner reporting |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | reporting only; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`); KEY `ix_reporting_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_reporting_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_reporting_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`); KEY `ix_reporting_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner reporting workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | reporting_api: SELECT/INSERT/UPDATE; reporting_worker: SELECT/INSERT/UPDATE; reporting_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner command UUID, including pre-prepare abort key |
| operation | VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact T01 operation; null only for pre-prepare abort |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | T01 canonical binding digest |
| actor_kind | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | human/ai/service/app/system; null only for pre-prepare abort |
| actor_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity actor; null only for pre-prepare abort |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Logical Identity delegation |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Registered kind; null only for pre-prepare abort |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Aggregate ID; null only for pre-prepare abort |
| record_version | BIGINT UNSIGNED | NULL; no default | Expected version; null only for pre-prepare abort |
| owner_revision | BIGINT UNSIGNED | NULL; no default | Expected owner revision; null only for pre-prepare abort |
| control_revision | BIGINT UNSIGNED | NULL; no default | Expected control revision; null only for pre-prepare abort |
| legacy_route | VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact legacy route key, no alias rewriting |
| legacy_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Exact caller receipt key |
| legacy_request_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original body/version hash, not new binding digest |
| binding_json | JSON | NULL; no default | OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB |
| request_json | JSON | NULL; no default | Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB |
| result_json | JSON | NULL; no default | Operation-specific strict response; private encrypted storage, max256KiB |
| admission_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Identity admission logical reference |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/committed/aborted |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Immutable terminal proof hash |
| terminal_at | DATETIME(6) | NULL; no default | UTC terminal commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','committed','aborted')`; `(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)`; `state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)`; `binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144`; `request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144`; `result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_reporting.reporting_owner_dependency

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_reporting.reporting_owner_dependency; owner reporting |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | reporting only; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`slot`); UNIQUE KEY `uq_reporting_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_reporting_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_reporting_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`); KEY `ix_reporting_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner reporting workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | reporting_api: SELECT/INSERT/UPDATE; reporting_worker: SELECT/INSERT/UPDATE; reporting_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local parent command |
| slot | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Operation-fixed slot; not caller-controlled |
| remote_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated owner |
| remote_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable child UUID derived from permanent child key |
| child_key | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact parent-command:note:v1 or need-recovery:<need> etc |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Parent core digest |
| receipt_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Remote reservation/admission/result ID |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/pending/committed/aborted/released |
| request_json | JSON | NOT NULL; no default | Strict child operation input; max256KiB |
| proof_json | JSON | NULL; no default | Strict authenticated terminal proof; max256KiB |
| remote_revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic remote resource revision |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC durable recovery schedule |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | Transport scheduling lease only |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','pending','committed','aborted','released')`; `JSON_STORAGE_SIZE(request_json)<=262144`; `proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_reporting_owner_dependency_1: (tenant_id,command_id) → reporting_owner_command(tenant_id,command_id).

## crm_reporting.reporting_owner_selection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_reporting.reporting_owner_selection; owner reporting |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | reporting only; Immutable per-row policy context for admitted bounded read; result snapshot is never permission; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-row policy context for admitted bounded read; result snapshot is never permission; no replica authorization or remote business authority |
| Loại dữ liệu | immutable ledger |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner reporting workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | reporting_api: SELECT/INSERT; reporting_worker: SELECT/INSERT; reporting_migrator: SELECT/INSERT; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local prepared read |
| ordinal | SMALLINT UNSIGNED | NOT NULL; no default | Candidate position 0..99 |
| resource_kind | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Object type |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact candidate resource |
| owner_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Historical local owner at preparation |
| team_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local team |
| record_version | BIGINT UNSIGNED | NOT NULL; no default | Candidate version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Control fence |
| context_json | JSON | NOT NULL; no default | Strict T01 ResourceContext fields/shares; max256KiB |
| candidate_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable page selection hash |

CHECK: `ordinal < 100`; `JSON_STORAGE_SIZE(context_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_reporting_owner_selection_1: (tenant_id,command_id) → reporting_owner_command(tenant_id,command_id).

## crm_chat.chat_event_stream

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_event_stream; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Per-tenant subscriber stream, ACK and replay low-watermark; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-tenant subscriber stream, ACK and replay low-watermark; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact registered consumer |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| next_sequence | BIGINT UNSIGNED | NOT NULL; no default | Next allocated sequence, starting at1 |
| acked_through | BIGINT UNSIGNED | NOT NULL; no default | Contiguous consumer ACK high-watermark |
| retained_from | BIGINT UNSIGNED | NOT NULL; no default | Earliest replayable sequence |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Versioned type/version/caller allowlist digest |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `next_sequence >= 1`; `retained_from >= 1`; `acked_through < next_sequence`; `retained_from <= next_sequence`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_event_delivery

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_event_delivery; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); UNIQUE KEY `uq_chat_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_chat_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_chat_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_chat_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owning stream subscriber |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Stream-local positive order |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Original producer outbox event |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical complete legacy envelope digest |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable subscriber registration at emission |
| envelope_json | JSON | NOT NULL; no default | Strict versioned legacy envelope, max256KiB; correlation is opaque |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/acked/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC retry due |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Transport retries, not business retries |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | UTC scheduler lease |
| acked_at | DATETIME(6) | NULL; no default | UTC authenticated consumer ACK |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','acked','quarantined')`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `(state='acked') = (acked_at IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_chat_event_delivery_1: (tenant_id,consumer_name,aggregate_type,aggregate_id) → chat_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id).

## crm_core.crm_event_stream

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_event_stream; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Per-tenant subscriber stream, ACK and replay low-watermark; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-tenant subscriber stream, ACK and replay low-watermark; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact registered consumer |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| next_sequence | BIGINT UNSIGNED | NOT NULL; no default | Next allocated sequence, starting at1 |
| acked_through | BIGINT UNSIGNED | NOT NULL; no default | Contiguous consumer ACK high-watermark |
| retained_from | BIGINT UNSIGNED | NOT NULL; no default | Earliest replayable sequence |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Versioned type/version/caller allowlist digest |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `next_sequence >= 1`; `retained_from >= 1`; `acked_through < next_sequence`; `retained_from <= next_sequence`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_core.crm_event_delivery

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_event_delivery; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); UNIQUE KEY `uq_crm_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_crm_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_crm_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_crm_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owning stream subscriber |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Stream-local positive order |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Original producer outbox event |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical complete legacy envelope digest |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable subscriber registration at emission |
| envelope_json | JSON | NOT NULL; no default | Strict versioned legacy envelope, max256KiB; correlation is opaque |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/acked/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC retry due |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Transport retries, not business retries |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | UTC scheduler lease |
| acked_at | DATETIME(6) | NULL; no default | UTC authenticated consumer ACK |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','acked','quarantined')`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `(state='acked') = (acked_at IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_crm_event_delivery_1: (tenant_id,consumer_name,aggregate_type,aggregate_id) → crm_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id).

## crm_identity.identity_event_stream

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_event_stream; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Per-tenant subscriber stream, ACK and replay low-watermark; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-tenant subscriber stream, ACK and replay low-watermark; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact registered consumer |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| next_sequence | BIGINT UNSIGNED | NOT NULL; no default | Next allocated sequence, starting at1 |
| acked_through | BIGINT UNSIGNED | NOT NULL; no default | Contiguous consumer ACK high-watermark |
| retained_from | BIGINT UNSIGNED | NOT NULL; no default | Earliest replayable sequence |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Versioned type/version/caller allowlist digest |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `next_sequence >= 1`; `retained_from >= 1`; `acked_through < next_sequence`; `retained_from <= next_sequence`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_identity.identity_event_delivery

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_event_delivery; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); UNIQUE KEY `uq_identity_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_identity_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_identity_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_identity_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owning stream subscriber |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Stream-local positive order |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Original producer outbox event |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical complete legacy envelope digest |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable subscriber registration at emission |
| envelope_json | JSON | NOT NULL; no default | Strict versioned legacy envelope, max256KiB; correlation is opaque |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/acked/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC retry due |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Transport retries, not business retries |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | UTC scheduler lease |
| acked_at | DATETIME(6) | NULL; no default | UTC authenticated consumer ACK |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','acked','quarantined')`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `(state='acked') = (acked_at IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_identity_event_delivery_1: (tenant_id,consumer_name,aggregate_type,aggregate_id) → identity_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id).

## crm_workflow.workflow_event_stream

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_event_stream; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Per-tenant subscriber stream, ACK and replay low-watermark; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-tenant subscriber stream, ACK and replay low-watermark; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact registered consumer |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| next_sequence | BIGINT UNSIGNED | NOT NULL; no default | Next allocated sequence, starting at1 |
| acked_through | BIGINT UNSIGNED | NOT NULL; no default | Contiguous consumer ACK high-watermark |
| retained_from | BIGINT UNSIGNED | NOT NULL; no default | Earliest replayable sequence |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Versioned type/version/caller allowlist digest |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `next_sequence >= 1`; `retained_from >= 1`; `acked_through < next_sequence`; `retained_from <= next_sequence`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_workflow.workflow_event_delivery

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_event_delivery; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); UNIQUE KEY `uq_workflow_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_workflow_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_workflow_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_workflow_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owning stream subscriber |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Stream-local positive order |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Original producer outbox event |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical complete legacy envelope digest |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable subscriber registration at emission |
| envelope_json | JSON | NOT NULL; no default | Strict versioned legacy envelope, max256KiB; correlation is opaque |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/acked/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC retry due |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Transport retries, not business retries |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | UTC scheduler lease |
| acked_at | DATETIME(6) | NULL; no default | UTC authenticated consumer ACK |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','acked','quarantined')`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `(state='acked') = (acked_at IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_workflow_event_delivery_1: (tenant_id,consumer_name,aggregate_type,aggregate_id) → workflow_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id).

## crm_sales.sales_event_stream

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_sales.sales_event_stream; owner sales |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | sales only; Per-tenant subscriber stream, ACK and replay low-watermark; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-tenant subscriber stream, ACK and replay low-watermark; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner sales workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | sales_api: SELECT/INSERT/UPDATE; sales_worker: SELECT/INSERT/UPDATE; sales_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact registered consumer |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| next_sequence | BIGINT UNSIGNED | NOT NULL; no default | Next allocated sequence, starting at1 |
| acked_through | BIGINT UNSIGNED | NOT NULL; no default | Contiguous consumer ACK high-watermark |
| retained_from | BIGINT UNSIGNED | NOT NULL; no default | Earliest replayable sequence |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Versioned type/version/caller allowlist digest |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `next_sequence >= 1`; `retained_from >= 1`; `acked_through < next_sequence`; `retained_from <= next_sequence`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_sales.sales_event_delivery

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_sales.sales_event_delivery; owner sales |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | sales only; Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); UNIQUE KEY `uq_sales_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_sales_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_sales_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`); KEY `ix_sales_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner sales workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | sales_api: SELECT/INSERT/UPDATE; sales_worker: SELECT/INSERT/UPDATE; sales_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owning stream subscriber |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Stream-local positive order |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Original producer outbox event |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical complete legacy envelope digest |
| registration_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable subscriber registration at emission |
| envelope_json | JSON | NOT NULL; no default | Strict versioned legacy envelope, max256KiB; correlation is opaque |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/acked/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC retry due |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Transport retries, not business retries |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Worker claim UUID |
| lease_until | DATETIME(6) | NULL; no default | UTC scheduler lease |
| acked_at | DATETIME(6) | NULL; no default | UTC authenticated consumer ACK |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','acked','quarantined')`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `(state='acked') = (acked_at IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_sales_event_delivery_1: (tenant_id,consumer_name,aggregate_type,aggregate_id) → sales_event_stream(tenant_id,consumer_name,aggregate_type,aggregate_id).

## crm_chat.chat_event_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_event_inbox; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Authenticated remote envelope and stream offset; no FK to producer database; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Authenticated remote envelope and stream offset; no FK to producer database; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`); UNIQUE KEY `uq_chat_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_chat_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_chat_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_chat_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| producer | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Verified workload owner, never inferred only from event prefix |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Registered local handler |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Retained event dedup identity |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Producer subscription stream position |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable envelope digest |
| envelope_json | JSON | NOT NULL; no default | Strict versioned envelope, max256KiB |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/applied/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC recovery schedule |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Delivery attempts |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local worker claim |
| lease_until | DATETIME(6) | NULL; no default | Scheduler lease only |
| applied_at | DATETIME(6) | NULL; no default | UTC effect/inbox commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','applied','quarantined')`; `(state='applied') = (applied_at IS NOT NULL)`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_core.crm_event_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_event_inbox; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Authenticated remote envelope and stream offset; no FK to producer database; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Authenticated remote envelope and stream offset; no FK to producer database; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`); UNIQUE KEY `uq_crm_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_crm_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_crm_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_crm_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| producer | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Verified workload owner, never inferred only from event prefix |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Registered local handler |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Retained event dedup identity |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Producer subscription stream position |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable envelope digest |
| envelope_json | JSON | NOT NULL; no default | Strict versioned envelope, max256KiB |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/applied/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC recovery schedule |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Delivery attempts |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local worker claim |
| lease_until | DATETIME(6) | NULL; no default | Scheduler lease only |
| applied_at | DATETIME(6) | NULL; no default | UTC effect/inbox commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','applied','quarantined')`; `(state='applied') = (applied_at IS NOT NULL)`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_identity.identity_event_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_event_inbox; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Authenticated remote envelope and stream offset; no FK to producer database; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Authenticated remote envelope and stream offset; no FK to producer database; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`); UNIQUE KEY `uq_identity_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_identity_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_identity_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_identity_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| producer | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Verified workload owner, never inferred only from event prefix |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Registered local handler |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Retained event dedup identity |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Producer subscription stream position |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable envelope digest |
| envelope_json | JSON | NOT NULL; no default | Strict versioned envelope, max256KiB |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/applied/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC recovery schedule |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Delivery attempts |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local worker claim |
| lease_until | DATETIME(6) | NULL; no default | Scheduler lease only |
| applied_at | DATETIME(6) | NULL; no default | UTC effect/inbox commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','applied','quarantined')`; `(state='applied') = (applied_at IS NOT NULL)`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_routing.routing_event_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_event_inbox; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Authenticated remote envelope and stream offset; no FK to producer database; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Authenticated remote envelope and stream offset; no FK to producer database; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`); UNIQUE KEY `uq_routing_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_routing_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_routing_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_routing_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT/UPDATE; routing_worker: SELECT/INSERT/UPDATE; routing_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| producer | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Verified workload owner, never inferred only from event prefix |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Registered local handler |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Retained event dedup identity |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Producer subscription stream position |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable envelope digest |
| envelope_json | JSON | NOT NULL; no default | Strict versioned envelope, max256KiB |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/applied/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC recovery schedule |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Delivery attempts |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local worker claim |
| lease_until | DATETIME(6) | NULL; no default | Scheduler lease only |
| applied_at | DATETIME(6) | NULL; no default | UTC effect/inbox commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','applied','quarantined')`; `(state='applied') = (applied_at IS NOT NULL)`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_ai.ai_runtime_event_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_ai.ai_runtime_event_inbox; owner ai-runtime |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | ai-runtime only; Authenticated remote envelope and stream offset; no FK to producer database; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Authenticated remote envelope and stream offset; no FK to producer database; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`); UNIQUE KEY `uq_ai_runtime_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_ai_runtime_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_ai_runtime_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_ai_runtime_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner ai-runtime workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | ai-runtime_api: SELECT/INSERT/UPDATE; ai-runtime_worker: SELECT/INSERT/UPDATE; ai-runtime_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| producer | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Verified workload owner, never inferred only from event prefix |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Registered local handler |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Retained event dedup identity |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Producer subscription stream position |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable envelope digest |
| envelope_json | JSON | NOT NULL; no default | Strict versioned envelope, max256KiB |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/applied/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC recovery schedule |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Delivery attempts |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local worker claim |
| lease_until | DATETIME(6) | NULL; no default | Scheduler lease only |
| applied_at | DATETIME(6) | NULL; no default | UTC effect/inbox commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','applied','quarantined')`; `(state='applied') = (applied_at IS NOT NULL)`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_workflow.workflow_event_inbox

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_event_inbox; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Authenticated remote envelope and stream offset; no FK to producer database; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Authenticated remote envelope and stream offset; no FK to producer database; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`); UNIQUE KEY `uq_workflow_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_workflow_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_workflow_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`); KEY `ix_workflow_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| producer | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Verified workload owner, never inferred only from event prefix |
| consumer_name | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Registered local handler |
| event_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Retained event dedup identity |
| aggregate_type | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate kind |
| aggregate_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stream aggregate ID |
| sequence | BIGINT UNSIGNED | NOT NULL; no default | Producer subscription stream position |
| event_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Immutable envelope digest |
| envelope_json | JSON | NOT NULL; no default | Strict versioned envelope, max256KiB |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pending/applied/quarantined |
| next_attempt_at | DATETIME(6) | NOT NULL; no default | UTC recovery schedule |
| attempts | BIGINT UNSIGNED | NOT NULL; no default | Delivery attempts |
| lease_token | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Local worker claim |
| lease_until | DATETIME(6) | NULL; no default | Scheduler lease only |
| applied_at | DATETIME(6) | NULL; no default | UTC effect/inbox commit |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `sequence >= 1`; `state IN ('pending','applied','quarantined')`; `(state='applied') = (applied_at IS NOT NULL)`; `JSON_STORAGE_SIZE(envelope_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_control_head

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_control_head; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Cumulative Chat registry/control state used by D2; existing owner revision remains in crm_record; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Cumulative Chat registry/control state used by D2; existing owner revision remains in crm_record; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local Conversation |
| registry_revision | BIGINT UNSIGNED | NOT NULL; no default | Cumulative registry watermark |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Current cancellation generation |
| cancel_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative cancelled generation |
| pause_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative paused generation |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `registry_revision >= 1`; `control_revision >= 1`; `cancel_through < control_revision`; `pause_through < control_revision`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_chat_control_head_1: (tenant_id,conversation_id) → conversation(tenant_id,record_id).

## crm_chat.chat_dataset_head

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_dataset_head; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Tenant fact watermark changed in every relevant local fact/registry transaction; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Tenant fact watermark changed in every relevant local fact/registry transaction; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`dataset`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| dataset | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | conversion/stage/progress/routing/registry |
| revision | BIGINT UNSIGNED | NOT NULL; no default | Monotonic dataset watermark |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `dataset IN ('conversion','stage','progress','routing','registry')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_contact_guard

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_contact_guard; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Contact archive tombstone/closing fence; protects every delayed ingress and reopen; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Contact archive tombstone/closing fence; protects every delayed ingress and reopen; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`contact_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| contact_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Core Contact logical reference |
| archive_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Core archive command |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Archive binding |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | closing/archived/released |
| core_revision | BIGINT UNSIGNED | NOT NULL; no default | Core terminal revision |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('closing','archived','released')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_report_snapshot

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_report_snapshot; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Temporary immutable report candidate and source watermark; no authority cache; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Temporary immutable report candidate and source watermark; no authority cache; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`snapshot_id`); UNIQUE KEY `uq_chat_report_snapshot_1` (`tenant_id`,`command_id`); KEY `ix_chat_report_snapshot_1` (`state`,`expires_at`,`tenant_id`,`snapshot_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_chat_report_snapshot_1` (`tenant_id`,`command_id`); KEY `ix_chat_report_snapshot_1` (`state`,`expires_at`,`tenant_id`,`snapshot_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE; chat_worker: SELECT/INSERT/UPDATE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| snapshot_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Snapshot UUID |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Prepared command |
| dataset | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Fact kind |
| watermark | BIGINT UNSIGNED | NOT NULL; no default | Head observed at prepare |
| query_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authorized query binding |
| snapshot_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Ordered immutable page hashes |
| row_count | BIGINT UNSIGNED | NOT NULL; no default | Complete bounded fact count |
| page_count | INT UNSIGNED | NOT NULL; no default | Complete number of pages |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | prepared/released |
| expires_at | DATETIME(6) | NOT NULL; no default | Prepare+5minutes; reclaim only after admission settles |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('prepared','released')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_chat_report_snapshot_1: (tenant_id,command_id) → chat_owner_command(tenant_id,command_id).

## crm_chat.chat_report_page

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_report_page; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Immutable bounded report facts; payload discarded after release, digest remains in snapshot; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Immutable bounded report facts; payload discarded after release, digest remains in snapshot; no replica authorization or remote business authority |
| Loại dữ liệu | rebuildable projection |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`snapshot_id`,`page_number`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT/INSERT/UPDATE/DELETE; chat_worker: SELECT/INSERT/UPDATE/DELETE; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| snapshot_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local snapshot |
| page_number | INT UNSIGNED | NOT NULL; no default | Zero-based page |
| row_count | SMALLINT UNSIGNED | NOT NULL; no default | Rows in this page |
| facts_json | JSON | NOT NULL; no default | Strict producer fact DTO array; max100 rows/max256KiB; no transcript |
| page_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical fact page hash |

CHECK: `row_count <= 100`; `JSON_STORAGE_SIZE(facts_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_chat_report_page_1: (tenant_id,snapshot_id) → chat_report_snapshot(tenant_id,snapshot_id).

## crm_identity.identity_owner_admission

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_owner_admission; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Non-send admission tied to one owner command; active rows block revoke completion; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Non-send admission tied to one owner command; active rows block revoke completion; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_identity_owner_admission_1` (`tenant_id`,`owner_service`,`command_id`); KEY `ix_identity_owner_admission_1` (`tenant_id`,`state`,`id`); KEY `ix_identity_owner_admission_2` (`account_id`,`state`,`tenant_id`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_identity_owner_admission_1` (`tenant_id`,`owner_service`,`command_id`); KEY `ix_identity_owner_admission_1` (`tenant_id`,`state`,`id`); KEY `ix_identity_owner_admission_2` (`account_id`,`state`,`tenant_id`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Admission UUID |
| owner_service | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Command owner |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Remote prepared command |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Remote prepared binding |
| account_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | System account logical/native reference |
| session_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Native session |
| principal_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Business principal |
| app_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Native private app |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Existing delegation |
| auth_revision | BIGINT UNSIGNED | NOT NULL; no default | Pinned authorization revision |
| gate_revision | BIGINT UNSIGNED | NOT NULL; no default | Business gate at admission |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | admitted/committed/aborted |
| allowed_fields | JSON | NOT NULL; no default | Strict admitted field list; no transcript |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Authenticated owner terminal proof |
| settled_at | DATETIME(6) | NULL; no default | UTC terminal settlement |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('admitted','committed','aborted')`; `(state='admitted' AND terminal_digest IS NULL AND settled_at IS NULL) OR (state<>'admitted' AND terminal_digest IS NOT NULL AND settled_at IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_identity.identity_owner_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_owner_gate; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Conservative whole-business-tenant revoke gate; closes new admissions before drain; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Conservative whole-business-tenant revoke gate; closes new admissions before drain; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| barrier_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Current durable revoke operation |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | open/closing |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original barrier requester |
| request_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Idempotent revoke input |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('open','closing')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_identity.identity_account_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_account_gate; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; System account-wide revoke gate closes before enumerating business admissions; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | System account-wide revoke gate closes before enumerating business admissions; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Registered deployment system tenant 01900000-0000-7000-8000-000000000001; operator/native account gate only; no default |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`account_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Explicit registered platform system tenant; never business API context or default |
| account_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Native system account |
| barrier_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Reset/logout-all operation |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | open/closing |
| request_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Original revoke request |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('open','closing')`; `tenant_id = '01900000-0000-7000-8000-000000000001'`; `version >= 1`.

## crm_identity.identity_owner_barrier

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_owner_barrier; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Durable revoke operation/status history; current gate may advance without erasing old completion; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable revoke operation/status history; current gate may advance without erasing old completion; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`barrier_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| barrier_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable revoke UUID |
| account_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Affected native account; null for tenant policy |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original requester delegation |
| request_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical nonsecret revoke/policy intent digest |
| request_json | JSON | NOT NULL; no default | Sanitized policy/revoke intent and security revision references; never password, token or credential material |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | closing/completed |
| completed_at | DATETIME(6) | NULL; no default | UTC drain completion |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('closing','completed')`; `(state='completed') = (completed_at IS NOT NULL)`; `JSON_STORAGE_SIZE(request_json)<=262144`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_identity.identity_account_barrier

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_identity.identity_account_barrier; owner identity |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | identity only; Durable revoke operation/status history; current gate may advance without erasing old completion; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable revoke operation/status history; current gate may advance without erasing old completion; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Registered deployment system tenant 01900000-0000-7000-8000-000000000001; operator/native account gate only; no default |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`barrier_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner identity workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | identity_api: SELECT/INSERT/UPDATE; identity_worker: SELECT/INSERT/UPDATE; identity_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Explicit registered platform system tenant; never business API context or default |
| barrier_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Stable revoke UUID |
| account_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Affected native account; null for tenant policy |
| delegation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Original requester delegation |
| request_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical nonsecret revoke/policy intent digest |
| request_json | JSON | NOT NULL; no default | Sanitized policy/revoke intent and security revision references; never password, token or credential material |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | closing/completed |
| completed_at | DATETIME(6) | NULL; no default | UTC drain completion |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('closing','completed')`; `(state='completed') = (completed_at IS NOT NULL)`; `JSON_STORAGE_SIZE(request_json)<=262144`; `tenant_id = '01900000-0000-7000-8000-000000000001'`; `version >= 1`.

## crm_core.crm_reference_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_reference_gate; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Owner resource revision/retirement barrier for Contact, mapping, metadata or channel; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Owner resource revision/retirement barrier for Contact, mapping, metadata or channel; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`resource_kind`,`resource_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| resource_kind | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | contact/identity/schema/connection |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner canonical resource |
| resource_revision | BIGINT UNSIGNED | NOT NULL; no default | Pinned canonical revision |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | open/closing/retired |
| barrier_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Retirement command |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('open','closing','retired')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_core.crm_reference_reservation

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_reference_reservation; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Durable liveness reservation, released only on terminal caller proof; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable liveness reservation, released only on terminal caller proof; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_crm_reference_reservation_1` (`tenant_id`,`caller_owner`,`command_id`,`resource_kind`,`resource_id`); KEY `ix_crm_reference_reservation_1` (`tenant_id`,`resource_kind`,`resource_id`,`state`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_crm_reference_reservation_1` (`tenant_id`,`caller_owner`,`command_id`,`resource_kind`,`resource_id`); KEY `ix_crm_reference_reservation_1` (`tenant_id`,`resource_kind`,`resource_id`,`state`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Reservation UUID |
| caller_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated command owner |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Caller command |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Caller prepared core |
| resource_kind | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local gate kind |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local gate resource |
| resource_revision | BIGINT UNSIGNED | NOT NULL; no default | Reserved revision |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | held/released |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Caller terminal proof |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('held','released')`; `(state='released') = (terminal_digest IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_crm_reference_reservation_1: (tenant_id,resource_kind,resource_id) → crm_reference_gate(tenant_id,resource_kind,resource_id).

## crm_connector.connector_reference_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_connector.connector_reference_gate; owner connector |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | connector only; Owner resource revision/retirement barrier for Contact, mapping, metadata or channel; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Owner resource revision/retirement barrier for Contact, mapping, metadata or channel; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`resource_kind`,`resource_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner connector workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | connector_api: SELECT/INSERT/UPDATE; connector_worker: SELECT/INSERT/UPDATE; connector_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| resource_kind | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | contact/identity/schema/connection |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Owner canonical resource |
| resource_revision | BIGINT UNSIGNED | NOT NULL; no default | Pinned canonical revision |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | open/closing/retired |
| barrier_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Retirement command |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('open','closing','retired')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_connector.connector_reference_reservation

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_connector.connector_reference_reservation; owner connector |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | connector only; Durable liveness reservation, released only on terminal caller proof; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable liveness reservation, released only on terminal caller proof; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_connector_reference_reservation_1` (`tenant_id`,`caller_owner`,`command_id`,`resource_kind`,`resource_id`); KEY `ix_connector_reference_reservation_1` (`tenant_id`,`resource_kind`,`resource_id`,`state`,`id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_connector_reference_reservation_1` (`tenant_id`,`caller_owner`,`command_id`,`resource_kind`,`resource_id`); KEY `ix_connector_reference_reservation_1` (`tenant_id`,`resource_kind`,`resource_id`,`state`,`id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner connector workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | connector_api: SELECT/INSERT/UPDATE; connector_worker: SELECT/INSERT/UPDATE; connector_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Reservation UUID |
| caller_owner | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated command owner |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Caller command |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Caller prepared core |
| resource_kind | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local gate kind |
| resource_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local gate resource |
| resource_revision | BIGINT UNSIGNED | NOT NULL; no default | Reserved revision |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | held/released |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Caller terminal proof |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('held','released')`; `(state='released') = (terminal_digest IS NOT NULL)`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

Local FK: fk_connector_reference_reservation_1: (tenant_id,resource_kind,resource_id) → connector_reference_gate(tenant_id,resource_kind,resource_id).

## crm_routing.routing_capacity_reservation

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_capacity_reservation; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Pending capacity is counted until terminal Chat confirmation/release; no TTL; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Pending capacity is counted until terminal Chat confirmation/release; no TTL; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`id`); UNIQUE KEY `uq_routing_capacity_reservation_1` (`tenant_id`,`command_id`); KEY `ix_routing_capacity_reservation_1` (`tenant_id`,`principal_id`,`state`,`id`); KEY `ix_routing_capacity_reservation_2` (`tenant_id`,`session_id`,`owner_revision`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | UNIQUE KEY `uq_routing_capacity_reservation_1` (`tenant_id`,`command_id`); KEY `ix_routing_capacity_reservation_1` (`tenant_id`,`principal_id`,`state`,`id`); KEY `ix_routing_capacity_reservation_2` (`tenant_id`,`session_id`,`owner_revision`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT/UPDATE; routing_worker: SELECT/INSERT/UPDATE; routing_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Reservation UUID |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat command |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat prepared core |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| session_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat episode |
| principal_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Target; null for unassigned |
| queue_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Pinned queue |
| queue_version | BIGINT UNSIGNED | NOT NULL; no default | Queue version |
| profile_version | BIGINT UNSIGNED | NOT NULL; no default | Target profile revision |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Expected/new Chat owner fence |
| mode | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | managed/not-managed/unassign/close |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | reserved/confirmed/released |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Chat terminal proof |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `mode IN ('managed','not-managed','unassign','close')`; `state IN ('reserved','confirmed','released')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_routing.routing_allocation_head

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_allocation_head; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Monotonic Chat owner revision/terminal allocation tombstone; coordinates existing work/allocation tables; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Monotonic Chat owner revision/terminal allocation tombstone; coordinates existing work/allocation tables; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`session_id`); KEY `ix_routing_allocation_head_1` (`tenant_id`,`principal_id`,`state`,`session_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_routing_allocation_head_1` (`tenant_id`,`principal_id`,`state`,`session_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT/UPDATE; routing_worker: SELECT/INSERT/UPDATE; routing_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| session_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat session logical reference |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| principal_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Confirmed owner |
| reservation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Latest reservation |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Highest applied Chat revision |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | active/closed/unassigned |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('active','closed','unassigned')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_routing.routing_capacity_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_routing.routing_capacity_gate; owner routing |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | routing only; Queue/profile/skills configuration drain barrier; conservative whole-tenant gate; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Queue/profile/skills configuration drain barrier; conservative whole-tenant gate; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner routing workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | routing_api: SELECT/INSERT/UPDATE; routing_worker: SELECT/INSERT/UPDATE; routing_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| barrier_command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Routing config operation |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | open/closing |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('open','closing')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_sales.sales_outcome_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_sales.sales_outcome_gate; owner sales |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | sales only; Per-need/session outcome serialization and durable recovery reservation; absence is fenced; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Per-need/session outcome serialization and durable recovery reservation; absence is fenced; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`need_id`,`session_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner sales workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | sales_api: SELECT/INSERT/UPDATE; sales_worker: SELECT/INSERT/UPDATE; sales_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| need_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat original need |
| session_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat original episode |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| outcome_revision | BIGINT UNSIGNED | NOT NULL; no default | Latest Sales outcome revision |
| command_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Chat recovery command |
| binding_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Recovery binding |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | open/held/released |
| terminal_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Chat terminal proof |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('open','held','released')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_core.crm_chat_projection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_core.crm_chat_projection; owner crm |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | crm only; Minimized cumulative Chat registry/control projection; never permission or a second writer; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Minimized cumulative Chat registry/control projection; never permission or a second writer; no replica authorization or remote business authority |
| Loại dữ liệu | rebuildable projection |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner crm workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | crm_api: SELECT/INSERT/UPDATE; crm_worker: SELECT/INSERT/UPDATE; crm_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| registry_revision | BIGINT UNSIGNED | NOT NULL; no default | Highest accepted Chat registry revision |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Current observed generation |
| cancel_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative cancellation |
| pause_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative pause |
| snapshot_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Equal revision must have identical snapshot |
| snapshot_json | JSON | NOT NULL; no default | Strict Chat RegistrySnapshot v1, max16KiB; no transcript/rights |
| observed_at | DATETIME(6) | NOT NULL; no default | UTC authenticated observation |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `registry_revision >= 1`; `control_revision >= 1`; `cancel_through < control_revision`; `pause_through < control_revision`; `JSON_STORAGE_SIZE(snapshot_json)<=16384`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_ai.ai_runtime_chat_projection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_ai.ai_runtime_chat_projection; owner ai-runtime |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | ai-runtime only; Minimized cumulative Chat registry/control projection; never permission or a second writer; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Minimized cumulative Chat registry/control projection; never permission or a second writer; no replica authorization or remote business authority |
| Loại dữ liệu | rebuildable projection |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner ai-runtime workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | ai-runtime_api: SELECT/INSERT/UPDATE; ai-runtime_worker: SELECT/INSERT/UPDATE; ai-runtime_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| registry_revision | BIGINT UNSIGNED | NOT NULL; no default | Highest accepted Chat registry revision |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Current observed generation |
| cancel_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative cancellation |
| pause_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative pause |
| snapshot_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Equal revision must have identical snapshot |
| snapshot_json | JSON | NOT NULL; no default | Strict Chat RegistrySnapshot v1, max16KiB; no transcript/rights |
| observed_at | DATETIME(6) | NOT NULL; no default | UTC authenticated observation |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `registry_revision >= 1`; `control_revision >= 1`; `cancel_through < control_revision`; `pause_through < control_revision`; `JSON_STORAGE_SIZE(snapshot_json)<=16384`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_workflow.workflow_chat_projection

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_chat_projection; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Minimized cumulative Chat registry/control projection; never permission or a second writer; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Minimized cumulative Chat registry/control projection; never permission or a second writer; no replica authorization or remote business authority |
| Loại dữ liệu | rebuildable projection |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`conversation_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| registry_revision | BIGINT UNSIGNED | NOT NULL; no default | Highest accepted Chat registry revision |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Current observed generation |
| cancel_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative cancellation |
| pause_through | BIGINT UNSIGNED | NOT NULL; no default | Cumulative pause |
| snapshot_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Equal revision must have identical snapshot |
| snapshot_json | JSON | NOT NULL; no default | Strict Chat RegistrySnapshot v1, max16KiB; no transcript/rights |
| observed_at | DATETIME(6) | NOT NULL; no default | UTC authenticated observation |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `registry_revision >= 1`; `control_revision >= 1`; `cancel_through < control_revision`; `pause_through < control_revision`; `JSON_STORAGE_SIZE(snapshot_json)<=16384`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_ai.ai_runtime_chat_work_binding

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_ai.ai_runtime_chat_work_binding; owner ai-runtime |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | ai-runtime only; Retained execution/node generation pin; lease acquisition serializes with local cumulative Chat projection; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Retained execution/node generation pin; lease acquisition serializes with local cumulative Chat projection; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`work_id`,`attempt_key`); KEY `ix_ai_runtime_chat_work_binding_1` (`tenant_id`,`conversation_id`,`control_revision`,`state`,`work_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_ai_runtime_chat_work_binding_1` (`tenant_id`,`conversation_id`,`control_revision`,`state`,`work_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner ai-runtime workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | ai-runtime_api: SELECT/INSERT/UPDATE; ai-runtime_worker: SELECT/INSERT/UPDATE; ai-runtime_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| work_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Existing execution/run/node ID |
| work_kind | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | execution/node/run |
| attempt_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact pinned attempt identity; new key on explicit resume |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| session_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Chat episode |
| graph_version_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Existing pinned graph/version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Original admitted owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Proved admitted generation |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pinned/paused/cancelled/terminal |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `control_revision >= 1`; `state IN ('pinned','paused','cancelled','terminal')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_workflow.workflow_chat_work_binding

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_workflow.workflow_chat_work_binding; owner workflow |
| Physical current | Not created. Owner-local additive migration; see physical map in manifest |
| Service writer / aggregate | workflow only; Retained execution/node generation pin; lease acquisition serializes with local cumulative Chat projection; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Retained execution/node generation pin; lease acquisition serializes with local cumulative Chat projection; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`work_id`,`attempt_key`); KEY `ix_workflow_chat_work_binding_1` (`tenant_id`,`conversation_id`,`control_revision`,`state`,`work_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | KEY `ix_workflow_chat_work_binding_1` (`tenant_id`,`conversation_id`,`control_revision`,`state`,`work_id`). Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner workflow workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | workflow_api: SELECT/INSERT/UPDATE; workflow_worker: SELECT/INSERT/UPDATE; workflow_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| work_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Existing execution/run/node ID |
| work_kind | VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | execution/node/run |
| attempt_key | VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Exact pinned attempt identity; new key on explicit resume |
| conversation_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Chat thread |
| session_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Chat episode |
| graph_version_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NULL; no default | Existing pinned graph/version |
| owner_revision | BIGINT UNSIGNED | NOT NULL; no default | Original admitted owner fence |
| control_revision | BIGINT UNSIGNED | NOT NULL; no default | Proved admitted generation |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | pinned/paused/cancelled/terminal |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `control_revision >= 1`; `state IN ('pinned','paused','cancelled','terminal')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_writer_gate

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_writer_gate; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Local startup/write epoch fence; only migration operator changes mode; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Local startup/write epoch fence; only migration operator changes mode; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT; chat_worker: SELECT; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| epoch | BIGINT UNSIGNED | NOT NULL; no default | Monotonic deployment epoch |
| mode | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | disabled/shadow/active/frozen |
| manifest_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Signed-off migration manifest digest |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC operator transition |

CHECK: `mode IN ('disabled','shadow','active','frozen')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

## crm_chat.chat_migration_run

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_migration_run; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Retained business-tenant migration checkpoint, explicit environment identity and validation evidence; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Retained business-tenant migration checkpoint, explicit environment identity and validation evidence; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`run_id`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT; chat_worker: SELECT; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| run_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Migration UUID |
| manifest_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Design+source+binary+partition manifest hash |
| snapshot_digest | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Encrypted immutable export index hash |
| source_identity | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Instance UUID/schema/version, no credentials |
| destination_identity | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Instance UUID/schema/lineage |
| source_watermark | VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Fenced snapshot/binlog position or explicit unavailable |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | exporting/copying/validated/active/frozen |
| writer_epoch | BIGINT UNSIGNED | NOT NULL; no default | Activation epoch |
| version | BIGINT UNSIGNED | NOT NULL; no default | CAS revision; positive, never reset |
| created_at | DATETIME(6) | NOT NULL; no default | UTC creation instant |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC last local commit |

CHECK: `state IN ('exporting','copying','validated','active','frozen')`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`; `version >= 1`.

## crm_chat.chat_migration_chunk

| Mục bắt buộc | Nội dung |
|---|---|
| Task / requirement / acceptance | SRC-109/T02, D3-01; [CD-01…12](../quality/chat-data-acceptance.md); native execution NOT_RUN |
| Tên table / schema đích | crm_chat.chat_migration_chunk; owner chat |
| Physical current | Not created. New Chat lineage1 |
| Service writer / aggregate | chat only; Durable replayable import checkpoint committed with exact rows; never update past unverified differences; local transaction and audit/outbox/receipt, never remote SQL |
| Ý nghĩa / không thuộc phạm vi | Durable replayable import checkpoint committed with exact rows; never update past unverified differences; no replica authorization or remote business authority |
| Loại dữ liệu | source of truth |
| Scope | Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound |
| Cột | Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](dictionary.md) and source-v42.json; new meanings are explicit |
| Keys / constraints | PRIMARY KEY (`tenant_id`,`run_id`,`table_name`,`chunk_number`). CHECKs and FKs are exact in DDL. No cascade deletion. |
| Remote references | Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them. |
| Query patterns / indexes | Exact tenant+primary-key lookup. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN. |
| Quyền | Owner chat workload allowlist plus exact operation policy from [16 capability rows](../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints. |
| Concurrent writes | Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding. |
| Audit / outbox | Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative. |
| PII / secret / retention | Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones. |
| DB grants | chat_api: SELECT; chat_worker: SELECT; chat_migrator: SELECT/INSERT/UPDATE; DDL only separate migrator; no foreign schema grants |
| Migration | Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented. |
| Compatibility / rollback | Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../architecture/chat-data-migration.md). |
| Test fixtures | Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12. |
| Evidence | Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN. |

| Column | SQL type | Null / default / generated | Meaning |
|---|---|---|---|
| tenant_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Authenticated business tenant; never a default/system fallback |
| run_id | CHAR(36) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Local migration run |
| table_name | VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Allowlisted target table |
| chunk_number | INT UNSIGNED | NOT NULL; no default | Ordered stable PK chunk |
| last_key | JSON | NOT NULL; no default | Typed ordered PK tuple; max4KiB |
| row_count | BIGINT UNSIGNED | NOT NULL; no default | Rows in immutable chunk |
| source_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Canonical original row hash |
| target_hash | CHAR(64) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | Readback hash |
| state | VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin | NOT NULL; no default | copied/validated |
| updated_at | DATETIME(6) | NOT NULL; no default | UTC commit |

CHECK: `state IN ('copied','validated')`; `JSON_STORAGE_SIZE(last_key)<=4096`; `tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`.

Local FK: fk_chat_migration_chunk_1: (tenant_id,run_id) → chat_migration_run(tenant_id,run_id).
