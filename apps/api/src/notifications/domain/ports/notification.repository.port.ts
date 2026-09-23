import type { Notification, NotificationType } from "@prisma/client";

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

/// §6's read/write surface for the in-app notification list. The create
/// path deliberately surfaces Prisma's P2002 on the (userId, type,
/// dedupeKey) unique constraint rather than pre-checking — an atomic
/// claim, so two racing dispatches can't double-notify even before the
/// channel fan-out runs.
export interface NotificationRepository {
  create(input: {
    userId: string;
    type: NotificationType;
    payload: Record<string, unknown>;
    dedupeKey: string | null;
  }): Promise<Notification>;

  /// The user's own list, newest first (§7's fallback surface).
  listForUser(userId: string, take: number): Promise<Notification[]>;
  unreadCountForUser(userId: string): Promise<number>;

  /// Returns null when the row doesn't exist or belongs to someone else —
  /// callers turn that into a 404 (the codebase's existence-hiding
  /// precedent, same as messaging's non-party 404).
  findByIdForUser(id: string, userId: string): Promise<Notification | null>;
  markRead(id: string, at: Date): Promise<Notification>;
  markAllReadForUser(userId: string, at: Date): Promise<number>;
}
