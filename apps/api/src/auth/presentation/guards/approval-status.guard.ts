import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ApprovalStatus, Role } from "@prisma/client";
import type { UserWithProfiles } from "../../domain/ports/user.repository.port";

// PRD 01 §5.1 — a Professional whose approvalStatus isn't APPROVED can log
// in and see the "waiting for approval" screen, but is blocked from every
// Professional-only feature (plan builder, client list, messaging, ...).
// Apply this guard (after JwtAuthGuard + @Roles(Role.PROFESSIONAL)) on those
// routes as later phases add them — it re-checks the DB-backed status on
// every request rather than trusting a JWT claim, since approval can change
// mid-session.
@Injectable()
export class ApprovalStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: UserWithProfiles = context.switchToHttp().getRequest().user;

    if (user.role !== Role.PROFESSIONAL) return true;

    if (user.professionalProfile?.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        "Your professional account is awaiting admin approval",
      );
    }
    return true;
  }
}
