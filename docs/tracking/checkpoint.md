# Checkpoint — điểm tiếp tục

Updated2026-10-06, S-20261006-15. SRC-001…031 DONE; PLAN-004D scoped design DONE. M3 overall/local release incomplete. [Tracker](tasks.md) · [Evidence](details/SRC-031.md). No task active, no background agents/automation.

## User objective and decisions

Hoàn thiện M3 local; no Meta sandbox. Latest priority: Admin configuration→Channels→Facebook Page list and Connect Facebook, real OAuth discovery (explicitly selected by user), DB-managed Page tokens; user may replace token manually later for demo. Unified conversations need channel/icon/channel_id and filtering/report dimensions by Page ID. CRM DB remains SoT for canonical identity→Contact; Connector/Chat cache-aside and crm_contact_id contracts from SRC-030 retained.

## Delivered this session

SRC-031 implements OAuth state/session/tenant binding, fixed Graph v26.0 code exchange and bounded Page discovery, encrypted Page credentials and verified manual stdin token CLI. Admin UI and callback return to selected tenant, Page list and configuration state. Migration19 adds Page/OAuth tables, channel provider extension, Conversation channel and generated channel_id, FK/indexes. Inbox Messenger icon and channel/channel_id/page_id filters honor tenant/field/record ACL. [Contract](../contracts/facebook-configuration.md) · [Runbook](../development/facebook-configuration.md).

Baseline Channels module owns configuration; independent Connector DB/capture remains unchanged. Page token stored does not activate receive/send: transport stays disabled, no real Page relabelled as mock. Real capture→Chat, subscription/send/control and provider profile enrichment are pending. Existing event/envelope versions unchanged.

## Verification / workspace

Main HEAD1111839 dirty, pre-existing work preserved; no commit/push/deploy/preview migration. Canonical Node24.21.0/pnpm10.33.0 Linux arm649/9 PASS (96 unit/contract/renderer +7 tooling). MySQL196/196 PASS including upgrade18→19, OAuth replay/supersession/revocation/cross-tenant rollback/encryption, channel filter/field ACL/cursor. Next+Chrome desktop/mobile synthetic browser smoke PASS; current nginx config syntax PASS. Screenshots inspected. Artifacts `artifacts/SRC-031/{verify-final.log,verify-summary.json,integration-complete.log,ui-smoke-final.log,gateway-config.log,docs-check.log,whitespace.log,services.log}`.

All disposable containers cleaned exit0. Isolated Next3101 test server stopped; seven existing preview containers healthy and still old schema17, not updated. Host Node25 orchestration/preflight/UI only. Full-stack release smoke expected schema19 but not rerun. Live Meta OAuth NOT_RUN; needs App ID/secret/key/valid redirect and eligible app account. No real secret read or stored during this task.

## Next action

Complete exact provider-ingestion/provisioning contract, then connect configured Facebook Pages and independent signed capture to CRM resolve/cache→Chat delivery as the next scoped source task. Keep subscription/send/control/profile enrichment and local M3 release explicit; do not bypass mock guards or give services direct SQL to the catalog. Real setup is documented; no unresolved business decision blocks the next design/source gate.

## Git handoff — S-20261006-16

User authorized committing/pushing accumulated SRC-026…031 work to origin/main. This checkpoint is included in that handoff commit; resolve its actual hash with Git history. Earlier uncommitted references describe implementation/test sessions. Preview remains old and Channels is not visible there until explicit preview update; admin still requires configured integration.read/configure grants, no username bypass. User will continue remaining tasks individually.
