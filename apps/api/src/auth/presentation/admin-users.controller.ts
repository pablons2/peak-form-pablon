import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  adminListUsersQuerySchema,
  rejectProfessionalSchema,
  type AdminListUsersQuery,
  type RejectProfessionalInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { ApproveProfessionalUseCase } from "../application/use-cases/approve-professional.use-case";
import { DeactivateAccountUseCase } from "../application/use-cases/deactivate-account.use-case";
import { ListPendingProfessionalsUseCase } from "../application/use-cases/list-pending-professionals.use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users.use-case";
import { ReactivateAccountUseCase } from "../application/use-cases/reactivate-account.use-case";
import { RejectProfessionalUseCase } from "../application/use-cases/reject-professional.use-case";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";
import type { UserWithProfiles } from "../domain/ports/user.repository.port";

// PRD 01 §5.5/§5.6 — Admin-only user lifecycle and Professional approval
// queue. Reused as-is by PRD 13's Admin Console (checklist Phase 15) rather
// than duplicated there. `listUsersHandler` below is PRD 13 §5.1's own
// addition — the one piece this controller didn't already have.
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminUsersController {
  constructor(
    private readonly listPendingProfessionals: ListPendingProfessionalsUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly approveProfessional: ApproveProfessionalUseCase,
    private readonly rejectProfessional: RejectProfessionalUseCase,
    private readonly deactivateAccount: DeactivateAccountUseCase,
    private readonly reactivateAccount: ReactivateAccountUseCase,
  ) {}

  // PRD 13 §5.1 — list/search every User with role/status/specializations/
  // approval status. Never leaks passwordHash / token hashes, same rule as
  // the pending-professionals serializer just below.
  @Get("users")
  async listUsersHandler(
    @Query(new ZodValidationPipe(adminListUsersQuerySchema))
    query: AdminListUsersQuery,
  ) {
    const users = await this.listUsers.execute(query);
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt,
      professionalProfile: user.professionalProfile
        ? {
            specializations: user.professionalProfile.specializations,
            approvalStatus: user.professionalProfile.approvalStatus,
            verificationNote: user.professionalProfile.verificationNote,
          }
        : null,
    }));
  }

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
