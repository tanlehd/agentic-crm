# Demo 50 inbox: CRM fixture and Report Builder dashboards

SRC-070 · [Ready contract](../contracts/inbox-demo-dashboards.md) · [execution evidence](../tracking/details/SRC-070.md).

## Scenario

Exactly 50 retained synthetic sessions: 30 accepted, 20 queued. Accepted sessions partition into 10 with a Lead, 10 exchanging information, 5 closed spam and 5 silent after the first outbound. The native fixture uses existing Alpha admin and Chat Anna identities; no extra agent/user/role is needed for CRM seeding. Names begin `DEMO Inbox50`. The first 20 customers have a synthetic follow-up message; the 10 Leads have need-confirmed evidence and the next-step stage. Information cases use the consulting stage. No tenant process configuration is overwritten.

Report time is explicitly simulated: 14 October 2026, 09:00–10:00 Asia/Ho_Chi_Minh. It uses the same native session IDs but does not rewrite canonical CRM timestamps. Two agents × 12 assumed active slots, one staffed hour each: 25 active / 24 slots = 104.17%; 30 accepted / 2 agent-hours = 15 per agent-hour. At that same assumed pace, round 50/15 up to 4 agents to balance arrivals. This is scenario arithmetic, not measured sustainable capacity.

Ad A/B/C cohorts contain 20/20/10 inboxes, 15/12/3 accepted and 8/2/0 Leads. Simulated spend is 800,000 / 600,000 / 300,000 VND, aggregated once per Ad. Total CPL is 170,000 VND. Ad C CPL is unavailable, not zero. Queued customers have unknown quality. Known interest means Lead-created or information-exchange, not qualified or won.

## Retained local fixture

Run from the repository root with the local API, worker, web and MySQL healthy:

```powershell
. ./scripts/dev-shell.ps1
pnpm --filter @agentic-crm/reporting build
node scripts/inbox-demo-seed.mjs
node scripts/inbox-demo-reporting.mjs --prepare
```

The seed uses authenticated native application APIs and mock Messenger intake. `.local/inbox50-v1.json` retains native IDs, ingress event payload times, command keys, expected revisions and completion markers. Never delete it to rerun; warm rerun reconciles the same records. It fails on unexpected owner/status changes instead of silently rewriting finished cases. Interrupted definite-cancelled outbound attempts remain in history; recovery sends only when all prior attempts are definitively cancelled, and waits for actual sent status before ownership changes/close. No replay of unknown deliveries or database/Redis reset.

`--prepare` builds the Reporting-owned immutable synthetic snapshot and computes all 11 widgets locally. It does not grant Alpha permissions or save reports as a different owner. Generated data/evidence stays in ignored `artifacts/inbox-demo`; private manifest stays in `.local`. There is no new table or migration, cross-service SQL, shared transaction, live Meta producer or background scheduler.

## Alpha activation

CHG-20261014-03: the user explicitly corrected alpha_admin to be tenant super admin. [Current policy](../contracts/tenant-super-admin.md) uses its existing admin seat + tenant_admin role. No separate Reporting role or membership update is needed. The earlier role-approval question is superseded. Actual Alpha login, all 11 widgets, native save/reopen/edit and CSV now pass; evidence is in artifacts/inbox-demo/alpha.

```powershell
node scripts/inbox-demo-reporting.mjs --activate
```

This reuses the native Alpha session/CSRF and effective rights, saves both dashboards, reopens/runs every widget and verifies desktop/mobile. Do not use the legacy --grant-approved flag for super admins. Keep the Reporting service running the built code; use the local monitor for controlled reloads, never reset databases.

Open: Report Builder → Báo cáo đã lưu → “Điều hành inbox · 50 phiên DEMO” or “Chất lượng chuyển đổi quảng cáo · 50 phiên DEMO” → Làm mới dashboard. Compose additional private dashboards with Dashboard mới → Chỉnh bố cục → Thêm widget; configure a report then add it. Maximum 12 widgets; metadata, order and removal are editable. Saves retain native owner/CAS/idempotency behavior.

Widgets pin immutable generations. Refresh never silently advances them. The current UI requires discovery metadata for the same active generation; if a binding advances, an older pin shows `SNAPSHOT_PIN_UNAVAILABLE` instead of rendering with potentially different catalog labels. Old immutable generations remain stored. Historical catalog discovery/rebinding, live refresh, sharing, global filters and full SRC-061 remain separate work.

## Verification

```powershell
pnpm test:unit
pnpm --filter @agentic-crm/web typecheck
pnpm --filter @agentic-crm/reporting typecheck
node scripts/reporting-query-native-test.mjs --runs --inbox-demo
node scripts/reporting-native-test.mjs
```

Run the two native Reporting harnesses sequentially: they reuse one retained isolated Identity fixture and restore its role/seat. The first command uses a browser-only transport proxy to that test identity; its screenshots are not proof of normal Alpha Reporting activation. Browser negative checks deliberately inject partial failure and 403, while positive widgets execute through real HTTP/MySQL. Alpha activation evidence is separately written under `artifacts/inbox-demo/alpha` after real Alpha native authorization succeeds.
