# PRD 14 — DevOps & Local Development Environment (Docker Compose + Make)

**Module:** DevOps / Local Development Environment
**Source:** Base document §7 (architecture), §7.4 (database), §7.5 (caching), §7.6 (storage), §8 (external APIs)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md)

---

## 1. Overview

This PRD defines how the PeakForm monorepo (`apps/api`, `apps/web`, `packages/*` — base doc §7.1) is built, run, and orchestrated via **Docker** and **Docker Compose**, with a root-level **Makefile** as the single entry point so no contributor needs to memorize raw `docker compose` invocations or flags. This is infrastructure/process, not a product feature — but every module PRD (01–13) implicitly assumes this environment exists and works.

## 2. Goals

- One-command bootstrap: `make up` brings up the full stack (API, web, Postgres, Redis, object storage emulator, mail catcher) with migrations and seed data already applied.
- Parity between local dev and CI — the same Docker images/Compose services back CI's test runs (PRD 15) as local development, minimizing "works on my machine" drift.
- Fast inner-loop: hot-reload for both API (NestJS watch mode) and Web (Next.js dev server) running inside containers, with no rebuild required on every code change.
- Reproducible, safe configuration via `.env` files that are never committed.

## 3. Non-Goals

- No production deployment/orchestration (Kubernetes, ECS, Terraform, etc.) — this PRD covers local development and CI only. Production infrastructure is a distinct, later initiative.
- No multi-environment Compose overlays (staging, prod) in v1 — a single `docker-compose.yml` (plus an optional `docker-compose.override.yml` for personal local tweaks, gitignored) is in scope.

## 4. Personas & Permissions

Not user-facing — this module serves developers/operators only. No RBAC applies; there is no Admin/Professional/Client concept here.

## 5. Functional Requirements

### 5.1 Services (`docker-compose.yml`)
- **`api`** — NestJS backend (`apps/api`), built from `apps/api/Dockerfile`; the dev target volume-mounts source and runs `nest start --watch`.
- **`web`** — Next.js frontend (`apps/web`), built from `apps/web/Dockerfile`; the dev target volume-mounts source and runs `next dev`.
- **`postgres`** — PostgreSQL (base doc §7.4), named volume for data persistence, init script creating the app database/user.
- **`redis`** — Redis (base doc §7.5 caching strategy), no persistence required for dev.
- **`mailhog`** (or equivalent) — local SMTP catcher so transactional email (PRD 01 verification/reset, PRD 12 notifications) can be inspected in a browser instead of hitting a real provider.
- **`minio`** (S3-compatible, base doc §7.6) — local object-storage emulator for progress photos/media, so dev doesn't depend on a real AWS/R2 account.
- **`adminer`** (or pgAdmin) — optional, dev-only convenience for browsing the Postgres database.

### 5.2 Makefile targets
A root `Makefile` wraps Compose/Turborepo commands so contributors only ever type `make <target>`:
- `make up` — build if needed, start all services in the background, wait for the Postgres healthcheck, run pending Prisma migrations, run the seed script (§5.6).
- `make down` — stop and remove containers; named volumes are preserved by default.
- `make down-clean` — like `make down`, but also removes volumes for a full reset (destructive — requires explicit confirmation in the Makefile target, e.g. via a `read` prompt or a `CONFIRM=1` flag, since it discards local dev data).
- `make logs` — tail logs from all services; `make logs service=api` scopes to one.
- `make shell service=api` — open a shell inside a running service container.
- `make migrate` — run Prisma migrations against the running `postgres` service.
- `make seed` — re-run the seed script idempotently.
- `make test` — run the full test suite (backend + frontend, see [`15-testing-strategy-bdd.md`](./15-testing-strategy-bdd.md)) inside containers, matching the CI environment.
- `make test-backend` / `make test-frontend` — scoped test runs.
- `make lint` / `make format` — run linting/formatting across the monorepo.
- `make build` — production-mode image build for both `api` and `web`, validating the production Dockerfile path (§5.3) even though it isn't the day-to-day dev path.

### 5.3 Dockerfiles
- Multi-stage Dockerfiles for both `api` and `web`:
  - A **`deps`** stage installs dependencies, cached by lockfile hash.
  - A **`dev`** stage (used by Compose locally) includes dev dependencies and expects a volume-mounted source tree.
  - A **`production`** stage produces a minimal runtime image — no dev dependencies, no mounted source, built via Turborepo's `prune` feature to keep the build context (and resulting layers) minimal even though `apps/api` and `apps/web` share `packages/*`.

### 5.4 Environment configuration
- `.env.example` at the repo root documents every required variable (DB connection string, Redis URL, JWT secrets, Google OAuth client ID/secret, S3/Minio credentials, USDA FoodData Central API key per base doc §8.2) with safe, non-secret placeholder values.
- `.env` (gitignored) is the real local file a developer copies from `.env.example` and fills in.
- `make up` fails fast with a clear, actionable error if `.env` is missing, rather than starting with silently broken configuration.

### 5.5 Health checks & startup ordering
- `postgres` and `redis` declare Compose healthchecks. `api` waits on `postgres: service_healthy` and `redis: service_healthy` before starting, avoiding the classic "API crashes because the DB wasn't ready yet" race.
- `api` exposes a minimal `/health` endpoint (infra-only, no business logic) that `make up` polls before printing "ready" — so the command doesn't hand control back to the developer before the stack is actually usable.

### 5.6 Seed data
- The seed script (run by `make up`/`make seed`) creates: one Admin account, one `APPROVED` Professional (both specializations) with a couple of demo Clients already linked (PRD 02), a demo `TrainingPlan` and `NutritionPlan` in progress, and imports the base Exercise Library dataset (PRD 05 §5.1) — so a fresh `make up` produces a usable, explorable app rather than an empty database.
- Seed data is idempotent (safe to re-run) and obviously fake (clearly-labeled demo emails/names) so it's never mistaken for real user data.

## 6. Data Model Additions

None — this module owns orchestration/config, not product data.

## 7. UX Notes

Not applicable in the usual sense (no end-user UI). The one usability bar that matters here: a new contributor should get from `git clone` to a fully working local app with `cp .env.example .env && make up` and nothing else.

## 8. Out of Scope / Future (Fast-Follow)

- Production deployment manifests (Kubernetes/ECS/Terraform).
- Multi-environment Compose overlays (staging).
- A full observability stack (log aggregation, tracing) beyond what `make logs` provides locally.

## 9. Open Questions

- Exact S3-compatible provider for production (AWS S3 vs. Cloudflare R2, base doc §7.6) does not block this PRD — Minio's API is compatible with both, so that choice can be deferred without touching this PRD's Compose setup.

## 10. Acceptance Criteria

- A new contributor with Docker and Make installed can run `cp .env.example .env && make up` and get a fully working stack (API, web, migrated+seeded DB, Redis, mail catcher, object storage) with no further manual steps.
- `make down` followed by `make up` again restores the same working state without data loss (named volumes persist).
- `make down-clean && make up` produces a fresh, empty-then-reseeded database.
- `make test` runs the full backend and frontend test suites ([`15-testing-strategy-bdd.md`](./15-testing-strategy-bdd.md)) inside containers and exits non-zero on any failure — suitable as a CI gate.
- `make build` succeeds and produces a production image containing no dev dependencies and no mounted source directory.
