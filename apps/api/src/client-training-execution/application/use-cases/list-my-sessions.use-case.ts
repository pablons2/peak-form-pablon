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

// PRD 07 §5.1/§5.4 — the Client's own full execution history (across every
// plan/mesocycle), newest first — where MISSED/CANCELLED sessions show up
// alongside COMPLETED ones (§5.4's "counted against adherence, not silently
// left SCHEDULED forever").
@Injectable()
export class ListMySessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EXERCISE_LOG_REPOSITORY) private readonly logs: ExerciseLogRepository,
    private readonly composer: SessionExecutionComposer,
  ) {}

  async execute(input: { clientId: string }) {
    const sessions = await this.sessions.listForClient(input.clientId);
    return Promise.all(
      sessions.map(async (session) => {
        const allLogs = await this.logs.listForSession(session.id);
        return this.composer.compose(session, allLogs);
      }),
    );
  }
}
