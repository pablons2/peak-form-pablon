# PeakForm — Shared Reference & Product Decisions Log

**Status:** Active
**Applies to:** All module PRDs in this directory
**Source document:** [`../peakform-prd-base-document.md`](../peakform-prd-base-document.md)

---

## 1. Purpose of This Document

Product module PRDs `01-*.md` through `13-*.md` are derived from the base foundation document. To avoid duplicating shared context in every PRD, each one **references** this document and the base document's Sections 6–10 instead of repeating them. This document also records the product decisions made while scoping the PRDs, resolving several items from the base document's Section 11 ("Open Questions"). PRDs `14-*.md` and `15-*.md` are a different kind of document — cross-cutting process/infrastructure (DevOps environment, testing methodology) layered on top of the product scope, not derived from any base doc §5.x module description — but they follow the same reference-instead-of-repeat convention, so they're indexed here too (§4).

Do not treat this as a PRD itself — it has no user stories or acceptance criteria of its own. It exists purely so the 13 product-module PRDs (plus the 2 process PRDs) stay consistent and short.

---

## 2. What Each Module PRD Assumes Is Already Defined Elsewhere

Every module PRD assumes the reader has (or can reference) the base document for:

| Topic | Base document section |
|---|---|
| RBAC matrix (Admin / Professional / Client capabilities) | Section 4 |
| Full conceptual data model | Section 6 |
| Backend layered architecture (NestJS-style layers, SOLID) | Section 7.2 |
| Frontend architecture (Next.js App Router, TanStack Query, NextAuth.js, shadcn/ui + Radix + Tailwind) | Section 7.3 |
| Database (PostgreSQL + Prisma) and encryption expectations | Section 7.4 |
| Caching strategy (Redis / DB cache table) | Section 7.5 |
| File/media storage (S3-compatible, signed URLs) | Section 7.6 |
| External free APIs (exercise data, food data) | Section 8 |
| Security, sanitization, LGPD baseline | Section 9 |
| Non-functional requirements (mobile-first, i18n, resilience) | Section 10 |
| Local dev environment (Docker Compose + Make) | [`14-devops-local-environment.md`](./14-devops-local-environment.md) |
| Testing methodology (mandatory BDD, Gherkin, traceability) | [`15-testing-strategy-bdd.md`](./15-testing-strategy-bdd.md) |

Module PRDs only restate architecture details when a module has a **module-specific exception or addition** to these shared rules (e.g., a stricter encryption requirement for health data, a specific rate-limit for one endpoint). The same applies to PRDs 14 and 15: every module PRD's §10 Acceptance Criteria is expected to have a corresponding Gherkin scenario per PRD 15 §7, but that expectation is stated once, centrally, rather than repeated in each module PRD.

---

## 3. Product Decisions Log

These decisions were made while scoping the PRDs and resolve items from the base document's Section 11. They are binding for all module PRDs unless a specific PRD explicitly overrides one (which should be called out in that PRD's own "Open Questions" section).

### 3.1 Deployment model — single-practice tool (resolves base doc §11.4)
**Decision:** PeakForm ships as a **single-practice tool**, not multi-tenant SaaS. There is one Admin scope covering one practice's Professionals and Clients — no tenant isolation, no per-tenant billing, no cross-tenant data partitioning.
**Impact on PRDs:** The Admin Console PRD (13) does not need tenant management, billing, or plan-tier gating. The Auth PRD (01) does not need a tenant/organization concept in the data model. If multi-tenancy is needed later, it is a distinct, larger initiative — not assumed by any PRD here.

### 3.2 Platform — responsive web only, no native app (resolves base doc §11.6)
**Decision:** v1 targets **responsive web (Next.js) only**. Web push (PWA) is optional; no native mobile shell (React Native/Capacitor) is planned or designed for at this stage.
**Impact on PRDs:** The Notifications PRD (12) scopes channels to email + optional web push only. No PRD should introduce offline-sync or native-push data-model concerns.

### 3.3 Productivity/Habits module scope — health-adjacent only (resolves base doc §11.2)
**Decision:** The Productivity/Habits module stays scoped to **health-adjacent habits and a simple personal task list** (hydration, sleep, supplements, mobility work, custom habits, non-clinical to-dos). It is explicitly **not** a general-purpose task/project management tool.
**Impact on PRDs:** PRD 10 (Productivity/Habits) is scoped accordingly and stays isolated from the training/nutrition domain models, per base doc §3.8.

### 3.4 Professional credential verification — manual approval, no document upload in v1 (resolves base doc §11.3)
**Decision:** Professional self-signup requires **manual Admin approval** with no license/document upload flow in v1. The Admin approves or rejects a Professional's account based on out-of-band verification (e.g., a conversation, an email, a known relationship) — the system does not collect or store credential documents yet.
**Impact on PRDs:** PRD 01 (Auth) and PRD 13 (Admin Console) model Professional account status as `PENDING_APPROVAL` / `APPROVED` / `REJECTED` with no attached document/file entity. Document upload for credential verification is noted as a fast-follow in both PRDs.

### 3.5 Form-check video upload — fast-follow, with a disabled placeholder in v1 UI (resolves base doc §11.5)
**Decision:** The async form-check video feature (base doc §3.3) is **out of scope for v1**. Instead, the Client Training Execution screen (PRD 07) ships with a **visibly disabled UI element** on the exercise-logging view (e.g., a "Record form-check video" button, disabled/greyed out) labeled as **coming soon**, so the affordance is discoverable without requiring the storage, moderation, and annotation work it implies.
**Impact on PRDs:** PRD 07 includes this disabled-state requirement explicitly in its functional requirements and UI notes, and lists the full feature in its "Future / Fast-Follow" section.

### 3.6 Still open — not resolved by product decision, needs external input
This remains genuinely open and is called out again in the relevant PRD's "Open Questions" section. It is **not** blocking initial PRD writing, but must be resolved before the affected module ships to production with real client data:

- **LGPD legal review** (base doc §11.7): required before any real client health data is processed in production. Not specific to one PRD — flagged as a cross-cutting launch blocker.

### 3.7 Body assessment protocol — resolved (base doc §11.1 / §3.5)
**Decision:** PRD 04 (Body Assessment) standardizes on the **Pollock 7-site skinfold protocol** (chest, midaxillary, triceps, subscapular, abdominal, suprailiac, thigh) with ISAK-style landmark discipline for circumferences, the **Jackson & Pollock (1978)** body-density equation, and the **Siri (1961)** equation for % body fat — the de facto standard in Brazilian personal-training/nutrition practice. Posture screening uses a structured checklist (not free text alone) plus standardized photos.
**Impact on PRDs:** PRD 04's field list is no longer a draft; it is versioned (`protocolVersion`) so a future alternate protocol (e.g., ISAK level 2, a 3-site method) can be added without breaking historical data or trend charts. See PRD 04 §5.2–§5.6 for the full protocol.

### 3.8 UI component stack — shadcn/ui + Radix + Tailwind (confirmed)
**Decision:** The frontend UI stack is **shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS**. This resolves the open "(e.g., shadcn/ui)" placeholder in base doc §7.3 — it is the confirmed stack, not one option among several. Rationale:
- shadcn/ui is not a component library in the traditional sense — component source code is generated **into the repository** (`packages/ui`), giving full control over appearance and behavior without fighting a closed third-party API.
- Accessibility (focus management, keyboard navigation, ARIA semantics) comes built-in via the Radix primitives, directly supporting the WCAG AA target (base doc §10).
- It imposes no aesthetic of its own — PeakForm's identity is built on top of it via the design tokens the product-designer defines in `docs/design-system.md`, which is what keeps the product from looking like a generic template.
- It is the de facto standard for new React/Next.js projects.

No other component library (MUI, Chakra, Ant Design, Mantine, Bootstrap, ...) is permitted; where shadcn/ui has no fitting primitive, build on the matching Radix primitive directly.
**Impact on PRDs:** Module PRDs reference shadcn/ui components by name and variant in their UX notes rather than describing generic UI elements, and may assume Radix-level accessibility behavior without re-specifying it. File organization (where `tailwind.config.ts`, `globals.css`, and `packages/ui` component code live) is defined once in base doc §7.3 and applies to all modules.

### 3.9 Local development environment — Docker Compose + Make (confirmed)
**Decision:** Local development and CI both run on **Docker Compose**, orchestrated through a root **Makefile** (`make up`, `make test`, etc.) so no contributor needs to memorize raw Compose invocations. Full detail lives in [`14-devops-local-environment.md`](./14-devops-local-environment.md), which is treated as a shared-foundation document like base doc §7–§10, not a per-module PRD.
**Impact on PRDs:** No module PRD (01–13) needs to restate how to run the app locally — they assume PRD 14's environment exists. Production deployment tooling (Kubernetes, Terraform, etc.) remains explicitly out of scope for PRD 14 and is a distinct future initiative.

### 3.10 Development methodology — Behavior-Driven Development is mandatory (confirmed)
**Decision:** **All development, backend and frontend, follows BDD.** Every module PRD's §10 Acceptance Criteria must be expressed as executable Gherkin scenarios (`jest-cucumber` on the backend, `playwright-bdd` on the frontend) written before implementation, per the workflow and traceability rule defined in [`15-testing-strategy-bdd.md`](./15-testing-strategy-bdd.md). This is a process requirement, not a suggestion — a PR changing business-rule behavior without a corresponding `.feature` file change is treated as incomplete in review.
**Impact on PRDs:** No module PRD (01–13) needs its own "how we test this" section — PRD 15's traceability rule (§7) already binds every module's Acceptance Criteria to a scenario requirement centrally. Module PRDs remain the source of truth for *what* the criteria are; PRD 15 owns *how* they're verified.

---

## 4. Module PRD Index

| # | Module PRD | Base doc source |
|---|---|---|
| 01 | Authentication & Account Management | §5.1 |
| 02 | Professional ↔ Client Relationship | §5.2 |
| 03 | Onboarding / Intake (Anamnesis + PAR-Q) | §5.3 |
| 04 | Body Assessment ("Cadastro Corporal") | §5.4 |
| 05 | Exercise Library | §5.5 |
| 06 | Training Plan Builder | §5.6 |
| 07 | Client Training Execution | §5.7 |
| 08 | Nutrition Module | §5.8 |
| 09 | "Today / This Week" Dashboard | §5.9 |
| 10 | Productivity / Habits | §5.10 |
| 11 | Messaging | §5.11 |
| 12 | Notifications | §5.12 |
| 13 | Admin Console | §5.13 |
| 14 | DevOps & Local Development Environment | §7 (cross-cutting, not a product module) |
| 15 | Testing Strategy & BDD Methodology | §7, §9 (cross-cutting, not a product module) |

---

## 5. Cross-PRD Dependency Map

Each module PRD's header carries a **Depends on** line (upstream PRDs whose content is a real prerequisite — no cycles) and, where useful, a **Referenced by** or **See also** line (downstream consumers or sibling cross-links mentioned in the body). This table is the single complete picture, kept here so a change to one PRD's scope can be checked against everything that relies on it before it ships.

| PRD | Depends on (upstream) | Depended on by (downstream) |
|---|---|---|
| 01 — Auth | — | 02, 12, 13 |
| 02 — Professional↔Client Relationship | 01 | 03, 04, 08, 09, 11, 12, 13 |
| 03 — Onboarding/Intake | 02, 05 | 06 |
| 04 — Body Assessment | 02, 06 (mesocycle-length concept) | 08, 09 |
| 05 — Exercise Library | — | 03, 06, 07, 13 |
| 06 — Training Plan Builder | 03, 05 | 04 (concept only), 07, 12 |
| 07 — Client Training Execution | 05, 06 | 09, 12 |
| 08 — Nutrition Module | 02, 04 | 09, 10, 12 |
| 09 — Today/This Week Dashboard | 02, 04, 07, 08, 10, 11 | 02 (check-in due date), 12 |
| 10 — Productivity/Habits | 08 (hydration boundary) | 09 |
| 11 — Messaging | 02 | 09, 12 |
| 12 — Notifications | 01, 02, 06, 07, 08, 09, 11 | — |
| 13 — Admin Console | 01, 02, 05 | — |
| 14 — DevOps & Local Environment | — (cross-cutting foundation, like base doc §7–§10) | 15, implicitly all of 01–13 |
| 15 — Testing Strategy & BDD | 14 (`make test` execution) | implicitly all of 01–13, via the §7 traceability rule |

Non-hierarchical sibling links (neither side is a prerequisite of the other, called out as **See also** in both PRDs): **07 ↔ 11** — both ship a disabled/deferred placeholder for the same async form-check-video fast-follow feature and should move together if that feature is ever built.

Notable resolved coupling: **03 and 05** both use a `ContraindicationTag` value — **05 (Exercise Library) is the canonical owner** of that vocabulary; 03 only ever reuses it, it does not define its own tag set. See PRD 05 §6 and PRD 03 §6.

Notable near-cycle, deliberately broken: **02 and 09/12** — PRD 02 owns `CheckInSchedule` and *mentions* how 09 (dashboard) and 12 (notifications) consume it, but 02 does not *depend on* 09/12 to be understood; the dependency runs one way (09 and 12 depend on 02).
