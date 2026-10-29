# Chat workspace create source — CHG-20261024-03

2026-10-24, Codex, SRC-109/T06. [Owner/source contract](../contracts/chat-sales-conversion-boundary.md). UI sub-scope verified; T06 remains IN_PROGRESS, T05 DONE, T07–T09 TODO, D3 2/6 and local 2/14 unchanged.

## Implementation

`apps/web/app/crm/customer360.tsx` captures conversation, Contact, session and selected Lead when opening the existing Lead/direct Deal/Deal-from-Lead dialog. The Sales panel stays mounted across session polling close/reopen, preserving the open draft and failed request's idempotency key. Tenant/conversation/Contact changes reset the panel. Explicit dialog close, navigation, reload and browser restart do not retain the draft/key.

Existing forms send the captured context to Sales. Deal-from-Lead sends the selected Lead and creation context; Sales retains authority over inherited immutable origin. No new endpoint, callback, schema, agent feature or Sales business workflow. Manual creates remain without fabricated Chat source. Owner authorization/source checks are unchanged.

## Verification

Windows PowerShell, Node 24.21.0 / pnpm 10.33.0 enabled with `. ./scripts/dev-shell.ps1`. Evidence directory: `artifacts/chat-extraction/workspace-source-20261024`.

| Command | Result | Evidence |
|---|---|---|
| `node scripts/chat-workspace-source-browser.mjs` | PASS 7 browser scenarios | `browser-static.log`, `browser.json` |
| `pnpm --filter @agentic-crm/web typecheck` | PASS | `typecheck.log` |
| `node scripts/lint.mjs` | PASS 1069 JS/TS files | `lint.log` |

The harness bundles actual Customer360/LeadCreate/DealForm with Vite in memory, serves an ephemeral loopback HTTP listener and drives headless Edge. All owner HTTP responses are intercepted synthetic fixtures; no DB or native Sales integration acceptance is claimed. Cases cover Lead draft/source/retry-key equality across two rollovers and 503; direct Deal after session close; pinned selected Lead without overriding inherited source; scope change discarding draft; manual Lead and Deal without source; visible owner 403 without local fallback. Browser and listener close in harness cleanup.

Earlier Vite dev-server/Chrome attempts stalled; they are not product failures or a successful red-before regression run. Retained logs: `browser-first.log` in this evidence directory and `artifacts/chat-extraction/workspace-source-before.log`, `artifacts/chat-extraction/workspace-source-before-2.log`. The final static-bundle/Edge run is the successful browser evidence.

Docs and scoped whitespace checks are recorded in `docs.log` and `whitespace.log`. `manifest.json` records actual branch/HEAD and file hashes; `tracked.diff` covers tracked changes only, including inherited changes where present. Working tree main/21eaadd0e8d1e9163bfb7721390c2e6b385b1b42 was already dirty with 840 entries at this sub-scope's start. No commit/push, deployment, migration/reset, main service restart or fresh health probe. Production build/native suites were not run for this UI change.

Next: T06 external Conversation/message read boundary review. Workflow/Sales/Reporting consumer implementation is accepted separately.
