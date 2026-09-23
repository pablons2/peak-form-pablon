"use client";

// PRD 12 §5.2 — web-push opt-in. Denied or unsupported is never an error
// state: the UI says so plainly and the user keeps getting email (the
// dispatcher falls back the same way). `vapidKey` is null when the backend
// has no VAPID configured — the whole section then explains push is off in
// this environment rather than offering a button that could only fail.
import { useEffect, useState, useTransition } from "react";
import {
  registerPushSubscriptionAction,
  unregisterPushSubscriptionAction,
} from "../actions";
import { NOTIFICATION_LABELS } from "../labels";

type PushState =
  | "checking"
  | "unsupported"
  | "not-configured"
  | "denied"
  | "subscribed"
  | "unsubscribed";

// VAPID public keys are base64url — PushManager wants them as bytes.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function PushOptIn({ vapidKey }: { vapidKey: string | null }) {
  const [state, setState] = useState<PushState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!vapidKey) {
      setState("not-configured");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("unsupported"));
  }, [vapidKey]);

  function enable() {
    setError(null);
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
        });
        const json = sub.toJSON() as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        const result = await registerPushSubscriptionAction({
          endpoint: json.endpoint ?? "",
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        });
        if (!result.ok) {
          setError(result.message ?? null);
          return;
        }
        setState("subscribed");
      } catch {
        setError(NOTIFICATION_LABELS.loadError);
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await unregisterPushSubscriptionAction({ endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
        setState("unsubscribed");
      } catch {
        setError(NOTIFICATION_LABELS.loadError);
      }
    });
  }

  if (state === "not-configured") {
    return (
      <p className="text-sm text-muted-foreground">
        {NOTIFICATION_LABELS.pushNotConfigured}
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        {NOTIFICATION_LABELS.pushUnsupported}
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">{NOTIFICATION_LABELS.pushDenied}</p>
    );
  }
  if (state === "checking") {
    return <p className="text-sm text-muted-foreground">…</p>;
  }

  return (
    <div>
      {state === "subscribed" ? (
        <>
          <p className="text-sm text-muted-foreground">{NOTIFICATION_LABELS.pushEnabled}</p>
          <button
            type="button"
            disabled={pending}
            onClick={disable}
            className="mt-2 text-sm text-accent hover:underline disabled:opacity-50"
          >
            {NOTIFICATION_LABELS.pushDisable}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={enable}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {NOTIFICATION_LABELS.pushEnable}
        </button>
      )}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
