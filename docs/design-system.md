# PeakForm — Design System (Token Source of Truth)

**Status:** v1 — extracted from the staged theme files (`frontend/globals.css`, `frontend/tailwind.config.ts`); evolves with the product-designer playbook.
**Canonical implementation targets (per base doc §7.3):** `apps/web/src/app/globals.css` + `apps/web/tailwind.config.ts` + `packages/ui/`.

This document is the **source of truth for every visual token** in PeakForm. The rule is strict and bidirectional:

- No component, screen design, or handoff may introduce a raw value (hex, px, ms, font) that is not a named token here.
- Changing a token means updating **all three** in the same change: this document, `globals.css` (CSS variables), and `tailwind.config.ts` (theme mapping). They must never drift.
- New tokens are added explicitly and sparingly — propose them as system additions, not inline one-offs.

---

## 1. Color Tokens

All colors are HSL channel triplets stored in CSS variables (`hsl(var(--token))` in Tailwind). Light mode lives in `:root`, dark mode in `.dark` (class-based switching, `darkMode: ["class"]`).

### 1.1 Semantic palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `30 20% 98%` | `20 16% 6%` | App/page background |
| `--foreground` | `22 14% 10%` | `30 20% 98%` | Default text |
| `--card` | `0 0% 100%` | `22 14% 10%` | Card surfaces |
| `--card-foreground` | `22 14% 10%` | `30 20% 98%` | Text on cards |
| `--popover` | `0 0% 100%` | `22 14% 10%` | Popover/dropdown surfaces |
| `--popover-foreground` | `22 14% 10%` | `30 20% 98%` | Text on popovers |
| `--primary` | `11 100% 61%` | `11 100% 65%` | Primary actions, brand accent (warm orange-red) |
| `--primary-foreground` | `22 14% 10%` | `22 14% 10%` | Text on primary |
| `--secondary` | `30 12% 90%` | `24 12% 16%` | Secondary surfaces/actions |
| `--secondary-foreground` | `22 14% 10%` | `30 20% 98%` | Text on secondary |
| `--muted` | `30 15% 95%` | `24 12% 16%` | Muted/disabled surfaces |
| `--muted-foreground` | `30 6% 48%` | `30 8% 65%` | Secondary/placeholder text |
| `--accent` | `185 81% 29%` | `185 60% 45%` | Accent highlights (deep teal) |
| `--accent-foreground` | `0 0% 100%` | `22 14% 10%` | Text on accent |
| `--destructive` | `358 75% 59%` | `358 70% 62%` | Destructive/error actions |
| `--destructive-foreground` | `22 14% 10%` | `22 14% 10%` | Text on destructive |
| `--success` | `146 67% 37%` | `146 55% 45%` | Success states |
| `--success-foreground` | `22 14% 10%` | `22 14% 10%` | Text on success |
| `--warning` | `37 91% 55%` | `37 85% 60%` | Warning states (e.g., contraindication flags) |
| `--warning-foreground` | `22 14% 10%` | `22 14% 10%` | Text on warning |
| `--border` | `30 10% 82%` | `24 12% 16%` | Default borders |
| `--input` | `30 10% 82%` | `24 12% 16%` | Form input borders |
| `--ring` | `11 100% 61%` | `11 100% 65%` | Focus rings |

### 1.2 Chart palette

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `11 100% 61%` | `11 100% 65%` |
| `--chart-2` | `185 81% 29%` | `185 60% 45%` |
| `--chart-3` | `146 67% 37%` | `146 55% 45%` |
| `--chart-4` | `37 91% 55%` | `37 85% 60%` |
| `--chart-5` | `30 6% 48%` | `30 8% 65%` |

### 1.3 Usage rules

- Semantic aliases only — components consume `bg-primary`, `text-muted-foreground`, `border-border`, never `hsl(...)` or hex directly.
- The palette is deliberately constrained (one primary, one accent, neutral scale, semantic status colors) — do not add new hues without a stated reason.
- Status is never conveyed by color alone — pair with icon and/or text (WCAG AA + product-designer spec).
- All color/foreground pairs must hold WCAG AA contrast in both modes; a token change requires re-checking its pairings.

## 2. Radius

Base token `--radius: 0.625rem` (10px); the scale derives from it in `tailwind.config.ts`:

| Scale | Value |
|---|---|
| `sm` | `calc(var(--radius) - 4px)` |
| `md` | `calc(var(--radius) - 2px)` |
| `lg` | `var(--radius)` |
| `xl` | `calc(var(--radius) + 4px)` |

## 3. Elevation (shadows)

Intentionally subtle — no heavy drop-shadow cards (part of the non-generic identity).

| Token | Value |
|---|---|
| `shadow-xs` | `0 1px 2px 0 hsl(30 10% 10% / 0.04)` |
| `shadow-sm` | `0 1px 3px 0 hsl(30 10% 10% / 0.08), 0 1px 2px -1px hsl(30 10% 10% / 0.06)` |
| `shadow-md` | `0 4px 8px -2px hsl(30 10% 10% / 0.10), 0 2px 4px -2px hsl(30 10% 10% / 0.06)` |

## 4. Motion

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | `120ms` | Micro-feedback (hover, press) |
| `duration-base` | `200ms` | Standard transitions |
| `duration-slow` | `320ms` | Larger state changes |
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default easing |
| `ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Entrances/emphasis |

Component enter/exit animations come from `tailwindcss-animate` (the shadcn/ui convention).

## 5. Typography

| Token | Stack | Usage |
|---|---|---|
| `--font-sans` | `"Plus Jakarta Sans", system-ui, sans-serif` | All UI text |
| `--font-mono` | `"IBM Plex Mono", ui-monospace, monospace` | Numeric/code contexts (e.g., logged values, timers) |

A named type scale (size/weight/line-height tokens) is a fast-follow for the product-designer — until then, use Tailwind's default scale deliberately rather than ad-hoc sizes.

## 6. Dark Mode

- Class-based (`.dark` on `<html>`), wired to `darkMode: ["class"]` in Tailwind.
- Every token above has a dark value — a screen is not done until verified in both modes.

## 7. Relationship to Components

- Components live as generated source in `packages/ui` (shadcn/ui on Radix primitives — see base doc §7.3 and decision 3.8 in `docs/prds/00-shared-reference-and-decisions.md`).
- Components style exclusively through these tokens; Radix supplies behavior (focus, keyboard, ARIA), tokens supply identity.
- The product-designer playbook (`.claude/agents/product-designer.md`, `.devin/agents/product-designer.devin.md`) is the authority for evolving this system — new tokens land here first, then in `globals.css`/`tailwind.config.ts`.
