import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import { AuthTestWorld } from "../../../support/test-app";

const feature = loadFeature("test/features/01-authentication-account-management/client-signup-login.feature");

let world: AuthTestWorld;
let response: request.Response;
let accessToken: string | undefined;
let refreshCookie: string | undefined;
let completionToken: string | undefined;

function extractRefreshCookie(res: request.Response): string | undefined {
  const cookies = res.headers["set-cookie"];
  const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  return list.find((c) => c.startsWith("refresh_token="));
}

beforeAll(async () => {
  world = await AuthTestWorld.boot();
});
afterAll(async () => {
  await world.close();
});
beforeEach(async () => {
  await world.reset();
  accessToken = undefined;
  refreshCookie = undefined;
  completionToken = undefined;
});

defineFeature(feature, (test) => {
  test("Client signs up with credentials, verifies email, and logs in", async ({
    when,
    then,
    and,
  }) => {
    when(
      'a client submits signup with email "ana@example.com", password "S3cure!Pass", full name "Ana Souza", born "1995-03-20", sex "FEMALE"',
      async () => {
        response = await request(world.http)
          .post("/auth/signup/client")
          .send({
            email: "ana@example.com",
            password: "S3cure!Pass",
            fullName: "Ana Souza",
            dateOfBirth: "1995-03-20",
            biologicalSex: "FEMALE",
          });
      },
    );

    then("the signup is accepted", () => {
      expect(response.status).toBe(201);
      expect(response.body.userId).toBeTruthy();
    });

    and('a verification email is sent to "ana@example.com"', () => {
      const mail = world.mailer.lastMailTo("ana@example.com");
      expect(mail?.subject).toContain("Verify");
    });

    when(
      "the client verifies their email using the token from that email",
      async () => {
        response = await request(world.http)
          .post("/auth/verify-email")
          .send({ token: world.mailer.tokenSentTo("ana@example.com") });
      },
    );

    then("the verification is accepted", () => {
      expect(response.status).toBe(201);
      expect(response.body.verified).toBe(true);
    });

    when(
      'the client logs in with email "ana@example.com" and password "S3cure!Pass"',
      async () => {
        response = await request(world.http)
          .post("/auth/login")
          .send({ email: "ana@example.com", password: "S3cure!Pass" });
      },
    );

    then('the login succeeds with an access token for role "CLIENT"', () => {
      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.user.role).toBe("CLIENT");
      accessToken = response.body.accessToken;
      refreshCookie = extractRefreshCookie(response);
    });

    and("an httpOnly refresh token cookie is set", () => {
      expect(refreshCookie).toBeTruthy();
      expect(refreshCookie).toContain("HttpOnly");
      expect(refreshCookie).toContain("Path=/auth");
    });

    and(
      'the client\'s ClientProfile persists dateOfBirth "1995-03-20" and biologicalSex "FEMALE"',
      async () => {
        const me = await request(world.http)
          .get("/auth/me")
          .set("Authorization", `Bearer ${accessToken}`);
        expect(me.status).toBe(200);
        expect(me.body.client.dateOfBirth).toBe("1995-03-20T00:00:00.000Z");
        expect(me.body.client.biologicalSex).toBe("FEMALE");
      },
    );
  });

  test("Client cannot log in before verifying their email", async ({
    given,
    when,
    then,
  }) => {
    given(
      'a client signed up with email "bea@example.com" and password "S3cure!Pass" but never verified',
      async () => {
        await world.seedClient("bea@example.com", {
          verified: false,
          password: "S3cure!Pass",
        });
      },
    );

    when(
      'the client logs in with email "bea@example.com" and password "S3cure!Pass"',
      async () => {
        response = await request(world.http)
          .post("/auth/login")
          .send({ email: "bea@example.com", password: "S3cure!Pass" });
      },
    );

    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("Client signup is rejected without dateOfBirth and biologicalSex", async ({
    when,
    then,
    and,
  }) => {
    when(
      'a client submits signup with email "carlos@example.com", password "S3cure!Pass", full name "Carlos Lima" but no dateOfBirth or biologicalSex',
      async () => {
        response = await request(world.http)
          .post("/auth/signup/client")
          .send({
            email: "carlos@example.com",
            password: "S3cure!Pass",
            fullName: "Carlos Lima",
          });
      },
    );

    then("the request is rejected with status 400", () => {
      expect(response.status).toBe(400);
    });

    and('no account exists for "carlos@example.com"', async () => {
      const user = await world.prisma.user.findUnique({
        where: { email: "carlos@example.com" },
      });
      expect(user).toBeNull();
    });
  });

  test("Client signs up and logs in via Google OAuth with no email-verification step", async ({
    when,
    then,
    and,
  }) => {
    when(
      'a client signs in with the Google identity "carol@example.com" named "Carol Dias"',
      async () => {
        response = await request(world.http)
          .post("/auth/oauth/google")
          .send({ idToken: "google:carol@example.com:Carol Dias" });
      },
    );

    then("the response indicates signup completion is required", () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("signup_required");
      expect(response.body.completionToken).toBeTruthy();
      completionToken = response.body.completionToken;
    });

    when(
      'the client completes Google signup born "1992-07-11", sex "FEMALE"',
      async () => {
        response = await request(world.http)
          .post("/auth/oauth/google/complete-client-signup")
          .send({
            oauthCompletionToken: completionToken,
            dateOfBirth: "1992-07-11",
            biologicalSex: "FEMALE",
          });
      },
    );

    then(
      "the client receives an access token and an httpOnly refresh token cookie",
      () => {
        expect(response.status).toBe(200);
        expect(response.body.accessToken).toBeTruthy();
        const cookie = extractRefreshCookie(response);
        expect(cookie).toContain("HttpOnly");
      },
    );

    and("the client never received a verification email", () => {
      expect(world.mailer.lastMailTo("carol@example.com")).toBeUndefined();
    });

    when(
      'the client signs in with the Google identity "carol@example.com" named "Carol Dias" again',
      async () => {
        response = await request(world.http)
          .post("/auth/oauth/google")
          .send({ idToken: "google:carol@example.com:Carol Dias" });
      },
    );

    then("the response is authenticated with an access token", () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("authenticated");
      expect(response.body.tokens.accessToken).toBeTruthy();
    });
  });
});
