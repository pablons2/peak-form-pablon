import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { CompleteGoogleClientSignupInput } from "@peakform/validation";
import { TOKEN_SERVICE, type TokenService } from "../../domain/ports/token.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";
import { LoginUseCase, type AuthTokens } from "./login.use-case";

@Injectable()
export class CompleteGoogleClientSignupUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly login: LoginUseCase,
  ) {}

  async execute(input: CompleteGoogleClientSignupInput): Promise<AuthTokens> {
    const { email, fullName } = this.tokens.verifyOAuthCompletionToken(
      input.oauthCompletionToken,
    );

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.users.createClient({
      email,
      fullName,
      passwordHash: null,
      oauthProviders: ["google"],
      emailVerifiedAt: new Date(),
      dateOfBirth: input.dateOfBirth,
      biologicalSex: input.biologicalSex,
    });

    return this.login.issueTokens(user);
  }
}
