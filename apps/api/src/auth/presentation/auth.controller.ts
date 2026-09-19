import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle, seconds } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  completeGoogleClientSignupSchema,
  completeGoogleProfessionalSignupSchema,
  googleIdTokenSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupClientSchema,
  signupProfessionalSchema,
  verifyEmailSchema,
  type CompleteGoogleClientSignupInput,
  type CompleteGoogleProfessionalSignupInput,
  type GoogleIdTokenInput,
  type LoginInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type SignupClientInput,
  type SignupProfessionalInput,
  type VerifyEmailInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { DeactivateAccountUseCase } from "../application/use-cases/deactivate-account.use-case";
import { CompleteGoogleClientSignupUseCase } from "../application/use-cases/complete-google-client-signup.use-case";
import { CompleteGoogleProfessionalSignupUseCase } from "../application/use-cases/complete-google-professional-signup.use-case";
import { GoogleOAuthLoginUseCase } from "../application/use-cases/google-oauth-login.use-case";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RefreshAccessTokenUseCase } from "../application/use-cases/refresh-access-token.use-case";
import { RequestPasswordResetUseCase } from "../application/use-cases/request-password-reset.use-case";
import { ResetPasswordUseCase } from "../application/use-cases/reset-password.use-case";
import { SignupClientUseCase } from "../application/use-cases/signup-client.use-case";
import { SignupProfessionalUseCase } from "../application/use-cases/signup-professional.use-case";
import { VerifyEmailUseCase } from "../application/use-cases/verify-email.use-case";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "../../shared/decorators/public.decorator";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "./cookies";
import type { UserWithProfiles } from "../domain/ports/user.repository.port";

// Per-route throttle limits stay at their production defaults unless the
// matching env var overrides them — the local dev stack relaxes them
// (AUTH_THROTTLE_*_LIMIT in .env) because the web BDD suite fires many
// logins/signups from a single IP inside one 60s window.
function throttleLimit(envVar: string, fallback: number): number {
  const override = Number(process.env[envVar]);
  return Number.isFinite(override) && override > 0 ? override : fallback;
}

function toPublicUser(user: UserWithProfiles) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    professional: user.professionalProfile
      ? {
          specializations: user.professionalProfile.specializations,
          approvalStatus: user.professionalProfile.approvalStatus,
        }
      : null,
    client: user.clientProfile
      ? {
          dateOfBirth: user.clientProfile.dateOfBirth,
          biologicalSex: user.clientProfile.biologicalSex,
        }
      : null,
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signupClient: SignupClientUseCase,
    private readonly signupProfessional: SignupProfessionalUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshAccessToken: RefreshAccessTokenUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly deactivateAccount: DeactivateAccountUseCase,
    private readonly googleOAuthLogin: GoogleOAuthLoginUseCase,
    private readonly completeGoogleClientSignup: CompleteGoogleClientSignupUseCase,
    private readonly completeGoogleProfessionalSignup: CompleteGoogleProfessionalSignupUseCase,
  ) {}

  @Public()
  @Throttle({
    default: {
      limit: throttleLimit("AUTH_THROTTLE_SIGNUP_LIMIT", 10),
      ttl: seconds(60),
    },
  })
  @Post("signup/client")
  signupClientHandler(
    @Body(new ZodValidationPipe(signupClientSchema)) body: SignupClientInput,
  ) {
    return this.signupClient.execute(body);
  }

  @Public()
  @Throttle({
    default: {
      limit: throttleLimit("AUTH_THROTTLE_SIGNUP_LIMIT", 10),
      ttl: seconds(60),
    },
  })
  @Post("signup/professional")
  signupProfessionalHandler(
    @Body(new ZodValidationPipe(signupProfessionalSchema))
    body: SignupProfessionalInput,
  ) {
    return this.signupProfessional.execute(body);
  }

  @Public()
  @Post("verify-email")
  async verifyEmailHandler(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailInput,
  ) {
    await this.verifyEmail.execute(body);
    return { verified: true };
  }

  @Public()
  @HttpCode(200)
  @Throttle({
    default: {
      limit: throttleLimit("AUTH_THROTTLE_LOGIN_LIMIT", 5),
      ttl: seconds(60),
    },
  })
  @Post("login")
  async loginHandler(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.login.execute(body);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: toPublicUser(user) };
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  async refreshHandler(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }
    const tokens = await this.refreshAccessToken.execute(refreshToken);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  logoutHandler(@Res({ passthrough: true }) res: Response) {
    clearRefreshTokenCookie(res);
    return { loggedOut: true };
  }

  @Public()
  @HttpCode(200)
  @Throttle({
    default: {
      limit: throttleLimit("AUTH_THROTTLE_RESET_REQUEST_LIMIT", 5),
      ttl: seconds(60),
    },
  })
  @Post("password-reset/request")
  async requestPasswordResetHandler(
    @Body(new ZodValidationPipe(requestPasswordResetSchema))
    body: RequestPasswordResetInput,
  ) {
    await this.requestPasswordReset.execute(body);
    // Always the same response whether or not the email exists (base doc §9).
    return { requested: true };
  }

  @Public()
  @HttpCode(200)
  @Post("password-reset/confirm")
  async resetPasswordHandler(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ) {
    await this.resetPassword.execute(body);
    return { reset: true };
  }

  @Public()
  @HttpCode(200)
  @Throttle({
    default: {
      limit: throttleLimit("AUTH_THROTTLE_OAUTH_LIMIT", 10),
      ttl: seconds(60),
    },
  })
  @Post("oauth/google")
  googleOAuthHandler(
    @Body(new ZodValidationPipe(googleIdTokenSchema)) body: GoogleIdTokenInput,
  ) {
    return this.googleOAuthLogin.execute(body);
  }

  @Public()
  @HttpCode(200)
  @Post("oauth/google/complete-client-signup")
  async completeGoogleClientSignupHandler(
    @Body(new ZodValidationPipe(completeGoogleClientSignupSchema))
    body: CompleteGoogleClientSignupInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.completeGoogleClientSignup.execute(body);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @HttpCode(200)
  @Post("oauth/google/complete-professional-signup")
  async completeGoogleProfessionalSignupHandler(
    @Body(new ZodValidationPipe(completeGoogleProfessionalSignupSchema))
    body: CompleteGoogleProfessionalSignupInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.completeGoogleProfessionalSignup.execute(body);
    setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Get("me")
  meHandler(@CurrentUser() user: UserWithProfiles) {
    return toPublicUser(user);
  }

  @HttpCode(200)
  @Post("me/deactivate")
  async deactivateSelfHandler(@CurrentUser() user: UserWithProfiles) {
    await this.deactivateAccount.execute({
      actorId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
    });
    return { deactivated: true };
  }
}
