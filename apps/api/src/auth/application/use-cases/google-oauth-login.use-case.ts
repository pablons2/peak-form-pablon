import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { GoogleIdTokenInput } from "@peakform/validation";
import { UserStatus } from "@prisma/client";
import {
  GOOGLE_TOKEN_VERIFIER,
  type GoogleTokenVerifier,
} from "../../domain/ports/google-token-verifier.port";
import { TOKEN_SERVICE, type TokenService } from "../../domain/ports/token.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/ports/user.repository.port";
import { LoginUseCase, type AuthTokens } from "./login.use-case";

export type GoogleOAuthResult =
  | { status: "authenticated"; tokens: AuthTokens }
  | { status: "signup_required"; completionToken: string; email: string; fullName: string };

// PRD 01 §5.1/§5.3 — Google already verifies the email, so an existing
// account logs straight in (and gets 'google' linked to oauthProviders if
// it wasn't already, e.g. a credentials account signing in with Google for
// the first time). A brand-new email can't be turned into a full User yet:
// ClientProfile.dateOfBirth/biologicalSex and ProfessionalProfile's
// specializations/verificationNote never come from Google's profile, so a
// short-lived completion token is handed back for the frontend to finish
// signup via the complete-*-signup endpoints instead.
@Injectable()
export class GoogleOAuthLoginUseCase {
  constructor(
    @Inject(GOOGLE_TOKEN_VERIFIER) private readonly verifier: GoogleTokenVerifier,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly login: LoginUseCase,
  ) {}

  async execute(input: GoogleIdTokenInput): Promise<GoogleOAuthResult> {
    const identity = await this.verifier.verifyIdToken(input.idToken);
    if (!identity.emailVerified) {
      throw new ForbiddenException("Google account email is not verified");
    }

    const existing = await this.users.findByEmail(identity.email);
    if (!existing) {
      return {
        status: "signup_required",
        completionToken: this.tokens.signOAuthCompletionToken({
          email: identity.email,
          fullName: identity.fullName,
        }),
        email: identity.email,
        fullName: identity.fullName,
      };
    }

    if (existing.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException(
        "This account has been deactivated. Contact an administrator.",
      );
    }

    const user = existing.oauthProviders.includes("google")
      ? existing
      : await this.users.update(existing.id, {
          oauthProviders: [...existing.oauthProviders, "google"],
          // Google already verified this email even if the account was
          // originally created via credentials and never clicked its link.
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        });

    return { status: "authenticated", tokens: this.login.issueTokens(user) };
  }
}
