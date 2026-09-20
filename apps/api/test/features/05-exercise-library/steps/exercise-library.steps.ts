import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import {
  ImportExerciseCatalogUseCase,
  type ImportResult,
} from "../../../../src/exercises/application/use-cases/import-exercise-catalog.use-case";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature(
  "test/features/05-exercise-library/exercise-library.feature",
);

let world: AuthTestWorld;
let response: request.Response;
let professional: UserWithProfiles;
let otherProfessional: UserWithProfiles;
let client: UserWithProfiles;
let stranger: UserWithProfiles;
let admin: UserWithProfiles;
const tokens: Record<string, string> = {};
let importResult: ImportResult;
let exerciseCountAfterFirstImport: number;
let customExerciseId: string;
let customExerciseBody: Record<string, unknown>;
let queueResult: { id: string; owner?: { email: string } | null }[];
let searchResults: { name: string }[];

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

// A valid custom-exercise payload — overridable name/tags per scenario.
function customExercisePayload(
  name: string,
  contraindicationCodes: string[] = ["WRIST_LOAD_CAUTION"],
) {
  return {
    name,
    muscleGroups: ["CORE"],
    equipment: ["BODYWEIGHT"],
    difficulty: "BEGINNER",
    cues: ["Execute devagar e com controle"],
    mistakes: ["Fazer o movimento rápido demais"],
    contraindicationCodes,
  };
}

async function searchAs(email: string, q: string) {
  const res = await request(world.http)
    .get(`/exercises?q=${encodeURIComponent(q)}`)
    .set("Authorization", `Bearer ${tokens[email]}`);
  return (res.body as { name: string }[]).map((e) => e.name);
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
  test("Catalog import is idempotent and re-hosts media in our own storage", async ({
    when,
    then,
    and,
  }) => {
    when("the exercise catalog import job runs", async () => {
      importResult = await world.app
        .get(ImportExerciseCatalogUseCase)
        .execute();
    });

    then(
      "every dataset entry exists as a GLOBAL exercise with cues, mistakes and contraindication tags",
      async () => {
        expect(importResult.total).toBeGreaterThan(0);
        expect(importResult.created).toBe(importResult.total);
        const rows = await world.prisma.exercise.findMany({
          include: { contraindicationTags: true },
        });
        expect(rows).toHaveLength(importResult.total);
        for (const row of rows) {
          expect(row.visibility).toBe("GLOBAL");
          expect(row.cues.length).toBeGreaterThan(0);
          expect(row.mistakes.length).toBeGreaterThan(0);
          expect(row.contraindicationTags.length).toBeGreaterThan(0);
          expect(row.sourceApiId).toBeTruthy();
        }
        exerciseCountAfterFirstImport = rows.length;
      },
    );

    and("every imported exercise's mediaUrl points at our own media host", async () => {
      const rows = await world.prisma.exercise.findMany();
      for (const row of rows) {
        expect(row.mediaUrl).toMatch(/^https:\/\/media\.test\//);
      }
      expect(world.mediaStore.puts.length).toBe(importResult.total);
    });

    when("the exercise catalog import job runs again", async () => {
      importResult = await world.app
        .get(ImportExerciseCatalogUseCase)
        .execute();
    });

    then("nothing is created or updated — every entry is skipped", () => {
      expect(importResult.created).toBe(0);
      expect(importResult.updated).toBe(0);
      expect(importResult.skipped).toBe(importResult.total);
    });

    and("the exercise count is unchanged", async () => {
      const count = await world.prisma.exercise.count();
      expect(count).toBe(exerciseCountAfterFirstImport);
    });
  });

  test("A professional's custom exercise stays private to them and their linked clients", async ({
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
      'an APPROVED professional "other@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        otherProfessional = await world.seedProfessional("other@example.com", {
          approvalStatus: "APPROVED",
          specializations: ["PERSONAL_TRAINER"],
        });
        tokens["other@example.com"] =
          await loginAndGetToken("other@example.com");
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
      'a verified client "stranger@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        stranger = await world.seedClient("stranger@example.com");
        tokens["stranger@example.com"] =
          await loginAndGetToken("stranger@example.com");
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
      'the professional creates a custom exercise "Mobilidade de Tornozelo"',
      async () => {
        response = await request(world.http)
          .post("/exercises/custom")
          .set("Authorization", `Bearer ${tokens["pro@example.com"]}`)
          .send(customExercisePayload("Mobilidade de Tornozelo"));
        customExerciseBody = response.body;
        customExerciseId = response.body.id;
      },
    );

    then('the exercise is PRIVATE and owned by "pro@example.com"', () => {
      expect(response.status).toBe(201);
      expect(customExerciseBody.visibility).toBe("PRIVATE");
      expect(customExerciseBody.ownerProfessionalId).toBe(professional.id);
    });

    and(
      '"pro@example.com" finds it in search but "other@example.com" does not',
      async () => {
        expect(await searchAs("pro@example.com", "Mobilidade")).toContain(
          "Mobilidade de Tornozelo",
        );
        expect(await searchAs("other@example.com", "Mobilidade")).toHaveLength(
          0,
        );
        expect(otherProfessional.id).not.toBe(professional.id);
      },
    );

    and(
      "the linked client finds it in search but the unlinked client does not",
      async () => {
        expect(await searchAs("cli@example.com", "Mobilidade")).toContain(
          "Mobilidade de Tornozelo",
        );
        expect(await searchAs("stranger@example.com", "Mobilidade")).toHaveLength(
          0,
        );
        expect(stranger.id).not.toBe(client.id);
      },
    );
  });

  test("Admin promotes a custom exercise to the global library and the action is audited", async ({
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
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        admin = await world.seedAdmin("admin@example.com");
        tokens["admin@example.com"] =
          await loginAndGetToken("admin@example.com");
      },
    );

    when(
      'the professional creates a custom exercise "Respiração Crocodilo"',
      async () => {
        response = await request(world.http)
          .post("/exercises/custom")
          .set("Authorization", `Bearer ${tokens["pro@example.com"]}`)
          .send(customExercisePayload("Respiração Crocodilo"));
        customExerciseId = response.body.id;
      },
    );

    and("the admin opens the custom-exercise review queue", async () => {
      response = await request(world.http)
        .get("/admin/exercises?visibility=PRIVATE")
        .set("Authorization", `Bearer ${tokens["admin@example.com"]}`);
      queueResult = response.body;
    });

    then("the exercise appears in the queue with its author", () => {
      expect(response.status).toBe(200);
      const queued = queueResult.find((e) => e.id === customExerciseId);
      expect(queued).toBeTruthy();
      expect(queued?.owner?.email).toBe("pro@example.com");
    });

    when("the admin promotes the exercise", async () => {
      response = await request(world.http)
        .post(`/admin/exercises/${customExerciseId}/promote`)
        .set("Authorization", `Bearer ${tokens["admin@example.com"]}`);
    });

    then("the exercise is GLOBAL with no owner", () => {
      expect(response.status).toBe(200);
      expect(response.body.visibility).toBe("GLOBAL");
      expect(response.body.ownerProfessionalId).toBeNull();
    });

    and(
      'an audit log entry "EXERCISE_PROMOTED_TO_GLOBAL" records the promotion by "admin@example.com"',
      async () => {
        const entry = await world.prisma.auditLog.findFirst({
          where: {
            actorId: admin.id,
            action: "EXERCISE_PROMOTED_TO_GLOBAL",
            entity: "Exercise",
            entityId: customExerciseId,
          },
        });
        expect(entry).toBeTruthy();
      },
    );

    and("promoting it again is rejected with 409", async () => {
      response = await request(world.http)
        .post(`/admin/exercises/${customExerciseId}/promote`)
        .set("Authorization", `Bearer ${tokens["admin@example.com"]}`);
      expect(response.status).toBe(409);
    });
  });

  test("Searching and filtering the imported catalog", async ({
    given,
    when,
    then,
  }) => {
    given("the exercise catalog has been imported", async () => {
      await world.app.get(ImportExerciseCatalogUseCase).execute();
    });

    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when('the client searches exercises by name "agachamento"', async () => {
      const res = await request(world.http)
        .get("/exercises?q=agachamento")
        .set("Authorization", `Bearer ${tokens["cli@example.com"]}`);
      searchResults = res.body;
    });

    then('the results include "Agachamento Livre (Back Squat)"', () => {
      expect(searchResults.map((e) => e.name)).toContain(
        "Agachamento Livre (Back Squat)",
      );
    });

    when(
      'the client filters exercises by muscle group "QUADRICEPS" and difficulty "ADVANCED"',
      async () => {
        const res = await request(world.http)
          .get("/exercises?muscleGroup=QUADRICEPS&difficulty=ADVANCED")
          .set("Authorization", `Bearer ${tokens["cli@example.com"]}`);
        searchResults = res.body;
      },
    );

    then(
      'the results include "Salto na Caixa (Box Jump)" but not "Agachamento Livre (Back Squat)"',
      () => {
        const names = searchResults.map((e) => e.name);
        expect(names).toContain("Salto na Caixa (Box Jump)");
        expect(names).not.toContain("Agachamento Livre (Back Squat)");
      },
    );
  });

  test("Clients cannot author exercises", async ({ given, when, then }) => {
    given(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        client = await world.seedClient("cli@example.com");
        tokens["cli@example.com"] = await loginAndGetToken("cli@example.com");
      },
    );

    when("the client tries to create a custom exercise", async () => {
      response = await request(world.http)
        .post("/exercises/custom")
        .set("Authorization", `Bearer ${tokens["cli@example.com"]}`)
        .send(customExercisePayload("Exercise that must not exist"));
    });

    then("the request is rejected with 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("Custom exercises reject unknown contraindication tag codes", async ({
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

    when(
      'the professional creates a custom exercise tagged with a nonexistent code "NOT_A_REAL_TAG"',
      async () => {
        response = await request(world.http)
          .post("/exercises/custom")
          .set("Authorization", `Bearer ${tokens["pro@example.com"]}`)
          .send(customExercisePayload("Qualquer exercício", ["NOT_A_REAL_TAG"]));
      },
    );

    then("the request is rejected with 400", () => {
      expect(response.status).toBe(400);
    });
  });
});
