import { defineFeature, loadFeature } from "jest-cucumber";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld } from "../../../support/test-app";

const feature = loadFeature("test/features/01-authentication-account-management/session-security.feature");

let world: AuthTestWorld;
let response: request.Response;
let user: UserWithProfiles;
let adminToken: string;
let accessToken: string;
let refreshToken: string;

function refreshCookieValue(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const cookie = list.find((c) => c.startsWith("refresh_token="));
  return cookie?.split(";")[0]?.split("=")[1] ?? "";
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
  accessToken = "";
  refreshToken = "";
});

defineFeature(feature, (test) => {
  test("Protected routes reject missing, invalid, or expired access tokens", async ({
    given,
    then,
    and,
  }) => {
    given(
      'a verified client "duda@example.com" with password "S3cure!Pass"',
      async () => {
        user = await world.seedClient("duda@example.com", {
          password: "S3cure!Pass",
        });
      },
    );

    then(
      "a request to a protected route with no access token is rejected with status 401",
      async () => {
        const res = await request(world.http).get("/auth/me");
        expect(res.status).toBe(401);
      },
    );

    and(
      "a request to a protected route with a malformed access token is rejected with status 401",
      async () => {
        const res = await request(world.http)
          .get("/auth/me")
          .set("Authorization", "Bearer not-a-real-jwt");
        expect(res.status).toBe(401);
      },
    );

    and(
      "a request to a protected route with an expired access token is rejected with status 401",
      async () => {
        // A correctly-signed token whose exp already passed — exercises the
        // expiry branch, not just the signature branch, of verifyAccessToken.
        // exp is set explicitly in the past (expiresIn: "0s" would only
        // expire on the next second boundary and could flake).
        const now = Math.floor(Date.now() / 1000);
        const expired = jwt.sign(
          {
            sub: user.id,
            role: "CLIENT",
            tokenVersion: 0,
            iat: now - 120,
            exp: now - 60,
          },
          process.env.JWT_ACCESS_SECRET as string,
        );
        const res = await request(world.http)
          .get("/auth/me")
          .set("Authorization", `Bearer ${expired}`);
        expect(res.status).toBe(401);
      },
    );
  });

  test("Password reset invalidates all prior sessions", async ({
    given,
    when,
    then,
    and,
    but,
  }) => {
    given(
      'a verified client "erik@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        user = await world.seedClient("erik@example.com", {
          password: "S3cure!Pass",
        });
        const login = await request(world.http)
          .post("/auth/login")
          .send({ email: "erik@example.com", password: "S3cure!Pass" });
        accessToken = login.body.accessToken;
        refreshToken = refreshCookieValue(login);
        expect(accessToken).toBeTruthy();
        expect(refreshToken).toBeTruthy();
      },
    );

    when(
      'the client requests a password reset for "erik@example.com"',
      async () => {
        response = await request(world.http)
          .post("/auth/password-reset/request")
          .send({ email: "erik@example.com" });
      },
    );

    then('a reset email is sent to "erik@example.com"', () => {
      expect(response.status).toBe(200);
      const mail = world.mailer.lastMailTo("erik@example.com");
      expect(mail?.subject).toContain("Reset");
    });

    when(
      'the client resets the password using the emailed token to "N3wPassw0rd!"',
      async () => {
        response = await request(world.http)
          .post("/auth/password-reset/confirm")
          .send({
            token: world.mailer.tokenSentTo("erik@example.com"),
            newPassword: "N3wPassw0rd!",
          });
      },
    );

    then("the reset is accepted", () => {
      expect(response.status).toBe(200);
    });

    and(
      "the client's previous access token is rejected with status 401",
      async () => {
        const res = await request(world.http)
          .get("/auth/me")
          .set("Authorization", `Bearer ${accessToken}`);
        expect(res.status).toBe(401);
      },
    );

    and(
      "the client's previous refresh token is rejected with status 401",
      async () => {
        const res = await request(world.http)
          .post("/auth/refresh")
          .set("Cookie", `refresh_token=${refreshToken}`);
        expect(res.status).toBe(401);
      },
    );

    and(
      'logging in with email "erik@example.com" and password "S3cure!Pass" is rejected with status 401',
      async () => {
        const res = await request(world.http)
          .post("/auth/login")
          .send({ email: "erik@example.com", password: "S3cure!Pass" });
        expect(res.status).toBe(401);
      },
    );

    but(
      'logging in with email "erik@example.com" and password "N3wPassw0rd!" succeeds',
      async () => {
        const res = await request(world.http)
          .post("/auth/login")
          .send({ email: "erik@example.com", password: "N3wPassw0rd!" });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
      },
    );
  });

  test("Reactivating an account restores status without touching approvalStatus", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        const login = await request(world.http)
          .post("/auth/login")
          .send({ email: "admin@example.com", password: "S3cure!Pass" });
        adminToken = login.body.accessToken;
      },
    );

    and(
      'an approved professional "pro@example.com" with password "S3cure!Pass" whose account is deactivated',
      async () => {
        user = await world.seedProfessional("pro@example.com", {
          password: "S3cure!Pass",
          approvalStatus: "APPROVED",
          status: "DEACTIVATED",
        });
      },
    );

    when('the admin reactivates "pro@example.com"', async () => {
      response = await request(world.http)
        .post(`/admin/users/${user.id}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then('the professional\'s status is "ACTIVE"', async () => {
      expect(response.status).toBe(200);
      const reloaded = await world.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(reloaded.status).toBe("ACTIVE");
    });

    and('the professional\'s approvalStatus is still "APPROVED"', async () => {
      const profile = await world.prisma.professionalProfile.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(profile.approvalStatus).toBe("APPROVED");
    });

    and(
      'the professional can log in with password "S3cure!Pass"',
      async () => {
        const res = await request(world.http)
          .post("/auth/login")
          .send({ email: "pro@example.com", password: "S3cure!Pass" });
        expect(res.status).toBe(200);
      },
    );
  });
});
