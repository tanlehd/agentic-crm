# PLAN-011E — metadata backend Ready design

Owner Codex,2026-10-08. CHG-20261008-11. Dependencies PLAN-023/SRC-054 DONE. User approved next immediate step: finalize metadata backend design before implementation. This evidence concerns design, not running synchronization.

Reviewed README/build plan/tracker/checkpoint, current dirty workspace, Marketing schema/field/tenant contracts, database guideline/table template, Channels SRC-031 Facebook credential/page code, standalone Connector API/schema, native auth/service-boundary contracts and saved Meta authorization/Creative/Ad references. Current authority is Channels in monolith; no existing live Page-authority port in standalone Connector. Account read credentials are separate from Page messaging tokens.

Deliverables:

- [Metadata backend contract](../../contracts/marketing-metadata-sync.md): exact actor/auth boundaries, fixed read-only Graph transport, admission receipts/revocation ordering, scan/checkpoint/retry/fence, management/lookup/snapshot/change API, acceptance and live gate.
- [Forward table templates](../../contracts/marketing-sync-tables.md): Channels credential/receipt and independent Page admission state; Marketing schedule/operation receipts/commit-order clock/change stream and additive provenance fields; no applied DDL changes.
- [Implementation sequence](../../planning/marketing-backend.md): SRC-056 authority first, then SRC-051 worker/read APIs, SRC-055 Insights and Reporting separate.
- [Metadata manifest](../../data/marketing-metadata-profile.json):88 provider fields,6 object reads+Ads scan; v25.0 documentation pin; source traces, numeric bounds/default cadence, live NOT_RUN.
- [Strict request schemas](../../contracts/marketing-authority-v1.schema.json), generator/checker scripts; request examples reject caller URL/tenant override, unsafe numeric IDs and invalid operation-dependent fields.

Technical choices:6h full bounded metadata reconciliation by default, manual sync coalesces,50 Ads/page,lease60s/renew20s; deferred Ads revisited by next scan. Typed actor_id is accepted as Page evidence only in documented Creative context plus matching authority, conflicting/missing Page defers; never parse Post ID prefix. Snapshot stream uses a per-tenant commit-order clock to avoid lost events from out-of-order AUTO_INCREMENT commits. Already granted admission receipt is a historical authorization fact; revoke stops new grants, not a retroactive reassignment of CRM source.

Verification commands use pinned Node24. Expected checks: marketing-metadata-profile.mjs --check, check-marketing-authority-contract.mjs (20 positive/negative schema examples), check-marketing-references.mjs, check-docs.mjs, lint.mjs and git diff --check. Final actual results recorded after execution in log/checkpoint. No runtime/DB/HTTP/Meta tests claimed for this design task.

Working-tree reference base ea5f71e with prior work preserved; no commit/push/deploy,subagents,new running service or schedule. Schema26 CRM / v1 Marketing unchanged this turn. Next source task is SRC-056, not a worker pretending authority is already available. Broad PLAN-011 remains open for non-metadata scopes; use scoped PLAN-011E dependency for these two source tasks.

Final actual checks PASS: metadata manifest88 fields/six object queries plus Ads scan;20 schema examples;24 Markdown/raw pairs/103 original field traces; docs204/1617 links/56 source-task DAG;lint508 JS/TS;git diff --check. All are document/schema checks. PLAN-011E DONE design-only; SRC-056 READY unassigned; SRC-051 TODO waiting on authority source. No runtime services freshly probed this turn; last SRC-054 health evidence retained, not repeated as new evidence.
