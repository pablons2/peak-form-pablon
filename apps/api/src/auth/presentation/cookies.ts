import type { Response } from "express";

export const REFRESH_TOKEN_COOKIE = "refresh_token";

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days, matches REFRESH_TOKEN_TTL
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/auth" });
}
