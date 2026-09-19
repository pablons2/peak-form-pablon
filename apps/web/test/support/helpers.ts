import { execSync } from "node:child_process";
import path from "node:path";

// Backend plumbing for web BDD Given-steps (PRD 15 §6.1): scenarios run
// against the real dockerized stack — the real API for anything it exposes,
// MailHog's HTTP API for emailed tokens, and a direct SQL insert only for
// what no endpoint can produce (an ADMIN user — there is no admin signup by
// design, PRD 01 §4).

export const API = process.env.API_BASE_URL ?? "http://localhost:3001";
export const MAILHOG = process.env.MAILHOG_URL ?? "http://localhost:8025";
export const TEST_PASSWORD = "S3cure!Pass";

export async function apiPost(
  path: string,
  body: unknown,
  token?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function apiGet(
  path: string,
  token: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

interface MailhogMessage {
  To: { Mailbox: string; Domain: string }[];
  Content: { Headers: { Subject?: string[] }; Body: string };
}

// The API emails raw tokens; MailHog stores bodies quoted-printable, so soft
// line breaks ("=\n") can split the token — strip them before matching.
export async function emailedToken(email: string): Promise<string> {
  const res = await fetch(`${MAILHOG}/api/v2/messages?limit=50`);
  const data = (await res.json()) as { items: MailhogMessage[] };
  const [mailbox, domain] = email.split("@");
  const mail = data.items.find((m) =>
    m.To.some((t) => t.Mailbox === mailbox && t.Domain === domain),
  );
  const body = mail?.Content.Body.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
  const token = body?.match(/([0-9a-f]{64})/)?.[1];
  if (!token) throw new Error(`No token-bearing email for ${email}`);
  return token;
}

export async function seedClient(email: string): Promise<void> {
  deleteUser(email);
  const signup = await apiPost("/auth/signup/client", {
    email,
    password: TEST_PASSWORD,
    fullName: "BDD Client",
    dateOfBirth: "1993-04-12",
    biologicalSex: "FEMALE",
  });
  if (signup.status !== 201) {
    throw new Error(`client signup failed: ${signup.status}`);
  }
  const verify = await apiPost("/auth/verify-email", {
    token: await emailedToken(email),
  });
  if (verify.status !== 201) throw new Error(`verify failed: ${verify.status}`);
}

export async function seedProfessional(
  email: string,
  opts: { approved?: boolean } = {},
): Promise<string> {
  deleteUser(email);
  const signup = await apiPost("/auth/signup/professional", {
    email,
    password: TEST_PASSWORD,
    fullName: "BDD Professional",
    specializations: ["PERSONAL_TRAINER"],
    verificationNote: "CREF 12345-G/SP",
  });
  if (signup.status !== 201) {
    throw new Error(`professional signup failed: ${signup.status}`);
  }
  const userId = signup.body.userId as string;
  await apiPost("/auth/verify-email", { token: await emailedToken(email) });

  if (opts.approved) {
    const adminToken = await adminLogin();
    const approve = await apiPost(
      `/admin/professionals/${userId}/approve`,
      {},
      adminToken,
    );
    if (approve.status !== 200) {
      throw new Error(`approve failed: ${approve.status}`);
    }
  }
  return userId;
}

export const ADMIN_EMAIL = "bdd.admin@example.com";

// Clean slate for one account (and its profiles via FK CASCADE): scenarios
// delete only the email they own, so parallel workers never wipe each
// other's seeded users — and reruns stay idempotent (a previous run's
// signup/password-reset state for that email never leaks in).
export function deleteUser(email: string): void {
  const repoRoot = path.resolve(process.cwd(), "../..");
  execSync("docker compose exec -T postgres psql -U peakform -d peakform", {
    cwd: repoRoot,
    input: `DELETE FROM users WHERE email = '${email}';`,
    stdio: "pipe",
  });
}

// No admin-signup endpoint exists (PRD 01 §4 — Admin accounts are provisioned,
// not self-registered), so the one seeder the API can't express goes through
// a direct SQL insert on the compose postgres service. The hash is a
// precomputed bcrypt(TEST_PASSWORD) — compare() doesn't care who hashed it,
// and keeping bcrypt out of web's deps lets `next build` typecheck this file.
const ADMIN_PASSWORD_HASH =
  "$2b$04$wLuxeOrHdwE8N9tMR4lhXuKMpf6SHiBZzjsDS990b7CemWjYtaMWW";

export async function ensureAdmin(): Promise<void> {
  const hash = ADMIN_PASSWORD_HASH;
  const sql = `INSERT INTO users (id, email, "fullName", "passwordHash", role, status, "emailVerifiedAt", "tokenVersion", "createdAt", "updatedAt")
VALUES ('bdd-admin-0001', '${ADMIN_EMAIL}', 'BDD Admin', '${hash}', 'ADMIN', 'ACTIVE', now(), 0, now(), now())
ON CONFLICT (email) DO NOTHING;`;
  // Playwright runs from apps/web — the compose file lives at the repo root.
  // SQL goes over stdin so camelCase column quoting survives untouched.
  const repoRoot = path.resolve(process.cwd(), "../..");
  execSync("docker compose exec -T postgres psql -U peakform -d peakform", {
    cwd: repoRoot,
    input: sql,
    stdio: "pipe",
  });
}

async function adminLogin(): Promise<string> {
  await ensureAdmin();
  const login = await apiPost("/auth/login", {
    email: ADMIN_EMAIL,
    password: TEST_PASSWORD,
  });
  if (login.status !== 200) {
    throw new Error(`admin login failed: ${login.status}`);
  }
  return login.body.accessToken as string;
}
