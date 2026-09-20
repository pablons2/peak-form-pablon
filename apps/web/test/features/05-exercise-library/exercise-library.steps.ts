import { expect, test, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

// Same single-page persona-swap convention as the other web suites — sign
// out and back in rather than juggling two browser contexts.
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(dashboard|pending-approval)/);
  await page.waitForLoadState("networkidle");
}

async function logout(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL(/\/login/);
}

function resultsSection(page: Page) {
  return page.getByRole("region", { name: "Resultados" });
}

function sectionByHeading(page: Page, heading: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

// --- Given: seeded state ----------------------------------------------------

Given("the exercise catalog has been imported", async () => {
  // First run uploads the bundled media to MinIO and boots a Nest context
  // inside the api container — give the test extra room for that cold path.
  test.setTimeout(120_000);
  h.ensureExerciseCatalog();
});

Given('a verified client "bdd.ex-client@example.com"', async () => {
  await h.seedClient("bdd.ex-client@example.com");
});

Given('a verified client "bdd.ex-client2@example.com"', async () => {
  await h.seedClient("bdd.ex-client2@example.com");
});

for (const email of [
  "bdd.ex-pro@example.com",
  "bdd.ex-other@example.com",
  "bdd.ex-pro2@example.com",
]) {
  Given(`an approved professional "${email}"`, async () => {
    await h.seedProfessional(email, { approved: true });
  });
}

Given(
  'an approved professional "bdd.ex-pro2@example.com" with a custom exercise "Ponte de Glúteo BDD"',
  async () => {
    await h.seedProfessional("bdd.ex-pro2@example.com", { approved: true });
    await h.seedCustomExercise(
      "bdd.ex-pro2@example.com",
      "Ponte de Glúteo BDD",
    );
  },
);

// --- Scenario: browse + search ----------------------------------------------

When("the client logs in and opens the exercise library", async ({ page }) => {
  await login(page, "bdd.ex-client@example.com", h.TEST_PASSWORD);
  await page.goto("/exercises");
  await page.waitForLoadState("networkidle");
});

Then("the imported exercises appear in the results", async ({ page }) => {
  await expect(
    resultsSection(page).getByText("Agachamento Livre (Back Squat)"),
  ).toBeVisible();
});

When('the client searches for "terra"', async ({ page }) => {
  await page.getByLabel("Nome", { exact: true }).fill("terra");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.waitForLoadState("networkidle");
});

Then(
  "the results include {string} but not {string}",
  async ({ page }, included: string, excluded: string) => {
    await expect(resultsSection(page).getByText(included)).toBeVisible();
    await expect(resultsSection(page).getByText(excluded)).toHaveCount(0);
  },
);

When("the client opens the exercise detail", async ({ page }) => {
  await page
    .getByRole("link", { name: "Levantamento Terra (Deadlift)" })
    .click();
  await page.waitForLoadState("networkidle");
});

Then(
  "the execution cues, common mistakes and contraindications are shown",
  async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Como executar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Erros comuns" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Contraindicações" }),
    ).toBeVisible();
    await expect(page.getByText("Carga na lombar — cautela")).toBeVisible();
  },
);

// --- Scenario: professional authors a private custom -------------------------

When(
  'the professional logs in and creates a custom exercise "Prancha Lateral BDD" through the form',
  async ({ page }) => {
    await login(page, "bdd.ex-pro@example.com", h.TEST_PASSWORD);
    await page.goto("/exercises");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Novo exercício" }).click();
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Nome do exercício").fill("Prancha Lateral BDD");
    await page.getByLabel("Dificuldade").selectOption("BEGINNER");
    await page.getByLabel("Core", { exact: true }).check();
    await page.getByLabel("Peso corporal", { exact: true }).check();
    await page
      .getByLabel("Execução 1")
      .fill("Apoie o antebraço e eleve o quadril");
    await page
      .getByLabel("Erros comuns 1")
      .fill("Deixar o quadril cair para trás");
    await page.getByRole("button", { name: "Criar exercício" }).click();
    await page.waitForURL(/\/exercises\/[^/]+$/);
    await page.waitForLoadState("networkidle");
  },
);

Then('the exercise detail shows it as "Privado"', async ({ page }) => {
  await expect(page.getByText("Privado", { exact: true })).toBeVisible();
  await expect(page.getByText("Prancha Lateral BDD")).toBeVisible();
});

Then(
  'it appears under "Meus exercícios personalizados" on the library page',
  async ({ page }) => {
    await page.goto("/exercises");
    await page.waitForLoadState("networkidle");
    await expect(
      sectionByHeading(page, "Meus exercícios personalizados").getByText(
        "Prancha Lateral BDD",
      ),
    ).toBeVisible();
  },
);

Then(
  'the other professional searching for "Prancha Lateral BDD" sees no results',
  async ({ page }) => {
    await logout(page);
    await login(page, "bdd.ex-other@example.com", h.TEST_PASSWORD);
    await page.goto("/exercises");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Nome", { exact: true }).fill("Prancha Lateral BDD");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText("Nenhum exercício encontrado para esses filtros."),
    ).toBeVisible();
  },
);

// --- Scenario: admin promotes a custom exercise ------------------------------

When(
  "the admin logs in and opens the exercise review queue",
  async ({ page }) => {
    await h.ensureAdmin();
    await login(page, h.ADMIN_EMAIL, h.TEST_PASSWORD);
    await page.goto("/admin/exercises");
    await page.waitForLoadState("networkidle");
  },
);

Then("the custom exercise is listed with its author", async ({ page }) => {
  const row = page.locator("li").filter({ hasText: "Ponte de Glúteo BDD" });
  await expect(row).toBeVisible();
  await expect(row.getByText("por BDD Professional")).toBeVisible();
});

When("the admin promotes it", async ({ page }) => {
  await page
    .locator("li")
    .filter({ hasText: "Ponte de Glúteo BDD" })
    .getByRole("button", { name: "Promover à biblioteca global" })
    .click();
});

Then("it leaves the review queue", async ({ page }) => {
  await expect(
    page.locator("li").filter({ hasText: "Ponte de Glúteo BDD" }),
  ).toHaveCount(0);
});

Then(
  'a client finds "Ponte de Glúteo BDD" when searching the library',
  async ({ page }) => {
    await h.seedClient("bdd.ex-client2@example.com");
    await logout(page);
    await login(page, "bdd.ex-client2@example.com", h.TEST_PASSWORD);
    await page.goto("/exercises");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Nome", { exact: true }).fill("Ponte de Glúteo BDD");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForLoadState("networkidle");
    await expect(
      resultsSection(page).getByText("Ponte de Glúteo BDD"),
    ).toBeVisible();
  },
);
