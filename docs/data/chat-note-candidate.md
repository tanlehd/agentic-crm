# CRM note candidate storage review

SRC-109/T05, CHG-20261023-01. Scoped Ready for retained native candidate only; main43 is unchanged. [Contract](../contracts/chat-notes-candidate.md), [guideline](database-guidelines.md), [schema catalog](schema-catalog.md).

Reuse the exact reviewed [crm_owner_command table template](chat-extraction-tables.md#crm_corecrm_owner_command) and immutable T02 owner-additions-v1.sql definition. Native provisioning extracts only that CREATE TABLE, pins its checksum in private metadata and verifies its installed definition before reuse. It does not apply the full T02 support file. Body lives only in Activity; command request/result JSON contains digests/reference IDs, never plaintext note content. Runtime receives SELECT/INSERT/UPDATE on this receipt ledger, required CRM table DML and append-only audit/outbox privileges; no Chat/Identity tables or DDL grants.

| Required table review | Activity related-record detachment |
|---|---|
| Task / requirement / acceptance | SRC-109/T05 CRM notes; note-create duplicate/abort/recovery and retained historical notes |
| Table / target schema | crm_core.activity, CRM owner |
| Physical current | native_identity_test candidate and agentic_crm baseline43; only native candidate is eligible for this scoped fixture step |
| Writer / aggregate | CRM Activity transaction writes registry/activity/ownership history/audit/outbox and crm_owner_command receipt |
| Meaning / scope | Activity source of truth; business tenant from authenticated workload request/proof, tenant_id stays NOT NULL |
| Columns | Existing types/defaults/nullability unchanged; related_record_id CHAR36 remains nullable logical record reference; record_id and tenant_id unchanged |
| Keys / constraints | Retain activity own-registry FK activity_ibfk_2 (tenant_id,record_id), all indexes/PK/checks. Drop only activity_ibfk_1 (tenant_id,related_record_id) after exact information_schema preflight; reject any unexpected FK shape |
| Remote references | Chat Conversation validated by exact admitted/pending parent proof, no shadow CRM Conversation required. Other generic CRM relations continue RecordRegistry validation until owner adapter activation |
| Queries / indexes | tenant/related_record_id/kind plus registry ACL and UUID keyset pagination; existing indexes retained, native EXPLAIN evidence required |
| Authorization | Conversation read/note and text read/write; Activity body read/write for create, independent Activity own/team/all read and body redaction for list |
| Concurrency | CRM receipt key INSERT lock serializes create/abort; Chat acceptance separately pins session/owner before RPC; immutable result/tombstone |
| Audit / outbox | CRM Activity creation plus reference-only crm.conversation_note.changed in same transaction; no Chat SQL/contribution inside CRM |
| PII / retention | Existing Activity body retention; receipts permanent, encrypted DB/backups, no plaintext payload logging or local data reset |
| Grants | Dedicated candidate CRM writer only own-table required DML; read-only note role stays read-only. Operator alone provisions/changes constraints |
| Migration | Inspect exact two-column FK, inventory row counts and definition, checksum-pin scoped SQL, apply only one FK removal and one reviewed support table. Existing rows unchanged; no copy/backfill |
| Compatibility / rollback | Schema is additive plus FK removal; old generic CRM checks still required. Do not restore foreign FK once Chat-only references exist. Main activation requires owning adapters and post-write reconciliation/import before old routing; no blind down migration |
| Fixtures | Reuse native business4101/4102 and Chat owner fixture. Preserve historical synthetic notes; new Chat-only Conversation IDs prove absence of CRM target registry dependence |
| Evidence | Applied native candidate only; note-write-native.log verifies preserved row count. note-write-native-recovery.log passes13write/recovery groups; read8/detail8/history6 also pass. EXPLAIN reports Activity index_merge and registry eq_ref on retained fixture. Runtime SELECT/INSERT only for business effects; receipt SELECT/INSERT/UPDATE; unauthorized delete/foreign SQL denied. All logs under artifacts/chat-extraction/continuation-20261022. Main migration NOT_RUN |

The unrelated detachments and retired Chatflow objects in baseline-reference-detach-v1.sql are not part of this migration. Historical migrations and T03 frozen evidence stay immutable. No service count or extraction gate is completed by applying candidate DDL.
