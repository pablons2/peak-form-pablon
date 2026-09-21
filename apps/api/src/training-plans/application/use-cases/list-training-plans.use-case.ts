import { Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";

// PRD 06 §4/§7 — the Client's own "My Plans" list and the Professional's/
// Admin's view of one Client's plans. A Professional only ever sees plans
// where they're the assigned professionalId (their "own clients" — §4).
@Injectable()
export class ListTrainingPlansUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
  ) {}

  listMine(clientId: string) {
    return this.plans.listForClient(clientId);
  }

  async listForClient(viewer: UserWithProfiles, clientId: string) {
    const plans = await this.plans.listForClient(clientId);
    if (viewer.role === Role.ADMIN) return plans;
    return plans.filter((p) => p.professionalId === viewer.id);
  }

  listStarterTemplates() {
    return this.plans.listStarterTemplates();
  }
}
