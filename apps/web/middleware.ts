import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Route protection (UX convenience only — the API's guards are the real
// security boundary, base doc §9). Unauthenticated users are bounced to
// /login; authenticated Professionals who aren't APPROVED yet are bounced to
// /pending-approval from anywhere else in the app.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (
      token?.role === "PROFESSIONAL" &&
      token.approvalStatus !== "APPROVED" &&
      pathname !== "/pending-approval"
    ) {
      return NextResponse.redirect(new URL("/pending-approval", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  // Only genuinely authenticated areas — auth pages and the landing page stay
  // public. New authenticated routes add their prefix here as modules land.
  matcher: [
    "/dashboard/:path*",
    "/pending-approval",
    "/team/:path*",
    "/clients/:path*",
  ],
};
