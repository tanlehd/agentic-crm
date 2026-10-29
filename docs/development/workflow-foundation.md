# Workflow foundation — SRC-065

ADR-027: one Workflow service owns business automation. CHG-20261021-08 removes legacy Chatflow code, routes and data; historical identifiers in evidence are not supported runtime APIs. Current removal scope is documented in the retirement contract.


Implemented: native canonical CRM metadata discovery and pure Core draft validation. [Contract](../contracts/workflow-catalog.md) · [Evidence](../tracking/details/SRC-065.md) · [Remaining platform plan](../planning/workflow-platform.md).

## Native discovery

`GET /api/v1/automation/catalog` needs crm_session, X-Tenant-Id, configure capability and automation.design/all plus schema.read or object read visibility. Never auto-grant an account to make the endpoint return200. Response is metadata only with tenant/principal/authorization revision and digest; Cache-Control no-store. Current field-deny rules apply. Reuse existing native login/session; no Keycloak or new login service.

Record/API capabilities are distinct from runtime node capability. All Workflow object-change, traversal and execution flags remain false until real producer/adapters exist. A user with only schema visibility sees metadata, not record access. No record values/defaults/secret tokens are returned.

## Core kernel

Build contracts before Core: `pnpm --filter @agentic-crm/contracts build`, then `pnpm --filter @agentic-crm/workflow-core build`. Library exports validateAuthoringGraph and nodeCatalog. Supply trusted current catalog from server authority, expected tenant and a graph matching [schema](../../packages/contracts/schemas/workflow-authoring.json). Do not accept browser-supplied catalog as an authorization source. Valid=true means draft structure/types accepted; executable is always false. There is intentionally no service start command, database provisioning or publish/run endpoint in this slice.

## Verification

`pnpm test:unit` includes catalog/kernel and legacy graph tests. After contracts/Core/backend builds, `pnpm test:workflow:catalog` uses existing .local/native-auth-test.env and retained .local/reporting-native-fixture.json in native_identity_test. Missing fixture is an explicit setup prerequisite; harness never resets accounts/DB or connects to dev/prod. It creates only its own synthetic metadata/record, restores temporary test permissions/labels/field policies, and preserves records for subsequent runs. Credentials stay local/ignored.

Artifacts: artifacts/workflow-foundation/unit.json and native.json. Main running API was not restarted during this task; its source route becomes available on its next normal reload. Kafka/Workflow API persistence/CMS execution must follow the design gates; running an existing M2 workflow is not proof those additions are deployed.
