# PeakForm — Remaining Work & Implementation Plans

**Date:** 2026-09-22  
**Author:** Implementation Audit  
**Status:** All 13 module PRDs complete; tracking redesign + cross-cutting items

---

## 1. Executive Summary

### ✅ Completed
- **All 13 module PRDs (01–13):** Backend + Frontend + BDD all green
- **Redesign Phase R1 (component layer + nav shell):** Complete
- **Professional/Admin dashboard (redesign §5.3):** Implemented & verified
- **Case-insensitive email lookup (auth fix):** Implemented

### ⏳ Remaining (Priority-ordered)

| Priority | Item | Estimate | Blocking |
|----------|------|----------|----------|
| **P0** | Email verification page (`/verify-email`) | ✅ Done | User signup flow |
| **P1** | Client detail hub redesign (redesign §5.4) | ✅ Done | Professional workflow |
| **P1** | Loading states (redesign §5.6) | 2–3 hours | User experience |
| **P2** | Responsive layout pass (redesign §5.5) | 3–4 hours | Desktop UX |
| **P2** | List row polish + icons (redesign §5.7) | 2–3 hours | Visual hierarchy |
| **P3** | Demo seed script (`/seed`) | 2 hours | Demo/presentation |
| **P3** | Search/filter on list screens | 4–6 hours | Data scale |

---

## 2. Critical Blocking Issues

### 🔴 P0: Missing Email Verification Page

**Current state:** Frontend has no `/verify-email` page; MailHog captures emails locally, but users can't verify without the API-only endpoint.

**What needs to happen:**
1. Create `apps/web/app/(auth)/verify-email/page.tsx`
   - Token input form (paste or URL prefill via `?token=`)
   - Show spinner + success/error states
   - On success: redirect to `/login` with message
   - On error: show inline error + retry option

2. Create server action: `apps/web/features/auth/actions.ts` → `verifyEmailAction(token)`
   - Call `POST /auth/verify-email` API
   - Handle errors gracefully (expired/invalid token)
   - Return success state for UI

3. Update email template in `docs/` to mention the `/verify-email` landing page

**Files to touch:**
- `apps/web/app/(auth)/verify-email/page.tsx` (new)
- `apps/web/features/auth/actions.ts` (add new action)
- Existing: auth flow already sends the token via MailHog

**Testing:**
- Manual: create account → find email in MailHog → copy token → paste in `/verify-email` → should redirect to login
- Add to BDD: `apps/web/test/features/01-authentication-account-management/auth-flows.feature`

---

## 3. Redesign Roadmap (§5 of `docs/redesign-plan.md`)

### P1: Client Detail Hub Redesign (§5.4)

**Current state:** `/clients/[linkId]` is a thin screen with 6 text links + check-in panel.

**Target state:** Tabbed overview (Professional's core workflow screen).

**Implementation plan:**

#### Phase 3A: Data fetching refactor
1. Consolidate 2–3 existing endpoint calls into one "client detail snapshot"
   - Current: `GET /clients/[linkId]` (relationship) + separate checks for recent activity
   - Option: reuse existing endpoints, compose client-side
   - Files: `apps/web/app/(app)/clients/[linkId]/page.tsx`

#### Phase 3B: Component scaffold
1. Copy pattern from Client dashboard's `DashboardTabs` (proven, working)
   - `features/dashboard/components/dashboard-tabs.tsx`
   - Apply to Professional's client detail instead

2. Create tabs:
   - **Overview** (new): avatar, status badge, active alerts, stat grid
   - **Treino**: existing linked Training Plans (already exists, just retab)
   - **Nutrição**: existing Nutrition view
   - **Avaliações**: existing Body Assessments
   - **Mensagens**: existing Messages

3. Surface `ContraindicationWarnings` on Overview
   - Component exists: `apps/web/features/training-plans/components/contraindication-warnings.tsx`
   - Just needs to be rendered in the new tab

#### Phase 3C: Styling + verification
1. Test in browser (dev server + real account)
2. Verify Professional can navigate all tabs
3. Ensure existing functionality is preserved (no regression)

**Files to create/modify:**
- `apps/web/app/(app)/clients/[linkId]/page.tsx` (major refactor)
- `apps/web/features/client-detail-hub/` (new folder)
- `features/client-detail-hub/components/overview-tab.tsx` (new)
- `features/client-detail-hub/components/client-avatar.tsx` (new)
- `features/client-detail-hub/components/stat-grid.tsx` (new)

**Estimate:** 4–6 hours (large but mostly composition of existing pieces)

---

### P1: Loading States (§5.6)

**Current state:** Every dashboard fetches 2–3 things in parallel (`Promise.all`), showing blank screen until all resolve.

**Target state:** Skeleton screens matching each route's final layout.

**Implementation plan:**

#### Step 1: Build loading.tsx for high-traffic routes
1. Create `apps/web/app/(app)/dashboard/loading.tsx`
   - Match Client dashboard card layout with `<Skeleton>` blocks
   - Use the existing `Skeleton` component from `packages/ui`

2. Repeat for:
   - `/clients` (roster)
   - `/clients/[linkId]` (detail, once redesigned)
   - `/plans`
   - `/messages`

#### Step 2: Verify visual behavior
1. Start dev server with throttled network
   - Chrome DevTools → Network → "Slow 3G"
2. Navigate to each route
3. Confirm skeleton appears before real content

**Files to create:**
- `apps/web/app/(app)/dashboard/loading.tsx`
- `apps/web/app/(app)/clients/loading.tsx`
- `apps/web/app/(app)/clients/[linkId]/loading.tsx`
- `apps/web/app/(app)/plans/loading.tsx`
- `apps/web/app/(app)/messages/loading.tsx`

**Estimate:** 2–3 hours (mechanical repetition of the pattern)

---

### P2: Responsive Layout Pass (§5.5)

**Current state:** Every screen is `max-w-2xl` (672px), centered, same on mobile and desktop.

**Target state:** Desktop uses available space; two-pane layouts where it makes sense.

**Implementation plan:**

#### Phase 5A: Professional client roster (highest value)
1. `/clients` — two-pane on desktop
   - Left: roster list (320px)
   - Right: detail of selected client (1fr)
   - Mobile: full-width list only

2. Layout: `lg:grid-cols-[320px_1fr]`
3. Files: `apps/web/app/(app)/clients/page.tsx`

#### Phase 5B: Admin review queue
1. `/admin/exercises` — similar two-pane
2. Left: exercise thumbnail + title
3. Right: full details + actions

#### Phase 5C: Remaining screens
1. Apply `sm:grid-cols-2 lg:grid-cols-3` to card grids where density matters
2. Keep `max-w-2xl` as the *content* column width, not the viewport

**Files to touch:**
- `apps/web/app/(app)/clients/page.tsx` (refactor)
- `apps/web/app/(app)/admin/exercises/page.tsx` (refactor)
- `apps/web/components/` (any shared layout components)

**Estimate:** 3–4 hours (CSS-heavy, requires browser testing)

---

### P2: List Row Polish & Icons (§5.7)

**Current state:** Roster/admin-queue are bare `LinkCard` rows with just a name + chevron.

**Target state:** Rich rows with avatar, status badge, secondary signal (last activity, unread count).

**Implementation plan:**

#### Phase 7A: Professional client roster rows
1. Add per row:
   - Client avatar/initials
   - Status badge (`ACTIVE`/`PENDING`)
   - Secondary: last message date or "Nenhuma mensagem"
   - Visual hierarchy via `text-sm` secondary text

2. Use `Badge` + `Avatar` from `packages/ui` (already exist)

3. Files:
   - `apps/web/features/relationships/components/client-roster-row.tsx` (new)
   - Integrate into `/clients` page component

#### Phase 7B: Admin exercise review queue
1. Add per row:
   - Exercise media thumbnail (50×50)
   - Author name + date
   - Approve/delete quick actions
   - Visual status (custom/global)

2. Files:
   - `apps/web/features/admin/components/exercise-review-row.tsx` (new)

#### Phase 7C: Icons throughout nav + screens
- Already deployed in redesign R1 (nav shell uses `lucide-react`)
- No new work, just verify consistent use elsewhere

**Estimate:** 2–3 hours

---

## 4. Cross-cutting: Demo Seed Script (§5.6 of PRD 14)

**Current state:** Stub script (`apps/api/package.json` → `npm run seed` prints a message, no-ops).

**What it needs:**
1. Create 1 Admin + 2 Professionals (1 PT, 1 Nutritionist) + 3 Clients
2. Link: PT ↔ Client 1 & 2, Nutritionist ↔ Client 2 & 3
3. Create sample Training Plan for Client 1
4. Create sample Nutrition Plan for Client 2

**Files:**
- `apps/api/src/seed.ts` (new)
- Entry point: `apps/api/package.json` `"seed"` script

**How to run:**
```bash
cd apps/api
npm run seed
# Creates demo data in the dev database
```

**Testing:** Verify via login dashboard with each role shows expected data.

**Estimate:** 2 hours

---

## 5. Future (Data Scale — P3)

### Search & Filter on List Screens (§3.8)

**When:** Once a Professional realistically has 30+ clients or the exercise library exceeds 100 entries.

**What:** Pagination + sort + search input on:
- `/clients` (filter by name, status, activity)
- `/exercises` (filter by muscle group, equipment, difficulty)
- `/admin/exercises` (filter by approval status, author)

**Not blocking now** — seed data is small, UX is acceptable at current scale.

---

## 6. Implementation Sequence (Start Here)

**Week 1:**
1. **Day 1–2:** Email verification page (P0, blocking signup)
2. **Day 3–4:** Client detail hub redesign (P1, high-value, large)
3. **Day 5:** Loading states (P1, mechanical, low-risk)

**Week 2:**
1. **Day 1–2:** Responsive layout pass (P2, visible impact)
2. **Day 3:** List row polish (P2, visual refinement)
3. **Day 4–5:** Demo seed script (P3, polish, demo-ready)

---

## 7. Testing Checklist (Per-Phase)

Every completed phase must verify:
- [ ] `tsc --noEmit` clean on affected apps
- [ ] `next lint` clean on `apps/web`
- [ ] Browser manual smoke test (sign in, navigate to the new/changed screen, confirm no 404/500)
- [ ] Responsive: test on mobile (DevTools) and desktop viewports
- [ ] Dark mode: toggle in nav shell, verify colors
- [ ] BDD: if adding a new user-facing flow, add a scenario to `apps/web/test/features/`

---

## 8. Known Gotchas

### Redesign Phases Don't Need New PRDs
- All data is already available via existing endpoints
- No API changes required
- Frontend composition + IA only

### Cascade of Incremental Phases
- Each redesign phase builds on the previous (nav shell → dashboards → detail hub → layout)
- Don't jump ahead; verify in-browser (dev server + dev DB) after each phase

### Email Verification Is Blocking
- New accounts can't sign in until they verify
- Once `/verify-email` exists, the full auth loop works
- Add a note in the frontend to guide users to MailHog (dev-only message on `/login`)

---

## 9. Commands to Remember

```bash
# Development
make up                    # Start full stack
make down                  # Stop containers
make test-backend         # Run API tests
make test-frontend        # Run web tests

# MailHog for email verification
# URL: http://localhost:8025
# Copy verification token from "sent" emails
# Paste into: http://localhost:3000/verify-email?token=<...>
```

---

## 10. Reference Links

- **Redesign plan:** `docs/redesign-plan.md`
- **Implementation checklist:** `docs/IMPLEMENTATION_CHECKLIST.md`
- **PRD index:** `docs/prds/00-shared-reference-and-decisions.md`
- **Design system:** `docs/design-system.md`
- **PRD 15 (Testing):** `docs/prds/15-testing-strategy-bdd.md`

---

## Status Log

| Date | Item | Status | Notes |
|------|------|--------|-------|
| 2026-09-22 | Email verification page | ✅ Done | Fully implemented + BDD tested |
| 2026-09-22 | Case-insensitive email | ✅ Done | Fixed login issue, committed |
| 2026-09-23 | Client detail hub redesign | ✅ Done | Tabbed interface, committed |
| 2026-09-23 | Loading states | 🟡 P1, in progress | Creating skeleton screens for high-traffic routes |
| — | Responsive layout | 🟡 P2, planned | Focuses on `/clients` first |
| — | List row polish | 🟡 P2, planned | Icons already deployed in R1 |
| — | Demo seed script | 🟡 P3, planned | Demo/presentation polish |
