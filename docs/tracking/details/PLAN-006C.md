# PLAN-006C — DB-backed cache-aside

DONE design-only, Codex2026-10-06, S-20261006-13 / CHG-20261006-11. Dependency PLAN-006B DONE. [Contract](../../contracts/contact-resolution.md) now requires cache→CRM DB lookup→hydrate, with resolve/create only after authoritative absence. Applies to Chat and Connector; no per-message CRM RPC on valid mapping cache hits. Lookup failures cannot create Contact; mismatched supplied Contact cannot be replaced silently. Enrichment nonblocking; idempotent replay preserves original receipt.

Services/data/ADR/acceptance/cross-service rules synchronized. `node scripts/check-docs.mjs` and `git diff --check` PASS, artifacts/PLAN-006C/docs-check.log and whitespace.log (host Node25 doc-only). No source/schema/generated API changes or runtime tests; no commit/push/deploy/service lifecycle action. Existing dirty work retained. Runtime last known from SRC-029, not rechecked.

Exact DB read adapter, invalidation/watermark/fencing/migration and machine contracts still require implementation gate; no source READY claimed. Baseline CRM module read port / target CRM service read API preserve DB ownership. Remaining review issue stable channel-account namespace is not silently resolved by this cache clarification.
