import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyThreads } from "@/features/messaging/api-client";
import { listMyNotifications } from "@/features/notifications/api-client";
import { listMyLinks } from "@/features/relationships/api-client";
import type { NavItemKey } from "@/features/navigation/nav-items";
import { NavShell } from "@/features/navigation/nav-shell";

// Persistent, role-aware nav shell for every authenticated screen
// (docs/redesign-plan.md §5.2). Every route folder that used to sit directly
// under app/ now sits under this (app) route group instead — a route group
// doesn't change the URL, so /dashboard, /clients, etc. are unaffected, and
// each page keeps its own existing role/approval redirect exactly as before
// (this layout only adds chrome, it doesn't replace those checks).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!role) redirect("/login");

  const accessToken = session.accessToken!;
  const badges: Partial<Record<NavItemKey, number>> = {};

  const threadsResult = await listMyThreads(accessToken);
  if (threadsResult.ok) {
    const unread = threadsResult.data.threads.reduce((sum, t) => sum + t.unreadCount, 0);
    if (unread > 0) badges.messages = unread;
  }

  // PRD 12 §6 — the in-app badge: same unreadCount the /notifications list
  // header uses, so the nav badge and the list can never disagree.
  const notificationsResult = await listMyNotifications(accessToken);
  if (notificationsResult.ok && notificationsResult.data.unreadCount > 0) {
    badges.notifications = notificationsResult.data.unreadCount;
  }

  if (role === "PROFESSIONAL") {
    const pendingResult = await listMyLinks(accessToken, "PENDING");
    if (pendingResult.ok && pendingResult.data.length > 0) {
      badges.clients = pendingResult.data.length;
    }
  }

  return (
    <NavShell role={role} badges={badges} name={session.user.name}>
      {children}
    </NavShell>
  );
}
