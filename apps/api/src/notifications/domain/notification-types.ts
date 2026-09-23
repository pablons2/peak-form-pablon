import { NotificationType } from "@prisma/client";

// PRD 12 §5.1/§5.1.1 — the trigger-type taxonomy in one place, pure data so
// the dispatcher, the preferences endpoints, and the frontend's own copy of
// the rules can never disagree about which types exist and how each behaves.

/// §5.1.1 — every §5.1 trigger EXCEPT the two account-security ones is
/// preference-eligible: it flows through the event bus -> dispatcher ->
/// NotificationPreference check -> email/push fan-out path.
export const PREFERENCE_ELIGIBLE_TYPES = [
  NotificationType.SESSION_REMINDER,
  NotificationType.MISSED_SESSION,
  NotificationType.MISSED_FOOD_LOG,
  NotificationType.NEW_MESSAGE,
  NotificationType.PLAN_UPDATED,
  NotificationType.WEEKLY_SUMMARY_READY,
  NotificationType.CHECK_IN_DUE,
  NotificationType.APPROVAL_DECISION,
] as const satisfies readonly NotificationType[];

/// §5.1's "Account security" note — these never enter the preference
/// system at all (no NotificationPreference row exists for them, not even
/// a locked-on one). They are sent synchronously by PRD 01's flows via
/// SendAccountSecurityNotificationUseCase, email-only, immediately.
export const ACCOUNT_SECURITY_TYPES = [
  NotificationType.EMAIL_VERIFICATION,
  NotificationType.PASSWORD_RESET,
] as const satisfies readonly NotificationType[];

/// §5.3 — among preference-eligible triggers, this one is account-critical:
/// its email channel cannot be disabled (enforced server-side in
/// UpdatePreferenceUseCase and again in the dispatcher, never trusted to UI).
export const EMAIL_LOCKED_TYPES = [
  NotificationType.APPROVAL_DECISION,
] as const satisfies readonly NotificationType[];

export function isPreferenceEligible(type: NotificationType): boolean {
  return (PREFERENCE_ELIGIBLE_TYPES as readonly NotificationType[]).includes(type);
}

export function isAccountSecurity(type: NotificationType): boolean {
  return (ACCOUNT_SECURITY_TYPES as readonly NotificationType[]).includes(type);
}

export function isEmailLocked(type: NotificationType): boolean {
  return (EMAIL_LOCKED_TYPES as readonly NotificationType[]).includes(type);
}

/// §5.4 — the deterministic exactly-once key for scheduler-fired triggers.
/// Jobs re-see the same firing condition on every tick until their source
/// state advances, so the dispatcher derives the dedupe key here from the
/// event payload (emitters stay dumb strings-and-ids) rather than trusting
/// each producer to format it. Returns null for action-triggered types
/// where each user action is already naturally one event.
export function dedupeKeyFor(
  type: NotificationType,
  payload: Record<string, unknown>,
): string | null {
  switch (type) {
    case NotificationType.SESSION_REMINDER:
    case NotificationType.MISSED_SESSION:
      return `session:${String(payload.sessionId)}`;
    case NotificationType.MISSED_FOOD_LOG:
      return `foodlog:${String(payload.clientId)}:${String(payload.date)}`;
    case NotificationType.NEW_MESSAGE:
      return `message:${String(payload.messageId)}`;
    case NotificationType.PLAN_UPDATED:
      // Per-day, not per-edit — §2's "non-spammy" goal: a Professional's
      // multi-edit building session still yields one "plan updated" nudge.
      return `plan:${String(payload.planId)}:${String(payload.date)}`;
    case NotificationType.WEEKLY_SUMMARY_READY:
      return `week:${String(payload.clientId)}:${String(payload.weekStart)}`;
    case NotificationType.CHECK_IN_DUE:
      // Includes dueAt so a RECURRING schedule's next firing is a new
      // occurrence, not a suppressed duplicate.
      return `checkin:${String(payload.scheduleId)}:${String(payload.dueAt)}`;
    default:
      return null;
  }
}
