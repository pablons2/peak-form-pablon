import { Inject, Injectable } from "@nestjs/common";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";

// PRD 06 §5.8 — a Starter Template has no Client/Professional, only an
// author (a licensed Professional or Admin authoring it at content-creation
// time, base doc §3.1). Route-level @Roles + PersonalTrainerGuard already
// restrict who can call this.
@Injectable()
export class CreateStarterTemplateUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
  ) {}

  execute(input: { actor: UserWithProfiles; name: string; startDate: Date }) {
    return this.plans.create({
      clientId: null,
      professionalId: null,
      authoredById: input.actor.id,
      name: input.name,
      startDate: input.startDate,
      isStarterTemplate: true,
    });
  }
}
