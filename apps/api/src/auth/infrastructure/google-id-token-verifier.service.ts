import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import type {
  GoogleTokenVerifier,
  VerifiedGoogleIdentity,
} from "../domain/ports/google-token-verifier.port";

// Verifies the ID token server-side (never trust a client-asserted email —
// base doc §9) using GOOGLE_CLIENT_ID as the expected audience. Only the
// client ID is needed here; the client *secret* is only used by NextAuth's
// server-side OAuth code exchange in apps/web, never by this API.
@Injectable()
export class GoogleIdTokenVerifierService implements GoogleTokenVerifier {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.clientId = config.getOrThrow<string>("GOOGLE_CLIENT_ID");
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
    } catch {
      throw new UnauthorizedException("Invalid Google ID token");
    }

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException("Google ID token has no email");
    }

    return {
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      fullName: payload.name ?? payload.email,
    };
  }
}
