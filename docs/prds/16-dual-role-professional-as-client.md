# PRD 16 — Dual Role: Professional as Client (DEFERRED)

**Status:** Deferred — planned, not scheduled. Documented during the 2026-09 nutrition
flow redesign (see `docs/redesign-plan.md` and the nutrition builder work) so the
product decision and its blast radius are written down before anyone reaches for it.

## 1. Overview

Every professional user (Personal Trainer, Nutritionist) should also be able to use
the Client-side features for themselves: their own food diary, hydration, training
execution, body assessments, and — via another professional — their own diet plan.
Today this is structurally impossible: `Role` is a single value per user
(`ADMIN | PROFESSIONAL | CLIENT`), every `mine/*` nutrition endpoint is
`@Roles(Role.CLIENT)`, and professional signup creates no `ClientProfile`.

## 2. Why it was deferred

The nutrition redesign (TACO integration, meal-plan builder, acompanhamento panel)
was already a large, independently shippable scope. Dual-role touches auth, every
`mine/*` route, signup, and the navigation shell — mixing it in would have made the
nutrition work unreviewable. The redesign deliberately left no UI that *pretends*
professionals are clients.

## 3. Required changes (when picked up)

### Backend

1. **ClientProfile on demand.** Professional signup creates no `ClientProfile`
   (`dateOfBirth`/`biologicalSex` are required-not-null once the row exists). Either:
   - create a partial profile at signup, or
   - lazily create it the first time a professional hits a client-side feature
     (with an onboarding step asking DOB/biologicalSex — required by the
     Mifflin-St Jeor draft formula, PRD 08 §5.1).
2. **`mine/*` role gates.** `@Roles(Role.CLIENT)` on
   `/nutrition/mine/*` (plan, diary, hydration, weekly-summary,
   adherence-history), `/today`, `/habits`, and the body-assessment self-report
   routes becomes `@Roles(Role.CLIENT, Role.PROFESSIONAL, Role.ADMIN)`.
   `LogFoodDiaryEntryUseCase` already keys `clientId` off the JWT, so the write
   paths are identity-safe; the guards are the only gate.
3. **Draft generation inputs.** `generate-draft` reads the *client's*
   `ClientProfile.dateOfBirth`/`biologicalSex` — works unchanged once (1) exists.
4. **Training execution.** PRD 07's session-completion routes are
   client-scoped by plan ownership; a professional with no plan is naturally
   empty — verify no `Role.CLIENT`-only guard blocks the routes.

### Frontend

5. **Navigation.** `nav-items.ts` `ITEMS_BY_ROLE` gives PROFESSIONAL no client
   items. Add the client items (Nutrição, Hoje, Hábitos) for professionals —
   or gate them behind a "Modo cliente" toggle to keep the professional nav
   uncluttered (product decision to make then).
6. **Role-redirect audit.** Every page doing
   `if (session.user.role !== "CLIENT") redirect("/dashboard")` (e.g.
   `app/(app)/nutrition/page.tsx`) needs its gate widened.

### Out of scope even then

- A professional **prescribing to themselves** (self-authored nutrition/training
  plan) — the PRD 08 §1 guardrail ("never auto-prescribe; a licensed
  professional confirms") is about *other* clients; self-prescription needs its
  own product decision.
- Professionals appearing in other professionals' client rosters as clients —
  they'd link like any client does (PRD 02 flow, unchanged).

## 4. Acceptance criteria (for when it's implemented)

- A PROFESSIONAL can log food diary entries and hydration for themselves.
- A PROFESSIONAL can receive a confirmed nutrition plan from another
  NUTRITIONIST-linked professional and see it in "Minha dieta".
- No existing CLIENT flow regresses (the full PRD 08 BDD suite stays green).
- The professional nav remains usable — client items don't bury the
  professional ones.
