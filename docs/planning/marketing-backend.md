# Marketing backend implementation sequence

PLAN-011E / CHG-20261008-11,2026-10-08. User approved finishing the next backend design gate. [Exact metadata contract](../contracts/marketing-metadata-sync.md), [forward table templates](../contracts/marketing-sync-tables.md). These are Ready design artifacts; current deployed state is SRC-054 database v1 only.

| Order | Task | Deliverable / gate |
|---|---|---|
| 1 | SRC-056 | Channels credential and Page authority ports; native credential setup/revoke; encrypted Ad Account credential; typed Graph proxy; immutable admission receipts; independent Page admission state; migration/ACL/secret/revoke-race/persistent MySQL tests |
| 2 | SRC-051 | Independent Marketing NestJS service/API/worker; binding/schedule/run lifecycle, six-hour full metadata reconciliation,88 selected field ingestion, tenant admission, revision history, lookup/snapshot/change stream; synthetic HTTP plus real MySQL/restart tests |
| 3 | Remaining PLAN-011 then SRC-055 | Exact compatible base/age/region Insights request matrix and lookback/late-attribution settings; use metadata admission. Live support and metric semantics gate separate from metadata |
| 4 | PLAN-022 then SRC-049 | Report builder uses producer fields/links/metrics; source data does not implement templates/UI by itself |

One source task active at a time. SRC-056 source dependencies are PLAN-011E/SRC-054/SRC-031/SRC-038 DONE. SRC-051 source waits for SRC-056 plus existing CRM/database foundations; completing design does not bypass its producer dependency. Broad PLAN-011 remains TODO for other CRM/Insights scopes, so use scoped PLAN-011E rather than falsely closing that umbrella.

## Implementation checkpoints

1. Authority: publish machine schemas for exact routes, add next monolith forward migration and safe grants, implement native/admin and private auth checks, fixed typed provider reads and receipt decision. Build and run tests before claiming SRC-056 complete. No standalone Connector Page catalog backfill/cutover here.
2. Marketing: own package/build/runtime config, own MySQL runtime credential and forward version2 migration. Add worker claim/heartbeat/retry mechanics, adapter/client ports, parser/allowlists and atomic projection/change/checkpoint writes. Dependency injection substitutes transport only in tests; no runtime fake Meta switch.
3. Read/control: native BFF integration metadata routes plus service API, watermark/cursor/ambiguity rules and field coverage. Backend release does not include a new Marketing UI or account OAuth picker; those need a separate UX scope if requested. Current Page UI remains usable.
4. Local release: compile/typecheck/lint/contracts, real MySQL two-tenant tests, synthetic HTTP fixtures with secret-redaction checks, graceful crash/takeover/restart and warm migration preservation. Use existing persistent synthetic tenants/users; do not reset volumes or enable a live schedule automatically.

## Default operational choices

First validated binding schedules immediately; thereafter every6h, interval configurable900..604800s, manual sync coalesces. Worker tick15s, lease60s/renew20s,50 Ads/page,1000 pages/run,8 retry failures then attention. Metadata full reconciliation avoids relying only on updated_time. Page mismatch skips; unknown/conflicting/missing evidence defers and next full scan revisits it. Expose completed_with_gaps when unresolved count>0, never claim all data imported.

Runtime activation remains explicit configuration: deploying/building a worker does not create an app-level reminder/automation or enable Meta credentials. Real tenant connector activation is the configured account binding action. Local fixture mode is not production synchronization. Live smoke uses a real configured account only after authority and worker local acceptance; currently NOT_RUN, no credentials requested for design work.

## Evidence and remaining scope

PLAN-011E validates references, metadata manifest and document consistency. It does not demonstrate HTTP endpoints or running worker. SRC-056/SRC-051 must record commands/artifacts, no secret payloads, with source status separately. Insights query compatibility/Lookback/age-region performance and report templates remain separate. Post-only Creative with neither explicit Page nor documented actor evidence stays deferred until additional verified endpoint capability exists; no guessed Post-ID parsing.

SRC-051 checkpoint2026-10-08: own package/storage scheduler and change stream repositories tested; forward control schema2/3 applied. Remaining within the same IN_PROGRESS task: authority client + all88-field producer/atomic projections, periodic worker entrypoint, private API/native BFF, integrated admission/pagination/fault/restart release. Do not treat storage tests as completed provider ingestion. [Evidence](../tracking/details/SRC-051.md).
