import { Inject, Injectable } from "@nestjs/common";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";
import {
  EXERCISE_LOG_REPOSITORY,
  type ExerciseLogRepository,
} from "../../domain/ports/exercise-log.repository.port";
import { SessionExecutionComposer } from "../session-execution-composer.service";

// PRD 07 §5.1 — resolves the Client's own Session for the current date, or
// reports a rest day (no Session, not an error). "Today" is UTC midnight —
// Session.date is a @db.Date column with no timezone of its own, the same
// convention PRD 06's session-generation service already uses.
@Injectable()
export class GetTodaySessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EXERCISE_LOG_REPOSITORY) private readonly logs: ExerciseLogRepository,
    private readonly composer: SessionExecutionComposer,
  ) {}

  async execute(input: { clientId: string; now: Date }) {
    const today = new Date(
      Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()),
    );
    const session = await this.sessions.findByClientAndDate(input.clientId, today);
    if (!session) return { session: null, isRestDay: true };

    const allLogs = await this.logs.listForSession(session.id);
    const view = await this.composer.composeWithLastTime(session, allLogs, input.clientId);
    return { session: view, isRestDay: false };
  }
}
