# PRD 10 — Productivity / Habits (Health-Adjacent, Lightweight)

**Module:** Productivity / Habits
**Source:** Base document §5.10 (see also §3.8, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`08-nutrition-module.md`](./08-nutrition-module.md) (hydration-log boundary, §3)
**Referenced by (downstream consumers):** [`09-today-this-week-dashboard.md`](./09-today-this-week-dashboard.md) (Today checklist card)

---

## 1. Overview

Per [decision 3.3](./00-shared-reference-and-decisions.md#33-productivityhabits-module-scope--health-adjacent-only-resolves-base-doc-112), this module is deliberately scoped to **health-adjacent habits and a simple personal task list only** — hydration, sleep, supplements, mobility work, custom habits, and a lightweight non-clinical to-do list. It is explicitly **not** a general project-management tool, and it stays architecturally isolated from the training/nutrition domain models per base doc §3.8.

## 2. Goals

- Let Clients define custom habits (e.g., "stretch 10 min", "take vitamin D") with a daily check-off and streak tracking.
- Provide a simple, optional personal task list feeding the same dashboard (PRD 09).
- Keep this module's data model fully independent of training/nutrition — no shared entities, no cross-module foreign keys into clinical data.

## 3. Non-Goals

- Not a full project-management tool: no projects, subtasks, assignees, dependencies, or Kanban boards.
- Not used for any clinical or training-adjacent tracking that belongs in PRD 07 (training execution) or PRD 08 (nutrition/hydration target). Note: base doc §5.8 already defines a hydration **log** under Nutrition (a simple counter tied to a Client's day) — this module's habits can include a supplementary custom "drink water" habit check-off, but the authoritative hydration counter lives in PRD 08, not here, to avoid duplicated tracking surfaces.

## 4. Personas & Permissions

This module is Client-facing only — it holds no clinical or prescriptive data, so there's no Professional-authoring role here.

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Create/edit own habits | — | — | ✅ (own) |
| Check off a habit for a day | — | — | ✅ (own) |
| Create/edit own personal tasks | — | — | ✅ (own) |
| View a Client's habits/tasks | ❌ | ❌ | ✅ (own only) |

Professionals and Admin have **no visibility** into this module's data — it is intentionally kept out of the coaching relationship's data surface, since it's non-clinical and personal by design.

## 5. Functional Requirements

### 5.1 Habit definitions
- Client creates a custom `HabitDefinition`: name, cadence (daily, or specific weekdays), optional reminder time.
- No preset/curated habit library is required for v1 — Clients type their own habit names freely (e.g., "hydration", "sleep 8h", "mobility work").

### 5.2 Daily check-in
- Each day, the Client can check off any due habit, creating a `HabitCheckIn` record for that date.
- Streak count is computed from consecutive check-ins per habit (a missed day resets the streak, but historical check-ins are never deleted).

### 5.3 Personal task list
- A simple flat list of tasks: text, due date (optional), done/not-done toggle. No sub-tasks, no priority levels, no sharing.

### 5.4 Dashboard feed
- Today's due habits (unchecked) and today's due tasks feed into the "Today" view of PRD 09 as a simple checklist card.

## 6. Data Model Additions

Uses base doc §6 entities directly, kept isolated from training/nutrition FKs:

- **HabitDefinition**: `clientId`, `name`, `cadence`, `reminderTime` (nullable), `createdAt`, `archivedAt` (nullable).
- **HabitCheckIn**: `habitDefinitionId`, `date`, `checkedAt`.
- **PersonalTask**: `clientId`, `text`, `dueDate` (nullable), `done` (bool), `createdAt`, `completedAt` (nullable).

## 7. UX Notes

- Keep this genuinely lightweight — a single "add habit"/"add task" quick-entry, no elaborate configuration screens. The value here is frictionless daily check-off, not a feature-rich planner.

## 8. Out of Scope / Future (Fast-Follow)

- Preset/curated habit templates (e.g., a "morning mobility routine" starter pack).
- Any form of sharing tasks/habits with a Professional (would require revisiting the "no Professional visibility" rule in §4 as a deliberate product decision, not a default).

## 9. Open Questions

- None blocking — scope was explicitly resolved by [decision 3.3](./00-shared-reference-and-decisions.md#33-productivityhabits-module-scope--health-adjacent-only-resolves-base-doc-112).

## 10. Acceptance Criteria

- A Client can create a custom habit and check it off for the current day, and the streak count updates correctly.
- Missing a day resets the streak without deleting historical check-in records.
- A Client can create, complete, and view a simple personal task list.
- No Professional or Admin account can query or view another user's habit/task data through any endpoint.
- This module's data model has no foreign-key relationship into `TrainingPlan`, `NutritionPlan`, or `BodyAssessment`.
