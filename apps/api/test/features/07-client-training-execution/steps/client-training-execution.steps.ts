import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { PARQ_QUESTION_CODES } from "../../../../src/intake/domain/par-q-questions";
import { RunMissedSessionJobUseCase } from "../../../../src/client-training-execution/application/use-cases/run-missed-session-job.use-case";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/07-client-training-execution/client-training-execution.feature",
);

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
function daysAgo(n: number): Date {
  return new Date(todayUTC().getTime() - n * 24 * 60 * 60 * 1000);
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function weekdayName(d: Date): string {
  return WEEKDAYS[d.getUTCDay()]!;
}

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let otherProfessional: UserWithProfiles;
let client: UserWithProfiles;
const tokens: Record<string, string> = {};
const exerciseIds: Record<string, string> = {};

let pastSessionId: string;
let pastSessionExerciseId: string;
let pastSessionDate: string;
let todaySessionId: string;
let secondSessionId: string;
let secondSessionExerciseId: string;
let threeSessions: { id: string; date: string }[] = [];
let jobResult: { flaggedCount: number; flaggedSessionIds: string[] };

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

async function completeIntake(email: string) {
  const start = await authed("post", "/intake", email).send();
  const intakeId = start.body.id as string;
  const parqAnswers = Object.fromEntries(PARQ_QUESTION_CODES.map((c) => [c, false]));
  await authed("patch", `/intake/${intakeId}`, email).send({ parqAnswers, painFlags: [] });
  await authed("post", `/intake/${intakeId}/complete`, email).send();
}

async function createExercise(name: string) {
  const res = await authed("post", "/exercises/custom", "pro@example.com").send({
    name,
    muscleGroups: ["CORE"],
    equipment: ["BODYWEIGHT"],
    difficulty: "BEGINNER",
    cues: ["Execute devagar e com controle"],
    mistakes: ["Fazer o movimento rápido demais"],
    contraindicationCodes: [],
  });
  exerciseIds[name] = res.body.id;
}

function exercisePrescription(name: string, targetSets = 3) {
  return {
    exerciseId: exerciseIds[name],
    order: 1,
    targetSets,
    targetRepsMin: 8,
    targetRepsMax: 10,
  };
}

async function sortedSessions(mesoId: string): Promise<{ id: string; date: string }[]> {
  const res = await authed("get", `/mesocycles/${mesoId}/sessions`, "pro@example.com");
  return (res.body as { id: string; date: string }[])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function sessionExerciseId(sessionId: string): Promise<string> {
  const res = await authed("get", `/sessions/${sessionId}`, "cli@example.com");
  return (res.body.sessionExercises as { id: string }[])[0]!.id;
}

async function buildPlan(opts: {
  startDate: Date;
  weeks: number;
  weekday: string;
  exerciseName: string;
  targetSets?: number;
}) {
  const planRes = await authed("post", "/training-plans", "pro@example.com").send({
    clientId: client.id,
    name: "Plano BDD",
    startDate: isoDate(opts.startDate),
  });
  const planId = planRes.body.id as string;
  const mesoRes = await authed(
    "post",
    `/training-plans/${planId}/mesocycles`,
    "pro@example.com",
  ).send({ weeks: opts.weeks, goal: "GENERAL_FITNESS", isDeload: false });
  const mesocycleId = mesoRes.body.id as string;
  await authed("post", `/mesocycles/${mesocycleId}/weekly-template`, "pro@example.com").send({
    entries: [
      {
        weekday: opts.weekday,
        name: "Treino",
        exercises: [exercisePrescription(opts.exerciseName, opts.targetSets ?? 3)],
      },
    ],
  });
  const sessions = await sortedSessions(mesocycleId);
  return { planId, mesocycleId, sessions };
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
  threeSessions = [];
});

defineFeature(feature, (test) => {
  function givenStandardSetup({ given, and }: { given: Function; and: Function }) {
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
      await createExercise("Agachamento Livre BDD");
    });
  }

  test("The Today view shows the scheduled session, or a clear rest-day state", ({
    given,
    and,
    when,
    then,
  }) => {
    givenStandardSetup({ given, and });

    when("the client checks today's session before any plan exists", async () => {
      response = await authed("get", "/training-execution/today", "cli@example.com");
    });

    then("the response reports a rest day with no session", () => {
      expect(response.status).toBe(200);
      expect(response.body.isRestDay).toBe(true);
      expect(response.body.session).toBeNull();
    });

    when("the professional builds a plan with a session scheduled for today", async () => {
      const built = await buildPlan({
        startDate: todayUTC(),
        weeks: 1,
        weekday: weekdayName(todayUTC()),
        exerciseName: "Agachamento Livre BDD",
      });
      todaySessionId = built.sessions[0]!.id;
    });

    and("the client checks today's session", async () => {
      response = await authed("get", "/training-execution/today", "cli@example.com");
    });

    then("the response shows today's scheduled session with its prescribed exercise", () => {
      expect(response.status).toBe(200);
      expect(response.body.isRestDay).toBe(false);
      expect(response.body.session.id).toBe(todaySessionId);
      expect(response.body.session.exercises[0].exerciseName).toBe("Agachamento Livre BDD");
    });
  });

  test("Logging a set updates the last-time reference for that exercise on its next occurrence", ({
    given,
    and,
    when,
    then,
  }) => {
    givenStandardSetup({ given, and });

    and("the professional builds a 2-week plan on today's weekday, starting a week ago", async () => {
      const built = await buildPlan({
        startDate: daysAgo(7),
        weeks: 2,
        weekday: weekdayName(todayUTC()),
        exerciseName: "Agachamento Livre BDD",
      });
      pastSessionId = built.sessions[0]!.id;
      pastSessionDate = built.sessions[0]!.date;
      todaySessionId = built.sessions[1]!.id;
      pastSessionExerciseId = await sessionExerciseId(pastSessionId);
    });

    when("the client logs a set of 8 reps at 60kg on last week's session", async () => {
      response = await authed(
        "post",
        `/training-execution/sessions/${pastSessionId}/exercises/${pastSessionExerciseId}/logs`,
        "cli@example.com",
      ).send({ actualReps: 8, actualLoad: 60 });
    });

    and("the client checks today's session", async () => {
      response = await authed("get", "/training-execution/today", "cli@example.com");
    });

    then('today\'s session shows "Last time: 60kg x 8" for that exercise', () => {
      const ex = response.body.session.exercises[0];
      expect(ex.lastTime).toBeTruthy();
      expect(ex.lastTime.actualReps).toBe(8);
      expect(ex.lastTime.actualLoad).toBe(60);
      void pastSessionDate; // captured for the late-logging scenario's own step
    });
  });

  test("Logging every prescribed set auto-completes the session; logging fewer requires a manual complete", ({
    given,
    and,
    when,
    then,
  }) => {
    givenStandardSetup({ given, and });

    and("the professional builds a plan with 2 prescribed sets for a session scheduled for today", async () => {
      const built = await buildPlan({
        startDate: todayUTC(),
        weeks: 1,
        weekday: weekdayName(todayUTC()),
        exerciseName: "Agachamento Livre BDD",
        targetSets: 2,
      });
      todaySessionId = built.sessions[0]!.id;
    });

    when("the client logs both prescribed sets for today's session", async () => {
      const seId = await sessionExerciseId(todaySessionId);
      await authed(
        "post",
        `/training-execution/sessions/${todaySessionId}/exercises/${seId}/logs`,
        "cli@example.com",
      ).send({ actualReps: 8, actualLoad: 50 });
      response = await authed(
        "post",
        `/training-execution/sessions/${todaySessionId}/exercises/${seId}/logs`,
        "cli@example.com",
      ).send({ actualReps: 8, actualLoad: 52 });
    });

    then("today's session is automatically COMPLETED", () => {
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("COMPLETED");
    });

    given(
      "the professional builds a second plan with 2 prescribed sets for a session scheduled for today",
      async () => {
        const built = await buildPlan({
          startDate: todayUTC(),
          weeks: 1,
          weekday: weekdayName(todayUTC()),
          exerciseName: "Agachamento Livre BDD",
          targetSets: 2,
        });
        secondSessionId = built.sessions[0]!.id;
        secondSessionExerciseId = await sessionExerciseId(secondSessionId);
      },
    );

    when("the client logs only 1 of the 2 prescribed sets for that session", async () => {
      await authed(
        "post",
        `/training-execution/sessions/${secondSessionId}/exercises/${secondSessionExerciseId}/logs`,
        "cli@example.com",
      ).send({ actualReps: 8, actualLoad: 50 });
    });

    and("the client manually marks that session complete", async () => {
      response = await authed(
        "post",
        `/training-execution/sessions/${secondSessionId}/complete`,
        "cli@example.com",
      ).send();
    });

    then("that session is COMPLETED with exactly 1 logged set on file, not fabricated data", () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("COMPLETED");
      expect(response.body.exercises[0].logs).toHaveLength(1);
    });
  });

  test("A Client can still log a set late, against a session whose date has already passed", ({
    given,
    and,
    when,
    then,
  }) => {
    givenStandardSetup({ given, and });

    and("the professional builds a 2-week plan on today's weekday, starting a week ago", async () => {
      const built = await buildPlan({
        startDate: daysAgo(7),
        weeks: 2,
        weekday: weekdayName(todayUTC()),
        exerciseName: "Agachamento Livre BDD",
      });
      pastSessionId = built.sessions[0]!.id;
      pastSessionDate = built.sessions[0]!.date;
      pastSessionExerciseId = await sessionExerciseId(pastSessionId);
    });

    when("the client logs a set on last week's already-past session", async () => {
      response = await authed(
        "post",
        `/training-execution/sessions/${pastSessionId}/exercises/${pastSessionExerciseId}/logs`,
        "cli@example.com",
      ).send({ actualReps: 5 });
    });

    then("the log is accepted and its loggedAt is well after the session's own date", () => {
      expect(response.status).toBe(201);
      const log = response.body.exercises[0].logs[0];
      expect(new Date(log.loggedAt).getTime()).toBeGreaterThan(
        new Date(pastSessionDate).getTime(),
      );
    });
  });

  test("The missed-session job flags an overdue session with no logs, skips one with a log, and never touches a cancelled one", ({
    given,
    and,
    when,
    then,
  }) => {
    givenStandardSetup({ given, and });

    and(
      "the professional builds a 3-week-old plan with three past sessions: untouched, logged, and cancelled",
      async () => {
        const start = daysAgo(30);
        const built = await buildPlan({
          startDate: start,
          weeks: 3,
          weekday: weekdayName(start),
          exerciseName: "Agachamento Livre BDD",
        });
        threeSessions = built.sessions;
        expect(threeSessions).toHaveLength(3);
        const loggedSessionId = threeSessions[1]!.id;
        const seId = await sessionExerciseId(loggedSessionId);
        await authed(
          "post",
          `/training-execution/sessions/${loggedSessionId}/exercises/${seId}/logs`,
          "cli@example.com",
        ).send({ actualReps: 5 });
        await authed(
          "post",
          `/sessions/${threeSessions[2]!.id}/cancel`,
          "pro@example.com",
        ).send();
      },
    );

    when("the missed-session job runs", async () => {
      jobResult = await (
        world.app.get(RunMissedSessionJobUseCase) as RunMissedSessionJobUseCase
      ).execute({ now: new Date() });
    });

    then("the untouched session is flagged MISSED", async () => {
      expect(jobResult.flaggedSessionIds).toContain(threeSessions[0]!.id);
      const res = await authed("get", `/sessions/${threeSessions[0]!.id}`, "cli@example.com");
      expect(res.body.status).toBe("MISSED");
    });

    and("the logged session stays SCHEDULED", async () => {
      const res = await authed("get", `/sessions/${threeSessions[1]!.id}`, "cli@example.com");
      expect(res.body.status).toBe("SCHEDULED");
      expect(jobResult.flaggedSessionIds).not.toContain(threeSessions[1]!.id);
    });

    and("the cancelled session stays CANCELLED", async () => {
      const res = await authed("get", `/sessions/${threeSessions[2]!.id}`, "cli@example.com");
      expect(res.body.status).toBe("CANCELLED");
      expect(jobResult.flaggedSessionIds).not.toContain(threeSessions[2]!.id);
    });
  });

  test(
    "A Professional cannot silently wipe a Client's already-logged performance by replacing a session's exercises",
    ({ given, and, when, then }) => {
      givenStandardSetup({ given, and });

      and("the professional builds a plan with a session scheduled for today", async () => {
        const built = await buildPlan({
          startDate: todayUTC(),
          weeks: 1,
          weekday: weekdayName(todayUTC()),
          exerciseName: "Agachamento Livre BDD",
        });
        todaySessionId = built.sessions[0]!.id;
      });

      and("the client logs a set on today's session", async () => {
        const seId = await sessionExerciseId(todaySessionId);
        await authed(
          "post",
          `/training-execution/sessions/${todaySessionId}/exercises/${seId}/logs`,
          "cli@example.com",
        ).send({ actualReps: 5 });
      });

      when("the professional tries to replace that session's exercises", async () => {
        response = await authed(
          "patch",
          `/sessions/${todaySessionId}/exercises`,
          "pro@example.com",
        ).send({ exercises: [exercisePrescription("Agachamento Livre BDD")] });
      });

      then("the request is rejected with 409, not a raw server error", () => {
        expect(response.status).toBe(409);
      });
    },
  );

  test("A Professional has read-only access to a linked Client's history and cannot log or edit it", ({
    given,
    and,
    when,
    then,
  }) => {
    givenStandardSetup({ given, and });

    and("the professional builds a plan with a session scheduled for today", async () => {
      const built = await buildPlan({
        startDate: todayUTC(),
        weeks: 1,
        weekday: weekdayName(todayUTC()),
        exerciseName: "Agachamento Livre BDD",
      });
      todaySessionId = built.sessions[0]!.id;
    });

    when("the professional views the client's execution history", async () => {
      response = await authed(
        "get",
        `/training-execution/clients/${client.id}/sessions`,
        "pro@example.com",
      );
    });

    then("the response includes today's session", () => {
      expect(response.status).toBe(200);
      const ids = (response.body as { id: string }[]).map((s) => s.id);
      expect(ids).toContain(todaySessionId);
    });

    when("the professional tries to log a set on the client's session", async () => {
      const seId = await sessionExerciseId(todaySessionId);
      response = await authed(
        "post",
        `/training-execution/sessions/${todaySessionId}/exercises/${seId}/logs`,
        "pro@example.com",
      ).send({ actualReps: 5 });
    });

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });

    given(
      'an APPROVED professional "other@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        otherProfessional = await world.seedProfessional("other@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["other@example.com"] = await loginAndGetToken("other@example.com");
        void otherProfessional;
      },
    );

    when(
      "that other professional, with no link to the client, tries to view the client's execution history",
      async () => {
        response = await authed(
          "get",
          `/training-execution/clients/${client.id}/sessions`,
          "other@example.com",
        );
      },
    );

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });
});
