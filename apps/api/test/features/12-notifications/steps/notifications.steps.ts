import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { NotificationType } from "@prisma/client";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { RunMissedSessionJobUseCase } from "../../../../src/client-training-execution/application/use-cases/run-missed-session-job.use-case";
import { RunSessionReminderJobUseCase } from "../../../../src/client-training-execution/application/use-cases/run-session-reminder-job.use-case";
import { RunWeeklySummaryReadyJobUseCase } from "../../../../src/dashboard/application/use-cases/run-weekly-summary-ready-job.use-case";
import { RunMissedFoodLogJobUseCase } from "../../../../src/nutrition/application/use-cases/run-missed-food-log-job.use-case";
import { RunCheckInDueJobUseCase } from "../../../../src/relationships/application/use-cases/run-check-in-due-job.use-case";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature("test/features/12-notifications/notifications.feature");

let world: AuthTestWorld;
let response: request.Response;
let threadId: string;

type Specialization = "PERSONAL_TRAINER" | "NUTRITIONIST";

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

async function seedProfessionalAndLogin(
  email: string,
  specialization: Specialization,
  approvalStatus: "APPROVED" | "PENDING_APPROVAL" = "APPROVED",
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedProfessional(email, {
    password: TEST_PASSWORD,
    approvalStatus,
    specializations: [specialization],
  });
  const token = await loginAndGetToken(email);
  return { user, token };
}

async function seedClientAndLogin(
  email: string,
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedClient(email, { password: TEST_PASSWORD });
  const token = await loginAndGetToken(email);
  return { user, token };
}

// Real HTTP invite+accept — same reasoning as PRD 11's suite: it's what
// fires LINK_STATUS_CHANGED and auto-creates the pair's MessageThread.
async function inviteAndAccept(
  proToken: string,
  clientEmail: string,
  specialization: Specialization,
): Promise<void> {
  const invite = await request(world.http)
    .post("/links/invites")
    .set("Authorization", `Bearer ${proToken}`)
    .send({ clientEmail, specializations: [specialization] });
  const clientToken = await loginAndGetToken(clientEmail);
  await request(world.http)
    .post(`/links/${invite.body[0].id}/accept`)
    .set("Authorization", `Bearer ${clientToken}`);
}

async function notificationsFor(
  token: string,
  type: NotificationType,
): Promise<Array<{ id: string; type: string; title: string; readAt: string | null }>> {
  const res = await request(world.http)
    .get("/notifications")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  return (res.body.notifications as Array<{ type: string }>).filter(
    (n) => n.type === type,
  );
}

// Every trigger scenario shares the same account scaffolding: an approved
// professional, a verified client, and (when the trigger routes through a
// link or thread) the relationship between them. The steps below spell it
// out in each scenario's Gherkin instead of a Background block — matching
// the existing suites' convention.
defineFeature(feature, (test) => {
  beforeAll(async () => {
    world = await AuthTestWorld.boot();
  });
  afterAll(async () => {
    await world.close();
  });
  beforeEach(async () => {
    await world.reset();
  });

  test("A new message produces exactly one NEW_MESSAGE notification and an email for the recipient", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";
    let notificationId = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        proToken = (await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER")).token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        clientToken = (await seedClientAndLogin("cli@example.com")).token;
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
        const pro = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pro@example.com" },
        });
        const cli = await world.prisma.user.findUniqueOrThrow({
          where: { email: "cli@example.com" },
        });
        threadId = (
          await world.prisma.messageThread.findUniqueOrThrow({
            where: {
              professionalId_clientId: {
                professionalId: pro.id,
                clientId: cli.id,
              },
            },
          })
        ).id;
      },
    );

    when('the professional sends the message "Bem-vindo ao programa!" in that pair\'s thread', async () => {
      response = await request(world.http)
        .post(`/messaging/threads/${threadId}/messages`)
        .set("Authorization", `Bearer ${proToken}`)
        .send({ body: "Bem-vindo ao programa!" });
      expect(response.status).toBe(201);
    });

    then(
      'the client has exactly 1 notification of type "NEW_MESSAGE" titled "Nova mensagem de Test Professional"',
      async () => {
        const list = await notificationsFor(clientToken, "NEW_MESSAGE");
        expect(list).toHaveLength(1);
        expect(list[0].title).toBe("Nova mensagem de Test Professional");
        notificationId = list[0].id;
      },
    );

    and('an email was sent to "cli@example.com"', () => {
      const mail = world.mailer.lastMailTo("cli@example.com");
      expect(mail).toBeTruthy();
      expect(mail!.subject).toContain("Nova mensagem");
    });

    and("the client's unread notification count is 1", async () => {
      const res = await request(world.http)
        .get("/notifications")
        .set("Authorization", `Bearer ${clientToken}`);
      expect(res.body.unreadCount).toBe(1);
    });

    when("the client marks that notification read", async () => {
      response = await request(world.http)
        .patch(`/notifications/${notificationId}/read`)
        .set("Authorization", `Bearer ${clientToken}`);
      expect(response.status).toBe(200);
    });

    then("the client's unread notification count is 0", async () => {
      const res = await request(world.http)
        .get("/notifications")
        .set("Authorization", `Bearer ${clientToken}`);
      expect(res.body.unreadCount).toBe(0);
    });
  });

  test("A due check-in produces a CHECK_IN_DUE notification for the client", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";
    let pro: UserWithProfiles;
    let cli: UserWithProfiles;

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
        pro = seeded.user;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        cli = seeded.user;
      },
    );

    and(
      'an ACTIVE PERSONAL_TRAINER link between them with a check-in schedule due at "2026-09-21"',
      async () => {
        const link = await world.seedLink(pro, cli, {
          specialization: "PERSONAL_TRAINER",
          status: "ACTIVE",
          linkedAt: new Date("2026-09-01T00:00:00.000Z"),
        });
        await world.seedCheckInSchedule(link, pro.id, { nextDueAt: "2026-09-21" });
      },
    );

    when('the check-in due job runs at "2026-09-22T12:00:00.000Z"', async () => {
      const job = world.app.get(RunCheckInDueJobUseCase) as RunCheckInDueJobUseCase;
      await job.execute({ now: new Date("2026-09-22T12:00:00.000Z") });
    });

    then('the client has exactly 1 notification of type "CHECK_IN_DUE"', async () => {
      expect(await notificationsFor(clientToken, "CHECK_IN_DUE")).toHaveLength(1);
    });

    and('an email was sent to "cli@example.com"', () => {
      const mail = world.mailer.lastMailTo("cli@example.com");
      expect(mail).toBeTruthy();
      expect(mail!.subject).toContain("Check-in");
    });
  });

  test("The session-reminder job notifies the client once per session even when re-run", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";
    let pro: UserWithProfiles;
    let cli: UserWithProfiles;

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
        pro = seeded.user;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        cli = seeded.user;
      },
    );

    and("an ACTIVE PERSONAL_TRAINER link between them", async () => {
      await world.seedLink(pro, cli, {
        specialization: "PERSONAL_TRAINER",
        status: "ACTIVE",
        linkedAt: new Date("2026-09-01T00:00:00.000Z"),
      });
    });

    and('the client has a SCHEDULED session on "2026-09-22"', async () => {
      await world.seedTrainingSession(cli, pro, {
        date: "2026-09-22",
        status: "SCHEDULED",
      });
    });

    when('the session-reminder job runs at "2026-09-22T08:00:00.000Z"', async () => {
      const job = world.app.get(RunSessionReminderJobUseCase) as RunSessionReminderJobUseCase;
      const result = await job.execute({ now: new Date("2026-09-22T08:00:00.000Z") });
      expect(result.remindedCount).toBe(1);
    });

    then('the client has exactly 1 notification of type "SESSION_REMINDER"', async () => {
      expect(await notificationsFor(clientToken, "SESSION_REMINDER")).toHaveLength(1);
    });

    when('the session-reminder job runs again at "2026-09-22T08:05:00.000Z"', async () => {
      const job = world.app.get(RunSessionReminderJobUseCase) as RunSessionReminderJobUseCase;
      const result = await job.execute({ now: new Date("2026-09-22T08:05:00.000Z") });
      expect(result.remindedCount).toBe(1);
    });

    then('the client still has exactly 1 notification of type "SESSION_REMINDER"', async () => {
      expect(await notificationsFor(clientToken, "SESSION_REMINDER")).toHaveLength(1);
    });
  });

  test("The missed-session job notifies the client when yesterday's session went unlogged", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";
    let pro: UserWithProfiles;
    let cli: UserWithProfiles;

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        pro = seeded.user;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        cli = seeded.user;
      },
    );

    and("an ACTIVE PERSONAL_TRAINER link between them", async () => {
      await world.seedLink(pro, cli, {
        specialization: "PERSONAL_TRAINER",
        status: "ACTIVE",
        linkedAt: new Date("2026-09-01T00:00:00.000Z"),
      });
    });

    and('the client has a SCHEDULED session on "2026-09-21"', async () => {
      await world.seedTrainingSession(cli, pro, {
        date: "2026-09-21",
        status: "SCHEDULED",
      });
    });

    when('the missed-session job runs at "2026-09-22T12:00:00.000Z"', async () => {
      const job = world.app.get(RunMissedSessionJobUseCase) as RunMissedSessionJobUseCase;
      const result = await job.execute({ now: new Date("2026-09-22T12:00:00.000Z") });
      expect(result.flaggedCount).toBe(1);
    });

    then('the client has exactly 1 notification of type "MISSED_SESSION"', async () => {
      expect(await notificationsFor(clientToken, "MISSED_SESSION")).toHaveLength(1);
    });
  });

  test("Confirming a nutrition plan notifies the client", async ({
    given,
    when,
    then,
    and,
  }) => {
    let nutriToken = "";
    let clientToken = "";
    let cli: UserWithProfiles;

    given(
      'an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in',
      async () => {
        nutriToken = (await seedProfessionalAndLogin("nutri@example.com", "NUTRITIONIST")).token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        cli = seeded.user;
      },
    );

    and("an ACTIVE NUTRITIONIST link between them", async () => {
      const nutri = await world.prisma.user.findUniqueOrThrow({
        where: { email: "nutri@example.com" },
      });
      await world.seedLink(nutri, cli, {
        specialization: "NUTRITIONIST",
        status: "ACTIVE",
        linkedAt: new Date("2026-09-01T00:00:00.000Z"),
      });
    });

    and("the client has a recorded body assessment", async () => {
      // The draft's Mifflin inputs require a height-bearing formal
      // assessment — posted via the real admin route (same seeder shape
      // PRD 08's own suite uses), since seedBodyAssessment is weight-only.
      await world.seedAdmin("admin@example.com");
      const adminToken = await loginAndGetToken("admin@example.com");
      const res = await request(world.http)
        .post(`/body-assessments/clients/${cli.id}/formal`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ weight: 75, height: 178 });
      expect(res.status).toBe(201);
    });

    when("the nutritionist generates a draft plan for the client and confirms it", async () => {
      const draft = await request(world.http)
        .post(`/nutrition/clients/${cli.id}/draft`)
        .set("Authorization", `Bearer ${nutriToken}`)
        .send({});
      expect(draft.status).toBe(201);
      response = await request(world.http)
        .post(`/nutrition/plans/${draft.body.id}/confirm`)
        .set("Authorization", `Bearer ${nutriToken}`)
        .send({
          calorieTarget: 2200,
          macroTargets: { protein: 160, carbs: 220, fat: 70 },
        });
      expect(response.status).toBe(200);
    });

    then(
      'the client has exactly 1 notification of type "PLAN_UPDATED" titled "Plano de nutrição atualizado"',
      async () => {
        const list = await notificationsFor(clientToken, "PLAN_UPDATED");
        expect(list).toHaveLength(1);
        expect(list[0].title).toBe("Plano de nutrição atualizado");
      },
    );

    and('an email was sent to "cli@example.com"', () => {
      const mail = world.mailer.lastMailTo("cli@example.com");
      expect(mail).toBeTruthy();
      expect(mail!.subject).toContain("nutrição");
    });
  });

  test("The weekly-summary job notifies both the client and the linked professional", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";
    let pro: UserWithProfiles;
    let cli: UserWithProfiles;

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
        pro = seeded.user;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        cli = seeded.user;
      },
    );

    and("an ACTIVE PERSONAL_TRAINER link between them", async () => {
      await world.seedLink(pro, cli, {
        specialization: "PERSONAL_TRAINER",
        status: "ACTIVE",
        linkedAt: new Date("2026-09-01T00:00:00.000Z"),
      });
    });

    when('the weekly-summary job runs on Monday "2026-09-21T10:00:00.000Z"', async () => {
      const job = world.app.get(
        RunWeeklySummaryReadyJobUseCase,
      ) as RunWeeklySummaryReadyJobUseCase;
      const result = await job.execute({ now: new Date("2026-09-21T10:00:00.000Z") });
      expect(result.emittedCount).toBe(1);
    });

    then('the client has exactly 1 notification of type "WEEKLY_SUMMARY_READY"', async () => {
      expect(await notificationsFor(clientToken, "WEEKLY_SUMMARY_READY")).toHaveLength(1);
    });

    and('the professional has exactly 1 notification of type "WEEKLY_SUMMARY_READY"', async () => {
      expect(await notificationsFor(proToken, "WEEKLY_SUMMARY_READY")).toHaveLength(1);
    });
  });

  test("The missed-food-log job notifies a client with an active plan who logged nothing yesterday", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";
    let nutri: UserWithProfiles;
    let cli: UserWithProfiles;

    given(
      'an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in',
      async () => {
        nutri = (await seedProfessionalAndLogin("nutri@example.com", "NUTRITIONIST")).user;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        cli = seeded.user;
      },
    );

    and("an ACTIVE NUTRITIONIST link between them", async () => {
      await world.seedLink(nutri, cli, {
        specialization: "NUTRITIONIST",
        status: "ACTIVE",
        linkedAt: new Date("2026-09-01T00:00:00.000Z"),
      });
    });

    and("the client has an ACTIVE nutrition plan", async () => {
      await world.seedActiveNutritionPlan(cli.id, nutri.id);
    });

    when('the missed-food-log job runs at "2026-09-22T12:00:00.000Z"', async () => {
      const job = world.app.get(RunMissedFoodLogJobUseCase) as RunMissedFoodLogJobUseCase;
      const result = await job.execute({ now: new Date("2026-09-22T12:00:00.000Z") });
      expect(result.missedCount).toBe(1);
    });

    then('the client has exactly 1 notification of type "MISSED_FOOD_LOG"', async () => {
      expect(await notificationsFor(clientToken, "MISSED_FOOD_LOG")).toHaveLength(1);
    });
  });

  test("Disabling a non-critical trigger's email stops delivery but keeps the in-app notification", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        proToken = (await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER")).token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        clientToken = (await seedClientAndLogin("cli@example.com")).token;
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
        const pro = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pro@example.com" },
        });
        const cli = await world.prisma.user.findUniqueOrThrow({
          where: { email: "cli@example.com" },
        });
        threadId = (
          await world.prisma.messageThread.findUniqueOrThrow({
            where: {
              professionalId_clientId: {
                professionalId: pro.id,
                clientId: cli.id,
              },
            },
          })
        ).id;
      },
    );

    and('the client disables email for "NEW_MESSAGE" notifications', async () => {
      const res = await request(world.http)
        .put("/notifications/preferences/NEW_MESSAGE")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ emailEnabled: false });
      expect(res.status).toBe(200);
      // The invite flow's own mail already landed; clear it so the "no
      // email" assertion below is about the message send only.
      world.mailer.sent.length = 0;
    });

    when('the professional sends the message "Oi" in that pair\'s thread', async () => {
      response = await request(world.http)
        .post(`/messaging/threads/${threadId}/messages`)
        .set("Authorization", `Bearer ${proToken}`)
        .send({ body: "Oi" });
      expect(response.status).toBe(201);
    });

    then('the client has exactly 1 notification of type "NEW_MESSAGE"', async () => {
      expect(await notificationsFor(clientToken, "NEW_MESSAGE")).toHaveLength(1);
    });

    and('no email was sent to "cli@example.com"', () => {
      expect(world.mailer.lastMailTo("cli@example.com")).toBeUndefined();
    });
  });

  test("The approval-decision email cannot be disabled via preferences", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let adminToken = "";
    let pro: UserWithProfiles;

    given(
      'a pending professional "pro@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin(
          "pro@example.com",
          "PERSONAL_TRAINER",
          "PENDING_APPROVAL",
        );
        pro = seeded.user;
        proToken = seeded.token;
      },
    );

    and(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        adminToken = await loginAndGetToken("admin@example.com");
      },
    );

    when('the professional tries to disable email for "APPROVAL_DECISION" notifications', async () => {
      response = await request(world.http)
        .put("/notifications/preferences/APPROVAL_DECISION")
        .set("Authorization", `Bearer ${proToken}`)
        .send({ emailEnabled: false });
    });

    then("the request is rejected with status 400", () => {
      expect(response.status).toBe(400);
    });

    when('the admin approves "pro@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/professionals/${pro.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });

    then('the professional has exactly 1 notification of type "APPROVAL_DECISION"', async () => {
      expect(await notificationsFor(proToken, "APPROVAL_DECISION")).toHaveLength(1);
    });

    and('an email was sent to "pro@example.com"', () => {
      const mail = world.mailer.lastMailTo("pro@example.com");
      expect(mail).toBeTruthy();
      expect(mail!.subject).toContain("aprovada");
    });
  });

  test("Password reset is sent immediately regardless of preferences and leaves no preference row", async ({
    given,
    when,
    then,
    and,
  }) => {
    let clientToken = "";

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        clientToken = (await seedClientAndLogin("cli@example.com")).token;
      },
    );

    when('the client requests a password reset for "cli@example.com"', async () => {
      response = await request(world.http)
        .post("/auth/password-reset/request")
        .send({ email: "cli@example.com" });
      expect(response.status).toBe(200);
    });

    then('an email was sent to "cli@example.com"', () => {
      const mail = world.mailer.lastMailTo("cli@example.com");
      expect(mail).toBeTruthy();
      expect(mail!.subject).toContain("password");
      // And it still carries the 64-hex token the existing flow asserts on.
      expect(world.mailer.tokenSentTo("cli@example.com")).toMatch(/^[0-9a-f]{64}$/);
    });

    and('the client has a notification of type "PASSWORD_RESET"', async () => {
      expect(await notificationsFor(clientToken, "PASSWORD_RESET")).toHaveLength(1);
    });

    and('the client\'s preferences list contains no "PASSWORD_RESET" entry', async () => {
      const res = await request(world.http)
        .get("/notifications/preferences")
        .set("Authorization", `Bearer ${clientToken}`);
      expect(res.status).toBe(200);
      const types = (res.body.preferences as Array<{ type: string }>).map(
        (p) => p.type,
      );
      expect(types).not.toContain("PASSWORD_RESET");
      expect(types).toContain("NEW_MESSAGE");
      expect(types).toContain("APPROVAL_DECISION");
    });

    when('the client tries to disable email for "PASSWORD_RESET" notifications', async () => {
      response = await request(world.http)
        .put("/notifications/preferences/PASSWORD_RESET")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ emailEnabled: false });
    });

    then("the request is rejected with status 400", () => {
      expect(response.status).toBe(400);
    });
  });
});
