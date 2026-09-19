import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus } from "@prisma/client";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 01 §5.6 — approve locks the requested specializations in (they're
// already on the profile from signup; approving just flips the status) and
// is written to the audit log with actor, timestamp, and decision.
@Injectable()
export class ApproveProfessionalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(input: { adminId: string; professionalUserId: string }) {
    const target = await this.users.findById(input.professionalUserId);
    if (!target?.professionalProfile) {
      throw new NotFoundException("Professional account not found");
    }

    const profile = await this.users.updateProfessionalProfile(target.id, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: input.adminId,
      approvedAt: new Date(),
    });

    await this.auditLog.record({
      actorId: input.adminId,
      action: "PROFESSIONAL_APPROVED",
      entity: "ProfessionalProfile",
      entityId: profile.id,
      metadata: { professionalUserId: target.id },
    });

    return profile;
  }
}
