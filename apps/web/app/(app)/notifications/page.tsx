import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import {
  getMyPreferences,
  getPushPublicKey,
  listMyNotifications,
} from "@/features/notifications/api-client";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { PushOptIn } from "@/features/notifications/components/push-opt-in";
import { NOTIFICATION_LABELS } from "@/features/notifications/labels";

export const metadata = { title: "Notificações — PeakForm" };

// PRD 12 §5.3/§6 — every authenticated role has an in-app notification list
// and preference settings (even a PENDING professional — the approval
// decision lands here, matching the API's no-ApprovalStatusGuard choice).
export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const token = session.accessToken!;
  const [notifications, preferences, pushKey] = await Promise.all([
    listMyNotifications(token),
    getMyPreferences(token),
    getPushPublicKey(token),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <h1 className="text-xl font-semibold text-foreground">
        {NOTIFICATION_LABELS.pageTitle}
      </h1>

      {notifications.ok ? (
        <NotificationList notifications={notifications.data.notifications} />
      ) : (
        <p className="text-sm text-danger">{NOTIFICATION_LABELS.loadError}</p>
      )}

      <section aria-label={NOTIFICATION_LABELS.pushTitle}>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          {NOTIFICATION_LABELS.pushTitle}
        </h2>
        <PushOptIn vapidKey={pushKey.ok ? pushKey.data.publicKey : null} />
      </section>

      {preferences.ok ? (
        <NotificationPreferences preferences={preferences.data.preferences} />
      ) : (
        <p className="text-sm text-danger">{NOTIFICATION_LABELS.loadError}</p>
      )}
    </div>
  );
}
