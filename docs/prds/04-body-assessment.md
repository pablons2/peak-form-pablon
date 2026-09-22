# PRD 04 — Body Assessment ("Cadastro Corporal")

**Module:** Body Assessment
**Source:** Base document §5.4 (see also §3.5, §6, §7.6)
**Status:** Draft v1 — **protocol confirmed** (clinical review completed; see §5.2 note)
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`01-authentication-account-management.md`](./01-authentication-account-management.md) (`ClientProfile.dateOfBirth`/`biologicalSex`, required inputs to §5.2's formula), [`02-professional-client-relationship.md`](./02-professional-client-relationship.md), [`06-training-plan-builder.md`](./06-training-plan-builder.md) (mesocycle-length concept, referenced in §5.3's cadence guidance)
**Referenced by (downstream consumers):** [`08-nutrition-module.md`](./08-nutrition-module.md) (BMR/TDEE draft estimate), [`09-today-this-week-dashboard.md`](./09-today-this-week-dashboard.md) (weight trend)

---

## Clinical Review Note

The field list and measurement protocol in this PRD were defined against the **Pollock 7-site skinfold protocol** (the de facto standard in Brazilian personal-training/nutrition practice) combined with **ISAK-style landmark discipline** for circumferences, plus a structured (not free-text-only) posture screening checklist. This resolves the item previously flagged open in [`00-shared-reference-and-decisions.md` §3.7](./00-shared-reference-and-decisions.md#37-body-assessment-protocol--resolved-base-doc-111--35) and base doc §11.1. The protocol is versioned (see §5.6) so a future Professional preference (e.g., a 3-site protocol, or full ISAK level-2) can be added without a breaking schema change.

## 1. Overview

Body assessment is the clinical record of a Client's physical measurements over time — weight, circumferences, skinfolds, body-fat estimate, posture screening, and progress photos. Unlike a simple weight tracker, this module distinguishes **self-reported** entries (day-to-day, unvalidated) from **professional-validated** formal assessments, and never overwrites history — every entry is appended so progress charts stay accurate and defensible.

## 2. Goals

- Let Clients self-log weight/photos frequently without professional involvement.
- Let Professionals record formal assessments using a single, consistent, named measurement protocol — not an ad hoc field list that varies assessment to assessment.
- Compute body composition (body density → % body fat) using a stated, auditable formula, never presented as more precise than skinfold measurement actually is.
- Preserve full history (append-only) so trend charts are trustworthy even as evaluators or protocol versions change.
- Store progress photos securely (never public-by-default, given sensitivity).

## 3. Non-Goals

- No automatic body-fat calculation formula validation/certification beyond citing the published formula used — any computed estimate is presented as an **estimate with a stated margin of error**, not a clinical diagnostic result, unless explicitly marked `professional_validated`.
- No posture-assessment AI/computer-vision analysis in v1 — posture screening is a structured checklist filled by the Professional against standardized photos, not automated.
- No support for multiple concurrent protocols per client in v1 — a client's formal-assessment history uses one protocol version at a time (see §5.6 for how a protocol change is handled without corrupting trend charts).

## 4. Personas & Permissions

Per base doc §4, row "Body assessment entry": Admin ✅, Professional ✅ (validate/create formal record), Client ✅ (self-entry, unvalidated).

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Self-log weight/photo | — | — | ✅ (own) |
| Create formal/validated assessment | ✅ | ✅ (own clients only) | ❌ |
| View own history | — | ✅ (own clients) | ✅ (own) |
| Delete/edit a past entry | ❌ (append-only, no edits) | ❌ | ❌ |

## 5. Functional Requirements

### 5.1 Self-reported entries (Client)
- Quick-entry flow: weight (required, kg), optional progress photo, optional note.
- Tagged `source: self_reported`, no `validatedBy`, no protocol fields.

### 5.2 Formal/validated entries (Professional) — confirmed protocol

**Basic measurements** (always captured):
- Weight (kg), height (cm) → BMI computed (`weight / height²`). BMI is shown with a standing caveat in the UI — "BMI does not distinguish muscle from fat mass; interpret alongside skinfolds/circumferences, especially for resistance-trained clients" — it is a screening number, not a body-composition result.

**Circumferences (cm)** — measured on the client's **right side** by default (standard practice for consistency between sessions), tape held snug without compressing the skin:
- Neck
- Chest (at nipple line / mesosternale)
- Waist (narrowest point, or at umbilicus if no natural waist narrowing is visible — the evaluator picks one landmark and keeps it consistent across that client's history)
- Hip (widest point over the buttocks)
- Relaxed arm and flexed/tensed arm
- Thigh (mid, halfway between inguinal crease and top of patella)
- Calf (maximum girth)
- **Waist-to-hip ratio** is computed automatically from waist and hip.
- Bilateral measurement (both sides) is an optional add-on flag, relevant when a physiotherapist is tracking post-injury asymmetry — not part of the default protocol.

**Skinfolds (mm) — Pollock 7-site protocol**, all measured on the right side with a calibrated skinfold caliper:
1. Chest/pectoral (diagonal fold, axilla-to-nipple line)
2. Midaxillary (vertical fold, midaxillary line at xiphoid level)
3. Triceps (vertical fold, posterior midline of upper arm)
4. Subscapular (diagonal fold, 1–2 cm below inferior angle of scapula)
5. Abdominal (vertical fold, 2 cm lateral to umbilicus)
6. Suprailiac (diagonal fold, above iliac crest)
7. Thigh (vertical fold, anterior midline, midway between inguinal crease and patella)

Each site is recorded as the mean of two measurements (a third is taken if they differ by more than 1 mm, per standard skinfold technique) — the system stores the final value used, not a formula-guessed one.

**Body-fat % calculation**:
- Body density computed via the **Jackson & Pollock (1978) generalized skinfold equation** (sex-specific, using the sum of the 7 skinfolds and the Client's age). Sex and date of birth are read from `ClientProfile.biologicalSex`/`dateOfBirth` (PRD 01 §6) — age is computed at calculation time as `recordedAt − dateOfBirth`, never stored as a standalone "age" field, so a historical entry's displayed age always reflects the Client's age *on that assessment date*, not their current age. Creating a formal assessment is blocked server-side with a clear error if the Client's `ClientProfile` is missing either field.
- % body fat computed from body density via the **Siri (1961) equation**: `%BF = (495 / BD) − 450`.
- The Professional can override the computed % with a manually entered value (e.g., if using a different validated instrument, such as bioimpedance or DEXA) — in that case the entry is flagged `bodyFatSource: manual_override` with a required note stating the alternate method used.

**Posture screening** (physiotherapist-authored, structured checklist + photos, not free text alone):
- Photos: anterior, posterior, and both lateral views, client in a fixed neutral stance (feet together, arms relaxed at sides), photographed from a consistent distance against a plain background — UI shows this framing guidance to the Professional/Client before capture.
- Structured fields: head position (`neutral`/`forward`), shoulder level (`symmetric`/`elevated_left`/`elevated_right`), scapular position (`normal`/`winging`), spinal curvature flag (`none`/`suspected_kyphosis`/`suspected_lordosis`/`suspected_scoliosis` — screening flag only, explicitly not a diagnosis), pelvic tilt (`neutral`/`anterior`/`posterior`), knee alignment (`neutral`/`varus`/`valgus`), foot posture (`neutral`/`pronated`/`supinated`).
- A free-text notes field remains available for anything the checklist doesn't capture.

**Goals**: structured goal type (`weight_loss`/`muscle_gain`/`recomposition`/`performance`/`rehabilitation`/`other`), optional target value, optional target date, free-text note.

- Tagged `source: professional_validated`, `validatedBy` = the Professional's User ID, `recordedAt` timestamp, `protocolVersion` (see §5.6).

### 5.3 Assessment cadence guidance
- The UI surfaces a non-blocking recommendation to Professionals: formal assessments every **4–6 weeks**, aligned with a typical mesocycle length (PRD 06), since body-composition changes are not reliably distinguishable from measurement noise on a shorter cycle. Self-reported weight has no cadence restriction — a Client can log daily if they choose.
- Measurement reliability note shown to Professionals: measure at a consistent time of day (ideally fasted, morning), same evaluator when possible, same side of body, same landmarks — inter-rater and intra-day variability are the biggest sources of noise in skinfold-based estimates, and the UI should not imply more precision than the method supports (e.g., display `%BF` rounded to one decimal, not two).

### 5.4 Append-only history
- No entry is ever edited or deleted after creation — corrections are made by adding a new entry with a note referencing the correction. This is a hard rule enforced in the repository layer (base doc §7.2 Infrastructure layer), not just a UI convention.
- Every entry, self-reported or validated, contributes to the same chronological timeline per Client.

### 5.5 Charts & comparison
- Weight trend line (all entries, self + validated, visually distinguished by source).
- Measurement trend (per-field line chart: circumferences, skinfold sum, %BF, waist-to-hip ratio) — only populated from validated entries where that field was recorded, and annotated on the chart if the `protocolVersion` changes mid-history (see §5.6) so a Professional isn't misled by a discontinuity.
- Photo comparison: side-by-side view, date-selectable, pulled from either self-reported or validated entries that included a photo; posture-screening photos are compared separately from general progress photos (different capture framing/purpose).

### 5.6 Protocol versioning
- The protocol described in §5.2 is `protocolVersion: "pollock7-v1"`. If the field list or formula is ever revised (e.g., adding an alternate skinfold-site count), a new `protocolVersion` is introduced rather than mutating the meaning of existing stored fields — every `BodyAssessment` row is permanently tagged with the protocol version active when it was recorded, so historical values are always interpreted correctly.

### 5.7 Photo storage
- Progress and posture-screening photos stored in S3-compatible object storage (base doc §7.6), served only via signed, time-limited URLs — never a public bucket, given the sensitivity of body photos.

## 6. Data Model Additions

Uses base doc §6 `BodyAssessment` directly (append-only):

- **BodyAssessment**: `clientId`, `source` (`self_reported`/`professional_validated`), `validatedBy` (Professional User FK, nullable), `recordedAt`, `protocolVersion` (nullable for self-reported), `weight`, `height` (nullable), `bmi` (computed), `circumferences` (JSON: neck/chest/waist/hip/armRelaxed/armFlexed/thigh/calf, right-side default, bilateral flag), `waistHipRatio` (computed), `skinfolds` (JSON: 7 named sites in mm, nullable), `bodyFatPercent` (nullable), `bodyFatSource` (`computed_pollock7`/`manual_override`), `postureScreening` (JSON: structured checklist fields above, nullable), `photoUrls[]` (nullable, signed-URL references, tagged `progress` or `posture`), `goalType`, `goalTargetValue` (nullable), `goalTargetDate` (nullable), `goalNote` (nullable).
- Sensitive fields (measurements, photos, posture screening) follow the encryption-at-rest / row-level-authorization guidance in base doc §7.4 and §9 — this module handles some of the most sensitive data in the system and should not relax those defaults.

## 7. UX Notes

- Client's quick self-log (weight + optional photo) should take under 15 seconds — this is meant to be logged frequently, friction kills adherence.
- Clear visual distinction (badge/icon) between self-reported and professional-validated entries everywhere they appear, so nobody mistakes an unvalidated self-entry for a clinical record.
- Professional's formal-assessment entry form is organized in the same order as the physical exam is typically performed (basic measurements → circumferences → skinfolds → posture → goals) to match muscle memory for evaluators trained on this protocol.

## 8. Out of Scope / Future (Fast-Follow)

- Bluetooth/API integration with smart scales or bioimpedance devices (would feed `bodyFatSource: manual_override` today; a dedicated device-integration source type is a future addition).
- Automated posture analysis from photos (computer vision).
- Support for an alternate/configurable skinfold protocol (e.g., 3-site) selectable per Professional — v1 standardizes on Pollock 7-site for consistency; §5.6's versioning makes this addition non-breaking when it happens.

## 9. Open Questions

- None blocking. The protocol is confirmed for v1. If a future Professional strongly prefers a different established protocol (e.g., full ISAK level 2), that's a `protocolVersion` addition (§5.6), not a rework of this PRD's architecture.

## 10. Acceptance Criteria

- A Client can log a self-reported weight entry (with optional photo) in a few taps, tagged `self_reported`.
- A Professional can create a formal assessment for a linked Client using the full Pollock 7-site protocol, and the system correctly computes BMI, waist-to-hip ratio, and % body fat (Jackson & Pollock body density → Siri equation) from the entered values plus the Client's `dateOfBirth`/`biologicalSex`.
- Attempting to create a formal assessment for a Client whose `ClientProfile.dateOfBirth` or `biologicalSex` is missing is rejected server-side with a clear error, rather than silently computing an incorrect or default body-fat estimate.
- A Professional can override the computed % body fat with a manually entered value, and the entry is clearly flagged as a manual override with the alternate method noted.
- No API endpoint allows editing or deleting an existing `BodyAssessment` row — only creation of new entries.
- Every `professional_validated` entry stores the `protocolVersion` active at creation time, and trend charts visually flag any point where the protocol version changes.
- Weight trend chart correctly plots both self-reported and validated entries, visually distinguishable.
- Progress and posture-screening photos are never accessible via a public/unauthenticated URL.
