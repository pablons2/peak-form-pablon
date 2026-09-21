import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Role, Specialization } from "@prisma/client";
import type { UserWithProfiles } from "../../domain/ports/user.repository.port";

// PRD 06 §4 — "A Professional without the PERSONAL_TRAINER specialization
// cannot access this module at all, even for their own linked clients."
// Same shape as ApprovalStatusGuard: apply after JwtAuthGuard + @Roles() on
// Training Plan Builder routes. Admins (and any non-Professional role a
// route also allows) pass through unconditionally — this only narrows
// PROFESSIONAL callers.
@Injectable()
export class PersonalTrainerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: UserWithProfiles = context.switchToHttp().getRequest().user;

    if (user.role !== Role.PROFESSIONAL) return true;

    if (
      !user.professionalProfile?.specializations.includes(
        Specialization.PERSONAL_TRAINER,
      )
    ) {
      throw new ForbiddenException(
        "This feature requires the Personal Trainer specialization",
      );
    }
    return true;
  }
}
