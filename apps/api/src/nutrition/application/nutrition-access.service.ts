import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { LinkStatus, Role, Specialization } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../relationships/domain/ports/link.repository.port";

// PRD 08 §4 — permission matrix. "Generate a draft"/"Confirm/edit an active
// target": Admin unrestricted, Professional requires an ACTIVE link *and*
// the NUTRITIONIST specialization (checked by NutritionistGuard at the
// route level, not here — this service only resolves the "own linked
// client" half). Client has zero write access to NutritionPlan, not even
// self-confirm — there is deliberately no method here a Client-facing
// use-case could call to bypass that.
@Injectable()
export class NutritionAccess {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  async assertProfessionalLinkedToClient(
    professionalId: string,
    clientId: string,
  ): Promise<void> {
    const links = await this.links.listForProfessional(professionalId);
    const linked = links.some(
      (l) =>
        l.clientId === clientId &&
        l.status === LinkStatus.ACTIVE &&
        l.specialization === Specialization.NUTRITIONIST,
    );
    if (!linked) {
      throw new ForbiddenException(
        "You can only manage nutrition targets for your own linked clients",
      );
    }
  }

  /// Shared by both the plan-management use-cases (generate/confirm) and
  /// the Professional's read-only diary/adherence views — §4's table
  /// requires the same NUTRITIONIST + ACTIVE link condition for all of a
  /// Professional's access in this module, whether writing a target or
  /// viewing a diary.
  async assertCanManagePlanFor(
    actor: { id: string; role: Role },
    clientId: string,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    await this.assertProfessionalLinkedToClient(actor.id, clientId);
  }
}
