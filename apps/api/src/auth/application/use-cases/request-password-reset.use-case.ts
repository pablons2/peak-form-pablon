import { Inject, Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import type { RequestPasswordResetInput } from "@peakform/validation";
import { SendAccountSecurityNotificationUseCase } from "../../../notifications/application/use-cases/send-account-security-notification.use-case";
import {
  PASSWORD_RESET_TTL_MS,
  generateRawToken,
  hashToken,
} from "../../domain/verification-token";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly securityNotifications: SendAccountSecurityNotificationUseCase,
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

    await this.securityNotifications.execute({
      userId: user.id,
      email: user.email,
      type: NotificationType.PASSWORD_RESET,
      token: rawToken,
    });
  }
}
