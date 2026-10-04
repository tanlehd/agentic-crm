ARG NODE_IMAGE=node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
FROM ${NODE_IMAGE} AS toolchain
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN npm install --global pnpm@10.33.0
WORKDIR /app

FROM toolchain AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/testkit/package.json ./packages/testkit/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS verify
COPY . .
CMD ["pnpm", "verify"]

FROM dependencies AS source
COPY . .
RUN pnpm contracts:check && pnpm --filter @agentic-crm/contracts build && pnpm --filter @agentic-crm/testkit build

FROM source AS development
RUN mkdir -p /pnpm && chown -R node:node /app/apps /pnpm
USER node
CMD ["pnpm", "dev:api"]

FROM source AS test
CMD ["pnpm", "test"]

FROM source AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build && pnpm --filter @agentic-crm/backend deploy --prod --legacy --offline /out/backend

FROM ${NODE_IMAGE} AS backend
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/backend ./
USER node
EXPOSE 3001 3002
CMD ["node", "dist/main.js"]

FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
