import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  DOMAIN_EVENT_BUS,
  type DomainEventBus,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/ports/session.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";
import { emitPlanUpdated } from "../plan-updated";

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
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { actor: UserWithProfiles; sessionId: string; date: Date }) {
    const { plan } = await this.access.requirePlanForSession(input.sessionId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);

    try {
      const moved = await this.sessions.move(input.sessionId, input.date);
      await emitPlanUpdated(this.events, plan, input.actor.id);
      return moved;
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
