import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 01 §5.5 — Admin-only (enforced by RolesGuard at the route). Restores
// User.status only: does NOT touch ProfessionalProfile.approvalStatus (a
// previously REJECTED Professional stays REJECTED) and does NOT restore any
// ProfessionalClientLink that PRD 02's force-unlink severed — those must be
// re-established explicitly.
@Injectable()
export class ReactivateAccountUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(targetUserId: string): Promise<void> {
    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundException("User not found");

    await this.users.update(target.id, { status: UserStatus.ACTIVE });
  }
}
