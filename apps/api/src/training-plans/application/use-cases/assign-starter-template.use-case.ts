import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LinkStatus, Specialization } from "@prisma/client";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../../relationships/domain/ports/link.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";
import { ClonePlanService } from "../clone-plan.service";

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// PRD 06 §5.8 — "A Client without a Professional can browse and self-assign
// a Starter Template, but cannot edit its prescriptions — it is consumed
// exactly as PRD 07 consumes any other assigned plan." Self-assigning
// clones the template's structure into a brand-new concrete plan (clientId
// set, professionalId null, authoredById carried over) rather than a live
// reference, since multiple Clients may assign the same template and each
// needs their own independent Session history. Sessions generate from
// today, the moment of assignment — the PRD gives no selectable start date
// for this self-service path.
@Injectable()
export class AssignStarterTemplateUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    private readonly cloneService: ClonePlanService,
  ) {}

  async execute(input: { client: UserWithProfiles; templateId: string }) {
    const template = await this.plans.findById(input.templateId);
    if (!template || !template.isStarterTemplate) {
      throw new NotFoundException("Starter template not found");
    }

    const ownLinks = await this.links.listForClient(input.client.id);
    const hasActivePersonalTrainer = ownLinks.some(
      (l) =>
        l.status === LinkStatus.ACTIVE &&
        l.specialization === Specialization.PERSONAL_TRAINER,
    );
    if (hasActivePersonalTrainer) {
      throw new ForbiddenException(
        "Clients with an active Personal Trainer can't self-assign a Starter Template",
      );
    }

    const created = await this.plans.create({
      clientId: input.client.id,
      professionalId: null,
      authoredById: template.authoredById,
      name: template.name,
      startDate: todayUTC(),
      isStarterTemplate: false,
    });

    await this.cloneService.cloneMesocyclesInto(template, created.id);
    return this.plans.findById(created.id);
  }
}
