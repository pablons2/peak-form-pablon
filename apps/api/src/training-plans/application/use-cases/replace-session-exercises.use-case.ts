import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { ReplaceSessionExercisesInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  DOMAIN_EVENT_BUS,
  type DomainEventBus,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/ports/session.repository.port";
import { ContraindicationWarningService } from "../contraindication-warning.service";
import { TrainingPlanAccess } from "../training-plan-access.service";
import { emitPlanUpdated } from "../plan-updated";
import { ValidateExerciseIds } from "../validate-exercise-ids.service";

// PRD 06 §5.4 — a one-off substitution for a single dated Session: the
// underlying template and every other generated session are untouched, and
// `overriddenFromTemplate` is set true (§6). Same contraindication
// cross-check + audit as saving a weekly template (§5.6) — this is just as
// much "adding an exercise to a Session for a specific Client" as authoring
// the template was.
@Injectable()
export class ReplaceSessionExercisesUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly access: TrainingPlanAccess,
    private readonly validateExerciseIds: ValidateExerciseIds,
    private readonly contraindicationWarnings: ContraindicationWarningService,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    sessionId: string;
    data: ReplaceSessionExercisesInput;
  }) {
    const { plan } = await this.access.requirePlanForSession(input.sessionId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);
    if (!plan.clientId) {
      throw new BadRequestException(
        "Starter Templates have no dated Sessions to edit",
      );
    }

    const exerciseIds = input.data.exercises.map((e) => e.exerciseId);
    await this.validateExerciseIds.execute(exerciseIds);

    const updated = await this.sessions.replaceExercises(
      input.sessionId,
      input.data.exercises,
    );

    const warnings = await this.contraindicationWarnings.checkAndAudit({
      actorId: input.actor.id,
      clientId: plan.clientId,
      entity: "SessionExercise",
      exerciseIds,
    });

    await emitPlanUpdated(this.events, plan, input.actor.id);
    return { session: updated, warnings };
  }
}
