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

// A real barcode that genuinely exists in Open Food Facts (Nutella) — this
// module's food lookup hits the real public API in this dev/BDD
// environment (only the jest-cucumber API suite fakes it, per PRD 15
// §5.2), the same way it was verified live earlier this session.
const KNOWN_BARCODE = "3017620422003";
const UNKNOWN_BARCODE = "0000000000000";

// --- Given: seeded state ----------------------------------------------------

Given(
  'an approved NUTRITIONIST professional "bdd.nutri-pro@example.com"',
  async () => {
    await h.seedProfessional("bdd.nutri-pro@example.com", {
      approved: true,
      specializations: ["NUTRITIONIST"],
    });
  },
);

Given(
  'a verified client "bdd.nutri-client@example.com" with a recorded body assessment and an ACTIVE NUTRITIONIST link to "bdd.nutri-pro@example.com"',
  async () => {
    await h.seedClient("bdd.nutri-client@example.com");
    const login_ = await h.apiPost("/auth/login", {
      email: "bdd.nutri-client@example.com",
      password: h.TEST_PASSWORD,
    });
    const me = await h.apiGet("/auth/me", login_.body.accessToken as string);
    await h.seedBodyAssessment(me.body.id as string);
    linkId = await h.seedActiveLink(
      "bdd.nutri-pro@example.com",
      "bdd.nutri-client@example.com",
      "NUTRITIONIST",
    );
  },
);

Given(
  'a verified client "bdd.nutri-client2@example.com" with a confirmed nutrition target from "bdd.nutri-pro2@example.com"',
  async () => {
    await h.seedConfirmedNutritionTarget(
      "bdd.nutri-pro2@example.com",
      "bdd.nutri-client2@example.com",
      2000,
    );
  },
);

Given('a verified client "bdd.nutri-client3@example.com"', async () => {
  await h.seedClient("bdd.nutri-client3@example.com");
});

// --- Scenario: Nutritionist confirms a draft --------------------------------

When("the nutritionist logs in and opens the client's nutrition page", async ({ page }) => {
  await login(page, "bdd.nutri-pro@example.com", h.TEST_PASSWORD);
  await page.goto(`/clients/${linkId}/nutrition`);
  await page.waitForLoadState("networkidle");
});

When("the nutritionist generates a draft target", async ({ page }) => {
  await page.getByRole("button", { name: "Gerar novo rascunho" }).click();
  await page.waitForLoadState("networkidle");
});

When('the nutritionist confirms the target with calorie goal "2200"', async ({ page }) => {
  await page.getByLabel("Meta calórica (kcal)").fill("2200");
  await page.getByLabel("Proteína (g)").fill("160");
  await page.getByLabel("Carboidrato (g)").fill("220");
  await page.getByLabel("Gordura (g)").fill("70");
  await page.getByRole("button", { name: "Confirmar meta" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the page shows the plan status as active", async ({ page }) => {
  await expect(page.getByText("Status atual: Ativo")).toBeVisible();
});

When("the client logs in and opens the nutrition page", async ({ page }) => {
  await login(page, "bdd.nutri-client@example.com", h.TEST_PASSWORD);
  await page.goto("/nutrition");
  await page.waitForLoadState("networkidle");
});

Then('the client sees an active target of "2200" kcal', async ({ page }) => {
  await expect(page.getByText("/ 2200 kcal")).toBeVisible();
});

// --- Scenario: Client logs a food diary entry -------------------------------

When("the client looks up the known barcode and logs it", async ({ page }) => {
  await page.getByLabel("Código de barras").fill(KNOWN_BARCODE);
  await page.getByRole("button", { name: "Buscar código" }).click();
  await page.getByRole("button", { name: "Registrar este alimento" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the diary shows the logged food and updated totals", async ({ page }) => {
  await expect(page.getByText("Nutella")).toBeVisible();
});

// --- Scenario: not-found barcode falls back to manual entry -----------------

When("the client looks up an unknown barcode", async ({ page }) => {
  await page.getByLabel("Código de barras").fill(UNKNOWN_BARCODE);
  await page.getByRole("button", { name: "Buscar código" }).click();
});

Then("the page shows a not-found message with a manual-entry form", async ({ page }) => {
  await expect(page.getByText("Produto não encontrado")).toBeVisible();
  await expect(page.getByLabel("Nome do alimento")).toBeVisible();
});

When("the client fills in the manual entry and submits it", async ({ page }) => {
  await page.getByLabel("Nome do alimento").fill("Salada caseira");
  await page.getByLabel("Calorias (kcal)").fill("250");
  await page.getByRole("button", { name: "Registrar manualmente" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the diary shows the manually entered food", async ({ page }) => {
  await expect(page.getByText("Salada caseira")).toBeVisible();
});
