# PRD 07 — Client Training Execution

**Module:** Client Training Execution
**Source:** Base document §5.7 (see also §3.3, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`06-training-plan-builder.md`](./06-training-plan-builder.md), [`05-exercise-library.md`](./05-exercise-library.md) (exercise media/cues shown while logging)
**See also:** [`11-messaging.md`](./11-messaging.md) (shares the same form-check-video fast-follow item, §8)
**Referenced by (downstream consumers):** [`09-today-this-week-dashboard.md`](./09-today-this-week-dashboard.md) (adherence, volume trend), [`12-notifications.md`](./12-notifications.md) (session reminder, missed-session triggers)

---

## 1. Overview

This is where the Client actually works out: viewing today's assigned session, logging real performance per set, and tracking adherence over time. It is the highest-frequency screen in the app for Clients with an active training plan — most usage happens in the gym, on a phone.

## 2. Goals

- Show today's session (if any) with exercises, media, cues, and target sets/reps/RPE from the plan.
- Let the Client log actual performance per set quickly, with minimal friction.
- Surface the previous session's values for the same exercise as a quick reference point.
- Track missed sessions explicitly for adherence reporting rather than letting them silently disappear.

## 3. Non-Goals

- No form-check video upload/annotation in v1 — see §5.5 for the required disabled placeholder, per [decision 3.5](./00-shared-reference-and-decisions.md#35-form-check-video-upload--fast-follow-with-a-disabled-placeholder-in-v1-ui-resolves-base-doc-115).
- No free editing of the day's prescribed exercises by the Client (that would reintroduce the base doc §3.1 problem this whole system is designed to avoid) — the Client executes what was assigned; substitutions are a Professional action in PRD 06.

## 4. Personas & Permissions

Per base doc §4, row "Log training session execution": Professional 👁 (view only), Client ✅ (own only).

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| View today's session | — | 👁 (own clients) | ✅ (own) |
| Log a set's actual performance | — | ❌ | ✅ (own) |
| Mark a session complete | — | ❌ | ✅ (own) |
| View adherence/missed-session history | ✅ (all) | ✅ (own clients) | ✅ (own) |

## 5. Functional Requirements

### 5.1 "Today" view
- Shows the current day's `Session` (from PRD 06) if one is scheduled: ordered list of exercises with target sets/reps/load/RPE-or-RIR, each showing the exercise's GIF, cues, and common mistakes (from PRD 05).
- If no session is scheduled today (rest day / plan gap), shows a clear rest-day state rather than an empty/broken-looking screen.

### 5.2 Set logging
- Per set, per exercise: input actual reps, actual load, actual RPE or RIR (matching whichever the Professional prescribed), optional note.
- Previous-session reference shown inline per exercise (e.g., "Last time: 60kg × 8 @ RPE8") pulled from the most recent prior `ExerciseLog` for that same `exerciseId` + Client, to support progressive overload decisions in the moment.
- A rest timer starts automatically after a set is logged, using the prescribed rest interval as the default countdown (adjustable per set).

### 5.3 Session completion
- A session auto-marks `COMPLETED` when every prescribed exercise has at least one logged set per prescribed set count, or the Client can manually mark it complete (e.g., they did fewer sets than prescribed but are done for the day) — manual completion still records what was actually logged, it doesn't fabricate data.

### 5.4 Missed-session handling
- If a `Session` still in `SCHEDULED` status has a date that has passed with zero logged sets, it is auto-flagged `MISSED` (not silently left `SCHEDULED` forever) and counted against adherence metrics (feeding the "This Week" dashboard, PRD 09, and the weekly summary shared with the Professional). A session the Professional already set to `CANCELLED` (PRD 06 §5.4) is never auto-flagged `MISSED` — a deliberate cancellation is not a no-show.
- The Client can still log a missed session late (e.g., logging on Tuesday for Monday's session) — the system records the actual log timestamp separately from the session's target date, and adherence reporting reflects that it was late.

### 5.5 Form-check video — disabled placeholder (fast-follow)
- Per [decision 3.5](./00-shared-reference-and-decisions.md#35-form-check-video-upload--fast-follow-with-a-disabled-placeholder-in-v1-ui-resolves-base-doc-115), the exercise-logging view for each `SessionExercise` includes a visibly **disabled** "Record form-check video" affordance (button or icon), labeled with a "Coming soon" tooltip/badge.
- This element performs no action when tapped in v1 beyond surfacing the "coming soon" messaging — no upload, no storage, no Professional-facing review queue is built yet. It exists purely so the feature is discoverable and so its future addition doesn't require redesigning the logging screen's layout.

## 6. Data Model Additions

Uses base doc §6 `ExerciseLog` directly, plus the `Session` entity already defined in PRD 06 §6:

- **ExerciseLog**: `sessionExerciseId`, `setNumber`, `actualReps`, `actualLoad`, `actualRpeOrRir`, `note` (nullable), `loggedAt`.
- **Session.status** full lifecycle (entity owned by PRD 06 §6): starts `SCHEDULED`, then transitions to exactly one of — `COMPLETED` (set by this module, §5.3), `MISSED` (set by this module, §5.4, automatically), or `CANCELLED` (set by the Professional ahead of time, PRD 06 §5.4 — this module never sets `CANCELLED` and never auto-flags a `CANCELLED` session as `MISSED`). Moving a session (PRD 06 §5.4) does not change its `status` — it stays `SCHEDULED` at its new `date`.

## 7. UX Notes

- This is the single most latency-sensitive, highest-frequency screen in the app (gym use, spotty wifi) — must work well against cached exercise media (PRD 05/base doc §7.5) and degrade gracefully if the network is briefly unavailable mid-set-logging (base doc §10 resilience NFR).
- Rest timer and quick-entry number inputs should be large-touch-target, usable one-handed, since the Client is often holding a phone between sets in a gym.

## 8. Out of Scope / Future (Fast-Follow)

- Form-check video upload, storage, and Professional async feedback (base doc §3.3, §11.5) — the disabled placeholder in §5.5 is the only v1 surface area for this.
- Offline-first logging with background sync (currently assumes a working connection; graceful degradation only, not full offline queueing).

## 9. Open Questions

- None blocking. Revisit form-check video scope once storage/moderation requirements are scoped as part of that fast-follow.

## 10. Acceptance Criteria

- The Client's "Today" view correctly shows the session scheduled for the current date, or a clear rest-day state if none.
- Logging a set records actual reps/load/RPE-or-RIR and immediately updates the "last time" reference for that exercise on the next occurrence.
- A `SCHEDULED` session with a past date and zero logged sets is automatically flagged `MISSED` without manual intervention; a `CANCELLED` session is never flagged `MISSED`.
- The form-check video button is visibly present but disabled/non-functional, clearly labeled as a future feature.
- Professionals can view (read-only) their linked Clients' logged execution history but cannot log or edit it themselves.
