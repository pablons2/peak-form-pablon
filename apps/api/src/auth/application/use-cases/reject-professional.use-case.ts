import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus } from "@prisma/client";
import type { RejectProfessionalInput } from "@peakform/validation";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";
import {
  APPROVAL_DECISION,
  DOMAIN_EVENT_BUS,
  type ApprovalDecisionPayload,
  type DomainEventBus,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 01 §5.6 — rejection is not a deactivation: User.status stays ACTIVE,
// the record is kept for audit purposes, and the person can still log in
// and see their rejection status (frontend concern — Phase 3 frontend).
//
// The notification itself moved to the APPROVAL_DECISION domain event in
// PRD 12 (delivered by NotificationsModule's dispatcher — email
// non-disableable, §5.3), replacing the direct mailer.send this use-case
// used to make.
@Injectable()
export class RejectProfessionalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly auditLog: AuditLogService,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
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

    const payload: ApprovalDecisionPayload = {
      professionalUserId: target.id,
      decision: "REJECTED",
      reason: input.reason ?? null,
    };
    await this.events.emit({ name: APPROVAL_DECISION, payload });

    return profile;
  }
}
