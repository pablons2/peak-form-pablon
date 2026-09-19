import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { SharedModule } from "../shared/shared.module";
import { GOOGLE_TOKEN_VERIFIER } from "./domain/ports/google-token-verifier.port";
import { MAILER } from "./domain/ports/mailer.port";
import { PASSWORD_HASHER } from "./domain/ports/password-hasher.port";
import { TOKEN_SERVICE } from "./domain/ports/token.port";
import { USER_REPOSITORY } from "./domain/ports/user.repository.port";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { GoogleIdTokenVerifierService } from "./infrastructure/google-id-token-verifier.service";
import { JwtTokenService } from "./infrastructure/jwt-token.service";
import { NodemailerMailerService } from "./infrastructure/nodemailer-mailer.service";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository";
import { ApproveProfessionalUseCase } from "./application/use-cases/approve-professional.use-case";
import { CompleteGoogleClientSignupUseCase } from "./application/use-cases/complete-google-client-signup.use-case";
import { CompleteGoogleProfessionalSignupUseCase } from "./application/use-cases/complete-google-professional-signup.use-case";
import { DeactivateAccountUseCase } from "./application/use-cases/deactivate-account.use-case";
import { GoogleOAuthLoginUseCase } from "./application/use-cases/google-oauth-login.use-case";
import { ListPendingProfessionalsUseCase } from "./application/use-cases/list-pending-professionals.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { ReactivateAccountUseCase } from "./application/use-cases/reactivate-account.use-case";
import { RefreshAccessTokenUseCase } from "./application/use-cases/refresh-access-token.use-case";
import { RejectProfessionalUseCase } from "./application/use-cases/reject-professional.use-case";
import { RequestPasswordResetUseCase } from "./application/use-cases/request-password-reset.use-case";
import { ResetPasswordUseCase } from "./application/use-cases/reset-password.use-case";
import { SignupClientUseCase } from "./application/use-cases/signup-client.use-case";
import { SignupProfessionalUseCase } from "./application/use-cases/signup-professional.use-case";
import { VerifyEmailUseCase } from "./application/use-cases/verify-email.use-case";
import { AdminUsersController } from "./presentation/admin-users.controller";
import { AuthController } from "./presentation/auth.controller";
import { ApprovalStatusGuard } from "./presentation/guards/approval-status.guard";
import { JwtAuthGuard } from "./presentation/guards/jwt-auth.guard";
import { RolesGuard } from "./presentation/guards/roles.guard";

@Module({
  imports: [JwtModule.register({}), SharedModule],
  controllers: [AuthController, AdminUsersController],
  providers: [
    // Infrastructure adapters bound to their Domain ports (base doc §7.2 DIP).
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: MAILER, useClass: NodemailerMailerService },
    { provide: GOOGLE_TOKEN_VERIFIER, useClass: GoogleIdTokenVerifierService },

    // Application use-cases.
    SignupClientUseCase,
    SignupProfessionalUseCase,
    VerifyEmailUseCase,
    LoginUseCase,
    RefreshAccessTokenUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    DeactivateAccountUseCase,
    ReactivateAccountUseCase,
    ListPendingProfessionalsUseCase,
    ApproveProfessionalUseCase,
    RejectProfessionalUseCase,
    GoogleOAuthLoginUseCase,
    CompleteGoogleClientSignupUseCase,
    CompleteGoogleProfessionalSignupUseCase,

    // Global guards — order matters: JwtAuthGuard populates request.user
    // before RolesGuard reads it. ApprovalStatusGuard is exported for later
    // modules to apply per-route (@UseGuards) once they have Professional-
    // only endpoints of their own; it isn't global.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    ApprovalStatusGuard,
  ],
  exports: [
    // MAILER and USER_REPOSITORY are generic infrastructure (PRD 02's
    // relationship module reuses both); ApprovalStatusGuard is exported for
    // later modules to apply per-route (@UseGuards) once they have
    // Professional-only endpoints.
    MAILER,
    USER_REPOSITORY,
    ApprovalStatusGuard,
  ],
})
export class AuthModule {}
