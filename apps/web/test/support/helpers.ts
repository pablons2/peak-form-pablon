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

export async function apiPatch(
  path: string,
  body: unknown,
  token: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  opts: { approved?: boolean; specializations?: ("PERSONAL_TRAINER" | "NUTRITIONIST")[] } = {},
): Promise<string> {
  deleteUser(email);
  const signup = await apiPost("/auth/signup/professional", {
    email,
    password: TEST_PASSWORD,
    fullName: "BDD Professional",
    specializations: opts.specializations ?? ["PERSONAL_TRAINER"],
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

// PRD 02 — seeds an ACTIVE ProfessionalClientLink via the real API (invite +
// accept), for web scenarios that need an existing relationship as a
// precondition rather than exercising that flow itself.
export async function seedActiveLink(
  professionalEmail: string,
  clientEmail: string,
  specialization: "PERSONAL_TRAINER" | "NUTRITIONIST" = "PERSONAL_TRAINER",
): Promise<string> {
  const proLogin = await apiPost("/auth/login", {
    email: professionalEmail,
    password: TEST_PASSWORD,
  });
  const proToken = proLogin.body.accessToken as string;
  const invite = await apiPost(
    "/links/invites",
    { clientEmail, specializations: [specialization] },
    proToken,
  );
  const links = invite.body as unknown as { id: string }[];
  const linkId = links[0]?.id;
  if (!linkId) throw new Error(`invite failed: ${invite.status}`);

  const clientLogin = await apiPost("/auth/login", {
    email: clientEmail,
    password: TEST_PASSWORD,
  });
  const clientToken = clientLogin.body.accessToken as string;
  const accept = await apiPost(`/links/${linkId}/accept`, {}, clientToken);
  if (accept.status !== 200) throw new Error(`accept failed: ${accept.status}`);
  return linkId;
}

// PRD 05 — seeds the exercise catalog by running the real import job inside
// the api container (idempotent — re-runs skip unchanged entries). Scenarios
// that need the library populated call this in a Given.
export function ensureExerciseCatalog(): void {
  const repoRoot = path.resolve(process.cwd(), "../..");
  execSync("docker compose exec -T api npm run exercises:import", {
    cwd: repoRoot,
    stdio: "pipe",
  });
}

// Creates a PRIVATE custom exercise through the real API as the given
// professional — for scenarios that need one as a precondition rather than
// exercising the authoring form itself.
export async function seedCustomExercise(
  professionalEmail: string,
  name: string,
  contraindicationCodes: string[] = [],
): Promise<string> {
  // Idempotent across reruns: a previous run's exercise may have been
  // promoted to GLOBAL (owner cleared), in which case deleteUser's cascade
  // can't reach it — delete by name instead.
  const repoRoot = path.resolve(process.cwd(), "../..");
  execSync("docker compose exec -T postgres psql -U peakform -d peakform", {
    cwd: repoRoot,
    input: `DELETE FROM exercises WHERE name = '${name.replaceAll("'", "''")}';`,
    stdio: "pipe",
  });
  const login = await apiPost("/auth/login", {
    email: professionalEmail,
    password: TEST_PASSWORD,
  });
  const res = await apiPost(
    "/exercises/custom",
    {
      name,
      muscleGroups: ["CORE"],
      equipment: ["BODYWEIGHT"],
      difficulty: "BEGINNER",
      cues: ["Execute devagar e com controle"],
      mistakes: ["Fazer o movimento rápido demais"],
      contraindicationCodes,
    },
    login.body.accessToken as string,
  );
  if (res.status !== 201) {
    throw new Error(`custom exercise seed failed: ${res.status}`);
  }
  return res.body.id as string;
}

// PRD 03 — mirrors apps/api/src/intake/domain/par-q-questions.ts's
// PARQ_QUESTION_CODES. Duplicated rather than imported (web and api are
// separate deployable apps — same boundary reason ADMIN_PASSWORD_HASH below
// is a precomputed literal instead of importing bcrypt).
const PARQ_QUESTION_CODES = [
  "HEART_CONDITION",
  "CHEST_PAIN",
  "DIZZINESS_BALANCE",
  "BONE_JOINT_PROBLEM",
  "BLOOD_PRESSURE_MEDICATION",
  "OTHER_MEDICAL_REASON",
];

// Seeds a COMPLETED intake (all readiness questions "no", one CURRENT
// LOWER_BACK pain flag) through the real API — for scenarios that need an
// already-finalized intake as a precondition (the Professional review
// screen) rather than exercising the wizard itself.
export async function seedCompletedIntake(clientEmail: string): Promise<void> {
  const login = await apiPost("/auth/login", {
    email: clientEmail,
    password: TEST_PASSWORD,
  });
  const token = login.body.accessToken as string;
  const start = await apiPost("/intake", {}, token);
  const intakeId = start.body.id as string;
  await apiPatch(
    `/intake/${intakeId}`,
    {
      parqAnswers: Object.fromEntries(PARQ_QUESTION_CODES.map((c) => [c, false])),
      painFlags: [{ region: "LOWER_BACK", severity: 6, pastOrCurrent: "CURRENT" }],
    },
    token,
  );
  const complete = await apiPost(`/intake/${intakeId}/complete`, {}, token);
  if (complete.status !== 200) {
    throw new Error(`intake completion seed failed: ${complete.status}`);
  }
}

// PRD 07 — seeds a plan/mesocycle/weekly-template through the real API whose
// generated Session lands exactly on today's real date (UTC), so the
// Client's actual "/today" page (which always resolves against the real
// clock, not a fixture) has something to show. Mirrors
// apps/api's own client-training-execution BDD date math.
const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function seedPlanWithTodaySession(
  professionalEmail: string,
  clientEmail: string,
  exerciseId: string,
  opts: { targetSets?: number } = {},
): Promise<{ sessionId: string }> {
  // PRD 06 §5.1 — plan creation is gated on the Client's intake being
  // finalized. This module's own scenarios aren't testing that gate (PRD
  // 06's suite already does), so it's satisfied here as an implementation
  // detail of "getting to a session that exists" rather than a step every
  // .feature scenario has to spell out.
  await seedCompletedIntake(clientEmail);
  const proLogin = await apiPost("/auth/login", {
    email: professionalEmail,
    password: TEST_PASSWORD,
  });
  const proToken = proLogin.body.accessToken as string;
  const clientLogin = await apiPost("/auth/login", {
    email: clientEmail,
    password: TEST_PASSWORD,
  });
  const clientRes = await apiGet("/auth/me", clientLogin.body.accessToken as string);
  const today = todayUTC();
  const plan = await apiPost(
    "/training-plans",
    { clientId: clientRes.body.id, name: "Plano BDD", startDate: isoDate(today) },
    proToken,
  );
  const planId = plan.body.id as string;
  const meso = await apiPost(
    `/training-plans/${planId}/mesocycles`,
    { weeks: 1, goal: "GENERAL_FITNESS", isDeload: false },
    proToken,
  );
  const mesocycleId = meso.body.id as string;
  await apiPost(
    `/mesocycles/${mesocycleId}/weekly-template`,
    {
      entries: [
        {
          weekday: WEEKDAYS[today.getUTCDay()],
          name: "Treino",
          exercises: [
            {
              exerciseId,
              order: 1,
              targetSets: opts.targetSets ?? 3,
              targetRepsMin: 8,
              targetRepsMax: 10,
              restSeconds: 90,
            },
          ],
        },
      ],
    },
    proToken,
  );
  const sessions = await apiGet(`/mesocycles/${mesocycleId}/sessions`, proToken);
  const sessionId = (sessions.body as unknown as { id: string }[])[0]?.id;
  if (!sessionId) throw new Error("today's session was not generated");
  return { sessionId };
}

// PRD 08 §5.1 — the Mifflin-St Jeor draft needs a body assessment on file;
// seeded through the real formal-assessment API as Admin (bypasses the
// ACTIVE-link check entirely, PRD 04 §4's Admin row), the same way this
// module's own API-level BDD suite does it — simplest path to "has a body
// assessment" without also standing up a PERSONAL_TRAINER/NUTRITIONIST link
// first.
export async function seedBodyAssessment(clientId: string): Promise<void> {
  const adminToken = await adminLogin();
  const res = await apiPost(
    `/body-assessments/clients/${clientId}/formal`,
    { weight: 75, height: 178 },
    adminToken,
  );
  if (res.status !== 201) {
    throw new Error(`body assessment seed failed: ${res.status}`);
  }
}

// PRD 08 §5.1/§5.2 — seeds an ACTIVE NUTRITIONIST link + body assessment +
// a confirmed (ACTIVE) nutrition target through the real API, for scenarios
// that need an existing confirmed target as a precondition rather than
// exercising the draft/confirm flow itself (already covered by the
// "Nutritionist confirms a draft" scenario in this same suite).
export async function seedConfirmedNutritionTarget(
  professionalEmail: string,
  clientEmail: string,
  calorieTarget = 2000,
): Promise<void> {
  await seedProfessional(professionalEmail, {
    approved: true,
    specializations: ["NUTRITIONIST"],
  });
  await seedClient(clientEmail);
  const clientLogin = await apiPost("/auth/login", {
    email: clientEmail,
    password: TEST_PASSWORD,
  });
  const clientRes = await apiGet("/auth/me", clientLogin.body.accessToken as string);
  await seedBodyAssessment(clientRes.body.id as string);
  await seedActiveLink(professionalEmail, clientEmail, "NUTRITIONIST");

  const proLogin = await apiPost("/auth/login", {
    email: professionalEmail,
    password: TEST_PASSWORD,
  });
  const proToken = proLogin.body.accessToken as string;
  const draft = await apiPost(
    `/nutrition/clients/${clientRes.body.id}/draft`,
    {},
    proToken,
  );
  const planId = draft.body.id as string;
  const confirm = await apiPost(
    `/nutrition/plans/${planId}/confirm`,
    { calorieTarget, macroTargets: { protein: 150, carbs: 200, fat: 65 } },
    proToken,
  );
  if (confirm.status !== 200) {
    throw new Error(`nutrition target confirm seed failed: ${confirm.status}`);
  }
}

export const ADMIN_EMAIL = "bdd.admin@example.com";

// Clean slate for one account (and its profiles via FK CASCADE): scenarios
// delete only the email they own, so parallel workers never wipe each
// other's seeded users — and reruns stay idempotent (a previous run's
// signup/password-reset state for that email never leaks in).
//
// PRD 06's WeeklyMicrocycleTemplateExercise/SessionExercise -> Exercise FK is
// deliberately Restrict (not Cascade — see PrismaExerciseRepository.delete),
// so `DELETE FROM users` alone can fail with a live FK violation once a
// prior (possibly failed) run left a training_plans row referencing an
// exercise this user owns. Sweeping training_plans this user is the
// client/professional/author of first removes that reference via its own
// Cascade chain (TrainingPlan -> Mesocycle -> WeeklyMicrocycleTemplate ->
// ...Exercise rows) before the exercise itself is ever touched.
// `audit_logs.actorId` is also Restrict (append-only trail, base doc §9) —
// PRD 06 §5.6's contraindication-override entries are the first thing in
// this test suite to make a *Professional* test account an audit actor, so
// this is swept too.
//
// PRD 07 adds the same problem one hop deeper: `exercise_logs.sessionExerciseId`
// is also Restrict (deliberately — see prd07's schema comment: a Professional
// editing a Session's exercises must not silently destroy a Client's already
// -logged performance). Once any scenario logs a set, deleting that user's
// `training_plans` row would try to cascade-delete its `session_exercises`
// rows while a Restrict `exercise_logs` row still points at one, hard-failing
// the whole sweep — so the logs are swept first, before the plan sweep ever
// reaches the sessions they're attached to.
export function deleteUser(email: string): void {
  const repoRoot = path.resolve(process.cwd(), "../..");
  execSync("docker compose exec -T postgres psql -U peakform -d peakform", {
    cwd: repoRoot,
    input: `
DELETE FROM exercise_logs WHERE "sessionExerciseId" IN (
  SELECT se.id FROM session_exercises se
  JOIN sessions s ON s.id = se."sessionId"
  JOIN mesocycles m ON m.id = s."mesocycleId"
  JOIN training_plans tp ON tp.id = m."trainingPlanId"
  WHERE tp."professionalId" IN (SELECT id FROM users WHERE email = '${email}')
     OR tp."authoredById" IN (SELECT id FROM users WHERE email = '${email}')
     OR tp."clientId" IN (SELECT id FROM users WHERE email = '${email}')
);
DELETE FROM training_plans WHERE "professionalId" IN (SELECT id FROM users WHERE email = '${email}')
  OR "authoredById" IN (SELECT id FROM users WHERE email = '${email}')
  OR "clientId" IN (SELECT id FROM users WHERE email = '${email}');
DELETE FROM audit_logs WHERE "actorId" IN (SELECT id FROM users WHERE email = '${email}');
DELETE FROM users WHERE email = '${email}';`,
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
