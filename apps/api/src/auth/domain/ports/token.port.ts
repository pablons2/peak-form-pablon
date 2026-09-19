import type { Role } from "@prisma/client";

export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  tokenVersion: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

// A separate, short-lived token proving a Google identity was verified,
// carried between POST /auth/oauth/google and the profile-completion
// endpoints for a brand-new Client/Professional (PRD 01 §5.1 — Google never
// supplies dateOfBirth/biologicalSex/specializations, so signup is 2 steps).
export interface OAuthCompletionTokenPayload {
  email: string;
  fullName: string;
}

export interface TokenService {
  signAccessToken(payload: AccessTokenPayload): string;
  signRefreshToken(payload: RefreshTokenPayload): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;

  signOAuthCompletionToken(payload: OAuthCompletionTokenPayload): string;
  verifyOAuthCompletionToken(token: string): OAuthCompletionTokenPayload;
}
