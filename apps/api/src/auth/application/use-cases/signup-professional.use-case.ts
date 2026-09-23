import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { SignupProfessionalInput } from "@peakform/validation";
import { NotificationType, Specialization } from "@prisma/client";
import { SendAccountSecurityNotificationUseCase } from "../../../notifications/application/use-cases/send-account-security-notification.use-case";
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

// PRD 01 §5.1 — User.status is ACTIVE immediately; what's gated is the
// separate ProfessionalProfile.approvalStatus (PENDING_APPROVAL by default,
// per the Prisma schema default — this use-case never sets it explicitly).
@Injectable()
export class SignupProfessionalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly securityNotifications: SendAccountSecurityNotificationUseCase,
  ) {}

  async execute(input: SignupProfessionalInput): Promise<{ userId: string }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await this.hasher.hash(input.password);
    const rawToken = generateRawToken();

    const user = await this.users.createProfessional({
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      oauthProviders: [],
      emailVerifiedAt: null,
      specializations: input.specializations as Specialization[],
      verificationNote: input.verificationNote,
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    await this.securityNotifications.execute({
      userId: user.id,
      email: user.email,
      type: NotificationType.EMAIL_VERIFICATION,
      token: rawToken,
      extraText:
        "Once verified, an administrator will review your account before you can create plans for clients.",
    });

    return { userId: user.id };
  }
}
