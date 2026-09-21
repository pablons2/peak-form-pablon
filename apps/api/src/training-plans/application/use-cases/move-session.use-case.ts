import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/ports/session.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.4 — moves one dated Session without touching the template or
// any other generated session: `date` updates, `originalDate` preserves the
// template-implied date (only ever set once — a second move keeps the
// *original* template date, not the intermediate one), `status` stays
// SCHEDULED at the new date.
@Injectable()
export class MoveSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly access: TrainingPlanAccess,
  ) {}

  async execute(input: { actor: UserWithProfiles; sessionId: string; date: Date }) {
    const { plan } = await this.access.requirePlanForSession(input.sessionId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);

    try {
      return await this.sessions.move(input.sessionId, input.date);
    } catch (error) {
      // @@unique([mesocycleId, date]) — the target date already has a
      // session in this mesocycle.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "This mesocycle already has a session on that date",
        );
      }
      throw error;
    }
  }
}
