import { createHash, randomBytes } from "node:crypto";

// Pure domain logic (base doc §7.2 — no DB/HTTP imports): the raw token only
// ever exists in the emailed link; only its hash is persisted (User.email
// VerificationTokenHash / passwordResetTokenHash), so a DB read never
// exposes a usable token (base doc §9 secrets handling).
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
