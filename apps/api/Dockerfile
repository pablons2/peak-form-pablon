# Multi-stage build per docs/prds/14-devops-local-environment.md §5.3.
# Build context is the repo root (see docker-compose.yml) so this stage can
# see the Turborepo workspace and packages/* it depends on.

FROM node:20-bookworm-slim AS base
WORKDIR /repo
# Prisma's query/schema engine binaries link against libssl — the slim
# image doesn't ship it, which surfaces as an opaque "Schema engine error"
# at migrate/generate time rather than a clear missing-library error.
# procps (`ps`) is needed by `nest start --watch`'s restart-on-change logic
# in the dev stage — without it, the CLI crashes the whole container on the
# very first file-change reload with "Error: spawn ps ENOENT".
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl procps && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# ---- deps: install once, cached by lockfile hash ----
FROM base AS deps
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN npm install --workspace=@peakform/api --workspace=@peakform/shared-types --workspace=@peakform/validation --include-workspace-root

# ---- dev: full source, volume-mounted over this in docker-compose.yml ----
FROM deps AS dev
COPY . .
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ---- production: minimal runtime image, no dev deps, no mounted source ----
FROM deps AS build
COPY . .
# Must run BEFORE the build: apps/api's source imports Prisma-generated
# enums/types (Role, UserStatus, Prisma.InputJsonValue, ...) directly, so
# `tsc` fails with "no exported member" if the client hasn't been generated
# yet — @prisma/client ships with no generated types of its own.
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npx turbo run build --filter=@peakform/api

FROM node:20-bookworm-slim AS production
WORKDIR /repo
RUN corepack enable
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
