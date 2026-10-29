# Independent service packaging — PLAN-054

2026-10-18 · CHG-20261018-05 · Ready for scoped implementation. User requested deployment audit, redrawn architecture and separation for packaging/test/operations. Dependencies SRC-028, SRC-057 and SRC-087 are DONE. [Architecture audit](../system/deployment-topology.md), [Reporting ownership](../services/reporting.md), [storage/security contract](reporting-persistence.md).

## Boundary and compatibility

SRC-090 packages the existing Reporting server as an independent image and opt-in Compose project. Build only Reporting TypeScript; runtime contains its compiled code and production dependencies, no backend/web source, operator credentials or development dependencies. Existing pinned Node/MySQL versions remain unchanged. Reporting binds 0.0.0.0 inside the container; only loopback host port 13004 is published. Host service3004 and native BFF configuration remain unchanged until an explicit operational switch. No external/public ingress, schema/API/event changes, worker, broker or live provider integration.

The existing local provisioner remains the migration owner: `scripts/reporting-db.mjs` verifies registered system tenant, backs up, applies immutable forward migrations and grants per table. Containers only receive runtime credentials for already provisioned crm_reporting or retained test_crm_reporting. Startup never provisions/migrates/seeds. No table added/changed; existing filled table reviews and ownership remain authoritative. Readiness is DB connectivity, not proof of correct schema or full business acceptance; a signed retained-fixture smoke supplies the schema/permission check.

## Runtime and operations

Non-root image, read-only root, writable bounded /tmp, dropped capabilities, no-new-privileges, PID/memory limits, init and graceful stop; bounded Docker logs. Readiness uses existing private endpoint, restart policy unless-stopped. Independent build/start/status/logs/restart/stop commands and explicit env sample. Docker Desktop uses host.docker.internal to reach the already running local MySQL port13306. Linux operator must provide a privately reachable DB endpoint; loopback-only host publication is not assumed reachable through host-gateway. No database ports or volumes are changed by this package.

Private signed API is compatible with existing BFF; host BFF can select http://127.0.0.1:13004 after stopping the old Reporting process. Switching requires matching admission key, current schema and signed smoke. No public transport relaxation. A containerized BFF needs HTTPS under its existing transport policy; this task does not silently allow plain HTTP service DNS.

Rollback package/config to previous image without reversing DDL; stop new instance, restore previous URL/process, preserve database. No automatic schema downgrade or duplicate background workers. Graceful shutdown must close SQL pools within20s; exit0 or143 (Nest re-emits SIGTERM after shutdown hooks) is expected, exit137/OOM is failure. Runtime isolation is database grants, not a claim of network isolation from every host endpoint.

## Acceptance SP-01…06

1. SP-01: inspect source, manifests, containers and host readiness; distinguish source/package/running/production evidence per service. Draw current and target boundaries and ordered extraction gates.
2. SP-02: pinned Reporting image builds independently of backend/web compilation; only compiled Reporting + production dependencies, non-root, no runtime operator secrets.
3. SP-03: opt-in Compose validates and starts against preprovisioned retained test_crm_reporting; ready, signed create/read/replay work, fixture reused without reset.
4. SP-04: unsigned/expired/body-tampered/spoofed requests and cross-tenant reads fail; runtime DB grants deny foreign schema and journal. No tokens/raw payloads in evidence.
5. SP-05: restart retains the same synthetic draft/receipt; stop exits cleanly. Existing local API/worker/web/Reporting and MySQL/Redis remain running. Test container is stopped after verification; no volume removal.
6. SP-06: runbook, service catalog, architecture, build plan, tracker/log/checkpoint synchronized; build/test logs and actual image reference recorded. Production deployment, restore/PITR/load/remote CI and remaining domain extraction explicitly NOT_RUN.

This is an executable packaging boundary, not completion of PLAN-006/007B, Chat/Identity/Sales extraction or all Reporting backlog.
