import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature("test/features/13-admin-console/admin-console.feature");

let world: AuthTestWorld;
let response: request.Response;
let adminToken: string;
let admin: UserWithProfiles;
let professional: UserWithProfiles;
let client: UserWithProfiles;
let link: { id: string };
let exerciseId: string;

function customExercisePayload(name: string) {
  return {
    name,
    muscleGroups: ["CORE"],
    equipment: ["BODYWEIGHT"],
    difficulty: "BEGINNER",
    cues: ["Execute devagar e com controle"],
    mistakes: ["Fazer o movimento rápido demais"],
    contraindicationCodes: ["WRIST_LOAD_CAUTION"],
  };
}

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

async function getUserFromList(email: string) {
  const res = await request(world.http)
    .get(`/admin/users?q=${encodeURIComponent(email)}`)
    .set("Authorization", `Bearer ${adminToken}`);
  return res.body as Array<{
    email: string;
    status: string;
    professionalProfile: { approvalStatus: string } | null;
  }>;
}

interface AuditEntry {
  action: string;
  entity: string;
  entityId: string;
  actorId: string;
  metadata: Record<string, unknown> | null;
}

async function getAuditLog(query: string): Promise<AuditEntry[]> {
  const res = await request(world.http)
    .get(`/admin/audit-log?${query}`)
    .set("Authorization", `Bearer ${adminToken}`);
  return res.body as AuditEntry[];
}

beforeAll(async () => {
  world = await AuthTestWorld.boot();
});
afterAll(async () => {
  await world.close();
});
beforeEach(async () => {
  await world.reset();
  adminToken = "";
});

defineFeature(feature, (test) => {
  test("Admin lists and searches users across every role and status", async ({
    given,
    when,
    then,
    and,
  }) => {
    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    and('a verified client "cli@example.com"', async () => {
      client = await world.seedClient("cli@example.com");
    });

    and(
      'an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER"',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
      },
    );

    when('the admin lists users filtered by role "CLIENT"', async () => {
      response = await request(world.http)
        .get("/admin/users?role=CLIENT")
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('only "cli@example.com" is returned', () => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe("cli@example.com");
    });

    when('the admin searches users for "pro@example"', async () => {
      response = await request(world.http)
        .get("/admin/users?q=pro%40example")
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('only "pro@example.com" is returned', () => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe("pro@example.com");
    });
  });

  test("Admin deactivates and reactivates a client account through the console", async ({
    given,
    when,
    then,
    and,
  }) => {
    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    and('a verified client "cli@example.com"', async () => {
      client = await world.seedClient("cli@example.com");
    });

    when('the admin deactivates "cli@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/users/${client.id}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('the user list shows "cli@example.com" with status "DEACTIVATED"', async () => {
      expect(response.status).toBe(200);
      const [user] = await getUserFromList("cli@example.com");
      expect(user?.status).toBe("DEACTIVATED");
    });

    when('the admin reactivates "cli@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/users/${client.id}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('the user list shows "cli@example.com" with status "ACTIVE"', async () => {
      expect(response.status).toBe(200);
      const [user] = await getUserFromList("cli@example.com");
      expect(user?.status).toBe("ACTIVE");
    });
  });

  test("Approving a pending professional is reflected in the user list and the audit log", async ({
    given,
    when,
    then,
    and,
  }) => {
    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    and(
      'a PENDING professional "pro@example.com" with specialization "NUTRITIONIST"',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "PENDING_APPROVAL",
          specializations: ["NUTRITIONIST"],
        });
      },
    );

    when('the admin approves "pro@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/professionals/${professional.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then(
      'the user list shows "pro@example.com" with approval status "APPROVED"',
      async () => {
        expect(response.status).toBe(200);
        const [user] = await getUserFromList("pro@example.com");
        expect(user?.professionalProfile?.approvalStatus).toBe("APPROVED");
      },
    );

    and(
      'the audit log filtered by action "PROFESSIONAL_APPROVED" includes an entry for "pro@example.com"',
      async () => {
        const entries = await getAuditLog("action=PROFESSIONAL_APPROVED");
        expect(
          entries.some((e) => e.metadata?.professionalUserId === professional.id),
        ).toBe(true);
      },
    );
  });

  test("Force-unlinking a relationship is reflected in the audit log, filterable by action and entity", async ({
    given,
    when,
    then,
    and,
  }) => {
    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    and(
      'an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER"',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
      },
    );

    and('a verified client "cli@example.com"', async () => {
      client = await world.seedClient("cli@example.com");
    });

    and('the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"', async () => {
      link = await world.seedLink(professional, client, {
        status: "ACTIVE",
        linkedAt: new Date(),
      });
    });

    when("the admin force-unlinks that relationship", async () => {
      response = await request(world.http)
        .post(`/admin/links/${link.id}/force-unlink`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('the audit log filtered by action "LINK_FORCE_UNLINKED" includes exactly one entry', async () => {
      expect(response.status).toBe(200);
      const entries = await getAuditLog("action=LINK_FORCE_UNLINKED");
      expect(entries).toHaveLength(1);
      expect(entries[0]?.entityId).toBe(link.id);
    });

    and(
      'the audit log filtered by entity "ProfessionalClientLink" includes exactly one entry',
      async () => {
        const entries = await getAuditLog("entity=ProfessionalClientLink");
        expect(entries).toHaveLength(1);
        expect(entries[0]?.entityId).toBe(link.id);
      },
    );
  });

  test("Promoting a custom exercise is reflected in the audit log, filterable by actor and date range", async ({
    given,
    when,
    then,
    and,
    but,
  }) => {
    let proToken: string;

    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    and(
      'an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER"',
      async () => {
        professional = await world.seedProfessional("pro@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        proToken = await loginAndGetToken("pro@example.com");
      },
    );

    and('the professional has authored a custom exercise "Supino inclinado BDD"', async () => {
      const res = await request(world.http)
        .post("/exercises/custom")
        .set("Authorization", `Bearer ${proToken}`)
        .send(customExercisePayload("Supino inclinado BDD"));
      exerciseId = res.body.id;
    });

    when('the admin promotes "Supino inclinado BDD" to the global library', async () => {
      response = await request(world.http)
        .post(`/admin/exercises/${exerciseId}/promote`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then(
      'the audit log filtered by actor "admin@example.com" includes an entry for "Supino inclinado BDD"',
      async () => {
        expect(response.status).toBe(200);
        const entries = await getAuditLog(`actorId=${admin.id}`);
        expect(entries.some((e) => e.entityId === exerciseId)).toBe(true);
      },
    );

    and(
      'the audit log filtered by a date range spanning today includes an entry for "Supino inclinado BDD"',
      async () => {
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const oneMinuteFromNow = new Date(Date.now() + 60_000);
        const entries = await getAuditLog(
          `from=${startOfToday.toISOString()}&to=${oneMinuteFromNow.toISOString()}`,
        );
        expect(entries.some((e) => e.entityId === exerciseId)).toBe(true);
      },
    );

    but(
      'the audit log filtered by a date range before today has no entry for "Supino inclinado BDD"',
      async () => {
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const twoDaysAgo = new Date(startOfToday.getTime() - 2 * 24 * 60 * 60 * 1000);
        const justBeforeToday = new Date(startOfToday.getTime() - 1);
        const entries = await getAuditLog(
          `from=${twoDaysAgo.toISOString()}&to=${justBeforeToday.toISOString()}`,
        );
        expect(entries.some((e) => e.entityId === exerciseId)).toBe(false);
      },
    );
  });

  test("The audit log has no route to edit or delete an entry", async ({ given, when, then }) => {
    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    when("the admin attempts to delete the audit log", async () => {
      response = await request(world.http)
        .delete("/admin/audit-log")
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then("the request is rejected as not found", () => {
      expect(response.status).toBe(404);
    });
  });

  test("Admin views aggregate usage analytics across clients and professionals", async ({
    given,
    when,
    then,
    and,
  }) => {
    const today = new Date().toISOString().slice(0, 10);

    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      adminToken = await loginAndGetToken("admin@example.com");
    });

    and(
      'a verified client "active-cli@example.com" with a COMPLETED training session today',
      async () => {
        const activeClient = await world.seedClient("active-cli@example.com");
        // A DEACTIVATED professional just to hang the training plan's FK off
        // of — deliberately excluded from the "active professionals" count
        // this scenario asserts below.
        const trainer = await world.seedProfessional("trainer-for-session@example.com", {
          approvalStatus: "APPROVED",
          status: "DEACTIVATED",
        });
        await world.seedTrainingSession(activeClient, trainer, {
          date: today,
          status: "COMPLETED",
        });
      },
    );

    and('a verified client "idle-cli@example.com" with no activity this week', async () => {
      await world.seedClient("idle-cli@example.com");
    });

    and(
      'an APPROVED professional "pro-pt@example.com" with specialization "PERSONAL_TRAINER"',
      async () => {
        await world.seedProfessional("pro-pt@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
      },
    );

    and(
      'a PENDING professional "pro-pending@example.com" with specialization "NUTRITIONIST"',
      async () => {
        await world.seedProfessional("pro-pending@example.com", {
          approvalStatus: "PENDING_APPROVAL",
          specializations: ["NUTRITIONIST"],
        });
      },
    );

    when("the admin views the analytics dashboard", async () => {
      response = await request(world.http)
        .get("/admin/analytics")
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then("it reports 2 active clients", () => {
      expect(response.status).toBe(200);
      expect(response.body.activeClients).toBe(2);
    });

    and('it reports 1 active professional for specialization "PERSONAL_TRAINER"', () => {
      expect(response.body.activeProfessionals.total).toBe(1);
      expect(response.body.activeProfessionals.bySpecialization.PERSONAL_TRAINER).toBe(1);
    });

    and("the average weekly training adherence is 100 percent", () => {
      expect(response.body.averageWeeklyTrainingAdherencePercent).toBe(100);
    });
  });
});
