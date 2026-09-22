# PRD 03 — Onboarding / Intake (Anamnesis + PAR-Q)

**Module:** Onboarding / Intake
**Source:** Base document §5.3 (see also §3.2, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`02-professional-client-relationship.md`](./02-professional-client-relationship.md), [`05-exercise-library.md`](./05-exercise-library.md) (`ContraindicationTag` vocabulary)
**Referenced by (downstream consumers):** [`06-training-plan-builder.md`](./06-training-plan-builder.md) (contraindication warnings)

---

## 1. Overview

Before any training plan can be assigned, the system must know whether the Client has injuries, pain, medical conditions, or other factors that make certain exercises unsafe. This module implements the intake questionnaire (a PAR-Q-style readiness screen plus a physiotherapy-style injury/pain history) and produces a **contraindications profile** consumed by the Training Plan Builder (PRD 06) to warn against unsafe prescriptions.

This is a **safety-critical module** per base doc §3.2 — it directly addresses failure mode #1 in the product vision (§1): training assigned without professional screening.

## 2. Goals

- Capture a structured, versioned intake covering readiness (PAR-Q), injury/pain history (body-map picker), medical conditions/medications, availability, and equipment access.
- Produce a machine-readable **contraindications profile** (a set of tags) attached to the Client, not just free-text notes a Professional has to re-read every time.
- Block or gate training-plan assignment until intake is complete or explicitly skipped with an acknowledged risk disclaimer.

## 3. Non-Goals

- This module does not itself decide whether an exercise is safe — it only produces the contraindications profile. The actual warning/blocking logic when a Professional adds an exercise lives in PRD 06 (Training Plan Builder), which consumes this profile.
- No diagnostic or medical-advice output — the system flags risk factors for the Professional's judgment, it does not render a clinical diagnosis.

## 4. Personas & Permissions

Per base doc §4, row "Fill intake/anamnesis": Professional ✅ (review/validate), Client ✅ (self-report).

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Fill out own intake | — | — | ✅ |
| View a linked Client's intake | — | ✅ (own clients only) | ✅ (own) |
| Review/annotate intake (add clinical notes) | — | ✅ (own clients only) | ❌ |
| Skip intake with disclaimer | — | ❌ (cannot skip on Client's behalf) | ✅ |

## 5. Functional Requirements

### 5.1 Structured questionnaire
Sections, per base doc §5.3:
- **Readiness (PAR-Q-style):** yes/no screening questions (heart condition, chest pain, dizziness/balance loss, bone/joint problems, blood-pressure medication, other reason exercise should be medically supervised).
- **Injury/pain history:** interactive body-map picker (front/back silhouette) — Client taps a body region, selects pain type/severity (0–10 scale), and whether it's a past or current issue. Multiple regions can be flagged.
- **Medical conditions/medications:** free-text + a checklist of common conditions affecting exercise (e.g., diabetes, cardiovascular disease, pregnancy) with an "other" free-text field.
- **Availability:** days per week, session duration preference.
- **Equipment access:** home or gym, and if home, a checklist of available equipment (dumbbells, bands, none, etc.).

### 5.2 Contraindications profile generation
- Each flagged body region + condition maps to one or more **contraindication tags**, using the exact same `ContraindicationTag` codes that the Exercise Library (PRD 05, canonical owner of this vocabulary) attaches to exercises — e.g., "current low-back pain" → tag `LOWER_BACK_LOAD_CAUTION`. This module never defines its own tag codes; it only selects from PRD 05's set, so a tag on a Client's profile always matches a tag PRD 06 can find on an `Exercise`.
- The mapping from questionnaire answers to tags is a Domain-layer rule set (base doc §7.2), not hardcoded per-question logic scattered in the UI — this keeps it auditable and easy for a Professional-reviewed protocol to update later.
- Any `PAR-Q` "yes" answer surfaces a visible advisory to both Client and Professional: "This answer suggests you should consult a physician before starting a new exercise program" — advisory only, does not block plan creation (that decision stays with the Professional).

### 5.3 Completion gating
- A Client cannot have a `TrainingPlan` assigned to them (PRD 06) until their intake `status` is `COMPLETED` or `SKIPPED_WITH_ACKNOWLEDGEMENT`.
- "Skip" requires the Client to read and check an explicit risk disclaimer ("I understand training without a completed health screening carries risk...") before the skip is recorded — this is a deliberate friction point, not a silent bypass.
- A completed intake is versioned: if a Client's situation changes (new injury), they (or their Professional) can start a **new** intake version rather than editing the old one in place — history is preserved for liability/audit purposes, consistent with the append-only pattern used for Body Assessment (PRD 04).

### 5.4 Professional review
- Professional sees the full intake plus the generated contraindication tags, and can add clinical annotation notes (e.g., "cleared for lower body, avoid overhead pressing until shoulder re-assessed") that are **not** overwritten by the Client's next self-reported update — annotations are their own record tied to a specific intake version.

## 6. Data Model Additions

Extends base doc §6 `IntakeAssessment`:

- **IntakeAssessment**: `clientId`, `version` (int, increasing), `parqAnswers` (JSON), `painFlags[]` (body region, severity, past/current), `medicalConditions[]`, `medications` (free text), `availability` (days/week, session duration), `equipmentAccess` (JSON), `contraindicationTagCodes[]` (derived at save time — references `ContraindicationTag.code` values owned by PRD 05, not a locally-defined enum), `status` (`IN_PROGRESS`/`COMPLETED`/`SKIPPED_WITH_ACKNOWLEDGEMENT`), `completedAt`.
- **ProfessionalAnnotation** (professionalId, intakeAssessmentId, note, createdAt) — separate from the Client-authored fields, never overwritten by them.

## 7. UX Notes

- Body-map picker is the centerpiece interaction — must work well on mobile touch targets (base doc §10 mobile-first).
- PAR-Q advisory messages are shown inline, non-blocking, with a clear "this is not a diagnosis" framing to manage liability expectations (ties into base doc §3.6's non-prescriptive-advice principle).

## 8. Out of Scope / Future (Fast-Follow)

- Structured integration with a physician's medical clearance document upload.
- Automatic contraindication-tag suggestions from free-text medical notes (NLP) — v1 uses the checklist mapping only.

## 9. Open Questions

- Exact PAR-Q question wording and the full contraindication-tag taxonomy should be validated with a licensed PT/physiotherapist before this ships — flagged as a professional-input dependency, same category as the Body Assessment protocol (base doc §11.1).

## 10. Acceptance Criteria

- A Client cannot proceed to receive a training plan without a `COMPLETED` or `SKIPPED_WITH_ACKNOWLEDGEMENT` intake.
- Flagging a body-region pain point produces at least one contraindication tag visible to the linked Professional.
- Any "yes" PAR-Q answer surfaces the medical-consultation advisory without blocking the Professional's workflow.
- A new intake version does not overwrite or delete a Professional's prior annotations.
