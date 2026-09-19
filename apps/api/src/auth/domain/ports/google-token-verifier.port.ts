export const GOOGLE_TOKEN_VERIFIER = Symbol("GOOGLE_TOKEN_VERIFIER");

export interface VerifiedGoogleIdentity {
  email: string;
  emailVerified: boolean;
  fullName: string;
}

export interface GoogleTokenVerifier {
  verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity>;
}
