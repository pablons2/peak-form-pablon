import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import type { SignupClientInput } from "@peakform/validation";
import {
  SendAccountSecurityNotificationUseCase,
} from "../../../notifications/application/use-cases/send-account-security-notification.use-case";
import {
  EMAIL_VERIFICATION_TTL_MS,
  generateRawToken,
  hashToken,
} from "../../domain/verification-token";
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from "../../domain/ports/password-hasher.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";

// PRD 01 §5.1 — a Client is ACTIVE immediately but still needs to verify
// their email (§5.2) before they can log in.
@Injectable()
export class SignupClientUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly securityNotifications: SendAccountSecurityNotificationUseCase,
  ) {}

  async execute(input: SignupClientInput): Promise<{ userId: string }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await this.hasher.hash(input.password);
    const rawToken = generateRawToken();

    const user = await this.users.createClient({
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      oauthProviders: [],
      emailVerifiedAt: null,
      dateOfBirth: input.dateOfBirth,
      biologicalSex: input.biologicalSex,
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    // PRD 12 §5.1 — the synchronous account-security path: sends the
    // verification email immediately and records the Notification row,
    // bypassing the preference/dispatcher flow entirely.
    await this.securityNotifications.execute({
      userId: user.id,
      email: user.email,
      type: NotificationType.EMAIL_VERIFICATION,
      token: rawToken,
    });

    return { userId: user.id };
  }
}
