# PLAN-005 — Enterprise microservice architecture

DONE doc-only, Codex2026-10-06, S-20261006-09 / CHG-20261006-07. Dependency SRC-027 DONE. User explicitly requested enterprise microservices and clear per-module scope/architecture/data model; no reapproval needed for that direction.

## Deliverables

[Architecture](../../system/architecture.md) updated target; previous implementation retained in [monolith baseline](../../system/monolith-baseline.md). [14 service descriptors](../../services/README.md): Identity, CRM Core, CRM Connector, Chat, Sales, AI Runtime, Routing, Workflow, Chatflow, Media, Ticket, Reporting, Operations, Gateway/BFF. Each has8 required sections with specific domain entities, command/event interactions, invariants/failure handling and extraction blockers. All11 existing modules linked to target descriptors; Ticket/Reporting/media/provider features not falsely marked implemented.

[Service ownership](../../data/service-ownership.md) partitions registry/owner authority into resource services, Identity authorization vs Runtime config and Connector vs Chat transport/content/control. [Cross-service rules](../../contracts/service-boundaries.md) define local outbox/inbox, idempotency, revisions, minimized events, saga/receipt and fail-closed authorization; exact wire/dispatch grant protocol remains PLAN-006. [Extraction roadmap](../../planning/microservices-migration.md) has first-slice gates, single-writer cutover, compatibility/pinned runs/rollback limits. ADR-017 supersedes future deployment/shared-UoW rules while retaining history. AGENTS.md updated to enforce service boundary reads and no distributed UoW/SQL/FK.

REST/OpenAPI and NATS JetStream are technical design baseline; no broker dependency installed, no HA/performance claim. Per-service SLO/RPO/RTO require measured deployment gates, not invented values. Distributed ownership/permission revocation has explicit protocol gate; no instantaneous cancellation promise.

## Evidence

| Command | Result | Artifact |
|---|---|---|
| `node scripts/check-docs.mjs` | PASS Markdown/local links/JSON examples/Mermaid headers/source DAG; final counts in log | artifacts/PLAN-005/docs-check.log |
| `python3 artifacts/PLAN-005/check-boundaries.py` | PASS14 descriptors×8 required sections,11 module links;368 source/config files unchanged against pre-task SHA256 snapshot | artifacts/PLAN-005/boundary-check.log; source-before.json |
| `git diff --check` | PASS exit0 | artifacts/PLAN-005/whitespace.log |

Host Node25/Python3.14 documentation checks only; Mermaid headers checked, diagrams not rendered. App/build/DB/distributed tests NOT_RUN because no app/config changes. Prior SRC-027 tests remain historical, not microservice validation. Working tree main HEAD1111839 with prior dirty work preserved; docs + AGENTS changes only this task. No commit/push/deploy/service lifecycle actions. Services last observed7 preview healthy in SRC-027, not freshly checked during doc-only task; no new background processes.

## Handoff

PLAN-005 DONE; PLAN-006 READY unclaimed design task. All source extraction TODO/not Ready. PLAN-004 remaining provider/media scope must align these service contracts; no need ask user again whether to use microservices. Current source/API+worker shared MySQL schema18 (preview17) unchanged. Next: claim PLAN-006 and finalize exact first-slice contracts plus authority/cutover/transport fixtures before source extraction.
