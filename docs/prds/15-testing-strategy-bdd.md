# PRD 15 — Testing Strategy & BDD Methodology (Backend & Frontend)

**Module:** Testing Strategy / Development Methodology
**Source:** Base document §7 (architecture layers), §9 (security — several scenarios are security/authorization-focused); cross-cutting over PRDs 01–13
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`14-devops-local-environment.md`](./14-devops-local-environment.md) (`make test` execution)

---

## 1. Overview

Per product decision, **all development on PeakForm follows Behavior-Driven Development (BDD)**: features are written as executable Gherkin scenarios (Given/When/Then) *before* implementation, and those scenarios form the primary regression suite for business rules — not documentation added after the fact. This PRD defines the mandatory BDD workflow, the tooling for each layer (backend/frontend), and the traceability rule tying every module PRD's §10 Acceptance Criteria directly to an executable scenario.

## 2. Goals

- Make BDD non-optional: business-rule code does not merge without a corresponding Gherkin scenario passing.
- Guarantee traceability: every bullet in every module PRD's (01–13) §10 Acceptance Criteria has at least one Gherkin scenario encoding it, in a predictable, discoverable location.
- Test business rules from the perspective of a Role (Admin/Professional/Client) and an observable outcome — not internal function calls or component internals.
- Keep backend and frontend BDD suites runnable identically in local dev (via [`14-devops-local-environment.md`](./14-devops-local-environment.md)'s `make test`) and in CI, so "passes locally" and "passes in CI" mean the same thing.

## 3. Non-Goals

- This PRD does not mandate 100% code coverage, nor does it replace plain unit tests for pure algorithmic code (e.g., the Jackson & Pollock body-fat formula in PRD 04 §5.2, or the `computeNextDueDate` date-math helper in PRD 02 §5.6) — those remain ordinary Jest unit tests that *support* a Gherkin scenario, not a substitute for one.
- No mandate on visual-regression/pixel-snapshot testing — a separate, optional concern from business-rule BDD coverage.
- No mandate on load/performance testing — that's an NFR concern (base doc §10), out of scope here.

## 4. The BDD Workflow (mandatory, all modules)

1. **Before writing implementation code** for a user story derived from a module PRD, the engineer writes or updates the `.feature` file for that story, translating the relevant §10 Acceptance Criteria bullet(s) into one or more Given/When/Then scenarios.
2. The scenario is run and confirmed **red** (failing, because the behavior doesn't exist yet) — the BDD analogue of a failing test in TDD, applied at the behavior level rather than the unit level.
3. Implementation proceeds — across the Domain/Application/Infrastructure/Presentation layers on the backend (base doc §7.2) or the corresponding feature slice on the frontend (base doc §7.3) — until the scenario passes (**green**).
4. Refactor with the scenario as a safety net.
5. A pull request that adds or changes business-rule behavior in any module (01–13) is expected to include the corresponding `.feature` file change in the same PR. Reviewers treat a business-rule PR with no scenario change as incomplete, exactly as they would treat one with no tests at all.

## 5. Backend BDD

### 5.1 Tooling
- **`jest-cucumber`**, layered on the existing NestJS/Jest test setup, rather than the standalone `@cucumber/cucumber` CLI — this keeps one test runner/config for the backend (unit tests and BDD scenarios alike), avoids a second reporting pipeline, and lets step definitions use `Test.createTestingModule` for dependency injection exactly like any other backend test.
- Feature files live at `apps/api/test/features/<module-slug>/*.feature`, one directory per module PRD, named after that PRD's own slug (e.g., `test/features/03-onboarding-intake-anamnesis/`, `test/features/06-training-plan-builder/`) so the PRD → feature-directory mapping is never ambiguous.
- Step definitions live alongside, in `apps/api/test/features/<module-slug>/steps/*.steps.ts`.

### 5.2 What backend scenarios exercise
- Business rules living in the **Application and Domain layers** (base doc §7.2) — e.g., "a Professional without the `PERSONAL_TRAINER` specialization cannot create a training plan" (PRD 06), "adding an exercise flagged against a Client's contraindications shows a warning and writes an audit-log entry" (PRD 06 §5.6), "activating a second `ACTIVE` link of the same specialization is rejected" (PRD 02 §5.3).
- Scenarios run against a **real test database** (a dedicated Postgres database via PRD 14's `postgres` service, migrated fresh per run — never mocked), because RBAC/ownership rules (base doc §9) are exactly the class of rule a mocked repository can silently get wrong. External dependencies (Redis, Open Food Facts, USDA FoodData Central, the exercise dataset import) are stubbed at the Infrastructure-layer interface boundary (base doc §7.2's Dependency Inversion — a test double implements the same repository/client interface used in production), keeping scenarios deterministic and independent of third-party uptime.
- A smaller set of Presentation-layer (HTTP) scenarios per module assert the *observable* contract (status codes, error shapes) rather than every input permutation — exhaustive input validation is covered by ordinary unit tests on the shared `zod` schemas in `packages/validation`.

### 5.3 Example (illustrative, not exhaustive)
```gherkin
Feature: One-PT-one-Nutritionist constraint (PRD 02)

  Scenario: Client already has an active trainer
    Given a Client "Ana" has an ACTIVE link to Professional "Bruno" as PERSONAL_TRAINER
    And Professional "Carla" also holds the PERSONAL_TRAINER specialization
    When Professional "Carla" invites Client "Ana" as PERSONAL_TRAINER
    And Client "Ana" accepts the invite
    Then the link is rejected with error "You already have an active trainer — unlink first"
    And Client "Ana" still has exactly one ACTIVE PERSONAL_TRAINER link, to "Bruno"
```

## 6. Frontend BDD

### 6.1 Tooling
- **Playwright** as the runner, with **`playwright-bdd`** to author scenarios in Gherkin and generate Playwright tests from them — chosen over a separate Cucumber+Selenium/Cypress stack so the frontend BDD suite shares Playwright's browser automation, trace viewer, and CI parallelization with any non-BDD smoke tests added later.
- Feature files live at `apps/web/test/features/<module-slug>/*.feature`, mirroring the same per-module directory convention as the backend (§5.1).
- Scenarios drive the real Next.js app (via PRD 14's `web` service, or a dedicated test build) against a seeded test backend — never a mocked API — for the same reason backend scenarios hit a real test DB: role-based visibility rules (e.g., "a `DRAFT` nutrition target is never shown to the Client," PRD 08 §3) are precisely the class of bug a mocked API response can accidentally hide.

### 6.2 What frontend scenarios exercise
- User-role-visible business rules and gating — e.g., "a Professional without the PT specialization does not see the Training Plan Builder entry point," "the form-check-video button is visibly present but disabled" (PRD 07 §5.5), "a Client cannot edit prescribed exercises," "the unread message count updates after a new message arrives" (PRD 11).
- What a Role can see/do — not component internals, not CSS — phrased the same way the owning module PRD's Acceptance Criteria is phrased, so the mapping stays close to 1:1.

### 6.3 Example (illustrative, not exhaustive)
```gherkin
Feature: Form-check video placeholder (PRD 07)

  Scenario: Disabled affordance is visible but non-functional
    Given Client "Ana" has an ACTIVE training plan with a session scheduled today
    When "Ana" opens today's session and views an exercise's logging screen
    Then a "Record form-check video" control is visible
    And the control is disabled
    And tapping it performs no navigation or upload action
```

## 7. Traceability Rule (cross-cutting, binding on PRDs 01–13)

Every bullet in a module PRD's §10 "Acceptance Criteria" section must be covered by at least one Gherkin scenario in that module's feature directory (backend and/or frontend, whichever layer the criterion actually lives in). This PRD does not restate each module's criteria — it establishes the rule; the criteria remain the single source of truth in each module PRD, and the feature files are their executable form. A module is not considered done for implementation purposes until this mapping is complete — the same "define once, reference everywhere" principle [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md) §5 already applies to cross-PRD dependencies.

## 8. CI Integration

- `make test` ([`14-devops-local-environment.md`](./14-devops-local-environment.md) §5.2) runs both suites inside the same containers CI uses, so local and CI results agree.
- `make test-backend` runs `jest-cucumber` scenarios plus plain unit tests for the API.
- `make test-frontend` runs `playwright-bdd` scenarios for the web app.
- CI fails the build on any scenario failure — BDD scenarios are release gates, not optional or soft-failing checks.
- Scenarios are tagged with their owning PRD number (e.g., `@prd-07`), and CI produces a per-PRD pass/fail report so gaps in §7's traceability rule are visible rather than assumed.

## 9. Data Model Additions

None — this is process/tooling, not a product module.

## 10. Out of Scope / Future (Fast-Follow)

- Visual regression testing.
- Load/performance testing (base doc §10 NFRs, a separate initiative).
- Mutation testing to grade scenario quality.

## 11. Open Questions

- None blocking. The tag-based traceability report (§8) is an implementation detail to build out once the first few modules have scenarios in place — it is not a prerequisite to starting BDD work on module 01.

## 12. Acceptance Criteria (for this PRD itself)

- `make test-backend` and `make test-frontend` both execute successfully against an empty/seeded test environment and report pass/fail per scenario.
- Every module PRD (01–13) has a corresponding feature-file directory created on both backend and frontend as applicable, even if initially containing only a subset of scenarios, expanded as that module is implemented.
- A PR touching business-rule logic in any module without a corresponding `.feature` file change is flagged in code review per §4 step 5 — enforced as a review convention documented here, not necessarily a hard CI gate in v1.
- Scenarios for at least one fully implemented module run end-to-end against the real test DB (backend) and the real seeded app (frontend), demonstrating the full pattern for other modules to follow.
