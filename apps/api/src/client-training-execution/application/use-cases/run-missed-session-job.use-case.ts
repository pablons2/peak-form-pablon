import { Inject, Injectable } from "@nestjs/common";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";
import {
  EXERCISE_LOG_REPOSITORY,
  type ExerciseLogRepository,
} from "../../domain/ports/exercise-log.repository.port";

// PRD 07 §5.4 — the missed-session firing job (invoked on an interval by
// MissedSessionJobService). A still-SCHEDULED Session whose date has passed
// with zero logged sets is flagged MISSED. CANCELLED Sessions never appear
// here at all — findScheduledPastDue's own status filter excludes them, so
// there's no separate "skip if cancelled" branch to get wrong.
@Injectable()
export class RunMissedSessionJobUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EXERCISE_LOG_REPOSITORY) private readonly logs: ExerciseLogRepository,
  ) {}

  async execute(input: { now: Date }) {
    // "Passed" (§5.4) means strictly before today — a Session scheduled for
    // later today hasn't happened yet, so today's own UTC-midnight boundary
    // is never itself eligible.
    const startOfToday = new Date(
      Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()),
    );
    const candidates = await this.sessions.findScheduledPastDue(startOfToday);
    const flagged: string[] = [];
    for (const session of candidates) {
      const hasLogs = await this.logs.hasAnyLogForSession(session.id);
      if (hasLogs) continue;
      await this.sessions.markMissed(session.id);
      flagged.push(session.id);
    }
    return { flaggedCount: flagged.length, flaggedSessionIds: flagged };
  }
}
