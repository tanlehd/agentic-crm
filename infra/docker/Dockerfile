ARG NODE_IMAGE=node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
FROM ${NODE_IMAGE} AS toolchain
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN npm install --global pnpm@10.33.0
WORKDIR /app

FROM toolchain AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY services/chat/package.json ./services/chat/package.json
COPY services/crm-connector/package.json ./services/crm-connector/package.json
COPY services/marketing/package.json ./services/marketing/package.json
COPY services/reporting/package.json ./services/reporting/package.json
COPY packages/workflow-definition/package.json ./packages/workflow-definition/package.json
COPY services/core-baseline/package.json ./services/core-baseline/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/workload-transport/package.json ./packages/workload-transport/package.json
COPY packages/testkit/package.json ./packages/testkit/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS verify
COPY . .
CMD ["pnpm", "verify"]

FROM dependencies AS source
COPY . .
RUN pnpm contracts:check && pnpm --filter @agentic-crm/contracts build && pnpm --filter @agentic-crm/workload-transport build && pnpm --filter @agentic-crm/testkit build

FROM source AS development
RUN mkdir -p /pnpm && chown -R node:node /app/apps /app/services/core-baseline /pnpm
USER node
CMD ["pnpm", "dev:api"]

FROM source AS test
CMD ["pnpm", "test"]

FROM source AS build
ARG NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS=300000
ARG NEXT_PUBLIC_INBOX_REALTIME_ENABLED=false
ENV NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS=${NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS}
ENV NEXT_PUBLIC_INBOX_REALTIME_ENABLED=${NEXT_PUBLIC_INBOX_REALTIME_ENABLED}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build && pnpm --filter @agentic-crm/backend deploy --prod --legacy --offline /out/backend

FROM ${NODE_IMAGE} AS backend
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/backend ./
USER node
EXPOSE 3001 3002
CMD ["node", "dist/main.js"]

# Baseline private endpoints/worker packaging without rebuilding the web application.
FROM dependencies AS backend-runtime-build
COPY tsconfig.base.json ./
COPY packages/workload-transport ./packages/workload-transport
COPY packages/contracts ./packages/contracts
COPY services/core-baseline ./services/core-baseline
RUN pnpm --filter @agentic-crm/contracts build && pnpm --filter @agentic-crm/workload-transport build && pnpm --filter @agentic-crm/backend build && pnpm --filter @agentic-crm/backend deploy --prod --legacy --prefer-offline /out/backend

FROM ${NODE_IMAGE} AS backend-runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=backend-runtime-build --chown=node:node /out/backend ./
USER node
CMD ["node", "dist/main.js"]

FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM dependencies AS connector-build
COPY tsconfig.base.json ./
COPY packages/workload-transport ./packages/workload-transport
COPY packages/contracts ./packages/contracts
COPY services/crm-connector ./services/crm-connector
RUN pnpm --filter @agentic-crm/contracts build && pnpm --filter @agentic-crm/workload-transport build && pnpm --filter @agentic-crm/crm-connector build && pnpm --filter @agentic-crm/crm-connector deploy --prod --legacy --prefer-offline /out/connector

FROM ${NODE_IMAGE} AS connector
ENV NODE_ENV=production
WORKDIR /app
COPY --from=connector-build --chown=node:node /out/connector ./
USER node
EXPOSE 3010
CMD ["node", "dist/main.js", "api"]

# Independent release: do not compile backend, Next.js or other domain services.
FROM dependencies AS reporting-build
COPY tsconfig.base.json ./
COPY services/reporting ./services/reporting
RUN pnpm --filter @agentic-crm/reporting build && pnpm --filter @agentic-crm/reporting deploy --prod --legacy --offline /out/reporting

FROM ${NODE_IMAGE} AS reporting
ENV NODE_ENV=production REPORTING_HOST=0.0.0.0 REPORTING_PORT=3004
WORKDIR /app
COPY --from=reporting-build --chown=node:node /out/reporting ./
USER node
EXPOSE 3004
CMD ["node", "dist/main.js"]

# Chat-only runtime: no backend, web, or other domain implementation is packaged.
FROM dependencies AS chat-build
COPY tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY packages/workload-transport ./packages/workload-transport
COPY services/chat ./services/chat
RUN pnpm --filter @agentic-crm/chat... build && pnpm --filter @agentic-crm/chat deploy --prod --legacy --prefer-offline /out/chat

FROM ${NODE_IMAGE} AS chat
ENV NODE_ENV=production
WORKDIR /app
COPY --from=chat-build --chown=node:node /out/chat ./
USER node
EXPOSE 3020 3021
CMD ["node", "dist/main.js", "api"]
