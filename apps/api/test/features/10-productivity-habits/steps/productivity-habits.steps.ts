import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature("test/features/10-productivity-habits/productivity-habits.feature");

let world: AuthTestWorld;
let response: request.Response;

const WEEKDAY_FROM_JS_INDEX = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(iso: string): (typeof WEEKDAY_FROM_JS_INDEX)[number] {
  return WEEKDAY_FROM_JS_INDEX[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]!;
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
  specialization: "PERSONAL_TRAINER" | "NUTRITIONIST",
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedProfessional(email, {
    password: TEST_PASSWORD,
    approvalStatus: "APPROVED",
    specializations: [specialization],
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
  test("A Client creates a DAILY habit and checks it off today, idempotently", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";
    let habitId = "";

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
      },
    );

    when('the client creates a DAILY habit named "Beber agua"', async () => {
      response = await request(world.http)
        .post("/habits")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ name: "Beber agua", cadence: "DAILY" });
    });

    then("the habit is created with status 201", () => {
      expect(response.status).toBe(201);
      habitId = response.body.id;
    });

    when("the client checks that habit off for today", async () => {
      response = await request(world.http)
        .post(`/habits/${habitId}/check-ins`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({});
    });

    then("the check-in is created with status 201", () => {
      expect(response.status).toBe(201);
    });

    and("the habit's streak is 1 and it is checked off today", async () => {
      response = await request(world.http)
        .get("/habits")
        .set("Authorization", `Bearer ${clientToken}`);
      const habit = response.body.find((h: { id: string }) => h.id === habitId);
      expect(habit.streak).toBe(1);
      expect(habit.checkedToday).toBe(true);
    });

    when("the client checks that habit off for today again", async () => {
      response = await request(world.http)
        .post(`/habits/${habitId}/check-ins`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({});
    });

    then("the check-in is still created with status 201", () => {
      expect(response.status).toBe(201);
    });

    and("there is still exactly 1 check-in row for that habit in the database", async () => {
      const count = await world.prisma.habitCheckIn.count({
        where: { habitDefinitionId: habitId },
      });
      expect(count).toBe(1);
    });
  });

  test("Consecutive check-ins build a streak, and a missed day resets it without deleting history", async ({
    given,
    when,
    then,
  }) => {
    let clientToken = "";
    let clientId = "";
    let habitId = "";

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        clientId = seeded.user.id;
      },
    );

    given('that client has a DAILY habit named "Dormir 8h" created 10 days ago', async () => {
      const habit = await world.seedHabit(clientId, {
        name: "Dormir 8h",
        createdAt: new Date(`${addDaysIso(todayIso(), -10)}T00:00:00.000Z`),
      });
      habitId = habit.id;
    });

    given("that habit has check-ins for each of the last 3 days including today", async () => {
      for (const offset of [0, -1, -2]) {
        await world.seedHabitCheckIn(habitId, addDaysIso(todayIso(), offset));
      }
    });

    when("the client lists their habits", async () => {
      response = await request(world.http)
        .get("/habits")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the habit's streak is 3", () => {
      const habit = response.body.find((h: { id: string }) => h.id === habitId);
      expect(habit.streak).toBe(3);
    });

    given('that client has another DAILY habit named "Mobilidade" created 10 days ago', async () => {
      const habit = await world.seedHabit(clientId, {
        name: "Mobilidade",
        createdAt: new Date(`${addDaysIso(todayIso(), -10)}T00:00:00.000Z`),
      });
      habitId = habit.id;
    });

    given("that habit has check-ins for today and for 3 days ago only", async () => {
      await world.seedHabitCheckIn(habitId, todayIso());
      await world.seedHabitCheckIn(habitId, addDaysIso(todayIso(), -3));
    });

    when("the client lists their habits", async () => {
      response = await request(world.http)
        .get("/habits")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then('the streak for "Mobilidade" is 1', () => {
      const habit = response.body.find((h: { name: string }) => h.name === "Mobilidade");
      expect(habit.streak).toBe(1);
    });

    then("the check-in from 3 days ago still exists in the database", async () => {
      const checkIn = await world.prisma.habitCheckIn.findFirst({
        where: {
          habitDefinitionId: habitId,
          date: new Date(`${addDaysIso(todayIso(), -3)}T00:00:00.000Z`),
        },
      });
      expect(checkIn).not.toBeNull();
    });
  });

  test("A SPECIFIC_WEEKDAYS habit only counts its due weekdays, and skips non-due days without counting them", async ({
    given,
    when,
    then,
  }) => {
    let clientToken = "";
    let clientId = "";
    let habitId = "";

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        clientId = seeded.user.id;
      },
    );

    given(
      'that client has a SPECIFIC_WEEKDAYS habit named "Yoga" due on today\'s and yesterday\'s weekdays, created 10 days ago',
      async () => {
        const today = todayIso();
        const yesterday = addDaysIso(today, -1);
        const habit = await world.seedHabit(clientId, {
          name: "Yoga",
          cadence: "SPECIFIC_WEEKDAYS",
          weekdays: [weekdayOf(today), weekdayOf(yesterday)],
          createdAt: new Date(`${addDaysIso(today, -10)}T00:00:00.000Z`),
        });
        habitId = habit.id;
      },
    );

    given("that habit has check-ins for today and yesterday only", async () => {
      await world.seedHabitCheckIn(habitId, todayIso());
      await world.seedHabitCheckIn(habitId, addDaysIso(todayIso(), -1));
    });

    when("the client lists their habits", async () => {
      response = await request(world.http)
        .get("/habits")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then('the streak for "Yoga" is 2', () => {
      const habit = response.body.find((h: { name: string }) => h.name === "Yoga");
      expect(habit.streak).toBe(2);
    });
  });

  test("A Client can create, list, complete and un-complete a personal task", async ({
    given,
    when,
    then,
  }) => {
    let clientToken = "";
    let taskId = "";

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
      },
    );

    when('the client creates a task with text "Agendar avaliacao"', async () => {
      response = await request(world.http)
        .post("/tasks")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ text: "Agendar avaliacao" });
    });

    then("the task is created with status 201", () => {
      expect(response.status).toBe(201);
      taskId = response.body.id;
    });

    when("the client lists their tasks", async () => {
      response = await request(world.http)
        .get("/tasks")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then('the task "Agendar avaliacao" is in the list, not done, with no completedAt', () => {
      const task = response.body.find((t: { id: string }) => t.id === taskId);
      expect(task).toBeTruthy();
      expect(task.done).toBe(false);
      expect(task.completedAt).toBeNull();
    });

    when("the client marks that task as done", async () => {
      response = await request(world.http)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ done: true });
    });

    then("the task is done and has a completedAt timestamp", () => {
      expect(response.body.done).toBe(true);
      expect(response.body.completedAt).toBeTruthy();
    });

    when("the client marks that task as not done", async () => {
      response = await request(world.http)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ done: false });
    });

    then("the task is not done and has no completedAt", () => {
      expect(response.body.done).toBe(false);
      expect(response.body.completedAt).toBeNull();
    });
  });

  test("No Professional or Admin account can access this module's endpoints at all", async ({
    given,
    when,
    then,
  }) => {
    let proToken = "";
    let adminToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    given('an admin "admin@example.com" with password "S3cure!Pass" who is logged in', async () => {
      await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    when("the professional tries to list habits", async () => {
      response = await request(world.http)
        .get("/habits")
        .set("Authorization", `Bearer ${proToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the professional tries to create a habit", async () => {
      response = await request(world.http)
        .post("/habits")
        .set("Authorization", `Bearer ${proToken}`)
        .send({ name: "x" });
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the professional tries to list tasks", async () => {
      response = await request(world.http)
        .get("/tasks")
        .set("Authorization", `Bearer ${proToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the professional tries to create a task", async () => {
      response = await request(world.http)
        .post("/tasks")
        .set("Authorization", `Bearer ${proToken}`)
        .send({ text: "x" });
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the professional tries to fetch the today feed", async () => {
      response = await request(world.http)
        .get("/productivity/today")
        .set("Authorization", `Bearer ${proToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to list habits", async () => {
      response = await request(world.http)
        .get("/habits")
        .set("Authorization", `Bearer ${adminToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to create a habit", async () => {
      response = await request(world.http)
        .post("/habits")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "x" });
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to list tasks", async () => {
      response = await request(world.http)
        .get("/tasks")
        .set("Authorization", `Bearer ${adminToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to create a task", async () => {
      response = await request(world.http)
        .post("/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ text: "x" });
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });

    when("the admin tries to fetch the today feed", async () => {
      response = await request(world.http)
        .get("/productivity/today")
        .set("Authorization", `Bearer ${adminToken}`);
    });
    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("A Client cannot patch, check into, or delete another Client's habit or task", async ({
    given,
    when,
    then,
  }) => {
    let clientAId = "";
    let clientBToken = "";
    let habitAId = "";
    let taskAId = "";

    given(
      'a verified client "cli-a@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli-a@example.com");
        clientAId = seeded.user.id;
      },
    );

    given('that client has a DAILY habit named "Habito da A"', async () => {
      const habit = await world.seedHabit(clientAId, { name: "Habito da A" });
      habitAId = habit.id;
      // Seeded so the "delete a check-in" 404 assertion below has a real
      // check-in row to target — the point under test is ownership, not
      // "no check-in exists".
      await world.seedHabitCheckIn(habitAId, todayIso());
    });

    given('that client has a task with text "Tarefa da A"', async () => {
      const task = await world.seedTask(clientAId, { text: "Tarefa da A" });
      taskAId = task.id;
    });

    given(
      'a verified client "cli-b@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli-b@example.com");
        clientBToken = seeded.token;
      },
    );

    when("client B tries to patch client A's habit", async () => {
      response = await request(world.http)
        .patch(`/habits/${habitAId}`)
        .set("Authorization", `Bearer ${clientBToken}`)
        .send({ name: "Hijacked" });
    });
    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });

    when("client B tries to check into client A's habit", async () => {
      response = await request(world.http)
        .post(`/habits/${habitAId}/check-ins`)
        .set("Authorization", `Bearer ${clientBToken}`)
        .send({});
    });
    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });

    when("client B tries to delete client A's habit check-in", async () => {
      response = await request(world.http)
        .delete(`/habits/${habitAId}/check-ins/${todayIso()}`)
        .set("Authorization", `Bearer ${clientBToken}`);
    });
    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });

    when("client B tries to patch client A's task", async () => {
      response = await request(world.http)
        .patch(`/tasks/${taskAId}`)
        .set("Authorization", `Bearer ${clientBToken}`)
        .send({ text: "Hijacked" });
    });
    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });

    when("client B tries to delete client A's task", async () => {
      response = await request(world.http)
        .delete(`/tasks/${taskAId}`)
        .set("Authorization", `Bearer ${clientBToken}`);
    });
    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });
  });

  test("This module's schema has no foreign key into TrainingPlan, NutritionPlan, or BodyAssessment", async ({
    then,
  }) => {
    then(
      "habit_definitions, habit_check_ins and personal_tasks have zero foreign keys into training_plans, nutrition_plans or body_assessments",
      async () => {
        const rows = await world.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('habit_definitions', 'habit_check_ins', 'personal_tasks')
            AND ccu.table_name IN ('training_plans', 'nutrition_plans', 'body_assessments')
        `;
        expect(Number(rows[0]!.count)).toBe(0);
      },
    );
  });

  test("The Today feed surfaces due habits (each carrying checkedToday) and due tasks, and excludes archived/non-due habits and done tasks", async ({
    given,
    when,
    then,
  }) => {
    let clientToken = "";
    let clientId = "";

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        clientId = seeded.user.id;
      },
    );

    given('that client has a DAILY habit named "Habito de hoje" that is due and unchecked today', async () => {
      await world.seedHabit(clientId, { name: "Habito de hoje" });
    });

    given(
      'that client has a DAILY habit named "Habito ja feito" that is due and checked today',
      async () => {
        const habit = await world.seedHabit(clientId, { name: "Habito ja feito" });
        await world.seedHabitCheckIn(habit.id, todayIso());
      },
    );

    given('that client has a DAILY habit named "Habito arquivado" that is archived', async () => {
      await world.seedHabit(clientId, { name: "Habito arquivado", archivedAt: new Date() });
    });

    given(
      'that client has a SPECIFIC_WEEKDAYS habit named "Habito de outro dia" that is not due today',
      async () => {
        const today = todayIso();
        const todayIndex = WEEKDAY_FROM_JS_INDEX.indexOf(weekdayOf(today));
        const otherWeekday = WEEKDAY_FROM_JS_INDEX[(todayIndex + 3) % 7]!;
        await world.seedHabit(clientId, {
          name: "Habito de outro dia",
          cadence: "SPECIFIC_WEEKDAYS",
          weekdays: [otherWeekday],
        });
      },
    );

    given('that client has a task with text "Tarefa de hoje" due today, not done', async () => {
      await world.seedTask(clientId, { text: "Tarefa de hoje", dueDate: todayIso(), done: false });
    });

    given('that client has a task with text "Tarefa concluida" due today, done', async () => {
      await world.seedTask(clientId, { text: "Tarefa concluida", dueDate: todayIso(), done: true });
    });

    when("the client fetches the today feed", async () => {
      response = await request(world.http)
        .get("/productivity/today")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then('the today feed includes "Habito de hoje" and "Tarefa de hoje"', () => {
      expect(response.status).toBe(200);
      const habitNames = response.body.habits.map((h: { name: string }) => h.name);
      const taskTexts = response.body.tasks.map((t: { text: string }) => t.text);
      expect(habitNames).toContain("Habito de hoje");
      expect(taskTexts).toContain("Tarefa de hoje");
    });

    then('the today feed includes "Habito ja feito" with checkedToday true', () => {
      const habit = response.body.habits.find(
        (h: { name: string }) => h.name === "Habito ja feito",
      );
      expect(habit).toBeDefined();
      expect(habit.checkedToday).toBe(true);
    });

    then(
      'the today feed excludes "Habito arquivado", "Habito de outro dia" and "Tarefa concluida"',
      () => {
        const habitNames = response.body.habits.map((h: { name: string }) => h.name);
        const taskTexts = response.body.tasks.map((t: { text: string }) => t.text);
        expect(habitNames).not.toContain("Habito arquivado");
        expect(habitNames).not.toContain("Habito de outro dia");
        expect(taskTexts).not.toContain("Tarefa concluida");
      },
    );
  });
});
