import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type {
  AccessTokenPayload,
  OAuthCompletionTokenPayload,
  RefreshTokenPayload,
  TokenService,
} from "../domain/ports/token.port";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
const OAUTH_COMPLETION_TOKEN_TTL = "10m";

@Injectable()
export class JwtTokenService implements TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    // Fail fast rather than silently signing tokens with `undefined` as the
    // secret (base doc §9 — secrets are environment-based, never optional).
    this.accessSecret = this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
    this.refreshSecret = this.config.getOrThrow<string>("JWT_REFRESH_SECRET");
  }

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.accessSecret,
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  signRefreshToken(payload: RefreshTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: REFRESH_TOKEN_TTL,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.verify<AccessTokenPayload>(token, this.accessSecret);
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.verify<RefreshTokenPayload>(token, this.refreshSecret);
  }

  signOAuthCompletionToken(payload: OAuthCompletionTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.accessSecret,
      expiresIn: OAUTH_COMPLETION_TOKEN_TTL,
    });
  }

  verifyOAuthCompletionToken(token: string): OAuthCompletionTokenPayload {
    return this.verify<OAuthCompletionTokenPayload>(token, this.accessSecret);
  }

  private verify<T extends object>(token: string, secret: string): T {
    try {
      return this.jwt.verify<T>(token, { secret });
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
