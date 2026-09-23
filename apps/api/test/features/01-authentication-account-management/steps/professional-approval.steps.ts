import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature("test/features/01-authentication-account-management/professional-approval.feature");

let world: AuthTestWorld;
let response: request.Response;
let adminToken: string;
let professional: UserWithProfiles;

async function loginAndGetToken(
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const res = await request(world.http)
    .post("/auth/login")
    .send({ email, password });
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
  adminToken = "";
});

defineFeature(feature, (test) => {
  test("A pending professional can log in but cannot reach professional-only routes", async ({
    given,
    when,
    then,
  }) => {
    given(
      'a professional "paulo@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"',
      async () => {
        professional = await world.seedProfessional("paulo@example.com", {
          password: "S3cure!Pass",
          approvalStatus: "PENDING_APPROVAL",
        });
      },
    );

    when(
      'the professional logs in with email "paulo@example.com" and password "S3cure!Pass"',
      async () => {
        response = await request(world.http)
          .post("/auth/login")
          .send({ email: "paulo@example.com", password: "S3cure!Pass" });
      },
    );

    then(
      'the login succeeds with an access token for role "PROFESSIONAL"',
      () => {
        expect(response.status).toBe(200);
        expect(response.body.user.role).toBe("PROFESSIONAL");
        expect(response.body.user.professional.approvalStatus).toBe(
          "PENDING_APPROVAL",
        );
      },
    );

    when("the professional requests a professional-only route", async () => {
      response = await request(world.http)
        .get("/probe/professional-only")
        .set("Authorization", `Bearer ${response.body.accessToken}`);
    });

    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("Admin approves a pending professional; access is granted immediately and audited", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        adminToken = await loginAndGetToken("admin@example.com", "S3cure!Pass");
        expect(adminToken).toBeTruthy();
      },
    );

    and(
      'a professional "paula@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"',
      async () => {
        professional = await world.seedProfessional("paula@example.com", {
          password: "S3cure!Pass",
          approvalStatus: "PENDING_APPROVAL",
          verificationNote: "CREF 12345-G/SP",
        });
      },
    );

    when("the admin lists the pending professionals", async () => {
      response = await request(world.http)
        .get("/admin/professionals/pending")
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then(
      '"paula@example.com" appears in the queue with verification note "CREF 12345-G/SP"',
      () => {
        expect(response.status).toBe(200);
        const entry = response.body.find(
          (p: { user: { email: string } }) =>
            p.user.email === "paula@example.com",
        );
        expect(entry).toBeTruthy();
        expect(entry.verificationNote).toBe("CREF 12345-G/SP");
      },
    );

    when('the admin approves "paula@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/professionals/${professional.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then("the professional can access a professional-only route", async () => {
      expect(response.status).toBe(200);
      const token = await loginAndGetToken("paula@example.com", "S3cure!Pass");
      const probe = await request(world.http)
        .get("/probe/professional-only")
        .set("Authorization", `Bearer ${token}`);
      expect(probe.status).toBe(200);
    });

    and(
      'an audit log entry records the approval of "paula@example.com" by "admin@example.com"',
      async () => {
        const admin = await world.prisma.user.findUniqueOrThrow({
          where: { email: "admin@example.com" },
        });
        const entry = await world.prisma.auditLog.findFirst({
          where: {
            actorId: admin.id,
            action: "PROFESSIONAL_APPROVED",
            entity: "ProfessionalProfile",
          },
        });
        expect(entry).toBeTruthy();
        expect(
          (entry?.metadata as { professionalUserId?: string })
            ?.professionalUserId,
        ).toBe(professional.id);
      },
    );
  });

  test("Admin cannot approve an unverified professional", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        adminToken = await loginAndGetToken("admin@example.com", "S3cure!Pass");
      },
    );

    and(
      'an unverified professional "unver@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"',
      async () => {
        professional = await world.seedProfessional("unver@example.com", {
          password: "S3cure!Pass",
          approvalStatus: "PENDING_APPROVAL",
          verified: false,
        });
      },
    );

    when('the admin approves "unver@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/professionals/${professional.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then("the request is rejected with status 409", () => {
      expect(response.status).toBe(409);
    });

    and(
      "the professional cannot log in because their email is not verified",
      async () => {
        const res = await request(world.http)
          .post("/auth/login")
          .send({ email: "unver@example.com", password: "S3cure!Pass" });
        expect(res.status).toBe(403);
      },
    );
  });

  test("Admin rejects a professional; the account can still log in but stays blocked", async ({
    given,
    when,
    then,
    and,
    but,
  }) => {
    given(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        adminToken = await loginAndGetToken("admin@example.com", "S3cure!Pass");
      },
    );

    and(
      'a professional "reje@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"',
      async () => {
        professional = await world.seedProfessional("reje@example.com", {
          password: "S3cure!Pass",
          approvalStatus: "PENDING_APPROVAL",
        });
      },
    );

    when(
      'the admin rejects "reje@example.com" with reason "credentials could not be verified"',
      async () => {
        response = await request(world.http)
          .post(`/admin/professionals/${professional.id}/reject`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ reason: "credentials could not be verified" });
        expect(response.status).toBe(200);
      },
    );

    then(
      'the professional can still log in with password "S3cure!Pass"',
      async () => {
        const res = await request(world.http)
          .post("/auth/login")
          .send({ email: "reje@example.com", password: "S3cure!Pass" });
        expect(res.status).toBe(200);
        expect(res.body.user.professional.approvalStatus).toBe("REJECTED");
      },
    );

    but("the professional cannot access a professional-only route", async () => {
      const token = await loginAndGetToken("reje@example.com", "S3cure!Pass");
      const probe = await request(world.http)
        .get("/probe/professional-only")
        .set("Authorization", `Bearer ${token}`);
      expect(probe.status).toBe(403);
    });

    and(
      'an audit log entry records the rejection of "reje@example.com" by "admin@example.com"',
      async () => {
        const admin = await world.prisma.user.findUniqueOrThrow({
          where: { email: "admin@example.com" },
        });
        const entry = await world.prisma.auditLog.findFirst({
          where: {
            actorId: admin.id,
            action: "PROFESSIONAL_REJECTED",
            entity: "ProfessionalProfile",
          },
        });
        expect(entry).toBeTruthy();
      },
    );
  });

  test("A non-admin cannot see the approval queue", async ({
    given,
    when,
    then,
  }) => {
    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedClient("cli@example.com", { password: "S3cure!Pass" });
      },
    );

    when("the client requests the pending professionals queue", async () => {
      const token = await loginAndGetToken("cli@example.com", "S3cure!Pass");
      response = await request(world.http)
        .get("/admin/professionals/pending")
        .set("Authorization", `Bearer ${token}`);
    });

    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });
});
