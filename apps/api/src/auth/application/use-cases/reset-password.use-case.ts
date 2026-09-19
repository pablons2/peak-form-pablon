import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { ResetPasswordInput } from "@peakform/validation";
import { hashToken } from "../../domain/verification-token";
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from "../../domain/ports/password-hasher.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const user = await this.users.findByPasswordResetTokenHash(
      hashToken(input.token),
    );

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await this.hasher.hash(input.newPassword);

    // Bumping tokenVersion is what makes this "invalidate all prior
    // sessions" (PRD 01 §10) — every previously issued access/refresh JWT
    // carries the old version and is rejected from here on (see
    // JwtAuthGuard / RefreshAccessTokenUseCase).
    await this.users.update(user.id, {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      tokenVersion: { increment: 1 },
    });
  }
}
