# Backend baseline

This package is the transitional modular monolith, not an independently extracted Gateway, Identity or Chat service. It contains the public NestJS API, baseline worker, domain modules, shared baseline database/UoW and private owner adapters.

See the [repository map](../../docs/architecture/repository-map.md) for paths and ownership. This package moved from the former backend location to `services/core-baseline` under CHG-20261021-12. Scripts, Compose, CI and test harnesses use this directory; the workspace name remains `@agentic-crm/backend` for command compatibility. Business owners move to their own service packages only through their extraction gates.

Existing workspace commands:

- Build: `pnpm --filter @agentic-crm/backend build` after required workspace libraries are built.
- Development API: `pnpm dev:api`; baseline worker: `pnpm dev:worker`.
- Built package: `pnpm --filter @agentic-crm/backend start` or `pnpm --filter @agentic-crm/backend worker`.

Environment, retained database and lifecycle setup: [local development](../../docs/development/local.md), [service manager](../../docs/development/service-manager.md). These commands are not authorization to start a second writer, migrate/reset data or deploy. [Tracker](../../docs/tracking/tasks.md) and [topology](../../docs/system/deployment-topology.md) hold implementation/runtime evidence.
