import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { CompleteGoogleProfessionalSignupInput } from "@peakform/validation";
import { Specialization } from "@prisma/client";
import { TOKEN_SERVICE, type TokenService } from "../../domain/ports/token.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";
import { LoginUseCase, type AuthTokens } from "./login.use-case";

@Injectable()
export class CompleteGoogleProfessionalSignupUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly login: LoginUseCase,
  ) {}

  async execute(
    input: CompleteGoogleProfessionalSignupInput,
  ): Promise<AuthTokens> {
    const { email, fullName } = this.tokens.verifyOAuthCompletionToken(
      input.oauthCompletionToken,
    );

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.users.createProfessional({
      email,
      fullName,
      passwordHash: null,
      oauthProviders: ["google"],
      emailVerifiedAt: new Date(),
      specializations: input.specializations as Specialization[],
      verificationNote: input.verificationNote,
    });

    return this.login.issueTokens(user);
  }
}
