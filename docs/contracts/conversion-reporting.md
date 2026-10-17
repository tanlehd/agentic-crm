# Connected conversion reporting — PLAN-048 / SRC-086

2026-10-17 · CHG-20261017-08 · Implemented bounded monolith slice; [acceptance/evidence](../quality/conversion-reporting-acceptance.md). User authorized coding after [PLAN-047](../planning/conversion-operations-review.md). Implement connected Session/Lead/Deal reporting, reusable dashboard, configurable report goals and record drilldown. Existing mock/operations reports and Sales commands remain compatible.

## Semantics and dictionary

Chat owns sessions/need/contribution facts; Sales owns leads/deals/context/merge/outcome links; CRM supplies record metadata through an application port. Reporting receives a signed minimized payload, never business SQL. Baseline ports share the existing monolith UoW only; extraction replaces them with versioned APIs/events. No transcripts or customer names in reporting payload.

New adapter `native_conversion_v1`, tenant-specific binding, immutable catalog pin. Read all bounded tenant facts (max5000 source facts and10000 projection rows); reject excess, never truncate. Source snapshot uses REPEATABLE READ with database observation timestamp; only current snapshot semantics, no historical-state reconstruction. Public rolling windows1…365days, max horizon90days; source retains older related facts for complete lineage/current backlog. Facts do not persist in Reporting. Durable connected runs remain unsupported.

Objects: `cv_session` one episode with thread ID, opened_at, source channel/Page/ad/classification, historical initial owner/team when recorded, current status and derived current attention; `cv_lead` one original Lead including merged source, created_at, origin_session_id, canonical_id and status; `cv_canonical_lead` one canonical Lead with canonical origin/created_at and all exact group Deal links; `cv_deal` one Deal with original lead/origin, canonical_lead_id, direct flag, amount/currency/stage/closed_at; `cv_attention` one current actionable subject (session, Lead, Deal or unmapped need) with record/thread/episode IDs, reason, current owner/team, age and observation time. Current-owner fields are operational, not historical credit.

Session cohort counts original origin lineage: sessions_with_lead/deal/won and direct/through-Lead won branches use distinct session IDs. Raw Lead volume includes merged source and is labeled raw; canonical Lead conversion uses merge-group IDs, preserves existing Deal.lead_id/source and uses canonical target creation cohort. Cross-origin merges never reattribute session outcomes. A direct Deal contributes Session→Won and Deal metrics, never Lead→Won. Source origin is separate from created/follow_up/closing context; never fan-out monetary values through contexts.

Lead cohort can choose raw or canonical model explicitly. Deal cohort win rate uses all created Deals; open/lost shown separately. Count Deals once, sum decimal amounts once per Deal and currency, zero denominator null. Currency mismatch fails; monetary templates require explicit currency selection rather than guessing currency from tenant. Behavioral milestones are not Sales outcomes.

Optional `time.horizonDays`1…90 only for conversion acquisition-cohort models. Include base subjects mature by observation time; cut off outcome collections at base creation+H (inclusive), reject pre-base outcome times for horizon metrics, disclose immature count. Omission observes outcomes through current asOf. Live data cannot reproduce past merge/state; prior-history requests unsupported. Historical initial assignee/team requires an opened contribution, then uses the earliest non-null opened/assignment owner; partial legacy history→null, never inferred from current membership. Current action list is separate snapshot model, no horizon.

## Goals and drilldown

Optional report definition `goal:{metricId,target}`; target nonnegative decimal string, percentage <=100, exactly one selected KPI and no dimensions, supported units count/percent/currency. Scope, period, currency, cohort/horizon/merge/owner role and responsible principal inherited from the immutable report version and owner; editing scope creates a new version. No seeded business target. Backend returns actual,target,gap (actual−target, percentage points for rates), attainment percent (null for target0). Goal values persist in existing report_version.definition JSON with existing audit/CAS/permissions; no new goal table.

Attention reasons distinguish session without primary-origin Lead/Deal, open Lead without Deal, open Deal, and explicit need without mapped outcome. Existing follow_up context suppresses false session-without-outcome attention; mapped Lead/Deal is not necessarily won. Age is displayed/filterable; no invented overdue SLA or auto notification. Current owner/team comes from registry; negative access fails. Report table reference links route to native Inbox/Lead/Deal and destination rechecks rights. No arbitrary external URLs. Max4dimensions remains; action table uses kind/id/reason/owner, age as metric. Open a need via its thread/episode context.

## Authorization and transport

Source available only with report.run plus complete read/all for Conversation, Contact, Lead and Deal (via CRM `allows` for Sales/Core), and read/filter on every projected field; export additionally needs report.export and export fields. No partial-record ratios. Current revision checked before/after signed transport, same as Operations. Denied source omitted; explicit unavailable binding fails, no fallback fake zeros. No grants added automatically.

Private sourcePolicy adds optional `conversion` to existing `{allowMock,operations}` for compatible callers. Conversion payload `{schemaVersion:1,tenantId,asOf,historyFrom,rows}` has exact registered fields, bounded size4MiB and type checks. Operations unchanged30day/5000rows; conversion independent365day bound. Public query/report APIs cannot accept sourcePolicy. No producer source cache shared across users.

## Filled table review / compatibility

| Item | report_connected_catalog existing table / Reporting schema6 |
|---|---|
| Task / AC / owner | SRC-086, CV-01…07; Reporting, physical crm_reporting/test_crm_reporting |
| Meaning/type/scope | Immutable metadata only; business tenant_id CHAR36 NOT NULL from native admission; existing PK tenant,binding,catalog_hash |
| Columns/keys/refs | No new columns/FK; adapter_id VARCHAR64 now allows native_operations_v1/native_conversion_v1; hash64 format retained; existing widget FK unchanged |
| Query/index | Existing exact PK lookup/insert; no new access pattern or index |
| Writes/rights | Existing report design own/all, saved-version CAS/idempotency/audit; runtime SELECT/INSERT only; migrator DDL |
| Retention/PII | Metadata retained with report versions, no customer/source rows/secrets, existing retention |
| Migration | Forward006 expands CHECK only; migration005 immutable. Backup and fingerprint all old tables; repeat no-op; no backfill/reset |
| Compatibility | New binary needs6 for conversion dashboard save. Old binaries cannot execute new adapter/definitions; old operations/mock pins still valid. Forward fix preferred, retain metadata on rollback |
| Tests/evidence | Existing synthetic tenants reused; MySQL check/PK/grants preservation, native wrong-tenant/revoke/export, unit/browser PASS; see acceptance/evidence |

## Acceptance

CV-01 distinct session/Lead/Deal cohorts, no-outcome denominator, multi-Deal, direct branch, zero and decimal/currency. CV-02 source S1/create S2/close S3/duplicate contexts preserve origin and single won value. CV-03 raw vs canonical merge with existing Deals/cross-origin mapping, current snapshot explicit. CV-04 horizon matured/immature and late won, unknown initial owner, no fabricated historical asOf. CV-05 current tenant/scope/field/export revocation, payload bounds/source failures/pins. CV-06 event-time initial assignment vs current operational owner, needs unmapped distinct from won. CV-07 native flow→refresh, versioned goal save/reopen/gap, template reports reuse, actionable native links, desktop/mobile/errors. Executed evidence and the precise CV-06 inspection boundary are recorded in acceptance; no broader feature completion implied.

Historical initial assignment refinement: require an `opened` contribution (full coverage) before selecting the earliest non-null opened/assignment owner and team. Partial legacy contribution history returns null; a later handling action is not evidence of initial assignment. Goal template monetary report requires explicit currency on creation; defaults in the release recipe are placeholders only.

Historical time travel, multi-touch revenue credit, generic custom-object ingestion, long-running exports, automatic goal alerts and Marketing spend remain explicit follow-ups, not prerequisites for this bounded connected release.
