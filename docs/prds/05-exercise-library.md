# PRD 05 — Exercise Library

**Module:** Exercise Library
**Source:** Base document §5.5 (see also §3.3, §7.5, §8.1)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md)
**Referenced by (downstream consumers):** [`03-onboarding-intake-anamnesis.md`](./03-onboarding-intake-anamnesis.md) (reuses the `ContraindicationTag` vocabulary), [`06-training-plan-builder.md`](./06-training-plan-builder.md) (exercise picker, contraindication cross-check)

---

## 1. Overview

The Exercise Library is the shared content catalog every Training Plan (PRD 06) is built from. Each exercise carries more than a name and a GIF — per base doc §3.3, it includes execution cues, common mistakes, contraindication tags, and metadata (muscle groups, equipment, difficulty), because a GIF alone doesn't teach safe self-correction.

## 2. Goals

- Seed a usable exercise catalog at launch by importing a static, self-hosted open-source exercise dataset (base doc §8.1 recommendation) — no live third-party API calls on the request path.
- Let Professionals and Admins extend the catalog with custom exercises.
- Tag every exercise with `contraindicationTags[]` drawn from a `ContraindicationTag` controlled vocabulary that **this module owns as the canonical source** (see §6) — the Intake module (PRD 03) reuses this exact same tag set when generating a Client's contraindications profile, rather than defining its own, so the Training Plan Builder (PRD 06) can safely cross-reference the two.

## 3. Non-Goals

- No live third-party exercise API calls on any user-facing request path (base doc §7.5/§8.1 explicitly call this out as required, not optional).
- No user-generated exercise submissions from Clients — only Professionals/Admin can author exercises.

## 4. Personas & Permissions

Per base doc §4, row "Manage global exercise library": Admin ✅, Professional ➕ (propose/edit own custom exercises), Client ❌ read-only.

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| View exercise library | ✅ | ✅ | ✅ (read-only) |
| Create/edit a global (shared) exercise | ✅ | ❌ | ❌ |
| Create/edit a custom exercise (own use) | ✅ | ✅ | ❌ |
| Promote a custom exercise to global | ✅ | ➕ propose (Admin approves) | ❌ |

## 5. Functional Requirements

### 5.1 Initial catalog import
- One-time import job pulls a static open-source exercise dataset (JSON + GIFs, MIT/Apache-licensed per base doc §8.1) into the `Exercise` table and re-hosts the GIF media in the app's own object storage (base doc §7.6) — the app never depends on the source dataset's hosting at runtime.
- Import is idempotent and re-runnable (e.g., to pull in a newer dataset snapshot) without duplicating existing rows — matched by a stable `sourceApiId`/slug.

### 5.2 Exercise record fields
Per base doc §3.3, every exercise includes:
- Name, media (GIF/video URL, served from own storage).
- Muscle group(s), equipment required, difficulty level.
- Written execution cues (2–4 bullet points).
- Common mistakes / compensations to watch for.
- Contraindication tags, drawn from the `ContraindicationTag` vocabulary this module owns (also reused by PRD 03's contraindications profile — see §6).

### 5.3 Custom exercises
- A Professional can add a custom exercise (e.g., a clinic-specific rehab movement) visible only to their own account/clients by default.
- Admin can review a Professional's custom exercise and "promote" it to the global library (visible to all Professionals), or leave it private.
- Admin can create/edit global exercises directly.

### 5.4 Search & filter
- Client and Professional-facing search/filter by muscle group, equipment, difficulty, and free-text name — used both when browsing the library and when a Professional is adding an exercise to a plan (PRD 06).

### 5.5 Contraindication warning hook
- This module doesn't itself generate warnings (that's the Training Plan Builder's job, PRD 06) — but it is the source of truth for which `contraindicationTags[]` are attached to each exercise, which PRD 06 cross-references against a Client's intake profile (PRD 03).

## 6. Data Model Additions

Uses base doc §6 `Exercise` directly:

- **Exercise**: `name`, `mediaUrl` (own storage), `muscleGroups[]`, `equipment[]`, `difficulty`, `cues[]`, `mistakes[]`, `contraindicationTags[]`, `sourceApiId` (nullable, for imported records), `ownerProfessionalId` (nullable — set for custom/private exercises, null for global), `visibility` (`GLOBAL`/`PRIVATE`).
- **ContraindicationTag** (new — this module is the canonical owner of this enum/reference table): `code` (e.g., `LOWER_BACK_LOAD_CAUTION`, `SHOULDER_IMPINGEMENT_CAUTION`), `label`, `description`. PRD 03 (Onboarding/Intake) stores references to these same `code` values on a Client's contraindications profile — it does not define its own tag set, so the two modules can never drift apart into incompatible vocabularies.

## 7. UX Notes

- Exercise detail view is reused identically in the library browse screen and inside the Training Plan Builder's exercise picker — one component, two contexts — to avoid divergence between "how it's authored" and "how it's consumed."
- GIFs should lazy-load and be served from a CDN-fronted bucket for performance (base doc §7.6/§10 performance NFR).

## 8. Out of Scope / Future (Fast-Follow)

- Live integration with a paid/rate-limited exercise API (e.g., ExerciseDB) as a secondary/supplemental source.
- Community-contributed exercise ratings or comments.

## 9. Open Questions

- Which specific open-source dataset to import for v1 (base doc §8.1 lists several candidates) — a build-time decision, not a product decision; can be resolved during implementation without blocking this PRD.

## 10. Acceptance Criteria

- The exercise library is fully browsable and searchable without any live external API call on the request path.
- Every exercise record includes cues, common mistakes, and contraindication tags — not just a name and GIF.
- A Professional can create a custom exercise visible only to their own clients.
- An Admin can promote a Professional's custom exercise to the global library.
