# PLAN-006B — Contact resolution responsibilities

DONE design-only, Codex2026-10-06, S-20261006-12 / CHG-20261006-10 / ADR-019. Dependencies PLAN-005/SRC-029 DONE. User explicitly assigns provider profile enrichment/cache to Connector, canonical Contact resolution to CRM, required crm_contact_id to inbound/outbound Chat contracts.

[Contract](../../contracts/contact-resolution.md) defines service ownership, canonical identity key, profile/mapping caches and invalidation, profile fallback/provenance/Human edit preservation, ResolveContact/ValidateContactBinding/SyncContactProfile semantics, Chat required customer context (including outbound/echo), future ERD and versioned migration gates. Updated service/module contracts, data ownership/dictionary/model, APIs/events, architecture, UX, acceptance, plans and tracker. Supersedes contradictory target ownership of contact_identity at Connector; baseline source stays intact.

## Evidence

Host Node25.9.0/Python3 for doc-only checks. `node scripts/check-docs.mjs` PASS (artifacts/PLAN-006B/docs-check.log); `git diff --check` PASS (whitespace.log). Python SHA256 comparison to pre-edit source/config snapshot PASS (source-before.json,source-check.log). No runtime tests invoked or claimed. Mermaid syntax blocks/link references checked by docs script, diagrams not rendered.

Working tree main HEAD1111839 dirty from prior source/docs, preserved; no source/generated contract/migration change, no commit/push/deploy/service lifecycle action. Last runtime evidence remains SRC-029 (seven preview containers healthy), not rechecked in this design turn.

## Remaining gate

Only responsibilities and semantic contract accepted; exact JSON Schema/OpenAPI/TS, auth/delegation, physical cache/mapping migrations, provider profile API permissions/endpoint/fields, invalidation transport/retention and Chat dispatch fences remain PLAN-006/004 before source READY. Full M3 local and live acceptance incomplete; missing sandbox remains separate. Next: exact machine/physical/auth design for this scoped Connector→CRM→Chat saga, then source tasks.
