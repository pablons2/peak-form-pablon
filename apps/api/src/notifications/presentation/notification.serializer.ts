import type { Notification, NotificationType } from "@prisma/client";

// What the in-app list needs — the rendered title/body the dispatcher
// stamped into the payload at dispatch time, never the raw event context
// (ids, sender ids, etc. stay server-side).
export function toPublicNotification(n: Notification) {
  const payload = n.payload as { title?: unknown; body?: unknown };
  return {
    id: n.id,
    type: n.type,
    title: typeof payload.title === "string" ? payload.title : "",
    body: typeof payload.body === "string" ? payload.body : "",
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
