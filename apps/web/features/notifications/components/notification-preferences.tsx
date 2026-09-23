"use client";

// PRD 12 §5.3 — per-type email/push toggles, one form posting every row at
// once (see actions.ts's field naming: `email:<type>` / `push:<type>`).
// emailLocked rows render checked+disabled — a disabled checkbox doesn't
// submit, and the action skips locked types entirely, so the lock can never
// be overridden by hand-edited markup (the API 400s it regardless — this is
// just honest UI).
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPreferencesAction } from "../actions";
import type { PublicNotificationPreference } from "../api-client";
import { NOTIFICATION_LABELS, NOTIFICATION_TYPE_LABELS } from "../labels";

export function NotificationPreferences({
  preferences,
}: {
  preferences: PublicNotificationPreference[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(formData);
      if (!result.ok) {
        setError(result.message ?? NOTIFICATION_LABELS.loadError);
        return;
      }
      setMessage(NOTIFICATION_LABELS.preferencesSaved);
      router.refresh();
    });
  }

  return (
    <section aria-label={NOTIFICATION_LABELS.preferencesTitle}>
      <h2 className="mb-3 text-base font-semibold text-foreground">
        {NOTIFICATION_LABELS.preferencesTitle}
      </h2>
      <form
        // <form action> requires a void-returning function; the hydrated
        // onSubmit path above is what reads the ActionResult for UI.
        action={async (formData: FormData): Promise<void> => {
          await updateNotificationPreferencesAction(formData);
        }}
        onSubmit={handleSubmit}
      >
        <ul className="space-y-2">
          {preferences.map((pref) => (
            <li
              key={pref.type}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span className="text-sm font-medium text-foreground">
                {NOTIFICATION_TYPE_LABELS[pref.type] ?? pref.type}
              </span>
              <span className="flex items-center gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name={`email:${pref.type}`}
                    defaultChecked={pref.emailEnabled}
                    disabled={pref.emailLocked}
                    className="h-4 w-4 accent-accent"
                  />
                  {NOTIFICATION_LABELS.emailColumn}
                  {pref.emailLocked ? (
                    <em className="not-italic text-muted-foreground">
                      ({NOTIFICATION_LABELS.lockedHint})
                    </em>
                  ) : null}
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name={`push:${pref.type}`}
                    defaultChecked={pref.pushEnabled}
                    className="h-4 w-4 accent-accent"
                  />
                  {NOTIFICATION_LABELS.pushColumn}
                </label>
              </span>
            </li>
          ))}
        </ul>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {NOTIFICATION_LABELS.savePreferences}
        </button>
      </form>
    </section>
  );
}
