import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  rejectProfessionalSchema,
  type RejectProfessionalInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { ApproveProfessionalUseCase } from "../application/use-cases/approve-professional.use-case";
import { DeactivateAccountUseCase } from "../application/use-cases/deactivate-account.use-case";
import { ListPendingProfessionalsUseCase } from "../application/use-cases/list-pending-professionals.use-case";
import { ReactivateAccountUseCase } from "../application/use-cases/reactivate-account.use-case";
import { RejectProfessionalUseCase } from "../application/use-cases/reject-professional.use-case";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";
import type { UserWithProfiles } from "../domain/ports/user.repository.port";

// PRD 01 §5.5/§5.6 — Admin-only user lifecycle and Professional approval
// queue. Reused as-is by PRD 13's Admin Console (checklist Phase 15) rather
// than duplicated there.
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminUsersController {
  constructor(
    private readonly listPendingProfessionals: ListPendingProfessionalsUseCase,
    private readonly approveProfessional: ApproveProfessionalUseCase,
    private readonly rejectProfessional: RejectProfessionalUseCase,
    private readonly deactivateAccount: DeactivateAccountUseCase,
    private readonly reactivateAccount: ReactivateAccountUseCase,
  ) {}

  @Get("professionals/pending")
  async listPendingHandler() {
    const pending = await this.listPendingProfessionals.execute();
    // The repository returns the full User row for the join — never let
    // passwordHash / token hashes leave the process, even to an Admin
    // (base doc §9).
    return pending.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      specializations: profile.specializations,
      verificationNote: profile.verificationNote,
      createdAt: profile.createdAt,
      user: {
        id: profile.user.id,
        email: profile.user.email,
        fullName: profile.user.fullName,
        emailVerified: Boolean(profile.user.emailVerifiedAt),
      },
    }));
  }

  @HttpCode(200)
  @Post("professionals/:userId/approve")
  approveHandler(
    @Param("userId") userId: string,
    @CurrentUser() admin: UserWithProfiles,
  ) {
    return this.approveProfessional.execute({
      adminId: admin.id,
      professionalUserId: userId,
    });
  }

  @HttpCode(200)
  @Post("professionals/:userId/reject")
  rejectHandler(
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(rejectProfessionalSchema))
    body: RejectProfessionalInput,
    @CurrentUser() admin: UserWithProfiles,
  ) {
    return this.rejectProfessional.execute({
      adminId: admin.id,
      professionalUserId: userId,
      reason: body.reason,
    });
  }

  @HttpCode(200)
  @Post("users/:userId/deactivate")
  async deactivateHandler(
    @Param("userId") userId: string,
    @CurrentUser() admin: UserWithProfiles,
  ) {
    await this.deactivateAccount.execute({
      actorId: admin.id,
      actorRole: admin.role,
      targetUserId: userId,
    });
    return { deactivated: true };
  }

  @HttpCode(200)
  @Post("users/:userId/reactivate")
  async reactivateHandler(@Param("userId") userId: string) {
    await this.reactivateAccount.execute(userId);
    return { reactivated: true };
  }
}
