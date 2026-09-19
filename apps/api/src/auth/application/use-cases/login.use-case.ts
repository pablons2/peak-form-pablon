import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { LoginInput } from "@peakform/validation";
import { UserStatus } from "@prisma/client";
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from "../../domain/ports/password-hasher.port";
import { TOKEN_SERVICE, type TokenService } from "../../domain/ports/token.port";
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserWithProfiles,
} from "../../domain/ports/user.repository.port";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(
    input: LoginInput,
  ): Promise<{ user: UserWithProfiles; tokens: AuthTokens }> {
    const user = await this.users.findByEmail(input.email);

    // Same generic failure whether the account doesn't exist, has no
    // password (OAuth-only), or the password is wrong — never let a login
    // attempt reveal which of those it was (base doc §9).
    const passwordOk =
      user?.passwordHash &&
      (await this.hasher.compare(input.password, user.passwordHash));
    if (!user || !passwordOk) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException(
        "This account has been deactivated. Contact an administrator.",
      );
    }

    // Credentials-based signups must verify email before first login (§5.2).
    // Google-issued accounts arrive with emailVerifiedAt already set.
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException("Please verify your email before logging in");
    }

    return { user, tokens: this.issueTokens(user) };
  }

  issueTokens(user: UserWithProfiles): AuthTokens {
    return {
      accessToken: this.tokens.signAccessToken({
        sub: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      }),
      refreshToken: this.tokens.signRefreshToken({
        sub: user.id,
        tokenVersion: user.tokenVersion,
      }),
    };
  }
}
