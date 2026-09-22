import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/04-body-assessment/body-assessment.feature",
);

const SKINFOLDS_SUM_100 = {
  chest: 15,
  midaxillary: 15,
  triceps: 15,
  subscapular: 15,
  abdominal: 15,
  suprailiac: 15,
  thigh: 10,
};

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let client: UserWithProfiles;
let admin: UserWithProfiles;
let entryId: string;
let photoKey: string;
const tokens: Record<string, string> = {};

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

function authed(
  method: "get" | "post" | "patch" | "put" | "delete",
  path: string,
  email: string,
) {
  return (request(world.http)[method](path) as request.Test).set(
    "Authorization",
    `Bearer ${tokens[email]}`,
  );
}

// Exactly N years before "now", so age math is deterministic regardless of
// when the suite actually runs (mirrors the domain unit tests' approach).
function dobExactlyYearsAgo(years: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()),
  );
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
});

defineFeature(feature, (test) => {
  test("A client self-logs weight and it is tagged unvalidated", async ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when(
      'the client self-logs a weight of 82.4 with note "Segunda-feira, em jejum"',
      async () => {
        response = await authed("post", "/body-assessments/self-log", "cli@example.com").send({
          weight: 82.4,
          note: "Segunda-feira, em jejum",
        });
      },
    );

    then(
      'the request succeeds and the entry is tagged "SELF_REPORTED" with no validator or protocol version',
      () => {
        expect(response.status).toBe(201);
        expect(response.body.source).toBe("SELF_REPORTED");
        expect(response.body.validatedById).toBeNull();
        expect(response.body.protocolVersion).toBeNull();
        expect(response.body.weight).toBe(82.4);
      },
    );

    and("the client's history shows exactly 1 entry", async () => {
      const res = await authed("get", "/body-assessments/mine", "cli@example.com");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  test("A professional's formal assessment computes BMI, WHR and %BF correctly", async ({
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
      'a male verified client "cli@example.com" with password "S3cure!Pass" born exactly 30 years ago who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          biologicalSex: "MALE",
          dateOfBirth: dobExactlyYearsAgo(30),
        });
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when(
      "the professional records a formal assessment for the client with weight 80, height 178, waist 85, hip 100, and the 7 skinfolds summing to 100mm",
      async () => {
        response = await authed(
          "post",
          `/body-assessments/clients/${client.id}/formal`,
          "pro@example.com",
        ).send({
          weight: 80,
          height: 178,
          circumferences: { waist: 85, hip: 100 },
          skinfolds: SKINFOLDS_SUM_100,
        });
        entryId = response.body.id;
      },
    );

    then(
      'the request succeeds with bmi 25.2, waistHipRatio 0.85, bodyFatPercent 14.6, and bodyFatSource "COMPUTED_POLLOCK7"',
      () => {
        expect(response.status).toBe(201);
        expect(response.body.bmi).toBeCloseTo(25.2, 1);
        expect(response.body.waistHipRatio).toBeCloseTo(0.85, 2);
        expect(response.body.bodyFatPercent).toBeCloseTo(14.6, 1);
        expect(response.body.bodyFatSource).toBe("COMPUTED_POLLOCK7");
        expect(response.body.source).toBe("PROFESSIONAL_VALIDATED");
        expect(response.body.validatedById).toBe(professional.id);
      },
    );

    and('the entry\'s protocolVersion is "pollock7-v1"', () => {
      expect(response.body.protocolVersion).toBe("pollock7-v1");
    });
  });

  test("A missing client profile blocks formal-assessment creation", async ({
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

    and('a client "ghost@example.com" with no client profile on file', async () => {
      client = await world.seedClientMissingProfile("ghost@example.com");
    });

    and(
      'the client "ghost@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when(
      "the professional records a formal assessment for the client with weight 70, height 165",
      async () => {
        response = await authed(
          "post",
          `/body-assessments/clients/${client.id}/formal`,
          "pro@example.com",
        ).send({ weight: 70, height: 165 });
      },
    );

    then("the request is rejected with 400", () => {
      expect(response.status).toBe(400);
    });
  });

  test("A professional without an active link is blocked from the client's data", async ({
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

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when(
      "the professional tries to record a formal assessment for the client without a link",
      async () => {
        response = await authed(
          "post",
          `/body-assessments/clients/${client.id}/formal`,
          "pro@example.com",
        ).send({ weight: 70, height: 165 });
      },
    );

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });

    when(
      "the professional tries to list the client's history without a link",
      async () => {
        response = await authed(
          "get",
          `/body-assessments/clients/${client.id}`,
          "pro@example.com",
        );
      },
    );

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("An admin can create a formal assessment without a professional link", async ({
    given,
    when,
    then,
  }) => {
    given('an admin "admin@example.com" who is logged in', async () => {
      admin = await world.seedAdmin("admin@example.com");
      tokens["admin@example.com"] = await loginAndGetToken("admin@example.com");
    });

    given(
      'a male verified client "cli@example.com" with password "S3cure!Pass" born exactly 30 years ago who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          biologicalSex: "MALE",
          dateOfBirth: dobExactlyYearsAgo(30),
        });
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when(
      "the admin records a formal assessment for the client with weight 80, height 178",
      async () => {
        response = await authed(
          "post",
          `/body-assessments/clients/${client.id}/formal`,
          "admin@example.com",
        ).send({ weight: 80, height: 178 });
      },
    );

    then(
      'the request succeeds and the entry is tagged "PROFESSIONAL_VALIDATED"',
      () => {
        expect(response.status).toBe(201);
        expect(response.body.source).toBe("PROFESSIONAL_VALIDATED");
        expect(response.body.validatedById).toBe(admin.id);
      },
    );
  });

  test("A manual body-fat override requires a note and is flagged distinctly", async ({
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
      'a male verified client "cli@example.com" with password "S3cure!Pass" born exactly 30 years ago who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com", {
          biologicalSex: "MALE",
          dateOfBirth: dobExactlyYearsAgo(30),
        });
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and(
      'the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"',
      async () => {
        await world.seedLink(professional, client, {
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when("the professional tries a manual body-fat override of 20 with no note", async () => {
      response = await authed(
        "post",
        `/body-assessments/clients/${client.id}/formal`,
        "pro@example.com",
      ).send({
        weight: 80,
        height: 178,
        bodyFatOverride: { percent: 20 },
      });
    });

    then("the request is rejected with 400", () => {
      expect(response.status).toBe(400);
    });

    when(
      'the professional overrides body fat with 20 and note "Bioimpedância InBody 770"',
      async () => {
        response = await authed(
          "post",
          `/body-assessments/clients/${client.id}/formal`,
          "pro@example.com",
        ).send({
          weight: 80,
          height: 178,
          bodyFatOverride: { percent: 20, note: "Bioimpedância InBody 770" },
        });
      },
    );

    then(
      'the request succeeds and the entry has bodyFatPercent 20, bodyFatSource "MANUAL_OVERRIDE", and the override note on file',
      () => {
        expect(response.status).toBe(201);
        expect(response.body.bodyFatPercent).toBe(20);
        expect(response.body.bodyFatSource).toBe("MANUAL_OVERRIDE");
        expect(response.body.bodyFatOverrideNote).toBe("Bioimpedância InBody 770");
      },
    );
  });

  test("No endpoint allows editing or deleting a body assessment", async ({
    given,
    and,
    then,
  }) => {
    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    and('the client self-logs a weight of 82.4 with note "Segunda-feira, em jejum"', async () => {
      const res = await authed("post", "/body-assessments/self-log", "cli@example.com").send({
        weight: 82.4,
        note: "Segunda-feira, em jejum",
      });
      entryId = res.body.id;
    });

    then("trying to edit or delete that entry is rejected with 404", async () => {
      const patchRes = await authed(
        "patch",
        `/body-assessments/${entryId}`,
        "cli@example.com",
      ).send({ weight: 1 });
      expect(patchRes.status).toBe(404);

      const deleteRes = await authed(
        "delete",
        `/body-assessments/${entryId}`,
        "cli@example.com",
      );
      expect(deleteRes.status).toBe(404);
    });
  });

  test("Photos are only ever exposed as signed, per-request URLs", async ({
    given,
    when,
    then,
  }) => {
    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when("the client requests a photo upload URL", async () => {
      response = await authed(
        "post",
        `/body-assessments/clients/${client.id}/photo-upload-url`,
        "cli@example.com",
      ).send({ tag: "PROGRESS", contentType: "image/jpeg" });
    });

    then("the response is a presigned upload URL and a fresh object key", () => {
      expect(response.status).toBe(201);
      expect(typeof response.body.uploadUrl).toBe("string");
      expect(response.body.key).toContain(client.id);
      photoKey = response.body.key;
    });

    when("the client self-logs a weight of 70 with that photo key", async () => {
      response = await authed("post", "/body-assessments/self-log", "cli@example.com").send({
        weight: 70,
        photoKey,
      });
    });

    then(
      "the client's history entry's photo URL is signed and distinct from the raw key",
      () => {
        expect(response.status).toBe(201);
        expect(response.body.photos).toHaveLength(1);
        const url = response.body.photos[0].url as string;
        expect(url).not.toBe(photoKey);
        expect(url).toContain("sig=");
        expect(world.signedMediaStore.downloadRequests).toContain(photoKey);
      },
    );
  });
});
