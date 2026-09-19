import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus } from "@prisma/client";
import type { RejectProfessionalInput } from "@peakform/validation";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";
import {
  MAILER,
  type Mailer,
} from "../../domain/ports/mailer.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 01 §5.6 — rejection is not a deactivation: User.status stays ACTIVE,
// the record is kept for audit purposes, and the person can still log in
// and see their rejection status (frontend concern — Phase 3 frontend).
@Injectable()
export class RejectProfessionalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(input: {
    adminId: string;
    professionalUserId: string;
    reason?: RejectProfessionalInput["reason"];
  }) {
    const target = await this.users.findById(input.professionalUserId);
    if (!target?.professionalProfile) {
      throw new NotFoundException("Professional account not found");
    }

    const profile = await this.users.updateProfessionalProfile(target.id, {
      approvalStatus: ApprovalStatus.REJECTED,
      approvedById: input.adminId,
      approvedAt: new Date(),
    });

    await this.auditLog.record({
      actorId: input.adminId,
      action: "PROFESSIONAL_REJECTED",
      entity: "ProfessionalProfile",
      entityId: profile.id,
      metadata: { professionalUserId: target.id, reason: input.reason },
    });

    await this.mailer.send({
      to: target.email,
      subject: "Your PeakForm professional account application",
      text:
        "An administrator has reviewed your professional account and it was not approved." +
        (input.reason ? ` Reason: ${input.reason}` : ""),
    });

    return profile;
  }
}
