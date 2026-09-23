import {
  Apple,
  Bell,
  CalendarCheck,
  Dumbbell,
  Home,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEM_LABELS } from "./labels";

export type Role = "CLIENT" | "PROFESSIONAL" | "ADMIN";

// A stable key per nav item — used both for the badge lookup passed down
// from the (app) layout and as the React key, since hrefs alone would
// collide for the shared "home" item across roles.
export type NavItemKey =
  | "home"
  | "today"
  | "nutrition"
  | "habits"
  | "messages"
  | "clients"
  | "plans"
  | "exercises"
  | "adminExercises"
  | "notifications";

export interface NavItem {
  key: NavItemKey;
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  CLIENT: [
    { key: "home", href: "/dashboard", label: NAV_ITEM_LABELS.home, icon: Home },
    { key: "today", href: "/today", label: NAV_ITEM_LABELS.today, icon: CalendarCheck },
    { key: "nutrition", href: "/nutrition", label: NAV_ITEM_LABELS.nutrition, icon: Apple },
    { key: "habits", href: "/habits", label: NAV_ITEM_LABELS.habits, icon: ListChecks },
    { key: "messages", href: "/messages", label: NAV_ITEM_LABELS.messages, icon: MessageSquare },
    { key: "notifications", href: "/notifications", label: NAV_ITEM_LABELS.notifications, icon: Bell },
  ],
  PROFESSIONAL: [
    { key: "home", href: "/dashboard", label: NAV_ITEM_LABELS.home, icon: Home },
    { key: "clients", href: "/clients", label: NAV_ITEM_LABELS.clients, icon: Users },
    { key: "plans", href: "/plans", label: NAV_ITEM_LABELS.plans, icon: ListChecks },
    { key: "messages", href: "/messages", label: NAV_ITEM_LABELS.messages, icon: MessageSquare },
    { key: "exercises", href: "/exercises", label: NAV_ITEM_LABELS.exercises, icon: Dumbbell },
    { key: "notifications", href: "/notifications", label: NAV_ITEM_LABELS.notifications, icon: Bell },
  ],
  // Deviation from docs/redesign-plan.md §5.2's literal Admin item list
  // ("Início, Revisão de exercícios, Equipe"): /team redirects any
  // non-CLIENT straight back to /dashboard (apps/web/app/(app)/team/page.tsx
  // — it's the Client's own "Meu Time" screen, PRD 02 §7), so an Admin
  // "Equipe" link would be a dead loop. Swapped for /exercises, which Admin
  // could already reach via the old NavigationLanding's "Biblioteca de
  // exercícios" link and can actually use (role===ADMIN is an accepted
  // author role there).
  ADMIN: [
    { key: "home", href: "/dashboard", label: NAV_ITEM_LABELS.home, icon: Home },
    {
      key: "adminExercises",
      href: "/admin/exercises",
      label: NAV_ITEM_LABELS.adminExercises,
      icon: ShieldCheck,
    },
    { key: "exercises", href: "/exercises", label: NAV_ITEM_LABELS.exercises, icon: Dumbbell },
    { key: "notifications", href: "/notifications", label: NAV_ITEM_LABELS.notifications, icon: Bell },
  ],
};

export function getNavItems(role: Role): NavItem[] {
  return ITEMS_BY_ROLE[role];
}
