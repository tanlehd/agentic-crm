# Workflow visual builder — SRC-067

2026-10-13 · Ready · CHG-20261013-04. Follow-up to completed SRC-066, requested by user. Dependencies SRC-066 and PLAN-024F DONE. Existing [M2 CMS contract](workflow-cms-m2.md) remains authoritative for permissions, APIs, immutable versions and activation.

Canvas is the primary editor: draggable cards, directed connections, explicit True/False and event/timeout ports, trigger entry connection, dot background, zoom/pan/fit, auto-layout, palette and selected-node inspector. Palette click inserts before selected node; dropping adds a disconnected node at the drop position for manual wiring. Output port drag replaces its single outgoing edge. Edge selection and delete clears that port; inspector selectors remain a keyboard alternative. Reject self/cyclic canvas connections, allow incomplete drafts during editing, and retain authoritative server validation before save/publish. Undo/redo covers graph edits, not version switching or activation.

Use React Flow for pointer/keyboard canvas mechanics. Seven existing M2 primitives only; no new execution capability. Do not copy vendor branding/assets. Inspiration: Salesforce toolbox/canvas/button bar and auto-layout; Dify node inspector; n8n explicit input/output connectors.

Layout is device-local presentation, stored only as numeric positions in sessionStorage, keyed by tenant, definition and saved version (or unsaved draft). Never store graph/config/credentials there, never send positions in strict executable graph. New versions inherit current positions; other browsers use deterministic DAG layout. Storage failure falls back to layout. No API/schema/migration changes. Persisted execution graph remains the source of truth.

Acceptance: real browser drag node, connect/replace/remove edges including branch and timeout, reject cycles, palette click/drop, undo/redo, zoom/fit, inspector, server save/reopen exact graph, desktop/mobile usability, retained native permission/CAS tests. Screenshot inspection and production build/type checks required. Local Alpha access already authorized; no workflows auto-enabled.

References checked 2026-10-13:

- [Salesforce Flow Builder](https://trailhead.salesforce.com/content/learn/modules/flow-basics/meet-flow-builder)
- [Dify quick start](https://docs.dify.ai/en/quick-start)
- [n8n connections](https://docs.n8n.io/workflows/components/connections/)
