import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { PARQ_QUESTION_CODES } from "../../../../src/intake/domain/par-q-questions";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/03-onboarding-intake-anamnesis/onboarding-intake.feature",
);

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let client: UserWithProfiles;
const tokens: Record<string, string> = {};
let intakeId: string;
let intakeBody: Record<string, unknown>;

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

async function startIntake(email: string) {
  const res = await authed("post", "/intake", email).send();
  intakeId = res.body.id;
  return res;
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
  test("Completing an intake with no flags allows plan assignment", async ({
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

    when("the client starts the intake questionnaire", async () => {
      await startIntake("cli@example.com");
    });

    and('the client answers every readiness question "no"', async () => {
      const parqAnswers = Object.fromEntries(
        PARQ_QUESTION_CODES.map((code) => [code, false]),
      );
      response = await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        parqAnswers,
      });
    });

    and("the client completes the intake", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/complete`,
        "cli@example.com",
      ).send();
      intakeBody = response.body;
    });

    then('the intake status is "COMPLETED" with no contraindication tags', () => {
      expect(response.status).toBe(200);
      expect(intakeBody.status).toBe("COMPLETED");
      expect(intakeBody.contraindicationTagCodes).toEqual([]);
    });

    and("plan assignment is allowed for the client", async () => {
      const res = await authed("get", "/intake/mine", "cli@example.com");
      expect(res.body.planAssignmentAllowed).toBe(true);
    });

    and(
      "plan assignment is not allowed for a client with no intake at all",
      async () => {
        const other = await world.seedClient("stranger2@example.com");
        const token = await loginAndGetToken("stranger2@example.com");
        const res = await request(world.http)
          .get("/intake/mine")
          .set("Authorization", `Bearer ${token}`);
        expect(res.body.planAssignmentAllowed).toBe(false);
        expect(res.body.intake).toBeNull();
        expect(other.id).not.toBe(client.id);
      },
    );
  });

  test("Completing is blocked until every readiness question is answered", async ({
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

    when("the client starts the intake questionnaire", async () => {
      await startIntake("cli@example.com");
    });

    when(
      "the client tries to complete the intake without answering readiness questions",
      async () => {
        response = await authed(
          "post",
          `/intake/${intakeId}/complete`,
          "cli@example.com",
        ).send();
      },
    );

    then("the request is rejected with 400", () => {
      expect(response.status).toBe(400);
    });
  });

  test("A current body-region pain flag produces the matching contraindication tag", async ({
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
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when("the client starts the intake questionnaire", async () => {
      await startIntake("cli@example.com");
    });

    and('the client answers every readiness question "no"', async () => {
      const parqAnswers = Object.fromEntries(
        PARQ_QUESTION_CODES.map((code) => [code, false]),
      );
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        parqAnswers,
      });
    });

    and('the client flags a CURRENT "LOWER_BACK" pain', async () => {
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        painFlags: [
          { region: "LOWER_BACK", severity: 7, pastOrCurrent: "CURRENT" },
        ],
      });
    });

    and('the client flags a PAST "KNEE_LEFT" pain', async () => {
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        painFlags: [
          { region: "LOWER_BACK", severity: 7, pastOrCurrent: "CURRENT" },
          { region: "KNEE_LEFT", severity: 3, pastOrCurrent: "PAST" },
        ],
      });
    });

    and("the client completes the intake", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/complete`,
        "cli@example.com",
      ).send();
      intakeBody = response.body;
    });

    then(
      'the intake status is "COMPLETED" and includes only the contraindication tag "LOWER_BACK_LOAD_CAUTION"',
      () => {
        expect(response.status).toBe(200);
        expect(intakeBody.status).toBe("COMPLETED");
        expect(intakeBody.contraindicationTagCodes).toEqual([
          "LOWER_BACK_LOAD_CAUTION",
        ]);
      },
    );

    when("the professional views the client's intake", async () => {
      response = await authed(
        "get",
        `/intake/clients/${client.id}`,
        "pro@example.com",
      );
    });

    then("the professional sees the pain flags and the contraindication tags", () => {
      expect(response.status).toBe(200);
      const intake = response.body.intake;
      expect(intake.contraindicationTagCodes).toEqual(["LOWER_BACK_LOAD_CAUTION"]);
      const regions = (intake.painFlags as { region: string }[]).map(
        (f) => f.region,
      );
      expect(regions.sort()).toEqual(["KNEE_LEFT", "LOWER_BACK"]);
    });
  });

  test('A PAR-Q "yes" answer does not block completion', async ({
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

    when("the client starts the intake questionnaire", async () => {
      await startIntake("cli@example.com");
    });

    and('the client answers every readiness question "no"', async () => {
      const parqAnswers = Object.fromEntries(
        PARQ_QUESTION_CODES.map((code) => [code, false]),
      );
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        parqAnswers,
      });
    });

    and('the client answers "HEART_CONDITION" with "yes"', async () => {
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        parqAnswers: { HEART_CONDITION: true },
      });
    });

    and("the client completes the intake", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/complete`,
        "cli@example.com",
      ).send();
      intakeBody = response.body;
    });

    then(
      'the intake status is "COMPLETED" and includes only the contraindication tag "BLOOD_PRESSURE_CAUTION"',
      () => {
        expect(response.status).toBe(200);
        expect(intakeBody.status).toBe("COMPLETED");
        expect(intakeBody.contraindicationTagCodes).toEqual([
          "BLOOD_PRESSURE_CAUTION",
        ]);
        expect(
          (intakeBody.parqAnswers as Record<string, boolean>).HEART_CONDITION,
        ).toBe(true);
      },
    );
  });

  test("Skipping requires the acknowledgement flag and still records safety data", async ({
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

    when("the client starts the intake questionnaire", async () => {
      await startIntake("cli@example.com");
    });

    and('the client flags a CURRENT "NECK" pain', async () => {
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        painFlags: [{ region: "NECK", severity: 4, pastOrCurrent: "CURRENT" }],
      });
    });

    and("the client tries to skip without acknowledging the disclaimer", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/skip`,
        "cli@example.com",
      ).send({});
    });

    then("the request is rejected with 400", () => {
      expect(response.status).toBe(400);
    });

    when("the client skips the intake with the disclaimer acknowledged", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/skip`,
        "cli@example.com",
      ).send({ acknowledged: true });
      intakeBody = response.body;
    });

    then(
      'the intake status is "SKIPPED_WITH_ACKNOWLEDGEMENT" and includes only the contraindication tag "NECK_STRAIN_CAUTION"',
      () => {
        expect(response.status).toBe(200);
        expect(intakeBody.status).toBe("SKIPPED_WITH_ACKNOWLEDGEMENT");
        expect(intakeBody.contraindicationTagCodes).toEqual([
          "NECK_STRAIN_CAUTION",
        ]);
      },
    );

    and("plan assignment is allowed for the client", async () => {
      const res = await authed("get", "/intake/mine", "cli@example.com");
      expect(res.body.planAssignmentAllowed).toBe(true);
    });
  });

  test("A professional can only view intake data for their own linked clients", async ({
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
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when("the professional tries to view the client's intake without a link", async () => {
      response = await authed(
        "get",
        `/intake/clients/${client.id}`,
        "pro@example.com",
      );
    });

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("A new intake version does not overwrite or delete a professional's prior annotation", async ({
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
          status: "ACTIVE",
          linkedAt: new Date(),
        });
      },
    );

    when("the client starts the intake questionnaire", async () => {
      await startIntake("cli@example.com");
    });

    and('the client answers every readiness question "no"', async () => {
      const parqAnswers = Object.fromEntries(
        PARQ_QUESTION_CODES.map((code) => [code, false]),
      );
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        parqAnswers,
      });
    });

    and("the client completes the intake", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/complete`,
        "cli@example.com",
      ).send();
      intakeBody = response.body;
    });

    and(
      'the professional annotates the client\'s latest intake with "Liberado para treino leve"',
      async () => {
        response = await authed(
          "post",
          `/intake/${intakeId}/annotations`,
          "pro@example.com",
        ).send({ note: "Liberado para treino leve" });
        expect(response.status).toBe(201);
      },
    );

    and("the client starts a new intake version", async () => {
      await startIntake("cli@example.com");
    });

    and('the client answers every readiness question "no"', async () => {
      const parqAnswers = Object.fromEntries(
        PARQ_QUESTION_CODES.map((code) => [code, false]),
      );
      await authed("patch", `/intake/${intakeId}`, "cli@example.com").send({
        parqAnswers,
      });
    });

    and("the client completes the intake", async () => {
      response = await authed(
        "post",
        `/intake/${intakeId}/complete`,
        "cli@example.com",
      ).send();
      intakeBody = response.body;
    });

    then("the client's intake is now at version 2", () => {
      expect(intakeBody.version).toBe(2);
    });

    and(
      "the professional's annotation from version 1 is still present in the version history",
      async () => {
        const res = await authed(
          "get",
          `/intake/clients/${client.id}/versions`,
          "pro@example.com",
        );
        expect(res.status).toBe(200);
        const versions = res.body as {
          version: number;
          annotations: { note: string }[];
        }[];
        expect(versions).toHaveLength(2);
        const v1 = versions.find((v) => v.version === 1);
        const v2 = versions.find((v) => v.version === 2);
        expect(v1?.annotations.map((a) => a.note)).toEqual([
          "Liberado para treino leve",
        ]);
        expect(v2?.annotations).toEqual([]);
      },
    );
  });
});
