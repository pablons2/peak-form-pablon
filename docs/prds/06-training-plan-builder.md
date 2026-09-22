# PRD 06 — Training Plan Builder (Professional-only)

**Module:** Training Plan Builder
**Source:** Base document §5.6 (see also §3.1, §3.4, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`03-onboarding-intake-anamnesis.md`](./03-onboarding-intake-anamnesis.md), [`05-exercise-library.md`](./05-exercise-library.md)
**Referenced by (downstream consumers):** [`04-body-assessment.md`](./04-body-assessment.md) (mesocycle-length concept), [`07-client-training-execution.md`](./07-client-training-execution.md) (consumes generated Sessions), [`12-notifications.md`](./12-notifications.md) ("plan updated" trigger), [`13-admin-console.md`](./13-admin-console.md) (UX pattern reference only)

---

## 1. Overview

This is the core authoring tool for Professionals with the `PERSONAL_TRAINER` specialization. It is the direct fix for the biggest concept correction in the base document (§3.1): **only a Professional authors a prescription** — Clients never free-assemble their own routine. Plans follow real periodization structure (§3.4): **Training Plan → Mesocycle(s) → Weekly Microcycle template → Session → Exercise prescriptions**, with contraindication warnings surfaced inline from the Client's intake profile (PRD 03).

## 2. Goals

- Let a Professional build a periodized plan (mesocycles, weekly template, per-exercise prescriptions with RPE/RIR) for a specific linked Client.
- Auto-generate dated Session instances from the weekly template across the mesocycle's span — this is where "select the day of month" (the original ask) actually lives, per base doc §3.4.
- Allow overriding individual dated sessions (holiday, travel) without editing the template itself.
- Surface a contraindication warning inline whenever an exercise being added conflicts with the Client's intake profile.
- Support cloning a plan/mesocycle as a starting point for a new client.

## 3. Non-Goals

- Clients cannot create, edit, or free-assemble their own plan (base doc §3.1) — self-service is limited to selecting a pre-built **Starter Template** (see §5.6 below), never ad hoc exercise picking.
- No AI-generated/auto-periodized plans in v1 — a Professional authors every prescription by hand (or by cloning an existing plan/template).

## 4. Personas & Permissions

Per base doc §4, row "Create/edit training plans": Admin ✅, Professional ✅ (own clients only, requires `PERSONAL_TRAINER` specialization), Client ❌.

| Action | Admin | Professional (PT specialization) | Client |
|---|:---:|:---:|:---:|
| Create/edit a Training Plan | ✅ | ✅ (own clients only) | ❌ |
| Assign a Starter Template (no professional) | ✅ | — | ➕ self-select, see §5.6 |
| Clone a plan/mesocycle | ✅ | ✅ (own only) | ❌ |
| View a plan | ✅ | ✅ (own clients) | ✅ (own, read-only) |

A Professional without the `PERSONAL_TRAINER` specialization cannot access this module at all, even for their own linked clients (base doc §2 specialization gating).

## 5. Functional Requirements

### 5.1 Training Plan
- A `TrainingPlan` belongs to exactly one Client and is authored by exactly one Professional. Fields: name, start date, status (`DRAFT`/`ACTIVE`/`COMPLETED`/`ARCHIVED`).
- Creating a plan for a Client whose intake (PRD 03) is not `COMPLETED` or `SKIPPED_WITH_ACKNOWLEDGEMENT` is blocked server-side with a clear error — this is the enforcement point for base doc §3.2/§5.3's gating rule.

### 5.2 Mesocycles
- A plan has one or more `Mesocycle`s in order (e.g., "Hypertrophy Block 1", 6 weeks). Each has: order, duration in weeks, goal (free text or enum: hypertrophy/strength/endurance/deload/etc.).
- A mesocycle can be flagged as a **deload week/block** — lower relative volume/intensity, surfaced distinctly in the Client's view (PRD 07) so they understand why the plan is easier that week.

### 5.3 Weekly Microcycle template
- Within a mesocycle, the Professional defines a **Weekly Microcycle template**: which weekdays have a session (e.g., Mon/Wed/Fri) and which Session template applies to each.
- This template is the source the system uses to auto-generate dated Session instances (§5.4) — it is not itself something the Client interacts with directly.

### 5.4 Session generation & override
- On saving a mesocycle's weekly template, the system generates dated `Session` instances covering every week of that mesocycle's span (computed from the mesocycle's derived start date, §6), based on the template's weekday assignments.
- A Professional can act on an individual dated Session without altering the underlying template — the change applies only to that one dated instance, leaving other generated sessions untouched:
  - **Move** it to a different date (e.g., shift Wednesday's session to Thursday because of a holiday): the `date` field is updated, the prior date is preserved in `originalDate`, `overriddenFromTemplate` is set `true`, and `status` stays `SCHEDULED` at the new date.
  - **Cancel** it (e.g., the Client is traveling that whole week): `status` is set to `CANCELLED` — the occurrence is dropped for adherence-tracking purposes (it is not counted as `MISSED`, since it was a deliberate, planned cancellation rather than a no-show) and no replacement session is auto-created.
  - **Edit** its exercises (a one-off substitution): the `SessionExercise` rows for that instance are changed and `overriddenFromTemplate` is set `true`; the session's `date` and `status` are unaffected.
- Editing the template itself only affects **future, not-yet-generated** weeks (or weeks explicitly regenerated) — it never silently rewrites sessions the Client may have already seen/logged against.

### 5.5 Exercise prescriptions
- Each `Session` contains one or more `SessionExercise` entries: exercise (from PRD 05's library), order (compound-before-isolation is a Professional judgment call, not system-enforced, but the UI should support easy reordering), target sets, reps (or rep range), load (absolute or %1RM), **RPE or RIR target** (not raw weight alone — base doc §3.3 explicitly calls out autoregulated prescription as current best practice), rest interval, tempo (optional), notes.

### 5.6 Contraindication warnings
- When a Professional adds an exercise to a Session for a specific Client, the system cross-references that exercise's `contraindicationTags[]` (PRD 05) against the Client's current intake contraindications profile (PRD 03).
- On a match, an inline, visible (not silently logged) warning appears: e.g., "This client has flagged current lower-back pain — this exercise is tagged for lower-back load caution." The Professional can still proceed (this is a warning, not a hard block — the clinical judgment stays with the licensed Professional), but the override is recorded in the audit log (base doc §9) for accountability.

### 5.7 Cloning
- A Professional can duplicate an entire plan or a single mesocycle as a starting point for a different client (or a future block for the same client) — clone copies structure and prescriptions but does not copy the source Client's identity or history.

### 5.8 Starter Templates (self-service, no Professional assigned)
- For Clients without an active `PERSONAL_TRAINER` link, Admin/Professionals can author **Starter Templates** — pre-built plans authored at content-creation time by a licensed Professional, not assembled by the untrained Client (base doc §3.1).
- A Client without a Professional can browse and self-assign a Starter Template, but cannot edit its prescriptions — it is consumed exactly as PRD 07 consumes any other assigned plan.
- Starter Templates skip the intake-gating rule in §5.1 only insofar as they carry their own conservative, pre-vetted contraindication safety margin — but a Client is still shown the intake questionnaire as strongly recommended before starting one.

## 6. Data Model Additions

Uses base doc §6 entities directly: `TrainingPlan` → `Mesocycle` → `WeeklyMicrocycleTemplate` → `Session` → `SessionExercise`.

- **TrainingPlan**: `clientId` (nullable — null only when `isStarterTemplate` is true), `professionalId` (nullable — null only when `isStarterTemplate` is true), `authoredBy` (Professional/Admin User FK, nullable — set only when `isStarterTemplate` is true, i.e. exactly one of `professionalId`/`authoredBy` is set at all times), `name`, `startDate`, `status`, `isStarterTemplate` (bool).
- **Mesocycle**: `trainingPlanId`, `order`, `weeks`, `goal`, `isDeload` (bool). A mesocycle has no `startDate` field of its own — its effective start date is always computed as `trainingPlan.startDate + sum(weeks of all mesocycles with a lower order)`, so reordering or resizing an earlier mesocycle correctly shifts every later one without a manual date-patching step.
- **WeeklyMicrocycleTemplate**: `mesocycleId`, `weekday → sessionTemplate` mapping.
- **Session**: `mesocycleId`, `date`, `originalDate` (nullable — set when a Professional moves a session per §5.4, preserving the template-implied date for audit/history), `status` (`SCHEDULED`/`COMPLETED`/`MISSED`/`CANCELLED` — see PRD 07 §6 for the full lifecycle, since `MISSED` is set by that module), `overriddenFromTemplate` (bool — true if this instance's date or exercises were manually edited away from what the template would generate).
- **SessionExercise**: `sessionId`, `exerciseId`, `order`, `targetSets`, `targetReps`, `targetLoad`/`percent1RM`, `targetRpeOrRir`, `restSeconds`, `tempo` (nullable), `notes` (nullable).

## 7. UX Notes

- Plan authoring is desktop-friendly-first (unlike most of the app) — a Professional building a periodized block benefits from more screen real estate, though the underlying UI kit remains responsive per base doc §10.
- Contraindication warnings use a persistent, unmissable visual treatment (not a toast that disappears) since safety depends on the Professional actually reading it.

## 8. Out of Scope / Future (Fast-Follow)

- AI-assisted or auto-periodized plan generation.
- Hard-blocking (vs. warning) on contraindication matches — v1 keeps clinical judgment with the Professional, but this could be revisited if incident data suggests warnings are being ignored.

## 9. Open Questions

- Should a hard-blocked (not just warned) contraindication tier exist for especially high-risk combinations? Flag for professional/legal input alongside the Section 11 items in the base document.

## 10. Acceptance Criteria

- A Professional without the `PERSONAL_TRAINER` specialization cannot create a training plan, even for their own linked client.
- Creating a plan for a Client with an incomplete intake is blocked server-side.
- Saving a weekly microcycle template auto-generates dated Session instances across the mesocycle's span.
- Moving, cancelling, or editing one dated Session does not alter the underlying weekly template or other generated sessions, and cancelling sets `status: CANCELLED` (never `MISSED`) with no replacement session created.
- Adding an exercise flagged against the Client's contraindications profile shows a visible warning and the override is recorded in the audit log.
- A Client without an assigned Professional can self-select a Starter Template but cannot edit its prescriptions.
