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

// --- Given: seeded state ----------------------------------------------------

Given('a verified client "bdd.intake-client@example.com"', async () => {
  await h.seedClient("bdd.intake-client@example.com");
});

Given('a verified client "bdd.intake-client2@example.com"', async () => {
  await h.seedClient("bdd.intake-client2@example.com");
});

Given('an approved professional "bdd.intake-pro@example.com"', async () => {
  await h.seedProfessional("bdd.intake-pro@example.com", { approved: true });
});

Given(
  'a verified client "bdd.intake-client3@example.com" with an ACTIVE link to "bdd.intake-pro@example.com"',
  async () => {
    await h.seedClient("bdd.intake-client3@example.com");
    linkId = await h.seedActiveLink(
      "bdd.intake-pro@example.com",
      "bdd.intake-client3@example.com",
    );
  },
);

Given(
  'the client "bdd.intake-client3@example.com" has completed their intake',
  async () => {
    await h.seedCompletedIntake("bdd.intake-client3@example.com");
  },
);

// --- Scenario: complete the wizard ------------------------------------------

When("the client logs in and opens the intake page", async ({ page }) => {
  await login(page, "bdd.intake-client@example.com", h.TEST_PASSWORD);
  await page.goto("/intake");
  await page.waitForLoadState("networkidle");
});

Then("the wizard shows the readiness step", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Etapa 1 de 5: Prontidão (PAR-Q)" }),
  ).toBeVisible();
});

When('the client answers every readiness question "Não" and continues', async ({ page }) => {
  const noRadios = page.getByRole("radio", { name: "Não" });
  const count = await noRadios.count();
  for (let i = 0; i < count; i++) {
    await noRadios.nth(i).check();
  }
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.waitForLoadState("networkidle");
});

When('the client flags "Lombar" as a current pain and continues', async ({ page }) => {
  await page.getByRole("button", { name: "Costas", exact: true }).click();
  await page.getByRole("button", { name: "Lombar", exact: true }).click();
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.waitForLoadState("networkidle");
});

When("the client continues through conditions without changes", async ({ page }) => {
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.waitForLoadState("networkidle");
});

When("the client continues through availability without changes", async ({ page }) => {
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.waitForLoadState("networkidle");
});

When("the client concludes the triagem", async ({ page }) => {
  await page.getByRole("button", { name: "Concluir triagem" }).click();
  await page.waitForLoadState("networkidle");
});

Then(
  'the summary shows the contraindication tag "LOWER_BACK_LOAD_CAUTION"',
  async ({ page }) => {
    await expect(page.getByText("LOWER_BACK_LOAD_CAUTION")).toBeVisible();
  },
);

Then('the summary shows the flagged region "Lombar"', async ({ page }) => {
  await expect(page.getByText(/Lombar — intensidade/)).toBeVisible();
});

// --- Scenario: skip -----------------------------------------------------

When("the second client logs in and opens the intake page", async ({ page }) => {
  await login(page, "bdd.intake-client2@example.com", h.TEST_PASSWORD);
  await page.goto("/intake");
  await page.waitForLoadState("networkidle");
});

When("the client opens the skip dialog and confirms without acknowledging", async ({ page }) => {
  await page.getByRole("button", { name: "Pular triagem por enquanto" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar e pular" }),
  ).toBeDisabled();
});

Then("the skip is not confirmed yet", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: /Etapa 1 de 5/ }),
  ).toBeVisible();
});

When("the client acknowledges the disclaimer and confirms the skip", async ({ page }) => {
  await page.getByLabel("Li e entendo o aviso acima.").check();
  await page.getByRole("button", { name: "Confirmar e pular" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the summary shows the skipped status", async ({ page }) => {
  await expect(page.getByText("Ignorado (com ciência de risco)")).toBeVisible();
});

// --- Scenario: professional review + annotation ------------------------

When("the professional logs in and opens the client's intake review page", async ({ page }) => {
  await login(page, "bdd.intake-pro@example.com", h.TEST_PASSWORD);
  await page.goto(`/clients/${linkId}/intake`);
  await page.waitForLoadState("networkidle");
});

Then("the contraindication tag {string} is shown", async ({ page }, tag: string) => {
  await expect(page.getByText(tag)).toBeVisible();
});

When("the professional adds the annotation {string}", async ({ page }, note: string) => {
  await page.getByLabel("Adicionar anotação clínica").fill(note);
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the annotation {string} appears in the list", async ({ page }, note: string) => {
  await expect(page.getByText(note)).toBeVisible();
});
