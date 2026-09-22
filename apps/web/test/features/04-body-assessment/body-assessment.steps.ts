import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

// Same single-page persona-swap convention as the other web suites.
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
let linkId2: string;

// --- Given: seeded state ----------------------------------------------------

Given('a verified client "bdd.body-client@example.com"', async () => {
  await h.seedClient("bdd.body-client@example.com");
});

Given('an approved professional "bdd.body-pro@example.com"', async () => {
  await h.seedProfessional("bdd.body-pro@example.com", { approved: true });
});

Given(
  'a verified client "bdd.body-client2@example.com" with an ACTIVE link to "bdd.body-pro@example.com"',
  async () => {
    await h.seedClient("bdd.body-client2@example.com");
    linkId = await h.seedActiveLink(
      "bdd.body-pro@example.com",
      "bdd.body-client2@example.com",
    );
  },
);

Given('an approved professional "bdd.body-pro2@example.com"', async () => {
  await h.seedProfessional("bdd.body-pro2@example.com", { approved: true });
});

Given(
  'a verified client "bdd.body-client3@example.com" with an ACTIVE link to "bdd.body-pro2@example.com"',
  async () => {
    await h.seedClient("bdd.body-client3@example.com");
    linkId2 = await h.seedActiveLink(
      "bdd.body-pro2@example.com",
      "bdd.body-client3@example.com",
    );
  },
);

// --- Scenario: client self-log ----------------------------------------------

When("the client logs in and opens the body assessment page", async ({ page }) => {
  await login(page, "bdd.body-client@example.com", h.TEST_PASSWORD);
  await page.goto("/body-assessments");
  await page.waitForLoadState("networkidle");
});

When('the client self-logs a weight of "78.5"', async ({ page }) => {
  await page.getByLabel("Peso (kg)").fill("78.5");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await page.waitForLoadState("networkidle");
});

Then('the history shows a self-reported entry with "78.5"', async ({ page }) => {
  const row = page.getByRole("listitem").filter({ hasText: "78.5 kg" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Auto-relatado")).toBeVisible();
});

// --- Scenario: professional formal assessment -------------------------------

When("the professional logs in and opens the client's body assessment page", async ({ page }) => {
  await login(page, "bdd.body-pro@example.com", h.TEST_PASSWORD);
  await page.goto(`/clients/${linkId}/body-assessments`);
  await page.waitForLoadState("networkidle");
});

When(
  "the second professional logs in and opens the client's body assessment page",
  async ({ page }) => {
    await login(page, "bdd.body-pro2@example.com", h.TEST_PASSWORD);
    await page.goto(`/clients/${linkId2}/body-assessments`);
    await page.waitForLoadState("networkidle");
  },
);

When(
  'the professional fills in weight "80" and height "178" and submits the formal assessment',
  async ({ page }) => {
    await page.getByLabel("Peso (kg)").fill("80");
    await page.getByLabel("Altura (cm)").fill("178");
    await page.getByRole("button", { name: "Registrar avaliação" }).click();
    await page.waitForLoadState("networkidle");
  },
);

Then('the page confirms the computed BMI "25.2"', async ({ page }) => {
  await expect(page.getByText(/IMC 25\.2/)).toBeVisible();
});

// --- Scenario: manual override requires a note ------------------------------

When(
  "the professional turns on the manual body-fat override without filling the note",
  async ({ page }) => {
    await page
      .getByLabel("Sobrescrever % de gordura manualmente (ex.: bioimpedância, DEXA)")
      .check();
    await page.getByLabel("% gordura manual").fill("22");
  },
);

When(
  'the professional fills in weight "75" and height "170" and submits the formal assessment',
  async ({ page }) => {
    await page.getByLabel("Peso (kg)").fill("75");
    await page.getByLabel("Altura (cm)").fill("170");
    await page.getByRole("button", { name: "Registrar avaliação" }).click();
  },
);

Then("the form shows an error about the missing override method", async ({ page }) => {
  await expect(
    page.getByText("Informe o método usado ao sobrescrever o % de gordura."),
  ).toBeVisible();
});

When(
  'the professional fills in the override method "Bioimpedância InBody 770" and submits again',
  async ({ page }) => {
    await page.getByLabel("Método usado (obrigatório)").fill("Bioimpedância InBody 770");
    await page.getByRole("button", { name: "Registrar avaliação" }).click();
    await page.waitForLoadState("networkidle");
  },
);

Then("the page confirms the manual override was recorded", async ({ page }) => {
  await expect(page.getByText(/22% gordura \(manual\)/)).toBeVisible();
});
