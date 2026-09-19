.PHONY: up down down-clean logs shell migrate seed test test-backend test-frontend lint format build check-env build-packages

COMPOSE := docker compose

check-env:
	@if [ ! -f .env ]; then \
		echo "Missing .env — run: cp .env.example .env (then fill in secrets)"; \
		exit 1; \
	fi

## packages/* (e.g. @peakform/validation) ship real TypeScript, not just
## types — apps/api's dev runner is plain `tsc` + `node dist/main.js`, which
## never transpiles workspace packages, so a package with runtime code
## (anything beyond `export type ...`) needs its dist/ built on the HOST
## before the dev containers start: docker-compose.yml bind-mounts the repo
## over the image (`.:/repo`), so anything built only inside the image at
## `docker build` time is invisible at runtime unless it's also on disk here.
build-packages:
	npm run build --workspace=@peakform/validation

## Bring the full stack up: build if needed, wait for DB, migrate, seed.
up: check-env build-packages
	$(COMPOSE) up -d --build
	@echo "Waiting for API health check..."
	@until curl -sf http://localhost:3001/health > /dev/null 2>&1; do sleep 2; done
	$(MAKE) migrate
	$(MAKE) seed
	@echo "PeakForm is up: web http://localhost:3000  api http://localhost:3001  mailhog http://localhost:8025  minio console http://localhost:9001  adminer http://localhost:8080"

down:
	$(COMPOSE) down

## Destructive: drops named volumes too (fresh DB/object storage on next `make up`).
down-clean:
	@read -p "This deletes local DB/media volumes. Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f $(service)

shell:
	$(COMPOSE) exec $(service) sh

migrate: check-env
	$(COMPOSE) exec api npx prisma migrate deploy --schema=prisma/schema.prisma

seed: check-env
	$(COMPOSE) exec api npm run seed --if-present

## Full suite, matching what CI runs.
test: test-backend test-frontend

test-backend: build-packages
	npm run test --workspace=@peakform/api

test-frontend: build-packages
	npm run test --workspace=@peakform/web

lint:
	npm run lint

format:
	npm run format

## Validates the production Dockerfile path (not the day-to-day dev path).
## docker-compose.yml's services are pinned to `target: dev` for local dev
## (volume-mounted live reload), so `compose build` never reaches the
## `production` stage — build it directly against each Dockerfile instead.
build:
	docker build -f apps/api/Dockerfile --target production -t peakform-api:production .
	docker build -f apps/web/Dockerfile --target production -t peakform-web:production .
