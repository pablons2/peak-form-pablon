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
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.1 — a TrainingPlan belongs to exactly one Client, authored by
// exactly one Professional. §5.1's intake-completion gate (base doc
// §3.2/§5.3) applies to every caller, Admin included — no bypass.
@Injectable()
export class CreateTrainingPlanUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly access: TrainingPlanAccess,
    private readonly intakeGating: IntakeGatingService,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    clientId: string;
    professionalId?: string;
    name: string;
    startDate: Date;
  }) {
    const client = await this.users.findById(input.clientId);
    if (!client || client.role !== Role.CLIENT) {
      throw new NotFoundException("Client not found");
    }

    const professionalId = await this.access.resolveProfessionalForClient(
      input.actor,
      input.clientId,
      input.professionalId,
    );

    const allowed = await this.intakeGating.isPlanAssignmentAllowed(input.clientId);
    if (!allowed) {
      throw new ForbiddenException(
        "This client's intake must be completed or skipped before a training plan can be created",
      );
    }

    return this.plans.create({
      clientId: input.clientId,
      professionalId,
      authoredById: null,
      name: input.name,
      startDate: input.startDate,
      isStarterTemplate: false,
    });
  }
}
