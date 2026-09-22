# PeakForm — Product & Technical Foundation Document

> **Working title:** *PeakForm* (rename freely). This is a **base/foundation document**, not a PRD itself — it is meant to be split into individual PRDs per module/epic. It covers the **full system scope at once** (no phased roadmap), per project decision.

**Document owner:** Product/Founder
**Reviewed as:** Senior Personal Trainer + Physiotherapist (clinical/product review) and Senior Software Architect (technical review)
**Date:** 2026-09-18
**Status:** Draft v1 — base for PRD extraction

---

## 0. How to Use This Document

Each numbered section is written so it can be lifted almost directly into a PRD:
- **Section 3** is the clinical/professional critique of the original idea — read it first, it changes several assumptions.
- **Section 5** is the module-by-module functional spec (the bulk of future PRDs will come from here).
- **Section 6** is the data model.
- **Sections 7–10** are the technical architecture, security, APIs, and NFRs — shared across all PRDs, so reference them instead of repeating them.
- **Section 11** is the open-questions backlog — resolve these before or during PRD writing.

---

## 1. Product Vision

A single platform where a person's **physical training**, **nutrition**, **body progress**, and **daily productivity** live together — but where the parts that carry health risk (training prescription, nutrition prescription, body assessment) are **authored or validated by a licensed professional**, not self-assembled by an untrained user. The system's job is to make that professional relationship *scalable* (one professional, many clients, structured plans, less spreadsheet/WhatsApp chaos) and to make the client's day-to-day experience *simple*: open the app, see what today and this week look like, log it, get nudged toward adherence.

**Two failure modes this document actively avoids:**
1. Turning it into "yet another exercise-picker app" where the user drags random exercises into a calendar with no periodization, no screening, and no professional oversight — this is a real injury/liability risk.
2. Turning it into a medical/nutrition-prescription tool that gives diagnostic or prescriptive advice without a licensed professional in the loop — this is a legal and ethical risk (practicing nutrition/physiotherapy without a license).

---

## 2. Personas

| Persona | Description |
|---|---|
| **Admin** | Platform owner/operator. Manages Professionals, global exercise/content library, plans/billing (if SaaS), audit logs. |
| **Professional** | A licensed specialist. Holds one or more **specializations**: `PERSONAL_TRAINER`, `NUTRITIONIST`, or both on the same account (per your decision: one unified "Professional" access tier, not two separate roles). Creates and owns training/nutrition plans for the clients assigned to them; can view and adjust body-assessment data; is the only role allowed to author prescriptive content. |
| **Client / Student (Aluno)** | The end user working out and eating better. Executes assigned plans, logs sets/reps/food/measurements, sees "today/this week", receives nudges, messages their Professional. |
| **Guest (optional)** | Unauthenticated visitor — marketing/landing only, no app access. |

> Note on your requirement: *"o sistema seja já o Nutricionista e personal (especialistas) sendo eles um acesso (profissional) podendo melhorar ou alterar algo"* — implemented as **one `PROFESSIONAL` role** with a `specializations[]` field (`PERSONAL_TRAINER`, `NUTRITIONIST`). Permissions are the same at the role level; UI and certain write-actions (e.g., authoring a *nutrition* plan vs a *training* plan) are gated by which specialization(s) the professional holds. This avoids duplicating an entire role/permission set for what is functionally the same access tier, while still preventing a personal-trainer-only account from writing clinical nutrition content, and vice versa.

---

## 3. Professional & Clinical Review — Corrections to the Original Concept

Reviewing the original idea as a senior Personal Trainer and Physiotherapist, and comparing it against how established systems (e.g., TrainingPeaks, Trainerize, PT Distinction, Hevy Coach, MyFitnessPal for the nutrition side) actually structure this:

### 3.1 Training must not be a free drag-and-drop by the end user
The original idea described the **user** selecting a day and assembling their own routine. This is the single biggest concept change needed:
- A layperson does not know correct **exercise order** (compound before isolation, large muscle groups before small), **volume/intensity progression**, **rest intervals**, or **contraindications** for their own body.
- **Correction:** Only the **Professional** authors/edits the actual prescription (which exercises, sets, reps, load, RPE/RIR, rest, weekly split). The **Client** *consumes* the plan (views it, executes it, logs results). If you still want a "self-service" mode for users without an assigned professional, ship it as a clearly-labeled **"Template/Starter Program"** (pre-built by a professional at content-creation time, not assembled ad hoc by the untrained user) rather than free exercise-picking.

### 3.2 A training/nutrition plan must never be assigned without an intake (anamnesis)
Before any plan is created, the system needs a **PAR-Q-style readiness questionnaire** and **injury/pain history** (physiotherapy anamnesis): past/current injuries, surgeries, pain areas (body-map picker), chronic conditions, medications affecting exercise, pregnancy status if applicable, mobility restrictions. This data must **flag contraindicated exercises** so a Professional isn't manually cross-checking from memory, and the system should visibly warn if a Professional assigns an exercise flagged as contraindicated for that client.

### 3.3 Movement demonstration needs more than a GIF
A GIF shows the movement but not *how to self-correct*. Each exercise record should carry:
- GIF/video demonstration (see Section 8 for API sourcing).
- Written execution cues (2–4 bullet points).
- Common mistakes / compensations to watch for.
- Contraindications (which injury flags should hide/replace this exercise).
- Target muscle(s), equipment, difficulty.
- Prescription is logged by **RPE (Rate of Perceived Exertion)** or **RIR (Reps in Reserve)**, not just raw weight — this is current best practice for autoregulated training and is what real systems (TrainHeroic, Trainerize) use.
- **Optional (recommended, later iteration):** client can upload a short form-check video against a specific logged set; Professional can leave async feedback. This is a strong differentiator and is standard in premium coaching apps.

### 3.4 Training structure should follow real periodization
Plans are not just "a list of days." Model it as:
**Training Plan → Mesocycle(s)/Blocks (e.g., 4–8 weeks) → Weekly Microcycle (assigns sessions to weekdays or specific calendar dates) → Session → Exercise prescriptions (sets/reps/load/RPE/rest/tempo/notes)**, with a **deload week** concept and **progressive overload** notes carried from week to week. This matches your requirement to "select the day, of month, and select the training" — the day-of-month scheduling sits at the Session level, generated from the weekly microcycle template but overridable for specific calendar dates (holidays, travel, etc.).

### 3.5 Body registration must be a professional-validated clinical record, not a free-text field
- **Correction:** Body assessment ("cadastro corporal") should capture: weight, height, circumferences (waist, hip, arm, thigh, etc.), skinfolds (if the professional uses calipers), body-fat estimate, BMI, posture-assessment notes/photos (physiotherapist), and goals. Self-entry by the client should be allowed for day-to-day weight/photos, but a **"validated by Professional"** flag and timestamp should exist for formal assessments, and history should be versioned (never overwrite — always append, so progress charts are accurate).
- This is explicitly the module where you asked to *"solicite ajuda do personal/nutricionista"* — confirmed: this module's field list and assessment protocol should be defined **with an actual PT/nutritionist**, matching a protocol they already trust (e.g., ISAK anthropometry, or whatever your professionals currently use) rather than inventing fields. Flag this as an open item in Section 11.

### 3.6 Nutrition: log + educate, don't auto-prescribe
- The app should let clients **log food intake** (search/barcode via free APIs, Section 8) and give the Nutritionist visibility + messaging tools.
- The system itself should **not** auto-generate calorie/macro targets as medical advice without a Nutritionist setting/approving them for that client. It's fine for the system to *suggest a starting point* (e.g., Mifflin-St Jeor BMR/TDEE estimate) but it must be presented as an editable **draft** the Nutritionist confirms, not a final prescription — this is both a safety and liability guardrail.
- "Interagir em melhorias" (interact for improvements) = automated, non-clinical nudges are fine (e.g., "you're low on protein today vs. your target", "you haven't logged lunch"); anything that reads as medical/nutritional advice should route through or be pre-approved by the Nutritionist.

### 3.7 Weekly/Daily interaction — this is good, keep and formalize it
Your instinct here matches how real coaching apps drive retention:
- A **"Today"** view: today's training session (if any), meals logged vs. target, tasks/habits due.
- A **"This Week"** view: weekly training split, adherence %, weigh-in day reminder, upcoming check-in with Professional.
- Push/email **nudges**: missed session, missed food log, check-in due, new message from Professional, plan updated.
- Weekly **auto-summary** (adherence %, volume trend, weight trend) shown to both Client and Professional.

### 3.8 "Productive" — scope this explicitly
Your prompt mixes "workout" and "be more productive." Recommendation: keep a **lightweight, generic task/habit module** (not a full project-management tool) scoped to health-adjacent productivity — hydration, sleep, supplement reminders, custom habits, simple daily task list — feeding the same "Today/This Week" dashboard. Keep it out of the training/nutrition domain models entirely (separate module) so it doesn't entangle clinical data with generic to-dos. Flagged as open scope question in Section 11.

---

## 4. Roles & Permissions (RBAC Matrix)

Enforced **server-side on every request** (never trust the frontend for authorization — see Section 9). Frontend uses the same permission set only to decide what to render.

| Capability | Admin | Professional (own clients) | Client (own data) |
|---|:---:|:---:|:---:|
| Manage users/roles | ✅ | ❌ | ❌ |
| Manage global exercise library | ✅ | ➕ propose/edit own custom exercises | ❌ read-only |
| Link/unlink Professional ↔ Client | ✅ | ✅ (accept/invite) | ✅ (accept invite) |
| Create/edit training plans | ✅ | ✅ (own clients only, needs `PERSONAL_TRAINER` specialization) | ❌ |
| Create/edit nutrition plans | ✅ | ✅ (own clients only, needs `NUTRITIONIST` specialization) | ❌ |
| Fill intake/anamnesis | — | ✅ (review/validate) | ✅ (self-report) |
| Body assessment entry | ✅ | ✅ (validate/create formal record) | ✅ (self-entry, unvalidated) |
| Log training session execution | — | 👁 view | ✅ own only |
| Log food diary | — | 👁 view | ✅ own only |
| Messaging | ✅ (support) | ✅ own clients | ✅ own professional |
| View analytics/adherence | ✅ (all) | ✅ (own clients) | ✅ (own data) |
| System configuration / audit log | ✅ | ❌ | ❌ |

---

## 5. Functional Modules

### 5.1 Authentication & Account Management
- Sign up / login via **email+password (credentials)** and **Google OAuth**, both enabled (per project decision), implemented with **NextAuth.js** (Auth.js) on the frontend issuing a session, backed by a **JWT** the Node.js API validates on every request (short-lived access token + httpOnly refresh token).
- Email verification, password reset, account deactivation.
- Role assignment happens at invite-time (Admin invites Professionals; Professionals invite/link Clients) — self-signup as "Client" is open; self-signup as "Professional" requires Admin approval (credential/license check, manual for v1).

### 5.2 Professional ↔ Client Relationship
- Invite flow (email/link), accept/decline, unlink (with data-retention rules).
- A Client can be linked to at most one Personal Trainer and one Nutritionist at a time (same or different Professional accounts) — configurable if multi-professional support is needed later.

### 5.3 Onboarding / Intake (Anamnesis + PAR-Q)
- Structured questionnaire: goals, training experience, injury history (body-map picker), pain scale, medical conditions/medications, availability (days/week, session duration), equipment access (home/gym).
- Output: a **contraindications profile** attached to the client, consumed by the plan builder (Section 5.5) to warn/block unsafe prescriptions.
- Must be completed (or explicitly skipped with an acknowledged risk disclaimer) before a training plan can be assigned.

### 5.4 Body Assessment ("Cadastro Corporal")
- Fields (**draft — confirm final protocol with a real PT/nutritionist**, see Section 11): weight, height, BMI (computed), circumferences, skinfolds (optional), body-fat % (computed or entered), progress photos, posture notes.
- Append-only history (never overwrite), each entry timestamped and tagged `self_reported` or `professional_validated`.
- Charts: weight trend, measurement trend, photo comparison (side-by-side, date-selectable).

### 5.5 Exercise Library
- Sourced from a free exercise API (Section 8) + custom exercises added by Professionals/Admin.
- Each exercise: name, GIF/video, muscle group(s), equipment, difficulty, written cues, common mistakes, contraindication tags.
- Cached locally (DB) after first fetch — never call the external API live on every page view (rate limits, latency, offline resilience). See Section 8 for caching strategy.

### 5.6 Training Plan Builder (Professional-only)
- Authoring UI: create a **Training Plan** → add **Mesocycle(s)** (name, duration in weeks, goal) → define a **Weekly Microcycle template** (assign sessions to weekdays, e.g., Mon/Wed/Fri) → each **Session** gets exercises with sets/reps/load-or-%1RM/RPE-or-RIR/rest/tempo/notes.
- The weekly template auto-generates dated **Session instances** across the mesocycle's calendar span (this is where "select the day of month" lives) — Professional can override/move individual dated sessions (holidays, travel) without editing the template.
- Contraindication warnings surface inline when adding an exercise flagged against that client's intake profile.
- Cloning: duplicate a plan/mesocycle as a starting template for a new client.
- Optional starter templates (Section 3.1) usable when no Professional is assigned.

### 5.7 Client Training Execution
- "Today" shows the day's session (if any) with exercises, GIFs, cues, target sets/reps/RPE.
- Client logs actual performance per set (weight, reps, RPE/RIR, notes) — session auto-marks complete when all exercises logged or manually marked.
- Rest timer, previous-session values shown for quick reference ("last time: 60kg x 8 @ RPE8").
- Missed-session handling (auto-flag for adherence tracking, doesn't silently disappear).

### 5.8 Nutrition Module
- **Nutritionist side:** set targets (calories/macros) per client — system may propose a draft estimate (BMR/TDEE formula) but Nutritionist must confirm/edit before it's active (Section 3.6). Optional structured meal plan (meal slots with suggested foods).
- **Client side:** food diary — search/barcode-scan via free food APIs (Section 8), log meals against time-of-day slots, see running macro totals vs. targets.
- Hydration log (simple counter).
- Weekly nutrition adherence summary shared with Nutritionist.

### 5.9 "Today / This Week" Dashboard (core interaction hub)
- Aggregates: today's training session, meals logged vs. target, habits/tasks due, unread messages, upcoming weigh-in/check-in.
- Weekly view: 7-day strip of sessions/adherence, weekly summary card.
- This is the client's default landing screen after login.

### 5.10 Productivity / Habits (lightweight, health-adjacent — scope to confirm, see Section 11)
- Custom habit list (hydration, sleep, supplements, mobility work, etc.) with daily check-off, streaks.
- Simple personal task list (optional, non-clinical) feeding the same dashboard.
- Kept as an isolated module/domain — does not touch training/nutrition data models.

### 5.11 Messaging
- Lightweight thread between a Client and their linked Professional(s). Text only for v1 (attachments/video form-check as fast-follow, ties into 3.3).

### 5.12 Notifications
- Channels: email (transactional) + web push (optional PWA) for v1; native push if a mobile shell is added later.
- Triggers: session reminder, missed session/log, new message, plan updated, weekly summary ready, check-in due.

### 5.13 Admin Console
- User/role management, Professional approval queue, global exercise-library curation, system-wide audit log, basic usage analytics.

---

## 6. Data Model Overview (conceptual — not a final schema)

Core entities and key relationships:

- **User** (base identity: email, password hash, OAuth links, status) — 1:1 → **Role** (`ADMIN`/`PROFESSIONAL`/`CLIENT`)
- **ProfessionalProfile** (User FK, specializations[], license/credential info, bio) — 1:N → **ProfessionalClientLink**
- **ClientProfile** (User FK, linked ProfessionalClientLink[])
- **ProfessionalClientLink** (professionalId, clientId, status, linkedAt)
- **IntakeAssessment** (clientId, PAR-Q answers, injury/pain flags, medical notes, completedAt)
- **BodyAssessment** (clientId, measurements JSON/columns, source: self|professional, validatedBy, recordedAt) — append-only
- **Exercise** (name, mediaUrl(gif/video), muscleGroups[], equipment[], difficulty, cues[], mistakes[], contraindicationTags[], sourceApiId)
- **TrainingPlan** (clientId, professionalId, name, startDate, status) → **Mesocycle** (order, weeks, goal) → **WeeklyMicrocycleTemplate** (weekday→session template) → **Session** (dated instance, status) → **SessionExercise** (exerciseId, order, targetSets/reps/load/RPE/rest/tempo, notes)
- **ExerciseLog** (sessionExerciseId, setNumber, actualReps, actualLoad, actualRPE, loggedAt)
- **NutritionPlan** (clientId, nutritionistId, calorieTarget, macroTargets, status, confirmedByProfessionalAt)
- **FoodDiaryEntry** (clientId, foodApiRef or customFoodId, quantity, mealSlot, loggedAt, nutrientsSnapshot)
- **FoodItemCache** (cached normalized result from external food API, source, externalId, nutrients, fetchedAt)
- **HabitDefinition** / **HabitCheckIn** (clientId, habit name, cadence, checkIns[])
- **Message** (threadId, senderId, body, attachments[], sentAt)
- **Notification** (userId, type, payload, readAt)
- **AuditLog** (actorId, action, entity, entityId, timestamp, metadata) — for Admin/compliance

---

## 7. Technical Architecture

### 7.1 Overall shape
**Monolith, internally layered and split by Back-end / Front-end**, organized as a **monorepo** (e.g., Turborepo or Nx) — not microservices, but not a tangled single app either:

```
/apps
  /api      → Node.js backend (layered architecture, described below)
  /web      → Next.js frontend (App Router, src/ directory convention — src/app, src/features, src/components)
/packages
  /shared-types     → TypeScript types shared between api and web
  /validation       → zod schemas shared between api and web (single source of truth for input rules)
  /ui               → shared UI components (shadcn/ui-generated code) + design tokens — required, not optional (Section 7.3)
```

The current top-level `frontend/` and `backend/` directories are temporary staging for pre-scaffolding work (e.g., the design-token CSS/Tailwind config already written — see Section 7.3). The canonical layout is the monorepo above; implementation moves staged files into it.

### 7.2 Backend — layered architecture + SOLID
Recommended framework: **NestJS** (built on Express/Fastify) — its module/provider/DI system maps naturally onto layered architecture and makes SOLID (especially Dependency Inversion) straightforward to enforce, and it has first-class support for guards (RBAC), pipes (validation/sanitization), and interceptors (logging/audit). A hand-rolled Express/Fastify structure with the same layering is a valid alternative if the team prefers less framework opinion — the layering rules below apply either way.

Layers (dependency direction: outer → inner only):
1. **Presentation** (`controllers/`, DTOs, route guards) — HTTP concerns only, no business logic.
2. **Application** (`use-cases/` or `services/`) — orchestrates a single business operation (e.g., `AssignTrainingPlanToClient`, `LogExerciseSet`, `ConfirmNutritionTargets`). This is where authorization *rules* (not just role checks) live, e.g., "a Nutritionist can only confirm targets for their own linked clients."
3. **Domain** (`entities/`, `value-objects/`, domain services) — core business rules, framework-agnostic, e.g., contraindication-checking logic, mesocycle/microcycle generation, RPE validation ranges. No DB or HTTP imports here.
4. **Infrastructure** (`repositories/`, external API clients, DB models, cache clients) — implements interfaces defined by the Application/Domain layers (Dependency Inversion — e.g., `ExerciseRepository` interface lives in Domain, `PrismaExerciseRepository` implementation lives in Infrastructure).

SOLID in practice:
- **S**ingle Responsibility: one use-case class per business operation, not fat "TrainingService god classes."
- **O**pen/Closed: new exercise-data providers or notification channels implemented as new Infrastructure adapters behind existing interfaces, no core changes needed.
- **L**iskov Substitution: any `ExerciseRepository` implementation (Prisma-backed, cached, in-memory for tests) is interchangeable.
- **I**nterface Segregation: narrow repository/service interfaces per use-case need, not one giant `IDatabase` interface.
- **D**ependency Inversion: Application/Domain depend on abstractions (interfaces); Infrastructure depends on those abstractions too, never the reverse.

### 7.3 Frontend — Next.js
- **App Router**, feature-sliced structure (`/features/training`, `/features/nutrition`, `/features/body-assessment`, `/features/dashboard`, etc.), not one flat `pages`/`components` dump.
- Server state via **TanStack Query** (React Query) talking to the typed API client (generated from or validated against the shared `zod`/OpenAPI schemas in `packages/validation`).
- Forms via **react-hook-form** + `zod` resolver — client-side validation for UX only; the backend re-validates everything independently (never trust the client).
- Auth: **NextAuth.js** (Credentials provider + Google provider) issuing a session; API calls carry the JWT for backend verification.
- Route-level RBAC via Next.js **middleware** checking session/role before rendering protected routes — this is a UX convenience, **not** the security boundary (the API is).
- UI: **shadcn/ui + Radix UI + Tailwind CSS (confirmed — see `docs/prds/00-shared-reference-and-decisions.md` decision 3.8)**; mobile-first (this is a gym-use app — most logging happens on a phone).
  - Why this stack: shadcn/ui is not a component library in the traditional sense — the component source code is generated **into the repository** (`packages/ui`), giving full control over appearance and behavior without fighting a closed third-party API. Accessibility (focus management, keyboard navigation, ARIA semantics) comes built-in via the underlying Radix primitives, which directly supports the WCAG AA target in Section 10. It imposes no aesthetic of its own — PeakForm's visual identity is built on top of it via the design tokens defined in `docs/design-system.md`, which is what keeps the product from looking like a generic template. It is also the de facto standard for new React/Next.js projects.
  - No other component library (MUI, Chakra, Ant Design, Mantine, Bootstrap, ...) is permitted. If shadcn/ui has no fitting primitive for a need, build on the matching Radix primitive directly.

**File organization (binding for implementation):**
- `apps/web/tailwind.config.ts` — Tailwind theme wiring the design tokens; lives at the web app root per Next.js/Tailwind convention. Its `content` globs must cover `./src/**/*.{ts,tsx}` and `../../packages/ui/**/*.{ts,tsx}`.
- `apps/web/src/app/globals.css` — design tokens as CSS variables (`:root` light + `.dark`), imported once in the root layout per the App Router convention.
- `packages/ui/src/components/` — shadcn/ui-generated component code shared across the app.
- The existing `frontend/globals.css` and `frontend/tailwind.config.ts` are the v1 token/theme source — implementation migrates them into the locations above (adjusting `content` globs to the `src/` + `packages/ui` layout). `docs/design-system.md` is the token source of truth; these files must stay in sync with it.

### 7.4 Database
- **PostgreSQL** (confirmed) + **Prisma ORM**. Rationale: strong relational integrity for RBAC/ownership chains (Professional→Client→Plan→Session→Log), migrations, and it pairs well with a NestJS/TypeScript backend. All queries parameterized via the ORM (SQL-injection safe by default — no raw string-concatenated SQL).
- Sensitive health fields (intake/injury data, body measurements) — consider column-level encryption or at minimum encryption-at-rest on the DB volume, plus strict row-level authorization in the repository layer (never a query that returns another client's rows).

### 7.5 Caching / external data
- **Redis** (or a simple DB cache table if Redis is overkill for v1) to cache exercise-library and food-lookup responses from external APIs — see Section 8 for why this is required, not optional.

### 7.6 File/media storage
- S3-compatible object storage (AWS S3, Cloudflare R2, etc.) for progress photos and (later) form-check videos, served via signed URLs, never public-by-default given the sensitivity of body photos.

---

## 8. External Free APIs (researched — confirm current terms before build, as free tiers change)

### 8.1 Exercise data / GIFs
| Option | Notes |
|---|---|
| **ExerciseDB** (v2, `exercisedb.io` / RapidAPI listing) | ~1,300–11,000+ exercises with GIFs, muscle/equipment metadata. Free tier exists but has been reported as rate-limited/unreliable depending on the specific host reselling it (check current RapidAPI terms at build time — several third-party wrappers exist with different limits). |
| **Static open-source exercise datasets on GitHub** (e.g., community JSON+GIF exercise datasets, several hundred to ~1,300 exercises, MIT/Apache-licensed) | **Recommended primary source for v1**: no API key, no rate limits, self-hosted (import once, serve GIFs from your own object storage/CDN). Trade-off: you own updates/curation. |
| **wger** (open-source, self-hostable workout manager with REST API) | Good as a secondary source or as inspiration for data modeling; exercise images are more limited than dedicated GIF datasets. |

**Recommendation:** import a static open-source exercise dataset once into the DB + your own object storage (Section 7.6), rather than calling a rate-limited third-party API on every page load. This directly supports the caching architecture in 7.5 and removes a runtime dependency/cost.

### 8.2 Nutrition / food data
| Option | Notes |
|---|---|
| **Open Food Facts API** | Free, **no API key required**, huge global barcode/packaged-food database (ingredients, allergens, Nutri-Score, nutrients per 100 g). Best fit for barcode-scan food logging. Caveat: data is crowd-sourced — validate/handle missing fields defensively, and a "no product found" response still returns HTTP 200 with a `status: 0` field (check that field, don't trust the HTTP status alone). |
| **USDA FoodData Central API** | Free with a `data.gov` API key (sign-up, no cost), ~600,000+ foods, authoritative for generic/whole foods (best for "1 cup rice", less useful for branded/packaged items). Rate limit ~1,000 req/hour/key — cache aggressively. |

**Recommendation:** use **Open Food Facts** for barcode/packaged-food lookup and **USDA FoodData Central** for generic/whole-food search, normalize both into your own `FoodItemCache` table so the Nutritionist/Client experience doesn't depend on live third-party latency.

### 8.3 Calendar / reminders (optional)
- Google Calendar API (OAuth, free) — optional sync for session reminders if the Client wants training sessions mirrored into their personal calendar. Not required for v1.

---

## 9. Security, Sanitization & Compliance

- **Backend is the sole authorization boundary.** Every write and every read that returns another user's data must pass through an ownership/role check in the Application layer (Section 7.2), independent of what the frontend shows or hides.
- **Input validation/sanitization:** shared `zod` schemas (Section 7.1) validated on the backend for every request body/query/param — this is the actual security control; the same schema on the frontend is UX only.
- **Output handling:** no raw HTML rendering of user-generated content (messages, notes) without sanitization (e.g., DOMPurify) if any rich text is ever allowed; plain text by default.
- **SQL injection:** mitigated by the ORM's parameterized queries — no raw string-built SQL.
- **Standard hardening:** Helmet (HTTP headers), CORS locked to known origins, rate limiting on auth and write endpoints, CSRF protection for cookie-based session calls, file-upload validation (type/size/content checks) for progress photos.
- **Secrets:** environment-based secret management, never committed; rotate OAuth/API keys.
- **Audit log:** every Professional action that mutates a Client's plan/targets is recorded (actor, action, entity, timestamp) — both for accountability and for the liability concerns raised in Section 3.
- **Data privacy (LGPD, since this handles health data — "dado pessoal sensível" under Brazilian law):** explicit consent at intake for health-data processing, encryption of sensitive fields, data export/deletion on request, clear retention policy, and a documented legal basis for processing before launch. Recommend a short legal review pass before handling real health data in production — this is called out again in Section 11 as it's outside a technical document's scope to finalize.

---

## 10. Non-Functional Requirements

- **Mobile-first responsive UI** — most client logging happens in the gym, on a phone.
- **Performance:** cached exercise/food data (Section 7.5/8) to keep logging interactions fast even if third-party APIs are slow/down.
- **Accessibility:** semantic HTML, keyboard navigation, sufficient contrast — standard WCAG AA target.
- **i18n:** pt-BR as primary locale, structured so English can be added without rework (all user-facing strings externalized from day one).
- **Resilience:** if an external API (exercise/food) is unreachable, the app must degrade gracefully (serve cached data, allow manual food entry) rather than blocking logging.

---

## 11. Open Questions / Decisions Needed Before or During PRD Writing

1. **Body assessment protocol** — confirm the exact field list/measurement protocol with a real PT/nutritionist (Section 3.5/5.4) rather than the draft list here.
2. **Productivity module scope** — confirm whether it stays "health-adjacent habits only" or should be a fuller task/project manager (Section 3.8/5.10).
3. **Professional credential verification** — manual Admin approval for v1 is assumed; confirm if any document/license upload is needed at signup.
4. **Monetization/SaaS model** — is this multi-tenant SaaS (many independent Professionals paying to onboard their own clients) or a single-practice tool? This affects billing, tenant isolation, and the Admin scope significantly and should be resolved before the RBAC/data-model PRDs are finalized.
5. **Form-check video upload** (Section 3.3) — confirm if this is in scope for v1 or a fast-follow; affects storage/moderation requirements.
6. **Native mobile app vs. PWA** — this document assumes responsive web (Next.js) only; confirm if a native shell (e.g., React Native / Capacitor) is needed later, as it affects how push notifications and offline caching are designed now.
7. **LGPD legal review** — schedule before handling real client health data in production (Section 9).

---

## 12. Glossary

- **RPE / RIR** — Rate of Perceived Exertion / Reps in Reserve: subjective effort scales used to autoregulate training load instead of relying only on fixed weight.
- **Mesocycle / Microcycle** — periodization terms: a mesocycle is a training block (weeks), made up of repeating weekly microcycles.
- **PAR-Q** — Physical Activity Readiness Questionnaire, a standard pre-exercise safety screening.
- **Anamnesis** — structured clinical history-taking (injuries, conditions) used in physiotherapy.
- **TDEE / BMR** — Total Daily Energy Expenditure / Basal Metabolic Rate, used to estimate calorie needs.
- **RBAC** — Role-Based Access Control.
