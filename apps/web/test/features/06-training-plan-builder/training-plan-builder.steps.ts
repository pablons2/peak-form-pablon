import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(dashboard|pending-approval)/);
  await page.waitForLoadState("networkidle");
}

let linkId: string;
let planId: string;
let mesocycleId: string;
let currentProfessionalEmail: string;

// --- Given: seeded state ----------------------------------------------------

for (const email of [
  "bdd.plan-pro@example.com",
  "bdd.plan-pro2@example.com",
  "bdd.plan-pro3@example.com",
]) {
  Given(`an approved professional "${email}"`, async () => {
    await h.seedProfessional(email, { approved: true });
    currentProfessionalEmail = email;
  });
}

Given(
  'a verified client "bdd.plan-client@example.com" with an ACTIVE Personal Trainer link to "bdd.plan-pro@example.com"',
  async () => {
    await h.seedClient("bdd.plan-client@example.com");
    linkId = await h.seedActiveLink(
      "bdd.plan-pro@example.com",
      "bdd.plan-client@example.com",
      "PERSONAL_TRAINER",
    );
  },
);

Given('the client "bdd.plan-client@example.com" has completed their intake', async () => {
  await h.seedCompletedIntake("bdd.plan-client@example.com");
});

Given(
  'a verified client "bdd.plan-client2@example.com" with an ACTIVE Personal Trainer link to "bdd.plan-pro2@example.com"',
  async () => {
    await h.seedClient("bdd.plan-client2@example.com");
    linkId = await h.seedActiveLink(
      "bdd.plan-pro2@example.com",
      "bdd.plan-client2@example.com",
      "PERSONAL_TRAINER",
    );
  },
);

Given(
  'the client "bdd.plan-client2@example.com" has completed their intake with a lower-back pain flag',
  async () => {
    // h.seedCompletedIntake always flags a CURRENT lower-back pain.
    await h.seedCompletedIntake("bdd.plan-client2@example.com");
  },
);

Given('a verified client "bdd.plan-client3@example.com" with no professional', async () => {
  await h.seedClient("bdd.plan-client3@example.com");
});

Given(
  'the professional created a custom exercise "Agachamento BDD" with no contraindications',
  async () => {
    await h.seedCustomExercise(currentProfessionalEmail, "Agachamento BDD");
  },
);

Given(
  'the professional created a custom exercise "Levantamento Terra BDD" tagged "LOWER_BACK_LOAD_CAUTION"',
  async () => {
    await h.seedCustomExercise(currentProfessionalEmail, "Levantamento Terra BDD", [
      "LOWER_BACK_LOAD_CAUTION",
    ]);
  },
);

Given(
  'the professional has a plan with a mesocycle for the client',
  async () => {
    const login1 = await h.apiPost("/auth/login", {
      email: "bdd.plan-pro2@example.com",
      password: h.TEST_PASSWORD,
    });
    const token = login1.body.accessToken as string;
    const clientLogin = await h.apiPost("/auth/login", {
      email: "bdd.plan-client2@example.com",
      password: h.TEST_PASSWORD,
    });
    const clientRes = await h.apiGet("/auth/me", clientLogin.body.accessToken as string);
    const plan = await h.apiPost(
      "/training-plans",
      { clientId: clientRes.body.id, name: "Plano BDD", startDate: "2026-02-02" },
      token,
    );
    planId = plan.body.id as string;
    const meso = await h.apiPost(
      `/training-plans/${planId}/mesocycles`,
      { weeks: 2, goal: "STRENGTH", isDeload: false },
      token,
    );
    mesocycleId = meso.body.id as string;
  },
);

// --- Scenario 1: build a plan through the UI --------------------------------

When("the professional creates a plan for the client through the UI", async ({ page }) => {
  await login(page, "bdd.plan-pro@example.com", h.TEST_PASSWORD);
  await page.goto(`/clients/${linkId}/plans/new`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nome do plano").fill("Plano BDD");
  await page.getByLabel("Data de início").fill("2026-02-02");
  await page.getByRole("button", { name: "Criar plano" }).click();
  // Matching plain "/plans/<id>$" would also match this very form's own URL
  // (".../plans/new") while the create is still pending/failed — the
  // predicate form checks the real destination and excludes the source.
  await page.waitForURL(
    (url) => /\/plans\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"),
  );
  await page.waitForLoadState("networkidle");
  planId = new URL(page.url()).pathname.split("/").pop()!;
});

When("the professional adds a {int}-week mesocycle", async ({ page }, weeks: number) => {
  await page.goto(`/plans/${planId}/mesocycles/new`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Duração (semanas)").fill(String(weeks));
  await page.getByRole("button", { name: "Adicionar mesociclo" }).click();
  await page.waitForURL(
    (url) => /\/mesocycles\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"),
  );
  await page.waitForLoadState("networkidle");
  mesocycleId = new URL(page.url()).pathname.split("/").pop()!;
});

When(
  'the professional saves a weekly template with "Agachamento BDD" on Segunda-feira',
  async ({ page }) => {
    await page.getByLabel("Segunda-feira").check();
    await page.getByRole("button", { name: "+ Adicionar exercício" }).click();
    await page.getByLabel("Exercício 1").selectOption({ label: "Agachamento BDD" });
    await page.getByRole("button", { name: "Salvar template semanal" }).click();
    await page.waitForLoadState("networkidle");
  },
);

Then("generated sessions appear on the mesocycle page", async ({ page }) => {
  const sessionsSection = page.getByRole("region", { name: "Sessões geradas" });
  // The session list renders pt-BR long dates (weekday, day de month de year)
  // — 2026-02-02 is a Monday, so the first generated session is that Monday.
  await expect(
    sessionsSection.getByText("segunda-feira, 2 de fevereiro de 2026"),
  ).toBeVisible();
  await expect(sessionsSection.getByText("Agachamento BDD").first()).toBeVisible();
});

// --- Scenario 2: contraindication warning -----------------------------------

When(
  'the professional saves a weekly template with "Levantamento Terra BDD" on Segunda-feira',
  async ({ page }) => {
    await login(page, "bdd.plan-pro2@example.com", h.TEST_PASSWORD);
    await page.goto(`/plans/${planId}/mesocycles/${mesocycleId}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Segunda-feira").check();
    await page.getByRole("button", { name: "+ Adicionar exercício" }).click();
    await page.getByLabel("Exercício 1").selectOption({ label: "Levantamento Terra BDD" });
    await page.getByRole("button", { name: "Salvar template semanal" }).click();
    await page.waitForLoadState("networkidle");
  },
);

Then("a contraindication warning is shown on the page", async ({ page }) => {
  await expect(page.getByRole("alert").filter({ hasText: "Aviso de contraindicação" })).toBeVisible();
  await expect(page.getByText("LOWER_BACK_LOAD_CAUTION")).toBeVisible();
});

// --- Scenario 3: starter template self-assign -------------------------------

Given(
  "the professional authored a starter template with a mesocycle and a Segunda-feira session",
  async () => {
    const login1 = await h.apiPost("/auth/login", {
      email: currentProfessionalEmail,
      password: h.TEST_PASSWORD,
    });
    const token = login1.body.accessToken as string;
    const plan = await h.apiPost(
      "/training-plans/starter-templates",
      { name: "Template BDD", startDate: "2026-02-02" },
      token,
    );
    planId = plan.body.id as string;
    const meso = await h.apiPost(
      `/training-plans/${planId}/mesocycles`,
      { weeks: 1, goal: "GENERAL_FITNESS", isDeload: false },
      token,
    );
    mesocycleId = meso.body.id as string;
    const exercise = await h.apiGet(
      "/exercises?q=Agachamento%20BDD",
      token,
    );
    const exerciseId = (exercise.body as unknown as { id: string }[])[0]!.id;
    await h.apiPost(
      `/mesocycles/${mesocycleId}/weekly-template`,
      {
        entries: [
          {
            weekday: "MONDAY",
            name: "Treino A",
            exercises: [
              {
                exerciseId,
                order: 1,
                targetSets: 3,
                targetRepsMin: 8,
                targetRepsMax: 10,
              },
            ],
          },
        ],
      },
      token,
    );
  },
);

When("the client logs in and assigns the starter template", async ({ page }) => {
  await login(page, "bdd.plan-client3@example.com", h.TEST_PASSWORD);
  await page.goto("/plans/starter-templates");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Atribuir a mim" }).click();
  await page.waitForURL(/\/plans\/[^/]+$/);
  await page.waitForLoadState("networkidle");
});

Then(
  "the client sees their own plan with generated sessions and no edit controls",
  async ({ page }) => {
    await expect(page.getByText("Template BDD")).toBeVisible();
    await page.getByRole("link", { name: /Bloco 1/ }).click();
    await page.waitForLoadState("networkidle");
    // A self-assigned plan starts "today" (§5.8 — no selectable date for
    // this self-service path), not the template's own placeholder date, so
    // this asserts a session exists and shows the templated exercise rather
    // than asserting a specific date.
    await expect(page.getByText("Agachamento BDD")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar template semanal" })).toHaveCount(0);
    await expect(page.getByText("Editar exercícios desta sessão")).toHaveCount(0);
  },
);
