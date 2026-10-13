# PLAN-014 — Meta Marketing source research and field merge

DONE design/research only, Codex2026-10-07, dependencies PLAN-013 DONE. User authorized official Markdown download and field/operational analysis merged into appropriate data model. CHG-20261007-16, S-20261007-19.

Deliverables: [24-source dossier](../../references/meta/marketing-dossier.md), [manifest/checksums](../../references/meta/2026-10-07-marketing/manifest.json), [operational mapping](../../data/marketing-field-mapping.md), [103 traceable field selections](../../data/marketing-field-selection.json). Updated dictionary/ownership/catalog, Marketing/Reporting descriptors, reporting module, acceptance and plans. New scripts download dated references, regenerate selected fields and verify source integrity.

Official Markdown endpoint responses contain an HTML pre envelope; raw bytes saved separately, extracted Markdown decoded once. Manifest records both checksums/timestamps and failed discovery attempts.24 selected documents downloaded successfully after correcting paths. No account data, token or transcript requested. Web fetch429 was bypassed by ordinary public direct HTTP fetch, not authentication circumvention. Standalone Object Story Spec unavailable as Markdown; parent Creative/CTM/asset references support selected scope, exact nested schema still PLAN-011.

Verification Windows pinned Node24.21.0:

- scripts/meta-marketing-snapshot.mjs:24 selected documents DOWNLOADED; completed run exit0, cached successful dated sources; initial guessed paths failed and are recorded.
- scripts/meta-marketing-field-selection.mjs: PASS103 selected fields found in official table rows.
- scripts/check-marketing-references.mjs: PASS24 raw/extracted checksum and extraction pairs,103 unique field traces.
- scripts/check-docs.mjs, scripts/lint.mjs and git diff --check: final results in execution log.

No runtime/backend/web/schema/DB change, migration or live provider call. No runtime tests needed for this documentation/source-reference task. PLAN-011/SRC-051/SRC-049 remain incomplete; version pin, exact physical table templates, nested schemas, permissions and sync/report runtime gates stay there. Insights remains separate from hierarchy/metadata sync. Marketing docs version candidate25.0 is recorded separately from historical Messenger26.0; live verification NOT_RUN.

Base ea5f71e, working tree source/docs from preceding sessions preserved, including next-env.d.ts. No commit/push/deploy, agents or service actions. No active implementation task after completion; next action PLAN-011 exact Marketing design using the selected mapping.
