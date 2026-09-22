import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/09-today-this-week-dashboard/today-this-week-dashboard.feature",
);

let world: AuthTestWorld;
let response: request.Response;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

async function seedClientAndLogin(
  email: string,
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedClient(email, { password: TEST_PASSWORD });
  const token = await loginAndGetToken(email);
  return { user, token };
}

async function seedProfessionalAndLogin(
  email: string,
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedProfessional(email, {
    password: TEST_PASSWORD,
    approvalStatus: "APPROVED",
    specializations: ["PERSONAL_TRAINER"],
  });
  const token = await loginAndGetToken(email);
  return { user, token };
}

beforeAll(async () => {
  world = await AuthTestWorld.boot();
});
afterAll(async () => {
  await world.close();
});
beforeEach(async () => {
  await world.reset();
});

defineFeature(feature, (test) => {
  test("The Today view aggregates today's session, unread messages, habits/tasks due, and the next check-in", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";
    let client: UserWithProfiles;
    let professional: UserWithProfiles;
    let link: { id: string };

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        client = seeded.user;
        clientToken = seeded.token;
      },
    );

    and(
      'an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER" linked ACTIVE to that client',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        link = await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    and("that link has a check-in due tomorrow", async () => {
      await world.seedCheckInSchedule(link, professional.id, {
        nextDueAt: addDaysIso(todayIso(), 1),
      });
    });

    and('that professional sent that client an unread message "Como foi o treino hoje?"', async () => {
      const thread = await world.seedMessageThread(professional, client);
      await world.seedMessage(thread.id, professional.id, "Como foi o treino hoje?");
    });

    and("that client has a COMPLETED training session today with one logged set", async () => {
      await world.seedTrainingSession(client, professional, {
        date: todayIso(),
        status: "COMPLETED",
        loggedSets: [{ actualReps: 10, actualLoad: 50 }],
      });
    });

    and('that client has a DAILY habit named "Alongar" due and unchecked today', async () => {
      await world.seedHabit(client.id, { name: "Alongar" });
    });

    and('that client has a task with text "Comprar whey" due today, not done', async () => {
      await world.seedTask(client.id, { text: "Comprar whey", dueDate: todayIso() });
    });

    when("the client fetches the Today dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/today")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the Today response has status 200", () => {
      expect(response.status).toBe(200);
    });

    and("the Today response's training session is today's and COMPLETED, not a rest day", () => {
      expect(response.body.training.isRestDay).toBe(false);
      expect(response.body.training.session.status).toBe("COMPLETED");
      expect(response.body.training.session.date.slice(0, 10)).toBe(todayIso());
    });

    and('the Today response shows 1 unread message from "pro@example.com"', () => {
      expect(response.body.messages.unreadTotal).toBe(1);
      expect(response.body.messages.unreadThreads).toHaveLength(1);
      expect(response.body.messages.unreadThreads[0].professional.id).toBe(professional.id);
    });

    and('the Today response\'s habits include "Alongar" and its tasks include "Comprar whey"', () => {
      const habitNames = response.body.habits.map((h: { name: string }) => h.name);
      const taskTexts = response.body.tasks.map((t: { text: string }) => t.text);
      expect(habitNames).toContain("Alongar");
      expect(taskTexts).toContain("Comprar whey");
    });

    and("the Today response's checkInDue is tomorrow", () => {
      expect(response.body.checkInDue.slice(0, 10)).toBe(addDaysIso(todayIso(), 1));
    });
  });

  test("The Today view degrades gracefully for a Client with no Professional, no active nutrition plan, and no habits", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";

    given(
      'a verified client "solo@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("solo@example.com");
        clientToken = seeded.token;
      },
    );

    when("the client fetches the Today dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/today")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the Today response has status 200", () => {
      expect(response.status).toBe(200);
    });

    and("the Today response's training session is null and it is a rest day", () => {
      expect(response.body.training.session).toBeNull();
      expect(response.body.training.isRestDay).toBe(true);
    });

    and("the Today response's nutrition has a null activeTarget and zero totals", () => {
      expect(response.body.nutrition.activeTarget).toBeNull();
      expect(response.body.nutrition.totals).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });

    and("the Today response's habits and tasks are both empty", () => {
      expect(response.body.habits).toEqual([]);
      expect(response.body.tasks).toEqual([]);
    });

    and("the Today response's checkInDue is null", () => {
      expect(response.body.checkInDue).toBeNull();
    });
  });

  test("The This Week strip reflects each day's session status, and non-CANCELLED sessions drive the adherence percent", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";
    let client: UserWithProfiles;
    let professional: UserWithProfiles;

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        client = seeded.user;
        clientToken = seeded.token;
      },
    );

    and(
      'an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER" linked ACTIVE to that client',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        await world.seedLink(professional, client, { status: "ACTIVE", linkedAt: new Date() });
      },
    );

    and("that client has a COMPLETED training session today with one logged set", async () => {
      await world.seedTrainingSession(client, professional, {
        date: todayIso(),
        status: "COMPLETED",
        loggedSets: [{ actualReps: 10, actualLoad: 50 }],
      });
    });

    and("that client has a MISSED training session 2 days ago", async () => {
      await world.seedTrainingSession(client, professional, {
        date: addDaysIso(todayIso(), -2),
        status: "MISSED",
      });
    });

    and("that client has a CANCELLED training session 3 days ago", async () => {
      await world.seedTrainingSession(client, professional, {
        date: addDaysIso(todayIso(), -3),
        status: "CANCELLED",
      });
    });

    when("the client fetches the Week dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/week")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the Week response has status 200", () => {
      expect(response.status).toBe(200);
    });

    and("the Week strip shows COMPLETED for today and MISSED 2 days ago", () => {
      const strip = response.body.strip as Array<{ date: string; status: string }>;
      expect(strip.find((d) => d.date === todayIso())?.status).toBe("COMPLETED");
      expect(strip.find((d) => d.date === addDaysIso(todayIso(), -2))?.status).toBe("MISSED");
    });

    and("the Week strip shows REST for days with no session", () => {
      const strip = response.body.strip as Array<{ date: string; status: string }>;
      const noSessionDay = strip.find((d) => d.date === addDaysIso(todayIso(), -1));
      expect(noSessionDay?.status).toBe("REST");
    });

    and("the Week trainingAdherence is 1 completed out of 2 scheduled", () => {
      // CANCELLED (3 days ago) is excluded from the denominator entirely.
      expect(response.body.trainingAdherence).toEqual({
        completed: 1,
        scheduledTotal: 2,
        percent: 50,
      });
    });
  });

  test("The weekly summary's volume trend and weight trend are computed from this week vs. the prior week", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";
    let client: UserWithProfiles;
    let professional: UserWithProfiles;

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        client = seeded.user;
        clientToken = seeded.token;
      },
    );

    and(
      'an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER" linked ACTIVE to that client',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        await world.seedLink(professional, client, { status: "ACTIVE", linkedAt: new Date() });
      },
    );

    and(
      "that client has a COMPLETED training session today with a logged set of 10 reps at 60kg",
      async () => {
        await world.seedTrainingSession(client, professional, {
          date: todayIso(),
          status: "COMPLETED",
          loggedSets: [{ actualReps: 10, actualLoad: 60 }],
        });
      },
    );

    and(
      "that client has a COMPLETED training session 9 days ago with a logged set of 10 reps at 40kg",
      async () => {
        await world.seedTrainingSession(client, professional, {
          date: addDaysIso(todayIso(), -9),
          status: "COMPLETED",
          loggedSets: [{ actualReps: 10, actualLoad: 40 }],
        });
      },
    );

    and("that client has a body assessment of 81kg recorded 9 days ago", async () => {
      await world.seedBodyAssessment(client.id, {
        weight: 81,
        recordedAt: addDaysIso(todayIso(), -9),
      });
    });

    and("that client has a body assessment of 79.5kg recorded today", async () => {
      await world.seedBodyAssessment(client.id, { weight: 79.5, recordedAt: todayIso() });
    });

    when("the client fetches the Week dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/week")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the Week response's volumeTrend shows this week heavier than the prior week", () => {
      expect(response.body.volumeTrend.thisWeekTonnage).toBe(600);
      expect(response.body.volumeTrend.priorWeekTonnage).toBe(400);
      expect(response.body.volumeTrend.deltaPercent).toBe(50);
    });

    and("the Week response's weightTrend shows a loss versus the prior entry", () => {
      expect(response.body.weightTrend).toEqual({ latest: 79.5, previous: 81, deltaKg: -1.5 });
    });
  });

  test("No Professional or Admin account can access the dashboard endpoints at all", async ({
    given,
    when,
    then,
  }) => {
    let proToken = "";
    let adminToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com");
        proToken = seeded.token;
      },
    );

    given('an admin "admin@example.com" with password "S3cure!Pass" who is logged in', async () => {
      await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    when("the professional tries to fetch the Today dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/today")
        .set("Authorization", `Bearer ${proToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the professional tries to fetch the Week dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/week")
        .set("Authorization", `Bearer ${proToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to fetch the Today dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/today")
        .set("Authorization", `Bearer ${adminToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to fetch the Week dashboard", async () => {
      response = await request(world.http)
        .get("/dashboard/week")
        .set("Authorization", `Bearer ${adminToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });
});
