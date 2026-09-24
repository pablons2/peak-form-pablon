import { NotificationType } from "@prisma/client";
import {
  ACCOUNT_SECURITY_TYPES,
  EMAIL_LOCKED_TYPES,
  PREFERENCE_ELIGIBLE_TYPES,
  dedupeKeyFor,
  isAccountSecurity,
  isPreferenceEligible,
} from "./notification-types";

// PRD 12 §5.3/§7 — the three type sets must partition the enum the way the
// PRD's preference model demands, and dedupeKeyFor must stay stable enough
// that re-emitted events collapse into one Notification (§10's "no
// duplicate in-app notifications" invariant).
describe("notification-types", () => {
  it("partitions the enum: every type is either preference-eligible or account-security, never both", () => {
    const all = Object.values(NotificationType);
    for (const t of all) {
      expect(isPreferenceEligible(t) !== isAccountSecurity(t)).toBe(true);
    }
    expect(all.length).toBe(
      PREFERENCE_ELIGIBLE_TYPES.length + ACCOUNT_SECURITY_TYPES.length,
    );
  });

  it("locks email only for the approval decision, and marks exactly the two security types as non-preference", () => {
    expect(EMAIL_LOCKED_TYPES).toEqual([NotificationType.APPROVAL_DECISION]);
    expect(isPreferenceEligible(NotificationType.NEW_MESSAGE)).toBe(true);
    expect(isAccountSecurity(NotificationType.PASSWORD_RESET)).toBe(true);
    expect(isPreferenceEligible(NotificationType.PASSWORD_RESET)).toBe(false);
  });

  it("derives stable dedupe keys per trigger family", () => {
    expect(
      dedupeKeyFor(NotificationType.SESSION_REMINDER, { sessionId: "s1" }),
    ).toBe("session:s1");
    expect(
      dedupeKeyFor(NotificationType.MISSED_SESSION, { sessionId: "s1" }),
    ).toBe("session:s1");
    expect(
      dedupeKeyFor(NotificationType.MISSED_FOOD_LOG, {
        clientId: "c1",
        date: "2026-09-21",
      }),
    ).toBe("foodlog:c1:2026-09-21");
    expect(
      dedupeKeyFor(NotificationType.NEW_MESSAGE, { messageId: "m1" }),
    ).toBe("message:m1");
    expect(
      dedupeKeyFor(NotificationType.PLAN_UPDATED, {
        planId: "p1",
        date: "2026-09-22",
      }),
    ).toBe("plan:p1:2026-09-22");
    expect(
      dedupeKeyFor(NotificationType.WEEKLY_SUMMARY_READY, {
        clientId: "c1",
        weekStart: "2026-09-15",
      }),
    ).toBe("week:c1:2026-09-15");
    // dueAt is part of the key so a RECURRING schedule's next firing is a
    // new occurrence, not a suppressed duplicate.
    expect(
      dedupeKeyFor(NotificationType.CHECK_IN_DUE, {
        scheduleId: "cs1",
        dueAt: "2026-09-21",
      }),
    ).toBe("checkin:cs1:2026-09-21");
  });

  it("returns null only for types with no deterministic key", () => {
    // §7 — each admin decision and each security email is its own
    // notification; only occurrence-keyed triggers collapse.
    expect(dedupeKeyFor(NotificationType.APPROVAL_DECISION, {})).toBeNull();
    expect(dedupeKeyFor(NotificationType.PASSWORD_RESET, {})).toBeNull();
    expect(dedupeKeyFor(NotificationType.EMAIL_VERIFICATION, {})).toBeNull();
  });
});
