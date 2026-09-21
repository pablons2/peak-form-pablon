import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserWithProfiles,
} from "../../../auth/domain/ports/user.repository.port";
import { IntakeGatingService } from "../../../intake/application/intake-gating.service";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";
import { ClonePlanService } from "../clone-plan.service";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.7 — duplicate an entire plan (including a Starter Template, per
// §5.8's "authored ... not assembled ad hoc" wording — cloning is exactly
// how an author's approved structure becomes a Client's concrete plan) as a
// starting point for a different Client, or a future block for the same
// one. The intake-completion gate (§5.1) applies to the *target* Client the
// same as a fresh create.
@Injectable()
export class ClonePlanUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly access: TrainingPlanAccess,
    private readonly intakeGating: IntakeGatingService,
    private readonly cloneService: ClonePlanService,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    sourcePlanId: string;
    targetClientId: string;
    professionalId?: string;
    name?: string;
    startDate?: Date;
  }) {
    const sourcePlan = await this.access.requirePlan(input.sourcePlanId);
    if (!sourcePlan.isStarterTemplate) {
      this.access.assertProfessionalOwnsPlan(sourcePlan, input.actor);
    }

    const client = await this.users.findById(input.targetClientId);
    if (!client || client.role !== Role.CLIENT) {
      throw new NotFoundException("Client not found");
    }

    const professionalId = await this.access.resolveProfessionalForClient(
      input.actor,
      input.targetClientId,
      input.professionalId,
    );

    const allowed = await this.intakeGating.isPlanAssignmentAllowed(input.targetClientId);
    if (!allowed) {
      throw new ForbiddenException(
        "This client's intake must be completed or skipped before a training plan can be created",
      );
    }

    const created = await this.plans.create({
      clientId: input.targetClientId,
      professionalId,
      authoredById: null,
      name: input.name ?? `${sourcePlan.name} (cópia)`,
      startDate: input.startDate ?? sourcePlan.startDate,
      isStarterTemplate: false,
    });

    await this.cloneService.cloneMesocyclesInto(sourcePlan, created.id);
    return this.plans.findById(created.id);
  }
}
