# PeakForm — Dashboard & UI/UX Redesign Plan

**Author role:** QA / Senior Product Designer audit
**Date:** 2026-09-22
**Scope:** All dashboard-class screens across `apps/web` (Client, Professional, Admin) — visual design, information architecture, navigation, and component reuse. Backend/API is out of scope; no token renames proposed (see §7).

---

## 1. What was audited

Every screen under `apps/web/app` was read (40 `page.tsx` routes), plus `docs/design-system.md`, `apps/web/app/globals.css`, `apps/web/tailwind.config.ts`, and `packages/ui`. The "dashboard-class" screens are:

| Screen | Route | Audience |
|---|---|---|
| Home dashboard (Today/Week tabs) | `/dashboard` | Client |
| Home "landing" (link list) | `/dashboard` | Professional, Admin |
| Today (training focus) | `/today` | Client |
| Client roster | `/clients` | Professional |
| Client detail hub | `/clients/[linkId]` | Professional |
| Habits & tasks | `/habits` | Client |
| Nutrition | `/nutrition`, `/clients/[linkId]/nutrition` | Client, Professional |
| Messages inbox | `/messages` | Client, Professional |
| Training plans | `/plans`, `/plans/[id]` | Professional |
| Exercise library | `/exercises` | All |
| Admin exercise review queue | `/admin/exercises` | Admin |
| Team | `/team` | Professional |

**Method note:** this is a static code/design-token audit (no dev server was run against seeded data for this pass). Findings below are grounded in what the code renders, not a live click-through — treat the roadmap as the priority order to implement, then verify each screen in-browser per this repo's own QA discipline before marking anything "done" in `docs/IMPLEMENTATION_CHECKLIST.md`.

---

## 2. Headline finding

**The design system on paper is good; the design system in practice doesn't exist yet.** `docs/design-system.md` mandates components "live as generated source in `packages/ui` (shadcn/ui on Radix primitives)" — but `packages/ui/src` contains only a `cn()` helper. No `Button`, `Card`, `Badge`, `Tabs`, `Avatar`, `Skeleton`, or `Dialog` component exists anywhere in the repo. Every one of the 40 pages hand-rolls the same `<div className="rounded-lg border border-border bg-card p-4">` / `<Link className="text-sm text-accent hover:underline">` patterns inline. The tokens (color, radius, shadow, motion) are real and well-designed — they're just never assembled into reusable, accessible components, so every screen re-derives its own ad hoc approximation of "card" and "button."

This is the single highest-leverage fix: build the component layer once, and most of the screen-level findings below become cheap to resolve as a side effect of adopting it.

---

## 3. Cross-cutting issues (affect every dashboard)

### 3.1 No persistent navigation shell — P0
There is no header, sidebar, or bottom tab bar anywhere in the app. Every page independently renders its own single hardcoded "Voltar" (back) link to one specific parent route (e.g. `/clients/[linkId]` → `/clients`, `/messages` → `/dashboard`). Consequences:
- Moving between major sections (Dashboard ↔ Clients ↔ Messages ↔ Plans) always round-trips through `/dashboard`, even though a Professional's real workflow bounces between clients, messages, and plans constantly.
- No indication of "where am I" (no active-state nav, no breadcrumbs) beyond the page `<h1>`.
- Unread-message count, pending check-ins, etc. are only visible from inside `/dashboard`'s Today tab (Client) or not at all (Professional/Admin have no equivalent badge anywhere).

### 3.2 Professional/Admin have no dashboard at all — P0
`app/dashboard/page.tsx` branches on role: Clients get the full PRD-09 Today/Week experience (cards, week strip, weekly summary, habit checklist, message previews, check-in reminders). Professional/Admin fall through to `NavigationLanding` — a static card with a name greeting and 3–5 plain text links. A Professional managing multiple clients — arguably the highest-frequency, highest-stakes user — has **zero** at-a-glance visibility into: how many clients need attention today, missed check-ins, unread threads, contraindication flags, or adherence trends. This is inverted from what the role needs.

### 3.3 Fixed narrow layout on every screen — P1
`max-w-2xl` (672px) is used on 26 of ~35 content pages, regardless of viewport. There isn't a single `lg:` breakpoint anywhere in `apps/web` (grep found zero), and only 7 files use any responsive prefix at all (mostly `sm:grid-cols-*` inside form layouts). On desktop, every screen renders as a centered mobile-width column with large empty side margins — this is a mobile design shipped unchanged to desktop, not a responsive design.

### 3.4 No loading states — P1
Zero `loading.tsx` files and no skeleton component exist anywhere in `apps/web/app`. Every dashboard is an async server component doing 2–3 parallel fetches (`Promise.all`) before rendering; until they resolve, Next.js shows nothing (blank background) rather than a skeleton. On slower connections or larger clients rosters this will read as a hang, not a load.

### 3.5 Dead design tokens: dark mode is fully wired but unreachable — P2
`globals.css` defines a complete `.dark` token set and `docs/design-system.system.md` states "a screen is not done until verified in both modes" — but nothing in the app ever adds the `.dark` class (no theme provider, no toggle, no `next-themes`). It's finished infrastructure with no entry point, and it has therefore certainly never been visually verified.

### 3.6 No icons, minimal visual hierarchy — P2
No icon library is installed (`lucide-react` was clearly intended per the shadcn/ui convention referenced in the design system doc, but isn't in `package.json`). Every affordance is a text link, often suffixed with a literal arrow character ("→"). Section headers are uniformly `text-sm font-medium` regardless of importance. Cards, list rows, and section headers are visually near-identical across the whole app, so screens with 5+ stacked sections (e.g. `/clients/[linkId]`, `/habits`) have no scan path — a user has to read every line.

### 3.7 Empty states are a single gray sentence — P2
Every "no data" case (`"Nenhum cliente ativo ainda."`, `"Nenhum convite ou solicitação pendente."`) is a plain `<p className="text-sm text-muted-foreground">`. No icon, no explanation of what will appear there, no CTA (e.g., empty client roster should prompt "invite your first client" inline, not rely on the user noticing the separate invite form above it).

### 3.8 List screens have no search or filter — P2
`/clients` (roster), `/admin/exercises` (review queue), `/exercises` (library) all render a flat, unfiltered, unpaginated list. This is fine at current seed-data scale; it will not be fine once a Professional has 30+ clients or the exercise library grows past a hundred entries. No pagination, sort, or search input exists on any list screen.

---

## 4. Screen-by-screen findings

### 4.1 Client dashboard (`/dashboard`, Client role) — the strongest screen in the app
Real strengths worth preserving in the redesign: a proper `role="tablist"`/`role="tab"` implementation (`dashboard-tabs.tsx`) instead of fake buttons, a single aggregating fetch per PRD-09 §7 (no waterfall), and genuine card composition (training, nutrition, habits, messages, check-in-due). This is the reference pattern the rest of the app should be pulled up to — not rebuilt from scratch.
**Gap:** still `max-w-2xl`-only, still no loading skeleton, still string literal Portuguese labels duplicated ad hoc rather than pulled from `labels.ts` consistently (`labels.ts` exists but isn't used inside `page.tsx` itself, e.g. "Hábitos e tarefas" is hardcoded rather than referencing a shared label).

### 4.2 Professional/Admin "dashboard" (`/dashboard` fallback) — P0, see §3.2
Currently: name greeting + up to 5 text links, conditionally rendered per role. No data. Needs to become a real command-center (see §5.2).

### 4.3 Client detail hub (`/clients/[linkId]`) — P0
This is the Professional's single most important screen (it's where they act on a specific client) and it is currently the thinnest: a `<h1>`, one `<LinkCard>`, six conditionally-rendered plain-text links ("Ver triagem de saúde →", "Ver planos de treino →", "Ver execução dos treinos →", "Ver avaliação corporal →", "Ver nutrição →", "Ver mensagens →"), and a check-ins panel. There is no client photo/avatar, no adherence snapshot, no last-activity timestamp, no surfaced alerts — despite a `--warning` token existing in the design system specifically for "contraindication flags" (design-system.md §1.1), and a `ContraindicationWarnings` component already existing in `features/training-plans/components/` — it is never surfaced here, at the one place a Professional would want to see it first.

### 4.4 Client roster (`/clients`) — P1
Reasonable IA (Pending vs. Active sections) but each row is a bare `LinkCard` with no supporting signal — no unread-message indicator, no "last check-in" or "needs attention" flag, no avatar. A Professional scanning 15 active clients has no way to tell which ones need attention without opening each one.

### 4.5 Admin exercise review queue (`/admin/exercises`) — P2
Functionally complete (promote/delete actions present) but purely a text list; no thumbnail/media preview despite exercises having a `mediaUrl` field (used elsewhere, e.g. `/today`'s `exerciseMedia` lookup) — reviewing "is this exercise correct" without seeing its media is a real friction point for the actual review task.

### 4.6 Habits/Nutrition/Messages/Today (Client) — P2
All structurally sound (clear section cards, correct data fetching, correct role gating) but suffer every cross-cutting issue in §3 identically: no nav shell, fixed width, no loading state, minimal hierarchy.

### 4.7 IA overlap: `/dashboard` "Hoje" tab vs. `/today` — P2 (needs a product decision, not just a visual fix)
`/dashboard`'s Today tab already shows `TodayTrainingCard`. `/today` is a separate full page with a richer training-session view + history. Right now the only link between them is `/today`'s small "Início" link back to `/dashboard`, and the dashboard's `TodayTrainingCard` doesn't appear to deep-link into `/today`. Recommend clarifying in the redesign whether `/today` is "the full training tab" reached by tapping the dashboard's training card (making the IA a clear hierarchy) versus two independent, overlapping "today" concepts (confusing). This plan assumes the former and treats `/today` as the training-focused drill-down.

---

## 5. Redesign proposal

### 5.1 Build the component layer first (`packages/ui`)
Scaffold real shadcn/ui-on-Radix components — `Button`, `Card` (+ `CardHeader`/`CardTitle`/`CardContent`), `Badge`, `Tabs`, `Avatar`, `Skeleton`, `EmptyState`, `Alert` (for the unused `--warning`/`--destructive`/`--success` tokens) — exactly as `docs/design-system.md` §7 already specifies, add `lucide-react` for icons, and add `next-themes` to actually wire the dark-mode toggle that the tokens already support. This is infrastructure, not a screen; do it once, then migrate screens onto it incrementally (don't block on a big-bang rewrite — see roadmap).

### 5.2 App shell: persistent, role-aware navigation
Add a shared layout (desktop: left sidebar; mobile: bottom tab bar, following the existing mobile-first `max-w-2xl` content column) with role-scoped items:
- **Client:** Início, Hoje, Nutrição, Hábitos, Mensagens
- **Professional:** Início, Clientes, Planos, Mensagens, Exercícios
- **Admin:** Início, Revisão de exercícios, Equipe

Each item shows a lightweight unread/attention badge (unread messages, pending reviews) sourced from data the dashboards already fetch. This alone removes most of the "everything routes back through /dashboard" friction in §3.1.

### 5.3 A real Professional/Admin dashboard
Replace `NavigationLanding` with a command-center home, mirroring the Client dashboard's card-composition pattern rather than inventing a new one:
- **Roster snapshot card:** active/pending client counts, clients with an overdue check-in, clients with unread messages — each a one-tap deep link into the filtered `/clients` view.
- **Attention feed:** flagged items needing action today (missed check-ins, contraindication flags from `ContraindicationWarnings`, unread threads), reusing the `--warning`/`--destructive` tokens that already exist but are barely used.
- **Admin variant:** pending exercise-review count + link, in the same card language instead of a bare link list.

### 5.4 Client detail hub → tabbed overview
Rebuild `/clients/[linkId]` using the same `DashboardTabs` pattern already proven on the Client dashboard: an **Overview** tab (avatar, key stats, active alerts, quick links) plus **Treino / Nutrição / Avaliações / Mensagens** tabs replacing the current six stacked one-line links. Surface `ContraindicationWarnings` directly on Overview — it exists in the codebase today and simply isn't rendered here.

### 5.5 Responsive layout pass
Keep `max-w-2xl` as the content-column width (it's a deliberate, reasonable reading width) but let dashboard-class screens use it as one column inside a wider responsive shell — e.g., roster/detail as a two-pane `lg:grid-cols-[320px_1fr]` on the Professional's client screens, card grids (`sm:grid-cols-2 lg:grid-cols-3`) for the roster and admin review queue — instead of every screen being a single centered column at every viewport.

### 5.6 Loading & empty states
Add `loading.tsx` (skeleton matching each route's card layout) for every dashboard-class route, and a shared `EmptyState` component (icon + one-line explanation + primary CTA) to replace the plain gray sentences in §3.7.

### 5.7 Scannable list rows
Roster and admin-queue rows get: avatar/media thumbnail, a status `Badge` (Ativo/Pendente, using existing `--success`/`--warning` tokens), and a secondary line of the actual signal a Professional needs (last activity, unread count) — not just a name and an arrow.

---

## 6. Priority roadmap

**Status correction (2026-09-23):** this table originally listed 5.1 and 5.2 as not-yet-started. A live re-check of the repo found both already built and wired in — `packages/ui` has real `Button`/`Card`/`Badge`/`Tabs`/`Avatar`/`Alert`/`EmptyState`/`Skeleton` components (`lucide-react` + `next-themes` installed, dark-mode toggle working), and `features/navigation/nav-shell.tsx` is mounted in `app/(app)/layout.tsx` for every role (desktop sidebar + mobile bottom nav, unread/pending badges). Neither this doc's own "current status" framing nor the prior audit session's memory record had been updated when that work landed, so the doc was stale, not the app. 5.3 was implemented and browser-verified (via curl against a live NextAuth session + seeded demo accounts) in the same session that made this correction.

| Priority | Item | Status |
|---|---|---|
| **P0** | 5.1 Component layer (`packages/ui`) | ✅ Done |
| **P0** | 5.2 Nav shell | ✅ Done |
| **P0** | 5.3 Professional/Admin dashboard | ✅ Done (2026-09-23) — `features/dashboard/components/{professional,admin}-dashboard.tsx`, wired into `app/(app)/dashboard/page.tsx`. Professional: attention feed (incoming link requests, clients with no check-in scheduled, unread threads) + roster stat grid, all from existing endpoints (`listMyLinks`, `listCheckInSchedules`, `listMyThreads`) — see the code comment on why "overdue check-in" (this item's original framing) doesn't hold up against PRD 02 §5.6's due-job and was reframed as "no check-in currently scheduled." Admin: pending-approvals/pending-exercise-review attention cards + `getAnalytics` platform snapshot + quick links to the admin pages not in the nav (`/admin/users`, `/admin/links`, `/admin/audit-log`, `/admin/analytics`). |
| **P1** | 5.4 Client detail hub redesign | Not started — next up. Professional's core workflow screen. |
| **P1** | 5.6 Loading states | Not started. Cheap now that 5.1's `<Skeleton>` exists — just needs a first consumer (route-level `loading.tsx`). |
| **P1** | 5.5 Responsive layout | Partially organic — the nav shell reserves `lg:pl-64` for its sidebar, but page content still sits in a single `max-w-2xl` column inside that space (no two-pane/grid layouts yet). Apply opportunistically as each screen is touched. |
| **P2** | 5.7 List row polish, icons | Icons landed with 5.1/5.2 (`lucide-react`, used throughout nav + the new dashboards). List-row polish (roster/admin-queue thumbnails, richer signal) not started. |
| **P2** | §4.7 `/dashboard` vs `/today` IA decision | Needs a product call before touching either screen |
| **P3** | Search/filter/pagination on list screens (§3.8) | Not urgent at current data scale; revisit when a roster/library realistically exceeds one screen |

Suggested sequencing respects this project's existing incremental discipline (per `docs/IMPLEMENTATION_CHECKLIST.md`): migrate one screen at a time (Client detail hub next → loading states → remaining screens), verifying each in-browser (or via a live authenticated request, where no browser tool is available) before checking it off, rather than one large rewrite PR.

---

## 7. Explicit non-goals

- **No token changes.** `docs/design-system.md` §1–5 tokens are sound; this plan is about *using* them consistently and *building* the missing component layer, not redefining colors/radius/motion.
- **No backend/API changes.** All findings are frontend composition and IA; no endpoint listed here needs a new field (the client-detail alerts, for example, can be composed client-side from data already fetched by existing endpoints — e.g. `ContraindicationWarnings` and `CheckInsPanel` already have the data, they're just not rendered together).
- **No new BDD scenarios required for the visual/IA changes themselves** — but any redesigned screen must keep passing its existing PRD's Gherkin acceptance criteria (per this repo's "done means 1:1 scenario coverage" rule), and role-gating logic (redirect rules in each `page.tsx`) must be preserved exactly as-is during migration.

---

## 8. Visual identity direction (logo-informed)

**Prompt:** design a redesign of all UI/UX using `apps/web/public/imgs/logo.png` as the anchor. This section is the visual companion to §5–§7 above — it does not reopen the IA/roadmap findings, it gives the roadmap's screens (5.2 nav shell, 5.3 Professional dashboard, 5.4 client detail hub) a concrete look, grounded in the mark rather than a generic "modern/clean" direction. Mockups: **[PeakForm Redesign Direction](https://claude.ai/artifact/JBhyx1mCQnuCCQygYXwiyj)** (brand/style guide board + mobile mockups of the Client dashboard, Professional dashboard, and Client detail hub, plus a desktop sidebar+two-pane shell).

**Rationale.** The mark is a bold, high-contrast flexed-arm silhouette with a confident orange wordmark on black — it reads as *strength, momentum, clarity*, not soft/pastel wellness-app default. The tokens already in `globals.css`/`design-system.md` already encode this correctly (`--primary: 11 100% 61%` ≈ `#ff5d38`, a saturated orange-red pulled straight from the wordmark; `--accent: 185 81% 29%` ≈ `#0e7c86`, a deep teal counterweight) — **no token changes proposed**, this section is about applying them consistently and closing gaps the audit above didn't cover:

- **Iconography:** none is installed yet (see §3.6). Direction: 1.75px stroke, rounded caps/joins, no fill — bold enough to sit next to the mark without looking like a generic thin icon set. Status icons always pair with the semantic color (never color alone, per `design-system.md` §1.3).
- **Typography in practice:** `Plus Jakarta Sans` for all UI text, `IBM Plex Mono` reserved specifically for numeric/counter values (kcal, timers, adherence %) so they read as measured/precise against the humanist sans elsewhere — this distinction exists in the token doc but isn't visibly demonstrated anywhere in the app yet.
- **Component visual language:** subtle elevation only (`shadow-sm`/`shadow-md`, no heavy drop-shadow-on-flat-gray), `--radius: 10px` throughout, semantic badges (Ativo/Pendente/Atenção/Novo) as pill shapes with a dot + text, never a bare color chip.
- **New finding — logo asset gap:** `logo.png` has a baked-in white background (not transparent) and no monochrome/reversed variant. It cannot be dropped cleanly into a dark-mode surface, a colored app-bar, or a favicon without a white box around it. **Action item, blocks §3.5 (dark mode) and the nav-shell app-bar mark:** export a transparent PNG/SVG of the arm mark (and ideally a reversed/light version for dark surfaces) before nav-shell or dark-mode-toggle work lands.

**How the mockups map to the roadmap:** the Client dashboard mockup mirrors §4.1's already-good pattern (nothing new asked there); the Professional dashboard mockup is one concrete version of §5.3's command-center (attention feed + roster snapshot stat grid + recent-clients strip); the Client detail mockup is one concrete version of §5.4 (contraindication alert surfaced above the fold, stat row, quick-link grid replacing the six stacked text links); the desktop mockup is one concrete version of §5.5's two-pane roster (`lg:grid-cols-[320px_1fr]`) plus a persistent left-sidebar nav shell for §5.2. Treat these as one valid execution of the roadmap's structure, not a spec to copy pixel-for-pixel — implement with real `packages/ui` components (§5.1) rather than by porting this markup.
