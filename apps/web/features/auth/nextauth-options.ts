import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { loginSchema } from "@peakform/validation";
import {
  loginWithCredentials,
  loginWithGoogleIdToken,
  refreshAccessToken,
  type PublicUser,
} from "./api-client";

// PeakForm backend JWTs expire in 15m; the refresh cookie lives 30d. Both are
// stored inside the NextAuth JWT (itself an httpOnly cookie), and the refresh
// call to the API is replayed server-side here — the browser only ever holds
// NextAuth's own session cookie.
function accessTokenExpiresAt(accessToken: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1] ?? "", "base64").toString(),
    ) as { exp?: number };
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

function sessionFields(user: PublicUser) {
  return {
    userId: user.id,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    approvalStatus: user.professional?.approvalStatus ?? null,
  };
}

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const result = await loginWithCredentials(parsed.data);
        if (!result.ok) {
          // Surface the API's reason (unverified email, deactivated account)
          // back through NextAuth's ?error= redirect.
          throw new Error(result.message);
        }
        const { accessToken, refreshToken, user } = result.data;
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          accessToken,
          refreshToken,
          ...sessionFields(user),
        };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "google") return true;

      // PRD 01 §5.1/§5.3 — the API owns identity. Exchange Google's id_token:
      // an existing account signs straight in; a new email must finish signup
      // (dateOfBirth/biologicalSex or specializations) on the completion page.
      const idToken = account.id_token;
      if (!idToken) return "/login?error=GoogleTokenMissing";

      const result = await loginWithGoogleIdToken(idToken);
      if (!result.ok) return "/login?error=GoogleSigninFailed";

      const data = result.data;
      if (data.status === "authenticated" && data.tokens) {
        // Stash API tokens + profile on the account object — the jwt callback
        // reads them off the same reference.
        const me = await fetch(
          `${process.env.API_BASE_URL ?? "http://localhost:3001"}/auth/me`,
          { headers: { Authorization: `Bearer ${data.tokens.accessToken}` } },
        );
        const user = (await me.json()) as PublicUser;
        account.peakform = {
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          user,
        };
        return true;
      }

      if (data.status === "signup_required" && data.completionToken) {
        const params = new URLSearchParams({
          token: data.completionToken,
          email: data.email ?? "",
          name: data.fullName ?? "",
        });
        return `/signup/complete?${params.toString()}`;
      }
      return "/login?error=GoogleSigninFailed";
    },

    async jwt({ token, user, account }): Promise<import("next-auth/jwt").JWT> {
      // Fresh credentials sign-in: authorize() put everything on `user`.
      if (user?.accessToken) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: accessTokenExpiresAt(user.accessToken),
          userId: user.userId,
          role: user.role,
          status: user.status,
          // NextAuth's adapter convention types emailVerified as Date | null;
          // ours is a boolean coming off the API's PublicUser shape.
          emailVerified: user.emailVerified === true,
          approvalStatus: user.approvalStatus,
        };
      }

      // Fresh Google sign-in: signIn() stashed the API session on `account`.
      const peakform = account?.peakform;
      if (peakform) {
        return {
          ...token,
          accessToken: peakform.accessToken,
          refreshToken: peakform.refreshToken,
          accessTokenExpires: accessTokenExpiresAt(peakform.accessToken),
          ...sessionFields(peakform.user),
        };
      }

      // Access token still valid — nothing to do.
      if (Date.now() < (token.accessTokenExpires ?? 0)) return token;

      // Expired — replay the refresh cookie server-side (PRD 01 §5.3).
      if (!token.refreshToken) {
        return { ...token, error: "RefreshAccessTokenError" };
      }
      const refreshed = await refreshAccessToken(token.refreshToken);
      if (!refreshed.ok) {
        return { ...token, error: "RefreshAccessTokenError" };
      }
      return {
        ...token,
        accessToken: refreshed.data.accessToken,
        refreshToken: refreshed.data.refreshToken,
        accessTokenExpires: accessTokenExpiresAt(refreshed.data.accessToken),
        error: undefined,
      };
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.user = {
        ...session.user,
        id: token.userId,
        role: token.role,
        status: token.status,
        emailVerified: token.emailVerified,
        approvalStatus: token.approvalStatus,
      };
      return session;
    },
  },
};
