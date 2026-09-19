# Multi-stage build per docs/prds/14-devops-local-environment.md §5.3.
# Build context is the repo root (see docker-compose.yml).

FROM node:20-bookworm-slim AS base
WORKDIR /repo
RUN corepack enable

# ---- deps: install once, cached by lockfile hash ----
FROM base AS deps
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm install --workspace=@peakform/web --workspace=@peakform/shared-types --workspace=@peakform/validation --workspace=@peakform/ui --include-workspace-root

# ---- dev: full source, volume-mounted over this in docker-compose.yml ----
FROM deps AS dev
COPY . .
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- production: minimal runtime image, no dev deps, no mounted source ----
FROM deps AS build
COPY . .
RUN npx turbo run build --filter=@peakform/web

FROM node:20-bookworm-slim AS production
WORKDIR /repo/apps/web
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/public ./public
COPY --from=build /repo/apps/web/.next ./.next
COPY --from=build /repo/apps/web/package.json ./package.json
COPY --from=build /repo/node_modules /repo/node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
