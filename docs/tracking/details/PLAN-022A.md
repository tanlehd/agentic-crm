# PLAN-022A — Report Builder planning evidence

Owner Codex · 2026-10-10 · scope design-only. Dependency PLAN-021 DONE. User requested module plan on Conversation, acquisition Session, Channel, Campaign/Ad Set/Ad/Page/Post/Media and Marketing Insights mock, with dynamic dashboard, team/agent/conversion KPI, axes/pivot/visualization and extensible datasource/model/attribute catalog.

## Deliverables

- [Module plan](../../planning/report-builder.md): scope/architecture/reference research, templates, persistence/API implementation gates and SRC-057…062 → SRC-049 sequence.
- [Semantic model](../../data/reporting-semantic-model.md): descriptors/object grains/relationship safety/metric formulas/owner role/time/currency/ACL/versioning/extensions.
- [UX](../../ux/report-builder.md): source/related objects/field slots, X/Y/series/pivot, library/dashboard/filter/drilldown states and text wireframe. Interactive mock/visual QA still pending PLAN-022.
- [Acceptance](../../quality/report-builder-acceptance.md): golden fixture with exact expected outcomes and RB-01…17. Runtime scenarios NOT_RUN.

Updated module/service/dictionary/ownership/index/UX registry/plans/roadmap/acceptance/tracker/checkpoint/log and README. No physical schema or source API/UI created. PLAN-022 remains TODO for exact wire schemas, producer coverage/snapshot/auth/event contracts, complete table templates/DDL/index/grants/retention, limits and interactive mock review. Existing SRC-051 remains IN_PROGRESS; no second source task claimed.

## Research

Public read-only requests via PowerShell Invoke-WebRequest on 2026-10-10. HubSpot custom report builder HTTP200, confirms multi-source/fields/axes/pivot. Salesforce Trailhead Lightning report builder HTTP200, confirms report type/Fields/Filters/summary/matrix. Links and applicability recorded in main plan. Initial legacy/incorrect Trailhead URLs returned404, corrected report-builder URL succeeded; no claim those failed pages were verified. Connected web-search tool twice returned isError with empty content, fallback public requests used. No authenticated product accounts accessed.

## Verification

Verification on Windows/PowerShell with pinned Node v24.21.0:

- `.local/node-v24.21.0-win-x64/node.exe scripts/check-docs.mjs` — PASS: local links, JSON examples, closed fences/Mermaid headers and62 acyclic source tasks; only SRC-051 active. Diagram headers are checked, diagrams not rendered.
- `git diff --check` — PASS; Git reports existing LF→CRLF normalization warnings, no whitespace errors. Final repeat uses `git -c core.safecrlf=false diff --check` to avoid warning noise.
- Manual semantic review: G1 distinct Contacts3 across paid ads vs subtotals4; two equal-value Deals retained; paid spend175 includes ad with0 sessions; ratios and continuous percentile expected values checked. This is document review, not executable metric test evidence.

Runtime/MySQL/browser/Meta/visual render NOT_RUN: this is a planning request and no executable change was made. Golden fixture values are expected design assertions, not test PASS. PLAN-022A DONE product planning; PLAN-022/source tasks remain unfinished as recorded in tracker.

## Workspace / resume

Windows PowerShell at D:/Work/Labs/agentic-crm; base ea5f71e, dirty worktree already contained extensive source/docs/Marketing work. Prior changes preserved, including apps/web/next-env.d.ts. No commit/push/deploy, services restart, background schedule, subagents or data reset. Services not freshly inspected in this session; prior health belongs to SRC-051 evidence.

Next active source action remains SRC-051 metadata producer/worker/API continuation. Reporting-specific next action is PLAN-022 exact implementation gate using this package, before any SRC-057 claim. No user decision blocks the planning deliverable; pending engineering design is explicit.
