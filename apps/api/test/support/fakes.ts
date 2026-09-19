import {
  Controller,
  Get,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import type { Mailer } from "../../src/auth/domain/ports/mailer.port";
import type {
  GoogleTokenVerifier,
  VerifiedGoogleIdentity,
} from "../../src/auth/domain/ports/google-token-verifier.port";
import { ApprovalStatusGuard } from "../../src/auth/presentation/guards/approval-status.guard";
import { Roles } from "../../src/auth/presentation/decorators/roles.decorator";

export interface SentMail {
  to: string;
  subject: string;
  text: string;
}

// PRD 15 §5.2 — external dependencies are stubbed at the Infrastructure-layer
// boundary. FakeMailer captures outbound mail instead of touching SMTP, so
// scenarios read verification/reset tokens straight out of the "sent" email
// exactly as a real user would from their inbox.
@Injectable()
export class FakeMailer implements Mailer {
  readonly sent: SentMail[] = [];

  async send(input: SentMail): Promise<void> {
    this.sent.push(input);
  }

  lastMailTo(email: string): SentMail | undefined {
    return [...this.sent].reverse().find((m) => m.to === email);
  }

  // Both transactional emails embed the raw token as a bare 64-hex string
  // ("... using this token: <hex>" / "... reset your password: <hex>").
  tokenSentTo(email: string): string {
    const mail = this.lastMailTo(email);
    const token = mail?.text.match(/([0-9a-f]{64})/)?.[1];
    if (!token) {
      throw new Error(`No token-bearing email found for ${email}`);
    }
    return token;
  }
}

// Deterministic Google verifier. Scenarios pass a fake idToken string instead
// of a real Google-issued JWT: `google:<email>:<full name>` verifies as a
// Google-owned, verified identity; `google-unverified:<email>:<name>` simulates
// a Google account whose email is not verified; anything else is invalid.
@Injectable()
export class FakeGoogleTokenVerifier implements GoogleTokenVerifier {
  async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    const [scheme, email, ...rest] = idToken.split(":");
    if (!email || rest.length === 0) {
      throw new UnauthorizedException("Invalid Google ID token");
    }
    if (scheme === "google") {
      return { email, emailVerified: true, fullName: rest.join(":") };
    }
    if (scheme === "google-unverified") {
      return { email, emailVerified: false, fullName: rest.join(":") };
    }
    throw new UnauthorizedException("Invalid Google ID token");
  }
}

// Test-only probe route. PRD 01 §10 requires PENDING_APPROVAL professionals to
// be blocked from Professional-only features, but the first real
// Professional-only endpoints only arrive with PRD 02/06 — so this probe
// applies the exact guard stack those endpoints will use
// (@Roles(PROFESSIONAL) + ApprovalStatusGuard) to exercise the gate today.
@Roles(Role.PROFESSIONAL)
@UseGuards(ApprovalStatusGuard)
@Controller("probe")
export class ProfessionalOnlyProbeController {
  @Get("professional-only")
  professionalOnly() {
    return { ok: true };
  }
}
