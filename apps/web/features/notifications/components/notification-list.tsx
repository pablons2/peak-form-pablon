"use client";

// PRD 12 §6 — the in-app list: newest first, unread rows visually distinct
// (§10 AC), per-row "mark read" plus a header "mark all". Both controls are
// native <form action={...}> bindings — same progressive-enhancement
// reasoning as features/messaging's composer: a click landing before React
// hydrates still works because the browser submits a real form post.
import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../actions";
import type { PublicNotification } from "../api-client";
import { NOTIFICATION_LABELS, NOTIFICATION_TYPE_LABELS } from "../labels";

function formatCreatedAt(iso: string): string {
  // Pinned timezone — same hydration-mismatch reasoning as messaging's
  // formatSentAt (server renders UTC, browser resolves local; pt-BR is the
  // app's locale convention).
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function NotificationList({
  notifications,
}: {
  notifications: PublicNotification[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">{NOTIFICATION_LABELS.empty}</p>;
  }

  // Pre-hydration the browser posts the bound action natively; once
  // hydrated, preventDefault routes through startTransition so `pending`
  // disables the controls and router.refresh() picks up fresh state.
  function submitAction(
    event: FormEvent<HTMLFormElement>,
    action: () => Promise<{ ok: boolean }>,
  ) {
    event.preventDefault();
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <section aria-label={NOTIFICATION_LABELS.pageTitle}>
      <div className="mb-3 flex justify-end">
        <form
          action={async () => {
            await markAllNotificationsReadAction();
          }}
          onSubmit={(e) => submitAction(e, markAllNotificationsReadAction)}
        >
          <button
            type="submit"
            disabled={pending}
            className="text-sm text-accent hover:underline disabled:opacity-50"
          >
            {NOTIFICATION_LABELS.markAllRead}
          </button>
        </form>
      </div>
      <ul className="space-y-2">
        {notifications.map((n) => {
          const unread = n.readAt === null;
          // <form action> requires a void-returning function (see
          // messaging's nativeFallbackAction) — the hydrated onSubmit path
          // below is what actually reads the ActionResult.
          const markRead = markNotificationReadAction.bind(null, n.id);
          const nativeFallback = async (): Promise<void> => {
            await markRead();
          };
          return (
            <li
              key={n.id}
              className={`rounded-lg border border-border bg-card p-4 ${
                unread ? "border-l-4 border-l-accent" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                    {unread ? ` · ${NOTIFICATION_LABELS.unread}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{n.title}</p>
                  {n.body ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCreatedAt(n.createdAt)}
                  </p>
                </div>
                {unread ? (
                  <form
                    action={nativeFallback}
                    onSubmit={(e) => submitAction(e, markRead)}
                  >
                    <button
                      type="submit"
                      disabled={pending}
                      className="shrink-0 text-xs text-accent hover:underline disabled:opacity-50"
                    >
                      {NOTIFICATION_LABELS.markRead}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
