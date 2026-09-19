import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { TOKEN_SERVICE, type TokenService } from "../../domain/ports/token.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";
import type { AuthTokens } from "./login.use-case";

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.sub);

    // A password reset bumps tokenVersion (PRD 01 §10 — "invalidates all
    // prior sessions"), so a refresh token minted before that reset no
    // longer matches and is rejected here even though its signature/expiry
    // are still valid.
    if (
      !user ||
      user.status === UserStatus.DEACTIVATED ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException("Invalid or expired session");
    }

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
