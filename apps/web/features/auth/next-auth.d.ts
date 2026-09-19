import type { DefaultSession } from "next-auth";

// Carries the API-issued session (PRD 01) through NextAuth's JWT → session.
// approvalStatus is null for non-professionals; for PROFESSIONAL users it is
// what gates them into Professional-only areas (UX layer only — the API's
// ApprovalStatusGuard is the real boundary). All augmented fields are
// optional because they don't exist on the JWT until the first sign-in
// populates them.
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id?: string;
      role?: "ADMIN" | "PROFESSIONAL" | "CLIENT";
      status?: "ACTIVE" | "DEACTIVATED";
      emailVerified?: boolean;
      approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | null;
    } & DefaultSession["user"];
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
    role?: "ADMIN" | "PROFESSIONAL" | "CLIENT";
    status?: "ACTIVE" | "DEACTIVATED";
    emailVerified?: boolean;
    approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | null;
  }

  interface Account {
    peakform?: {
      accessToken: string;
      refreshToken: string;
      user: import("./api-client").PublicUser;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    userId?: string;
    role?: "ADMIN" | "PROFESSIONAL" | "CLIENT";
    status?: "ACTIVE" | "DEACTIVATED";
    emailVerified?: boolean;
    approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | null;
    error?: string;
  }
}
