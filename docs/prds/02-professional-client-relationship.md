# PRD 02 — Professional ↔ Client Relationship

**Module:** Professional ↔ Client Relationship
**Source:** Base document §5.2 (see also §4, §6)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`01-authentication-account-management.md`](./01-authentication-account-management.md)
**Referenced by (downstream consumers):** [`09-today-this-week-dashboard.md`](./09-today-this-week-dashboard.md) (check-in due date), [`12-notifications.md`](./12-notifications.md) (`CHECK_IN_DUE` event)

---

## 1. Overview

Every prescriptive feature in PeakForm (training plans, nutrition targets, body-assessment validation) is gated by an active link between a Professional and a Client. This module owns the lifecycle of that link: invite, accept/decline, and unlink, plus the constraint that a Client has at most one Personal Trainer and one Nutritionist linked at a time.

## 2. Goals

- Let a Professional invite a Client (or a Client request/accept a Professional) to establish a working relationship.
- Enforce the "one PT + one Nutritionist per Client at a time" constraint server-side.
- Provide a clean unlink flow with clear data-retention behavior (a Client's historical plans/logs are not deleted when unlinked from a Professional).
- Let a Professional schedule recurring or one-off check-in reminders for a linked Client, closing the gap flagged as an open question in [`12-notifications.md`](./12-notifications.md) (the "check-in due" trigger needs a scheduling source — this module is that source, since check-ins are a property of the relationship, not of any single plan).

## 3. Non-Goals

- No multi-professional-per-specialization support in v1 (e.g., a Client cannot have two Personal Trainers simultaneously) — base doc explicitly flags this as "configurable if needed later."
- No marketplace/discovery feature for Clients to browse and pick a Professional — invites are the only linking mechanism in v1.

## 4. Personas & Permissions

Per base doc §4 RBAC matrix, row "Link/unlink Professional ↔ Client": Admin ✅, Professional ✅ (accept/invite), Client ✅ (accept invite).

| Action | Admin | Professional | Client |
|---|:---:|:---:|:---:|
| Invite a Client (by email) | ✅ (on behalf of any Professional) | ✅ (own account only) | — |
| Accept/decline an invite | — | — | ✅ (own account only) |
| Request a Professional (Client-initiated) | — | ✅ (accept/decline) | ✅ |
| Unlink | ✅ (any link) | ✅ (own clients only) | ✅ (own professionals only) |
| View own linked clients/professionals | ✅ (all) | ✅ (own only) | ✅ (own only) |
| Create/edit/cancel a check-in schedule | ❌ | ✅ (own clients only) | ❌ |
| View own upcoming check-ins | — | ✅ (own clients) | ✅ (own, read-only) |

## 5. Functional Requirements

### 5.1 Invite flow (Professional-initiated)
- An `APPROVED` Professional enters a Client's email and selects which specialization the invite is for (`PERSONAL_TRAINER` and/or `NUTRITIONIST` — a Professional with both specializations can send one invite covering both roles, or two separate invites).
- If the email matches an existing Client account, an in-app + email notification is sent. If it doesn't match any account, an email invite link is sent that leads to Client signup, then auto-creates the pending link.
- The invite is itself a `ProfessionalClientLink` row starting in `PENDING` status; it transitions directly to `ACTIVE` on acceptance (§5.2) — there is no separate intermediate "ACCEPTED" status distinct from `ACTIVE`. A `PENDING` invite auto-expires to `EXPIRED` after 30 days if neither accepted nor declined.

### 5.2 Accept/decline flow (Client-initiated)
- Client can also search/enter a Professional's public invite code or email to request a link; this creates a `PENDING` request the Professional must accept/decline.
- On acceptance from either direction, a `ProfessionalClientLink` becomes `ACTIVE`.

### 5.3 One-PT-one-Nutritionist constraint
- Before activating a new link, the backend checks: does this Client already have an `ACTIVE` link to a Professional with the `PERSONAL_TRAINER` specialization? If the new link is also for `PERSONAL_TRAINER`, block it with a clear error ("You already have an active trainer — unlink first"). Same check independently for `NUTRITIONIST`.
- This check happens in the Application layer (base doc §7.2), not just the frontend.

### 5.4 Unlink
- Either party can unlink an `ACTIVE` relationship. Unlinking:
  - Sets the link status to `UNLINKED` with a timestamp and initiating party.
  - Does **not** delete the Client's historical TrainingPlan/NutritionPlan/logs created under that Professional — they remain visible to the Client as read-only history.
  - Any currently-active plan authored by that Professional is marked read-only for the Client going forward (no new sessions/targets are generated) until a new Professional takes over.
  - Notifies the other party.

### 5.5 Admin oversight
- Admin can view and force-unlink any relationship (e.g., dispute resolution, Professional deactivation cleanup from PRD 01 §5.5).

### 5.6 Check-in scheduling
This closes the gap identified while writing PRD 12 (Notifications): the "check-in due" trigger needs a source of truth for *when* a check-in is due. That source is a lightweight scheduler owned by this module, scoped to a specific `ProfessionalClientLink` (a PT and a Nutritionist schedule their own check-ins independently, since their cadences typically differ).

- **Creating a schedule:** an `APPROVED` Professional creates a `CheckInSchedule` against one of their `ACTIVE` links. Two types:
  - `ONE_OFF` — a single reminder for a specific date (e.g., "progress review next Friday").
  - `RECURRING` — a cadence (`WEEKLY`/`BIWEEKLY`/`MONTHLY`) plus an anchor (weekday for weekly/biweekly, day-of-month for monthly). `nextDueAt` is computed at creation time from the anchor.
  - Both types carry an optional free-text note shown to the Client (e.g., "Bring your weigh-in and side photos").
- **Firing:** a scheduled backend job (Infrastructure layer, base doc §7.2) queries for `CheckInSchedule` rows where `status = ACTIVE` and `nextDueAt <= now`. For each match, it emits a `CHECK_IN_DUE` event consumed by the Notification dispatcher (PRD 12 §5.4) — this module never talks to the email/push channels directly, it only produces the domain event, keeping delivery concerns in PRD 12 where they already live.
- **Advancing:** after firing, a `RECURRING` schedule's `nextDueAt` is advanced by its cadence (date-math lives in the Domain layer, base doc §7.2, as a pure function — e.g., `computeNextDueDate(cadence, anchor, lastFiredAt)` — so it's unit-testable without touching the database). A `ONE_OFF` schedule's `status` moves to `FIRED` after it fires once; the Professional creates a new one-off if they want another reminder.
- **Editing/cancelling:** a Professional can edit an `ACTIVE` schedule's cadence/anchor/note (for `RECURRING`) or its `dueDate`/note (for `ONE_OFF`), or cancel it (`status: CANCELLED`) at any time — cancelling does not delete history of past firings, it only stops future ones.
- **Unlink interaction:** unlinking a relationship (§5.4) automatically cancels any `ACTIVE` `CheckInSchedule` tied to that link — a schedule cannot outlive the relationship it belongs to.
- **Consumers:** the "upcoming weigh-in/check-in" line on the Client's Today/This Week dashboard (PRD 09 §5.1/§5.2) reads the next `nextDueAt` per active link directly from this entity, so the dashboard and the notification always agree on the same due date — one source of truth, two surfaces.

## 6. Data Model Additions

Uses base doc §6 `ProfessionalClientLink` entity directly:

- **ProfessionalClientLink**: `professionalId`, `clientId`, `specialization` (`PERSONAL_TRAINER`/`NUTRITIONIST`), `status` (`PENDING`/`ACTIVE`/`DECLINED`/`EXPIRED`/`UNLINKED`), `invitedBy` (professional|client), `linkedAt`, `unlinkedAt` (nullable).
- Unique constraint: at most one `ACTIVE` row per (`clientId`, `specialization`).
- **CheckInSchedule** (new entity, owned by this module): `professionalClientLinkId` (FK), `type` (`ONE_OFF`/`RECURRING`), `cadence` (`WEEKLY`/`BIWEEKLY`/`MONTHLY`, nullable — required only for `RECURRING`), `anchor` (weekday int or day-of-month int, nullable — required only for `RECURRING`), `dueDate` (nullable — required only for `ONE_OFF`), `nextDueAt` (computed, indexed — this is what the firing job queries), `note` (nullable), `status` (`ACTIVE`/`FIRED`/`CANCELLED`), `createdBy` (Professional User FK), `createdAt`.

## 7. UX Notes

- Client-facing "My Team" screen shows current Trainer and Nutritionist (if any) with a clear "Change" action that walks through the unlink-then-request flow rather than a silent overwrite.
- Professional-facing client list clearly distinguishes `PENDING` invites from `ACTIVE` clients.
- Professional's client-detail view shows a simple "Check-ins" panel listing active schedules (one-off and recurring) with quick edit/cancel actions — this should feel like setting a reminder, not filling out a form.

## 8. Out of Scope / Future (Fast-Follow)

- Multiple simultaneous Professionals per specialization (e.g., a Client working with two trainers).
- Professional discovery/marketplace browsing.
- Client-side acknowledgment/completion tracking for check-ins (e.g., auto-marking a check-in "done" when a new Body Assessment is logged) — v1 only fires the reminder; closing the loop is manual (a message or a new Body Assessment entry), not tracked as a discrete state on the schedule itself.
- Professional-facing digest notification when a Client's check-in comes due (v1 only notifies the Client, per PRD 12 §5.1).

## 9. Open Questions

- None blocking. Revisit the one-PT/one-Nutritionist constraint if a future business need (e.g., team-based coaching) requires relaxing it.

## 10. Acceptance Criteria

- A Professional can invite a Client by email and the Client can accept, creating an `ACTIVE` link.
- Attempting to activate a second `ACTIVE` link of the same specialization for a Client is rejected with a clear error, enforced server-side.
- Unlinking a Professional from a Client preserves the Client's historical plan/log data as read-only.
- Admin can view and force-unlink any relationship.
- A Professional can create a `RECURRING` check-in schedule (e.g., weekly) and the system computes the correct `nextDueAt` from the chosen cadence and anchor.
- When a schedule's `nextDueAt` passes, exactly one `CHECK_IN_DUE` event is emitted for consumption by the Notification module (PRD 12), and a `RECURRING` schedule's `nextDueAt` is correctly advanced to the next occurrence afterward.
- Unlinking a relationship automatically cancels any active check-in schedule tied to it.
- The Client's Today/This Week dashboard (PRD 09) and the fired notification always reflect the same `nextDueAt` value for a given schedule.
