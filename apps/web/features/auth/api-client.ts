// Typed client for the auth endpoints (PRD 01). Server-side only — it is
// used by NextAuth's authorize()/callbacks and by the server actions in
// ./actions.ts. Browser code never calls the API directly: the access token
// and the refresh token both live inside the NextAuth JWT, and the API's
// httpOnly refresh_token cookie is captured from Set-Cookie and replayed
// server-side as a Cookie header.
import type {
  CompleteGoogleClientSignupInput,
  CompleteGoogleProfessionalSignupInput,
  LoginInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SignupClientInput,
  SignupProfessionalInput,
} from "@peakform/validation";

export function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
  status: "ACTIVE" | "DEACTIVATED";
  emailVerified: boolean;
  professional: {
    specializations: string[];
    approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  } | null;
  client: { dateOfBirth: string; biologicalSex: "MALE" | "FEMALE" } | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginSuccess extends AuthTokens {
  user: PublicUser;
}

// Discriminated result so callers render the right message without parsing
// NestJS error bodies.
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function failure<T>(res: Response, data: { message?: string | string[] }): ApiResult<T> {
  const message = Array.isArray(data.message)
    ? data.message.join(" ")
    : (data.message ?? `Request failed (${res.status})`);
  return { ok: false, status: res.status, message };
}

// The API issues the refresh token as an httpOnly Set-Cookie (Path=/auth),
// not in the JSON body — capture its value for server-side replay.
function refreshTokenFromResponse(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/refresh_token=([^;]+)/);
  return match?.[1] ?? null;
}

// Raw POST that keeps access to response headers (Set-Cookie). Endpoints that
// rotate or issue the refresh cookie need this instead of postJson().
async function postForTokens(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<AuthTokens>> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: "API unreachable" };
  }
  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    tokens?: { accessToken: string; refreshToken: string };
    message?: string | string[];
  };
  if (!res.ok) return failure(res, data);

  // /auth/oauth/google's authenticated shape nests tokens under `tokens`;
  // the rest put accessToken at the top level with refreshToken in the cookie.
  const accessToken = data.accessToken ?? data.tokens?.accessToken;
  const refreshToken =
    refreshTokenFromResponse(res) ?? data.tokens?.refreshToken;
  if (!accessToken || !refreshToken) {
    return { ok: false, status: res.status, message: "Malformed token response" };
  }
  return { ok: true, data: { accessToken, refreshToken } };
}

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: "API unreachable" };
  }
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string | string[];
  };
  if (!res.ok) return failure(res, data);
  return { ok: true, data };
}

async function fetchMe(accessToken: string): Promise<PublicUser | null> {
  const res = await fetch(`${apiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as PublicUser;
}

// /auth/login returns { accessToken, user } plus the refresh Set-Cookie.
export async function loginWithCredentials(
  input: LoginInput,
): Promise<ApiResult<LoginSuccess>> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: "API unreachable" };
  }
  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: PublicUser;
    message?: string | string[];
  };
  if (!res.ok) return failure(res, data);
  const refreshToken = refreshTokenFromResponse(res);
  if (!data.accessToken || !data.user || !refreshToken) {
    return { ok: false, status: res.status, message: "Malformed login response" };
  }
  return {
    ok: true,
    data: { accessToken: data.accessToken, refreshToken, user: data.user },
  };
}

// Server-side replay of the httpOnly refresh cookie — the browser never sees
// it; it lives only inside the NextAuth JWT.
export async function refreshAccessToken(
  refreshToken: string,
): Promise<ApiResult<AuthTokens>> {
  return postForTokens("/auth/refresh", {}, {
    Cookie: `refresh_token=${refreshToken}`,
  });
}

export async function signupClient(input: SignupClientInput) {
  return postJson<{ userId: string }>("/auth/signup/client", input);
}

export async function signupProfessional(input: SignupProfessionalInput) {
  return postJson<{ userId: string }>("/auth/signup/professional", input);
}

export async function verifyEmail(token: string) {
  return postJson<{ verified: boolean }>("/auth/verify-email", { token });
}

export async function requestPasswordReset(input: RequestPasswordResetInput) {
  return postJson<{ requested: boolean }>("/auth/password-reset/request", input);
}

export async function resetPassword(input: ResetPasswordInput) {
  return postJson<{ reset: boolean }>("/auth/password-reset/confirm", input);
}

export interface GoogleOAuthResponse {
  status: "authenticated" | "signup_required";
  tokens?: { accessToken: string; refreshToken: string };
  completionToken?: string;
  email?: string;
  fullName?: string;
}

export async function loginWithGoogleIdToken(idToken: string) {
  return postJson<GoogleOAuthResponse>("/auth/oauth/google", { idToken });
}

// The complete-*-signup endpoints return accessToken + the refresh cookie but
// no user object — fetch /auth/me so the session has the same shape as login.
async function completeGoogleSignup(
  path: string,
  input: CompleteGoogleClientSignupInput | CompleteGoogleProfessionalSignupInput,
): Promise<ApiResult<LoginSuccess>> {
  const tokens = await postForTokens(path, input);
  if (!tokens.ok) return tokens;
  const user = await fetchMe(tokens.data.accessToken);
  if (!user) return { ok: false, status: 0, message: "Could not load profile" };
  return { ok: true, data: { ...tokens.data, user } };
}

export async function completeGoogleClientSignup(
  input: CompleteGoogleClientSignupInput,
) {
  return completeGoogleSignup("/auth/oauth/google/complete-client-signup", input);
}

export async function completeGoogleProfessionalSignup(
  input: CompleteGoogleProfessionalSignupInput,
) {
  return completeGoogleSignup(
    "/auth/oauth/google/complete-professional-signup",
    input,
  );
}
