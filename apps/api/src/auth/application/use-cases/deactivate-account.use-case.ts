import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Role, UserStatus } from "@prisma/client";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 01 §5.5 — a user may deactivate their own account; an Admin may
// deactivate anyone's. This ownership-or-role rule is authorization *logic*,
// not a pure role check, so it lives here (base doc §7.2 Application layer),
// not just behind a route guard.
@Injectable()
export class DeactivateAccountUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: {
    actorId: string;
    actorRole: Role;
    targetUserId: string;
  }): Promise<void> {
    if (input.actorRole !== Role.ADMIN && input.actorId !== input.targetUserId) {
      throw new ForbiddenException("You can only deactivate your own account");
    }

    const target = await this.users.findById(input.targetUserId);
    if (!target) throw new NotFoundException("User not found");

    await this.users.update(target.id, { status: UserStatus.DEACTIVATED });

    // Note: flagging a deactivated Professional's active Client links for
    // Admin reassignment, and cascading force-unlink, are PRD 02's job
    // (checklist Phase 4) — this use-case only sets User.status per §5.5.
  }
}
