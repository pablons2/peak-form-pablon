import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { Specialization } from "@prisma/client";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/08-nutrition-module/nutrition-module.feature",
);

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let client: UserWithProfiles;
let admin: UserWithProfiles;
let draftId: string;
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

function dobExactlyYearsAgo(years: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()),
  );
}

// Seeds a body assessment (weight+height on file) as Admin, which bypasses
// the ACTIVE-link check entirely (PRD 04 §4's Admin row) — the simplest way
// to get a Client into "has a body assessment" state without also needing a
// PERSONAL_TRAINER/NUTRITIONIST link set up first.
async function seedBodyAssessment(clientId: string): Promise<void> {
  const res = await authed(
    "post",
    `/body-assessments/clients/${clientId}/formal`,
    admin.email,
  ).send({ weight: 75, height: 178 });
  if (res.status !== 201) {
    throw new Error(`seedBodyAssessment failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
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
  async function setupLinkedPair(
    specialization: Specialization,
    withBodyAssessment: boolean,
  ) {
    admin = await world.seedAdmin("admin@example.com");
    professional = await world.seedProfessional("pro@example.com", {
      approvalStatus: "APPROVED",
      specializations: [specialization],
    });
    client = await world.seedClient("cli@example.com", {
      dateOfBirth: dobExactlyYearsAgo(30),
      biologicalSex: "MALE",
    });
    await world.seedLink(professional, client, {
      specialization,
      status: "ACTIVE",
      linkedAt: new Date(),
    });
    for (const email of [admin.email, professional.email, client.email]) {
      tokens[email] = await loginAndGetToken(email);
    }
    if (withBodyAssessment) await seedBodyAssessment(client.id);
  }

  test("A draft nutrition target is never visible to the Client until a Nutritionist confirms it", ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      "an active NUTRITIONIST link between a professional and a client with a recorded body assessment",
      async () => {
        await setupLinkedPair("NUTRITIONIST", true);
      },
    );

    when("the nutritionist generates a draft nutrition target for the client", async () => {
      response = await authed(
        "post",
        `/nutrition/clients/${client.id}/draft`,
        professional.email,
      ).send({});
    });

    then('the draft is created with status "DRAFT" and no confirmedByProfessionalAt', () => {
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("DRAFT");
      expect(response.body.confirmedByProfessionalAt).toBeNull();
      draftId = response.body.id as string;
    });

    and("the client's own active-plan endpoint returns null", async () => {
      const res = await authed("get", "/nutrition/mine/plan", client.email);
      expect(res.status).toBe(200);
      expect(res.body.plan).toBeNull();
    });

    when("the nutritionist confirms the draft", async () => {
      response = await authed(
        "post",
        `/nutrition/plans/${draftId}/confirm`,
        professional.email,
      ).send({
        calorieTarget: 2200,
        macroTargets: { protein: 160, carbs: 220, fat: 70 },
      });
    });

    then('the plan becomes "ACTIVE" with confirmedByProfessionalAt set', () => {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ACTIVE");
      expect(response.body.confirmedByProfessionalAt).not.toBeNull();
    });

    and("the client's own active-plan endpoint now returns the confirmed target", async () => {
      const res = await authed("get", "/nutrition/mine/plan", client.email);
      expect(res.status).toBe(200);
      expect(res.body.plan.id).toBe(draftId);
      expect(res.body.plan.calorieTarget).toBe(2200);
    });
  });

  test("Generating a draft is blocked when the client has no body assessment on file", ({
    given,
    when,
    then,
  }) => {
    given(
      "an active NUTRITIONIST link between a professional and a client with no body assessment",
      async () => {
        await setupLinkedPair("NUTRITIONIST", false);
      },
    );

    when("the nutritionist generates a draft nutrition target for the client", async () => {
      response = await authed(
        "post",
        `/nutrition/clients/${client.id}/draft`,
        professional.email,
      ).send({});
    });

    then("the request is rejected with a client-error status", () => {
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  test("A Professional without the NUTRITIONIST specialization cannot create or confirm a nutrition plan", ({
    given,
    when,
    then,
  }) => {
    given(
      "an active PERSONAL_TRAINER link between a professional and a client with a recorded body assessment",
      async () => {
        await setupLinkedPair("PERSONAL_TRAINER", true);
      },
    );

    when("that professional generates a draft nutrition target for the client", async () => {
      response = await authed(
        "post",
        `/nutrition/clients/${client.id}/draft`,
        professional.email,
      ).send({});
    });

    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("Confirming a plan always sets ACTIVE and confirmedByProfessionalAt together", ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      "an active NUTRITIONIST link between a professional and a client with a recorded body assessment",
      async () => {
        await setupLinkedPair("NUTRITIONIST", true);
      },
    );

    and("the nutritionist has generated a draft nutrition target for the client", async () => {
      const res = await authed(
        "post",
        `/nutrition/clients/${client.id}/draft`,
        professional.email,
      ).send({});
      draftId = res.body.id as string;
    });

    when("the nutritionist confirms the draft", async () => {
      response = await authed(
        "post",
        `/nutrition/plans/${draftId}/confirm`,
        professional.email,
      ).send({
        calorieTarget: 2100,
        macroTargets: { protein: 150, carbs: 210, fat: 65 },
      });
    });

    then('the plan becomes "ACTIVE" with confirmedByProfessionalAt set', () => {
      expect(response.body.status).toBe("ACTIVE");
      expect(response.body.confirmedByProfessionalAt).not.toBeNull();
    });
  });

  test("An Admin can generate and confirm a nutrition plan without any link to the client", ({
    given,
    when,
    then,
  }) => {
    given("a client with a recorded body assessment and no professional link at all", async () => {
      admin = await world.seedAdmin("admin@example.com");
      client = await world.seedClient("cli@example.com", {
        dateOfBirth: dobExactlyYearsAgo(28),
        biologicalSex: "FEMALE",
      });
      tokens[admin.email] = await loginAndGetToken(admin.email);
      tokens[client.email] = await loginAndGetToken(client.email);
      await seedBodyAssessment(client.id);
    });

    when("an admin generates a draft nutrition target for the client", async () => {
      response = await authed(
        "post",
        `/nutrition/clients/${client.id}/draft`,
        admin.email,
      ).send({});
    });

    then('the draft is created with status "DRAFT" and no confirmedByProfessionalAt', () => {
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("DRAFT");
      draftId = response.body.id as string;
    });

    when("the admin confirms the draft", async () => {
      response = await authed("post", `/nutrition/plans/${draftId}/confirm`, admin.email).send({
        calorieTarget: 1800,
        macroTargets: { protein: 120, carbs: 180, fat: 55 },
      });
    });

    then('the plan becomes "ACTIVE" with confirmedByProfessionalAt set', () => {
      expect(response.body.status).toBe("ACTIVE");
      expect(response.body.confirmedByProfessionalAt).not.toBeNull();
    });
  });

  test("A barcode lookup that Open Food Facts reports as not found returns no fabricated nutrients", ({
    given,
    when,
    then,
  }) => {
    given("a client logged in with a valid session", async () => {
      client = await world.seedClient("cli@example.com", {
        dateOfBirth: dobExactlyYearsAgo(25),
        biologicalSex: "FEMALE",
      });
      tokens[client.email] = await loginAndGetToken(client.email);
    });

    when("the client looks up an unknown barcode", async () => {
      // FakeOpenFoodFactsClient resolves anything not explicitly seeded to
      // null — the same "not found" behavior confirmed live against the
      // real API's `status: 0` response.
      response = await authed(
        "get",
        "/nutrition/food/barcode/0000000000000",
        client.email,
      );
    });

    then("the barcode lookup returns null", () => {
      expect(response.status).toBe(200);
      expect(response.body.item).toBeNull();
    });
  });

  test("A food diary entry's nutrient snapshot survives a later correction to the cached food item", ({
    given,
    and,
    when,
    then,
  }) => {
    let cacheId: string;

    given("a client logged in with a valid session", async () => {
      client = await world.seedClient("cli@example.com", {
        dateOfBirth: dobExactlyYearsAgo(25),
        biologicalSex: "FEMALE",
      });
      tokens[client.email] = await loginAndGetToken(client.email);
    });

    and("a cached food item is seeded with known nutrients", async () => {
      world.openFoodFacts.seedProduct("1111111111111", {
        name: "Test Bar",
        nutrients: { calories: 400, protein: 20, carbs: 40, fat: 10 },
      });
      const res = await authed(
        "get",
        "/nutrition/food/barcode/1111111111111",
        client.email,
      );
      cacheId = res.body.item.id as string;
    });

    when("the client logs a diary entry for that cached food item", async () => {
      response = await authed("post", "/nutrition/diary", client.email).send({
        foodItemCacheId: cacheId,
        quantity: 100,
        mealSlot: "BREAKFAST",
      });
    });

    then("the diary entry's nutrient snapshot matches the nutrients at log time", () => {
      expect(response.status).toBe(201);
      expect(response.body.nutrientsSnapshot).toEqual({
        calories: 400,
        protein: 20,
        carbs: 40,
        fat: 10,
      });
    });

    when("the cached food item's nutrients are corrected", async () => {
      // Simulate a later correction by re-seeding the same barcode with
      // different values and forcing a fresh (non-cache-hit) upsert via the
      // repository directly — the point under test is the diary entry, not
      // the cache-write path itself.
      await world.prisma.foodItemCache.update({
        where: { id: cacheId },
        data: { nutrients: { calories: 999, protein: 99, carbs: 99, fat: 99 } },
      });
    });

    then("the diary entry's nutrient snapshot is still the original value", async () => {
      const res = await authed("get", "/nutrition/mine/diary", client.email);
      const entry = res.body.entries.find((e: { id: string }) => e.id === response.body.id);
      expect(entry.nutrientsSnapshot).toEqual({
        calories: 400,
        protein: 20,
        carbs: 40,
        fat: 10,
      });
    });
  });

  test("A Professional has no mutating route to write another client's food diary or hydration", ({
    given,
    when,
    then,
  }) => {
    given("a client logged in with a valid session", async () => {
      professional = await world.seedProfessional("pro@example.com", {
        approvalStatus: "APPROVED",
        specializations: ["NUTRITIONIST"],
      });
      client = await world.seedClient("cli@example.com", {
        dateOfBirth: dobExactlyYearsAgo(25),
        biologicalSex: "FEMALE",
      });
      tokens[professional.email] = await loginAndGetToken(professional.email);
    });

    when("a request is made to a food-diary write route scoped to a professional", async () => {
      // PRD 08 §4 — Professional access to the food diary is view-only
      // (GET /nutrition/clients/:clientId/diary); there is no
      // POST/PATCH/DELETE diary or hydration route under /clients/:id at
      // all, so a Professional attempting to write one hits 404, not a
      // guard-enforced 403 — the route itself doesn't exist.
      response = await authed(
        "post",
        `/nutrition/clients/${client.id}/diary`,
        professional.email,
      ).send({ quantity: 100, mealSlot: "LUNCH" });
    });

    then("the route does not exist", () => {
      expect(response.status).toBe(404);
    });
  });

  test("The weekly adherence summary is identical for the Client and the Nutritionist", ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      "an active NUTRITIONIST link between a professional and a client with a recorded body assessment",
      async () => {
        await setupLinkedPair("NUTRITIONIST", true);
      },
    );

    and(
      "the nutritionist has generated and confirmed a draft nutrition target for the client",
      async () => {
        const draft = await authed(
          "post",
          `/nutrition/clients/${client.id}/draft`,
          professional.email,
        ).send({});
        await authed("post", `/nutrition/plans/${draft.body.id}/confirm`, professional.email).send(
          { calorieTarget: 2000, macroTargets: { protein: 150, carbs: 200, fat: 65 } },
        );
      },
    );

    and("the client has logged food diary entries this week", async () => {
      world.openFoodFacts.seedProduct("2222222222222", {
        name: "Chicken breast",
        nutrients: { calories: 165, protein: 31, carbs: 0, fat: 4 },
      });
      const lookup = await authed(
        "get",
        "/nutrition/food/barcode/2222222222222",
        client.email,
      );
      await authed("post", "/nutrition/diary", client.email).send({
        foodItemCacheId: lookup.body.item.id,
        quantity: 200,
        mealSlot: "LUNCH",
      });
    });

    when("the client fetches their own weekly adherence summary", async () => {
      response = await authed("get", "/nutrition/mine/weekly-summary", client.email);
    });

    let clientSummary: unknown;
    and("the nutritionist fetches the client's weekly adherence summary", async () => {
      clientSummary = response.body;
      response = await authed(
        "get",
        `/nutrition/clients/${client.id}/weekly-summary`,
        professional.email,
      );
    });

    then("both summaries report the same days logged and the same average adherence percent", () => {
      expect(response.body).toEqual(clientSummary);
      expect(response.body.daysLogged).toBeGreaterThan(0);
    });
  });
});
