import { Inject, Injectable } from "@nestjs/common";
import type { RequestPasswordResetInput } from "@peakform/validation";
import {
  PASSWORD_RESET_TTL_MS,
  generateRawToken,
  hashToken,
} from "../../domain/verification-token";
import { MAILER, type Mailer } from "../../domain/ports/mailer.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    // Always behave the same whether or not the email exists — a differing
    // response here would let an attacker enumerate registered emails.
    if (!user) return;

    const rawToken = generateRawToken();
    await this.users.update(user.id, {
      passwordResetTokenHash: hashToken(rawToken),
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });

    await this.mailer.send({
      to: user.email,
      subject: "Reset your PeakForm password",
      text: `Use this token to reset your password: ${rawToken}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    });
  }
}
