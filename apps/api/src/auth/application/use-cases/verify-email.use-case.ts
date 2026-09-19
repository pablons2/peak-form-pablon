import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { VerifyEmailInput } from "@peakform/validation";
import { hashToken } from "../../domain/verification-token";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

@Injectable()
export class VerifyEmailUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: VerifyEmailInput): Promise<void> {
    const user = await this.users.findByEmailVerificationTokenHash(
      hashToken(input.token),
    );

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.users.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });
  }
}
