import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Role, Specialization } from "@prisma/client";
import type { UserWithProfiles } from "../../domain/ports/user.repository.port";

// PRD 08 §4 — "A Professional without the NUTRITIONIST specialization
// cannot create or confirm a nutrition plan, even for their own linked
// client." Exact same shape as PersonalTrainerGuard (PRD 06): apply after
// JwtAuthGuard + @Roles() on Nutrition Module mutation routes. Admins (and
// any non-Professional role a route also allows) pass through
// unconditionally — this only narrows PROFESSIONAL callers.
@Injectable()
export class NutritionistGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: UserWithProfiles = context.switchToHttp().getRequest().user;

    if (user.role !== Role.PROFESSIONAL) return true;

    if (
      !user.professionalProfile?.specializations.includes(
        Specialization.NUTRITIONIST,
      )
    ) {
      throw new ForbiddenException(
        "This feature requires the Nutritionist specialization",
      );
    }
    return true;
  }
}
