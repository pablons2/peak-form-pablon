# PRD 09 — "Today / This Week" Dashboard

**Module:** Today / This Week Dashboard
**Source:** Base document §5.9 (see also §3.7, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`02-professional-client-relationship.md`](./02-professional-client-relationship.md), [`04-body-assessment.md`](./04-body-assessment.md), [`07-client-training-execution.md`](./07-client-training-execution.md), [`08-nutrition-module.md`](./08-nutrition-module.md), [`10-productivity-habits.md`](./10-productivity-habits.md), [`11-messaging.md`](./11-messaging.md)
**Referenced by (downstream consumers):** [`12-notifications.md`](./12-notifications.md) ("weekly summary ready" trigger; mirrors this module's nudge cards)

---

## 1. Overview

This is the Client's default landing screen after login — the aggregation hub pulling together training, nutrition, habits, and messaging into one "what does today/this week look like" view. Per base doc §3.7, this pattern (a Today view + a This Week view + nudges + a weekly auto-summary) is what drives retention in real coaching apps, and is explicitly called out as a strength of the original concept to keep and formalize.

## 2. Goals

- Give the Client a single "Today" view: today's training session status, meals logged vs. target, habits/tasks due, unread messages, upcoming weigh-in/check-in.
- Give a "This Week" view: a 7-day strip of session/adherence status and a weekly summary card (adherence %, volume trend, weight trend).
- Serve as the landing screen after login for the Client persona.

## 3. Non-Goals

- This module is a read-mostly aggregator — it does not own or duplicate any data. Every fact shown here is sourced live from its owning module (PRD 02 for check-in schedules, PRD 04 for weight trend, PRD 07 for training, PRD 08 for nutrition, PRD 10 for habits, PRD 11 for messaging).
- No Professional-facing version of this dashboard in this PRD — Professionals get their own client-oversight views defined implicitly across PRDs 06–08's "view own clients" permissions; a dedicated Professional dashboard, if needed, is a separate future PRD.

## 4. Personas & Permissions

This module is Client-facing only. It reads across modules using the same per-module permission rules already defined (Client can only ever see their own data, per base doc §4).

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| View own Today/This Week dashboard | — | — | ✅ |

## 5. Functional Requirements

### 5.1 "Today" view
Aggregates, read-only:
- Today's training session (from PRD 07): exercises, status (not started / in progress / completed / rest day).
- Meals logged vs. active nutrition target (from PRD 08), if an active `NutritionPlan` exists; otherwise, a simple "log your meals" prompt with no target comparison.
- Habits/tasks due today (from PRD 10).
- Unread message count/preview (from PRD 11).
- Upcoming Professional check-in reminder, if scheduled — sourced directly from PRD 02 §5.6's `CheckInSchedule.nextDueAt` per active link, the same field that drives the `CHECK_IN_DUE` notification (PRD 12), so the dashboard and the notification never disagree.

### 5.2 "This Week" view
- A 7-day strip showing, per day: training session status icon (scheduled/completed/missed/cancelled/rest — the full `Session.status` lifecycle per PRD 06 §6/PRD 07 §6), and a lightweight nutrition-logged indicator.
- A weekly summary card: adherence % (sessions completed / sessions scheduled), volume trend (from PRD 07's logged sets, e.g., total tonnage vs. prior week), weight trend (from PRD 04's body-assessment entries).
- This same weekly summary is also shared with the linked Professional(s), per base doc §3.7 ("auto-summary shown to both Client and Professional") — the summary computation is shared logic, only the delivery surface differs (this dashboard for the Client; the Professional's own client-detail view, defined in the owning modules, for the Professional).

### 5.3 Nudges surfaced here
- This dashboard is the primary landing surface for the non-blocking nudges also delivered via Notifications (PRD 12): missed session, missed food log, check-in due, new message, plan updated. The dashboard shows these as inline cards/banners in addition to (not instead of) any push/email notification.

## 6. Data Model Additions

None — this module introduces no new persisted entities. It is a read-side composition of data owned by PRDs 02, 04, 07, 08, 10, and 11. The weekly summary calculation (adherence %, volume trend, weight trend) may be cached (e.g., computed nightly and stored as a lightweight `WeeklySummary` read-model row keyed by clientId + week) purely as a performance optimization — the source of truth remains the owning modules' data.

## 7. UX Notes

- This is the highest-traffic screen for the Client persona — must load fast even as more modules are added over time; prefer a single aggregating API call (composed server-side) over the frontend firing five separate module requests on every load.
- Mobile-first (base doc §10) — this is the screen a Client opens most often, often for a quick glance rather than deep interaction.

## 8. Out of Scope / Future (Fast-Follow)

- A dedicated Professional-facing multi-client dashboard (distinct from the per-client views already implied by PRDs 06–08).
- Customizable/reorderable dashboard widgets.

## 9. Open Questions

- None blocking. The weekly-summary caching strategy (live-computed vs. precomputed) is an implementation detail to resolve during build, not a product decision.

## 10. Acceptance Criteria

- The Today view correctly reflects live state from PRDs 07/08/10/11 with no stale/duplicated data model.
- The This Week strip accurately reflects each day's session status (scheduled/completed/missed/cancelled/rest).
- The weekly summary numbers shown to the Client match those shown to their linked Professional for the same week.
- Dashboard remains usable (with clear empty/loading states) for a Client who has no assigned Professional, no active nutrition plan, or no habits configured.
