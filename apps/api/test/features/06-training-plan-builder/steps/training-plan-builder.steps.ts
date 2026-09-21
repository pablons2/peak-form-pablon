import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { PARQ_QUESTION_CODES } from "../../../../src/intake/domain/par-q-questions";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/06-training-plan-builder/training-plan-builder.feature",
);

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let client: UserWithProfiles;
const tokens: Record<string, string> = {};
const exerciseIds: Record<string, string> = {};
let planId: string;
let mesocycleId: string;
let sessionIds: string[] = [];
let sessionDatesBefore: Record<string, string> = {};

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

function authed(method: "get" | "post" | "patch", path: string, email: string) {
  return (request(world.http)[method](path) as request.Test).set(
    "Authorization",
    `Bearer ${tokens[email]}`,
  );
}

async function completeIntake(
  email: string,
  painFlags: { region: string; severity: number; pastOrCurrent: string }[] = [],
) {
  const start = await authed("post", "/intake", email).send();
  const intakeId = start.body.id as string;
  const parqAnswers = Object.fromEntries(PARQ_QUESTION_CODES.map((c) => [c, false]));
  await authed("patch", `/intake/${intakeId}`, email).send({ parqAnswers, painFlags });
  await authed("post", `/intake/${intakeId}/complete`, email).send();
}

async function createExercise(
  actorEmail: string,
  path: string,
  name: string,
  contraindicationCodes: string[] = [],
) {
  const res = await authed("post", path, actorEmail).send({
    name,
    muscleGroups: ["CORE"],
    equipment: ["BODYWEIGHT"],
    difficulty: "BEGINNER",
    cues: ["Execute devagar e com controle"],
    mistakes: ["Fazer o movimento rápido demais"],
    contraindicationCodes,
  });
  exerciseIds[name] = res.body.id;
}

function exercisePrescription(name: string, overrides: Record<string, unknown> = {}) {
  return {
    exerciseId: exerciseIds[name],
    order: 1,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 10,
    ...overrides,
  };
}

async function sortedSessions(mesoId: string): Promise<{ id: string; date: string }[]> {
  const res = await authed("get", `/mesocycles/${mesoId}/sessions`, "pro@example.com");
  return (res.body as { id: string; date: string }[])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

beforeAll(async () => {
  world = await AuthTestWorld.boot();
});
afterAll(async () => {
  await world.close();
});
beforeEach(async () => {
  await world.reset();
  for (const key of Object.keys(tokens)) delete tokens[key];
  for (const key of Object.keys(exerciseIds)) delete exerciseIds[key];
  sessionIds = [];
  sessionDatesBefore = {};
});

defineFeature(feature, (test) => {
  test("A professional without the Personal Trainer specialization cannot create a plan", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in',
      async () => {
        professional = await world.seedProfessional("nutri@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["NUTRITIONIST"],
        });
        tokens["nutri@example.com"] = await loginAndGetToken("nutri@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "NUTRITIONIST" link with "nutri@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          specialization: "NUTRITIONIST",
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when("the professional tries to create a training plan for the client", async () => {
      response = await authed("post", "/training-plans", "nutri@example.com").send({
        clientId: client.id,
        name: "Plano BDD",
        startDate: "2026-01-05",
      });
    });

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("Creating a plan for a client with an incomplete intake is blocked", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["pro@example.com"] = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          specialization: "PERSONAL_TRAINER",
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when("the professional tries to create a training plan for the client", async () => {
      response = await authed("post", "/training-plans", "pro@example.com").send({
        clientId: client.id,
        name: "Plano BDD",
        startDate: "2026-01-05",
      });
    });

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("Saving a weekly template auto-generates dated sessions across the mesocycle span", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["pro@example.com"] = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          specialization: "PERSONAL_TRAINER",
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    and('the client "cli@example.com" has completed their intake', async () => {
      await completeIntake("cli@example.com");
    });

    and('the professional created a custom exercise "Agachamento Livre BDD"', async () => {
      await createExercise("pro@example.com", "/exercises/custom", "Agachamento Livre BDD");
    });

    when(
      "the professional creates a training plan for the client starting 2026-01-05",
      async () => {
        response = await authed("post", "/training-plans", "pro@example.com").send({
          clientId: client.id,
          name: "Plano BDD",
          startDate: "2026-01-05",
        });
        planId = response.body.id;
      },
    );

    and("the professional adds a 2-week mesocycle to the plan", async () => {
      response = await authed(
        "post",
        `/training-plans/${planId}/mesocycles`,
        "pro@example.com",
      ).send({ weeks: 2, goal: "HYPERTROPHY", isDeload: false });
      mesocycleId = response.body.id;
    });

    and(
      "the professional saves a weekly template with sessions on MONDAY and WEDNESDAY",
      async () => {
        response = await authed(
          "post",
          `/mesocycles/${mesocycleId}/weekly-template`,
          "pro@example.com",
        ).send({
          entries: [
            {
              weekday: "MONDAY",
              name: "Treino A",
              exercises: [exercisePrescription("Agachamento Livre BDD")],
            },
            {
              weekday: "WEDNESDAY",
              name: "Treino B",
              exercises: [exercisePrescription("Agachamento Livre BDD")],
            },
          ],
        });
      },
    );

    then("4 sessions were generated for the mesocycle", async () => {
      expect(response.status).toBe(200);
      const sessions = await sortedSessions(mesocycleId);
      expect(sessions).toHaveLength(4);
    });

    and(
      "the generated sessions fall on 2026-01-05, 2026-01-07, 2026-01-12 and 2026-01-14",
      async () => {
        const sessions = await sortedSessions(mesocycleId);
        expect(sessions.map((s) => s.date)).toEqual([
          "2026-01-05T00:00:00.000Z",
          "2026-01-07T00:00:00.000Z",
          "2026-01-12T00:00:00.000Z",
          "2026-01-14T00:00:00.000Z",
        ]);
      },
    );

    when("the professional saves the weekly template again unchanged", async () => {
      response = await authed(
        "post",
        `/mesocycles/${mesocycleId}/weekly-template`,
        "pro@example.com",
      ).send({
        entries: [
          {
            weekday: "MONDAY",
            name: "Treino A",
            exercises: [exercisePrescription("Agachamento Livre BDD")],
          },
          {
            weekday: "WEDNESDAY",
            name: "Treino B",
            exercises: [exercisePrescription("Agachamento Livre BDD")],
          },
        ],
      });
    });

    then("still 4 sessions exist for the mesocycle", async () => {
      const sessions = await sortedSessions(mesocycleId);
      expect(sessions).toHaveLength(4);
    });
  });

  test("Moving, cancelling and editing one session leaves the template and other sessions untouched", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["pro@example.com"] = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          specialization: "PERSONAL_TRAINER",
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    and('the client "cli@example.com" has completed their intake', async () => {
      await completeIntake("cli@example.com");
    });

    and('the professional created a custom exercise "Agachamento Livre BDD"', async () => {
      await createExercise("pro@example.com", "/exercises/custom", "Agachamento Livre BDD");
    });

    and('the professional created a custom exercise "Prancha BDD"', async () => {
      await createExercise("pro@example.com", "/exercises/custom", "Prancha BDD");
    });

    and(
      "the professional has a plan with a mesocycle and a MONDAY/WEDNESDAY weekly template",
      async () => {
        const plan = await authed("post", "/training-plans", "pro@example.com").send({
          clientId: client.id,
          name: "Plano BDD",
          startDate: "2026-01-05",
        });
        planId = plan.body.id;
        const meso = await authed(
          "post",
          `/training-plans/${planId}/mesocycles`,
          "pro@example.com",
        ).send({ weeks: 2, goal: "HYPERTROPHY", isDeload: false });
        mesocycleId = meso.body.id;
        await authed(
          "post",
          `/mesocycles/${mesocycleId}/weekly-template`,
          "pro@example.com",
        ).send({
          entries: [
            {
              weekday: "MONDAY",
              name: "Treino A",
              exercises: [exercisePrescription("Agachamento Livre BDD")],
            },
            {
              weekday: "WEDNESDAY",
              name: "Treino B",
              exercises: [exercisePrescription("Agachamento Livre BDD")],
            },
          ],
        });
        const sessions = await sortedSessions(mesocycleId);
        sessionIds = sessions.map((s) => s.id);
        sessionDatesBefore = Object.fromEntries(sessions.map((s) => [s.id, s.date]));
      },
    );

    when("the professional moves the first generated session to 2026-01-06", async () => {
      response = await authed(
        "post",
        `/sessions/${sessionIds[0]}/move`,
        "pro@example.com",
      ).send({ date: "2026-01-06" });
    });

    then(
      "that session's date is 2026-01-06 and its originalDate is preserved and it is marked overridden",
      () => {
        expect(response.status).toBe(200);
        expect(response.body.date).toBe("2026-01-06T00:00:00.000Z");
        expect(response.body.originalDate).toBe(sessionDatesBefore[sessionIds[0]]);
        expect(response.body.overriddenFromTemplate).toBe(true);
      },
    );

    when("the professional cancels the second generated session", async () => {
      response = await authed(
        "post",
        `/sessions/${sessionIds[1]}/cancel`,
        "pro@example.com",
      ).send();
    });

    then(
      "that session's status is CANCELLED, not MISSED, and no replacement session was created",
      async () => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("CANCELLED");
        const sessions = await sortedSessions(mesocycleId);
        expect(sessions).toHaveLength(4);
      },
    );

    when(
      'the professional edits the third generated session\'s exercises to just "Prancha BDD"',
      async () => {
        response = await authed(
          "patch",
          `/sessions/${sessionIds[2]}/exercises`,
          "pro@example.com",
        ).send({ exercises: [exercisePrescription("Prancha BDD")] });
      },
    );

    then(
      'that session\'s exercises are just "Prancha BDD" and it is marked overridden',
      () => {
        expect(response.status).toBe(200);
        const session = response.body.session;
        expect(session.sessionExercises.map((e: { exerciseName: string }) => e.exerciseName)).toEqual([
          "Prancha BDD",
        ]);
        expect(session.overriddenFromTemplate).toBe(true);
      },
    );

    and(
      'the mesocycle\'s weekly template still prescribes "Agachamento Livre BDD" on MONDAY',
      async () => {
        const planRes = await authed("get", `/training-plans/${planId}`, "pro@example.com");
        const meso = planRes.body.mesocycles.find((m: { id: string }) => m.id === mesocycleId);
        const monday = meso.weeklyTemplates.find((t: { weekday: string }) => t.weekday === "MONDAY");
        expect(monday.exercises.map((e: { exerciseName: string }) => e.exerciseName)).toEqual([
          "Agachamento Livre BDD",
        ]);
      },
    );
  });

  test("Adding a contraindicated exercise shows a warning and is audited", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["pro@example.com"] = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          specialization: "PERSONAL_TRAINER",
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    and(
      'the client "cli@example.com" has completed their intake with a current lower-back pain flag',
      async () => {
        await completeIntake("cli@example.com", [
          { region: "LOWER_BACK", severity: 7, pastOrCurrent: "CURRENT" },
        ]);
      },
    );

    and(
      'the professional created a custom exercise "Levantamento Terra BDD" tagged "LOWER_BACK_LOAD_CAUTION"',
      async () => {
        await createExercise(
          "pro@example.com",
          "/exercises/custom",
          "Levantamento Terra BDD",
          ["LOWER_BACK_LOAD_CAUTION"],
        );
      },
    );

    and("the professional has a plan with a mesocycle", async () => {
      const plan = await authed("post", "/training-plans", "pro@example.com").send({
        clientId: client.id,
        name: "Plano BDD",
        startDate: "2026-01-05",
      });
      planId = plan.body.id;
      const meso = await authed(
        "post",
        `/training-plans/${planId}/mesocycles`,
        "pro@example.com",
      ).send({ weeks: 1, goal: "STRENGTH", isDeload: false });
      mesocycleId = meso.body.id;
    });

    when(
      'the professional saves a weekly template prescribing "Levantamento Terra BDD" on MONDAY',
      async () => {
        response = await authed(
          "post",
          `/mesocycles/${mesocycleId}/weekly-template`,
          "pro@example.com",
        ).send({
          entries: [
            {
              weekday: "MONDAY",
              name: "Treino A",
              exercises: [exercisePrescription("Levantamento Terra BDD")],
            },
          ],
        });
      },
    );

    then(
      'the response includes a contraindication warning for "Levantamento Terra BDD"',
      () => {
        expect(response.status).toBe(200);
        const warnings = response.body.warnings as {
          exerciseName: string;
          matchedTags: string[];
        }[];
        const warning = warnings.find((w) => w.exerciseName === "Levantamento Terra BDD");
        expect(warning).toBeTruthy();
        expect(warning?.matchedTags).toContain("LOWER_BACK_LOAD_CAUTION");
      },
    );

    and(
      'an audit log entry "CONTRAINDICATED_EXERCISE_PRESCRIBED" records the client and the matched tag',
      async () => {
        const entry = await world.prisma.auditLog.findFirst({
          where: { actorId: professional.id, action: "CONTRAINDICATED_EXERCISE_PRESCRIBED" },
        });
        expect(entry).toBeTruthy();
        const metadata = entry?.metadata as { clientId: string; matchedTags: string[] };
        expect(metadata.clientId).toBe(client.id);
        expect(metadata.matchedTags).toContain("LOWER_BACK_LOAD_CAUTION");
      },
    );
  });

  test("A client without a professional self-assigns a Starter Template but cannot edit it", async ({
    given,
    when,
    then,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["pro@example.com"] = await loginAndGetToken("pro@example.com");
      },
    );

    given('the professional created a custom exercise "Agachamento Livre BDD"', async () => {
      await createExercise("pro@example.com", "/exercises/custom", "Agachamento Livre BDD");
    });

    given(
      "the professional authored a starter template with a mesocycle and a MONDAY weekly template",
      async () => {
        const plan = await authed(
          "post",
          "/training-plans/starter-templates",
          "pro@example.com",
        ).send({ name: "Template BDD", startDate: "2026-01-05" });
        planId = plan.body.id;
        const meso = await authed(
          "post",
          `/training-plans/${planId}/mesocycles`,
          "pro@example.com",
        ).send({ weeks: 1, goal: "GENERAL_FITNESS", isDeload: false });
        mesocycleId = meso.body.id;
        await authed(
          "post",
          `/mesocycles/${mesocycleId}/weekly-template`,
          "pro@example.com",
        ).send({
          entries: [
            {
              weekday: "MONDAY",
              name: "Treino A",
              exercises: [exercisePrescription("Agachamento Livre BDD")],
            },
          ],
        });
      },
    );

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in with no professional',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when("the client self-assigns the starter template", async () => {
      response = await authed(
        "post",
        `/training-plans/starter-templates/${planId}/assign`,
        "cli@example.com",
      ).send();
    });

    then(
      "the client has their own new plan cloned from the template with generated sessions",
      async () => {
        expect(response.status).toBe(200);
        expect(response.body.clientId).toBe(client.id);
        expect(response.body.isStarterTemplate).toBe(false);
        expect(response.body.mesocycles).toHaveLength(1);
        const clonedMesocycleId = response.body.mesocycles[0].id;
        const sessions = await authed(
          "get",
          `/mesocycles/${clonedMesocycleId}/sessions`,
          "cli@example.com",
        );
        expect((sessions.body as unknown[]).length).toBeGreaterThan(0);
        sessionIds = (sessions.body as { id: string }[]).map((s) => s.id);
      },
    );

    when("the client tries to edit one of the generated session's exercises", async () => {
      response = await authed(
        "patch",
        `/sessions/${sessionIds[0]}/exercises`,
        "cli@example.com",
      ).send({ exercises: [exercisePrescription("Agachamento Livre BDD")] });
    });

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });
});
