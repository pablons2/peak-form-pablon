import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { DOMAIN_EVENT_BUS } from "../../../../src/shared/domain-events/domain-event-bus.port";
import type { DomainEventBus } from "../../../../src/shared/domain-events/domain-event-bus.port";
import { RunCheckInDueJobUseCase } from "../../../../src/relationships/application/use-cases/run-check-in-due-job.use-case";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/02-professional-client-relationship/link-lifecycle.feature",
);

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let secondProfessional: UserWithProfiles;
let client: UserWithProfiles;
let proToken: string;
let clientToken: string;
let adminToken: string;
let activeLink: { id: string };
let pendingLinkId: string;
let schedule: { id: string; nextDueAt: Date | string | null };
let jobResult: { firedCount: number; firedScheduleIds: string[] };

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

beforeAll(async () => {
  world = await AuthTestWorld.boot();
});
afterAll(async () => {
  await world.close();
});
beforeEach(async () => {
  await world.reset();
  proToken = "";
  clientToken = "";
  adminToken = "";
});

defineFeature(feature, (test) => {
  test("Professional invites a client; the client accepts and the link becomes ACTIVE", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          password: TEST_PASSWORD,
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        proToken = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          password: TEST_PASSWORD,
        });
        clientToken = await loginAndGetToken("cli@example.com");
      },
    );

    when(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER"',
      async () => {
        response = await request(world.http)
          .post("/links/invites")
          .set("Authorization", `Bearer ${proToken}`)
          .send({ clientEmail: "cli@example.com", specializations: ["PERSONAL_TRAINER"] });
      },
    );

    then('the invite is created with status "PENDING"', () => {
      expect(response.status).toBe(201);
      expect(response.body[0].status).toBe("PENDING");
      expect(response.body[0].specialization).toBe("PERSONAL_TRAINER");
      pendingLinkId = response.body[0].id;
    });

    and("the client is notified by email about the invite", () => {
      expect(world.mailer.lastMailTo("cli@example.com")).toBeTruthy();
    });

    when("the client accepts the invite", async () => {
      response = await request(world.http)
        .post(`/links/${pendingLinkId}/accept`)
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then('the link status is "ACTIVE" with a linkedAt timestamp', () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ACTIVE");
      expect(response.body.linkedAt).toBeTruthy();
    });
  });

  test("A second ACTIVE link of the same specialization is rejected server-side", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pt-one@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER"',
      async () => {
        professional = await world.seedProfessional("pt-one@example.com", {
          password: TEST_PASSWORD,
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
      },
    );

    and(
      'an APPROVED professional "pt-two@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER"',
      async () => {
        secondProfessional = await world.seedProfessional("pt-two@example.com", {
          password: TEST_PASSWORD,
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          password: TEST_PASSWORD,
        });
        clientToken = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client already has an ACTIVE "PERSONAL_TRAINER" link with "pt-one@example.com"',
      async () => {
        activeLink = await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when(
      'the client accepts a pending "PERSONAL_TRAINER" invite from "pt-two@example.com"',
      async () => {
        const invite = await world.seedLink(secondProfessional, client, {
          status: "PENDING",
          specialization: "PERSONAL_TRAINER",
        });
        response = await request(world.http)
          .post(`/links/${invite.id}/accept`)
          .set("Authorization", `Bearer ${clientToken}`);
      },
    );

    then(
      'the acceptance is rejected with status 409 and message "You already have an active trainer — unlink first"',
      () => {
        expect(response.status).toBe(409);
        expect(JSON.stringify(response.body)).toContain(
          "You already have an active trainer — unlink first",
        );
      },
    );
  });

  test("Unlinking preserves the relationship history and cancels active check-in schedules", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          password: TEST_PASSWORD,
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        proToken = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          password: TEST_PASSWORD,
        });
        clientToken = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        activeLink = await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    and(
      "the professional has a RECURRING WEEKLY check-in schedule on that link",
      async () => {
        schedule = await world.prisma.checkInSchedule.create({
          data: {
            linkId: activeLink.id,
            type: "RECURRING",
            cadence: "WEEKLY",
            anchor: 5, // Friday
            nextDueAt: new Date("2026-09-25T00:00:00.000Z"),
            note: "Bring your weigh-in",
            status: "ACTIVE",
            createdById: professional.id,
          },
        });
      },
    );

    when("the client unlinks the relationship", async () => {
      response = await request(world.http)
        .post(`/links/${activeLink.id}/unlink`)
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then('the link status is "UNLINKED" with unlinkedAt and the client recorded as initiator', () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("UNLINKED");
      expect(response.body.unlinkedAt).toBeTruthy();
      expect(response.body.unlinkedById).toBe(client.id);
    });

    and('the check-in schedule status is "CANCELLED"', async () => {
      const row = await world.prisma.checkInSchedule.findUniqueOrThrow({
        where: { id: schedule.id },
      });
      expect(row.status).toBe("CANCELLED");
    });

    and(
      "the link row still exists (history preserved, nothing deleted)",
      async () => {
        const stillThere = await world.prisma.professionalClientLink.findUnique({
          where: { id: activeLink.id },
        });
        expect(stillThere).toBeTruthy();
        expect(stillThere?.status).toBe("UNLINKED");
      },
    );
  });

  test("Admin force-unlinks a relationship and the action is audited", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        adminToken = await loginAndGetToken("admin@example.com");
      },
    );

    and(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER"',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          password: TEST_PASSWORD,
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass"',
      async () => {
        client = await world.seedClient("cli@example.com", {
          password: TEST_PASSWORD,
        });
      },
    );

    and('the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"', async () => {
      activeLink = await world.seedLink(professional, client, {
        status: "ACTIVE",
        linkedAt: new Date(),
      });
    });

    when("the admin force-unlinks the relationship", async () => {
      response = await request(world.http)
        .post(`/admin/links/${activeLink.id}/force-unlink`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('the link status is "UNLINKED"', () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("UNLINKED");
    });

    and(
      'an audit log entry "LINK_FORCE_UNLINKED" records the force-unlink by "admin@example.com"',
      async () => {
        const admin = await world.prisma.user.findUniqueOrThrow({
          where: { email: "admin@example.com" },
        });
        const entry = await world.prisma.auditLog.findFirst({
          where: {
            actorId: admin.id,
            action: "LINK_FORCE_UNLINKED",
            entity: "ProfessionalClientLink",
            entityId: activeLink.id,
          },
        });
        expect(entry).toBeTruthy();
      },
    );
  });

  test("Recurring check-in nextDueAt is computed from cadence and anchor and advances after firing", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          password: TEST_PASSWORD,
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        proToken = await loginAndGetToken("pro@example.com");
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          password: TEST_PASSWORD,
        });
        clientToken = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        activeLink = await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when(
      "the professional creates a RECURRING WEEKLY check-in schedule anchored on Friday for that link",
      async () => {
        response = await request(world.http)
          .post(`/links/${activeLink.id}/check-ins`)
          .set("Authorization", `Bearer ${proToken}`)
          .send({ type: "RECURRING", cadence: "WEEKLY", anchor: 5 });
        schedule = response.body;
      },
    );

    then(
      "the schedule's nextDueAt is the next Friday after creation",
      () => {
        expect(response.status).toBe(201);
        const next = new Date(schedule.nextDueAt!);
        expect(next.getUTCDay()).toBe(5); // Friday
        expect(next.getTime()).toBeGreaterThan(Date.now());
      },
    );

    when("the check-in due job runs past the schedule's nextDueAt", async () => {
      const bus = world.app.get(DOMAIN_EVENT_BUS) as DomainEventBus;
      bus.history.length = 0;
      // Fire the job with a clock past the computed nextDueAt.
      const after = new Date(new Date(schedule.nextDueAt!).getTime() + 60_000);
      jobResult = await (
        world.app.get(RunCheckInDueJobUseCase) as RunCheckInDueJobUseCase
      ).execute({ now: after });
    });

    then(
      "exactly one CHECK_IN_DUE event is emitted for that schedule",
      () => {
        expect(jobResult.firedCount).toBe(1);
        expect(jobResult.firedScheduleIds).toContain(schedule.id);
      },
    );

    and(
      "the schedule's nextDueAt advanced by 7 days",
      async () => {
        const row = await world.prisma.checkInSchedule.findUniqueOrThrow({
          where: { id: schedule.id },
        });
        const before = new Date(schedule.nextDueAt!).getTime();
        expect(row.nextDueAt!.getTime() - before).toBe(7 * 24 * 60 * 60 * 1000);
      },
    );
  });
});
