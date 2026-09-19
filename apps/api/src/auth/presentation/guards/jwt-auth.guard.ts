import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserStatus } from "@prisma/client";
import { TOKEN_SERVICE, type TokenService } from "../../domain/ports/token.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";
import { IS_PUBLIC_KEY } from "../../../shared/decorators/public.decorator";

// PRD 01 §10 — every authenticated route is rejected (401) if the access
// token is missing, expired, invalid, OR no longer matches the user's
// current state (deactivated, or tokenVersion bumped by a password reset).
// Registered globally as APP_GUARD in AuthModule; routes opt out via @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException("Missing access token");

    const payload = this.tokens.verifyAccessToken(token);
    const user = await this.users.findById(payload.sub);

    if (
      !user ||
      user.status === UserStatus.DEACTIVATED ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException("Invalid or expired session");
    }

    request.user = user;
    return true;
  }

  private extractBearerToken(header?: string): string | null {
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length).trim() || null;
  }
}
