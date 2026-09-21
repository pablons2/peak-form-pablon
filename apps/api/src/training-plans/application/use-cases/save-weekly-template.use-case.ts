import { Inject, Injectable } from "@nestjs/common";
import type { SaveWeeklyTemplateInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";
import {
  ContraindicationWarningService,
  type ContraindicationWarning,
} from "../contraindication-warning.service";
import { SessionGenerationService } from "../session-generation.service";
import { ValidateExerciseIds } from "../validate-exercise-ids.service";

// PRD 06 §5.3/§5.4/§5.6 — replaces the mesocycle's whole weekly template
// (one entry per weekday, at most one per weekday — enforced by the shared
// zod schema), regenerates dated Sessions for any not-yet-generated slot,
// and cross-checks every prescribed exercise against the Client's
// contraindications profile.
@Injectable()
export class SaveWeeklyTemplateUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    private readonly access: TrainingPlanAccess,
    private readonly validateExerciseIds: ValidateExerciseIds,
    private readonly contraindicationWarnings: ContraindicationWarningService,
    private readonly generation: SessionGenerationService,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    mesocycleId: string;
    data: SaveWeeklyTemplateInput;
  }) {
    const { mesocycle, plan } = await this.access.requirePlanForMesocycle(
      input.mesocycleId,
    );
    this.access.assertProfessionalOwnsPlan(plan, input.actor);

    const allExerciseIds = input.data.entries.flatMap((e) =>
      e.exercises.map((x) => x.exerciseId),
    );
    await this.validateExerciseIds.execute(allExerciseIds);

    const updated = await this.plans.replaceWeeklyTemplates(
      mesocycle.id,
      input.data.entries,
    );
    await this.generation.generateForMesocycle(mesocycle.id);

    // A Starter Template has no Client yet (§5.8) — nothing to cross-check
    // against, so authoring one never blocks on this and never warns.
    const warnings: ContraindicationWarning[] = plan.clientId
      ? await this.contraindicationWarnings.checkAndAudit({
          actorId: input.actor.id,
          clientId: plan.clientId,
          entity: "WeeklyMicrocycleTemplateExercise",
          exerciseIds: allExerciseIds,
        })
      : [];

    return { mesocycle: updated, warnings };
  }
}
