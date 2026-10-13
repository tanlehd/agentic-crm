# Marketing service

SRC-051 IN_PROGRESS. Independent crm_marketing owner; [contract](../../docs/contracts/marketing-metadata-sync.md), [progress](../../docs/tracking/details/SRC-051.md).

Implemented modules: database connections, fenced scheduler, operation receipts and commit-ordered change/snapshot repositories. These are library components; no API or periodic worker entrypoint exists yet. No live Meta fetching is activated by building this package.

Build with `pnpm --filter @agentic-crm/marketing build`. Forward database provisioning and retained synthetic fixtures follow the [local database runbook](../../docs/development/marketing-database.md). Test scripts from the repository root after building: marketing-db-test.mjs, marketing-scheduler-test.mjs, marketing-changes-test.mjs under scripts. Read/change APIs must authenticate tenant/consumer before invoking repositories; binding setup/resume must validate authority before enabling schedules. These remaining integrations are not bypassed by the library.

Own runtime DB credentials use MARKETING_DB_HOST/PORT/NAME and MARKETING_RUNTIME_USER/PASSWORD; migration/operator credentials are never passed to runtime. No schema synchronization or cross-service SQL. Channels credentials and Page authority are consumed through the approved versioned HTTP contract in the next implementation checkpoint.
