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

let currentProfessionalEmail: string;
let linkId: string;

// --- Given: seeded state ----------------------------------------------------

for (const email of [
  "bdd.exec-pro@example.com",
  "bdd.exec-pro2@example.com",
  "bdd.exec-pro3@example.com",
]) {
  Given(`an approved professional "${email}"`, async () => {
    await h.seedProfessional(email, { approved: true });
    currentProfessionalEmail = email;
  });
}

for (const [clientEmail, proEmail] of [
  ["bdd.exec-client@example.com", "bdd.exec-pro@example.com"],
  ["bdd.exec-client3@example.com", "bdd.exec-pro2@example.com"],
  ["bdd.exec-client4@example.com", "bdd.exec-pro3@example.com"],
] as const) {
  Given(
    `a verified client "${clientEmail}" with an ACTIVE link to "${proEmail}"`,
    async () => {
      await h.seedClient(clientEmail);
      linkId = await h.seedActiveLink(proEmail, clientEmail, "PERSONAL_TRAINER");
    },
  );
}

Given('a verified client "bdd.exec-client2@example.com"', async () => {
  await h.seedClient("bdd.exec-client2@example.com");
});

let currentExerciseId: string;

Given('the professional created a custom exercise "Agachamento Livre Exec BDD"', async () => {
  currentExerciseId = await h.seedCustomExercise(
    currentProfessionalEmail,
    "Agachamento Livre Exec BDD",
  );
});

Given('the second professional created a custom exercise "Prancha Exec BDD"', async () => {
  currentExerciseId = await h.seedCustomExercise(currentProfessionalEmail, "Prancha Exec BDD");
});

Given('the third professional created a custom exercise "Remada Exec BDD"', async () => {
  currentExerciseId = await h.seedCustomExercise(currentProfessionalEmail, "Remada Exec BDD");
});

Given(
  "a plan with a session scheduled for today for {string}",
  async ({}, clientEmail: string) => {
    await h.seedPlanWithTodaySession(currentProfessionalEmail, clientEmail, currentExerciseId);
  },
);

// --- Scenario: client sees today's session and logs a set -------------------

When("the client logs in and opens today's training page", async ({ page }) => {
  await login(page, "bdd.exec-client@example.com", h.TEST_PASSWORD);
  await page.goto("/today");
  await page.waitForLoadState("networkidle");
});

Then('the page shows today\'s session with "Agachamento Livre Exec BDD"', async ({ page }) => {
  await expect(page.getByText("Agachamento Livre Exec BDD")).toBeVisible();
});

When('the client logs a set of "8" reps at "40" kg', async ({ page }) => {
  await page.getByLabel(/^Série 1/).fill("8");
  await page.getByLabel("Carga (kg)").fill("40");
  await page.getByRole("button", { name: "Registrar série" }).click();
  await page.waitForLoadState("networkidle");
});

Then('the page shows the logged set "8 reps" for that exercise', async ({ page }) => {
  await expect(page.getByText(/Série 1: 8 reps/)).toBeVisible();
});

Then("a rest timer is visible", async ({ page }) => {
  await expect(page.getByText("Descanso")).toBeVisible();
});

// --- Scenario: rest-day state -------------------------------------------------

When("the second client logs in and opens today's training page", async ({ page }) => {
  await login(page, "bdd.exec-client2@example.com", h.TEST_PASSWORD);
  await page.goto("/today");
  await page.waitForLoadState("networkidle");
});

Then("the page shows the rest-day state", async ({ page }) => {
  await expect(page.getByText("Dia de descanso")).toBeVisible();
});

// --- Scenario: disabled form-check-video control ------------------------------

When("the third client logs in and opens today's training page", async ({ page }) => {
  await login(page, "bdd.exec-client3@example.com", h.TEST_PASSWORD);
  await page.goto("/today");
  await page.waitForLoadState("networkidle");
});

Then("the form-check-video button is visibly disabled", async ({ page }) => {
  const button = page.getByRole("button", { name: /Gravar vídeo de execução/ });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
});

When("the client clicks the disabled form-check-video button", async ({ page }) => {
  // A native disabled <button> never dispatches a click event at all
  // (browser-level, not just a React guard) — `force: true` only bypasses
  // Playwright's own actionability check so the click can be attempted
  // against a disabled element; it still can't make the DOM fire one.
  await page
    .getByRole("button", { name: /Gravar vídeo de execução/ })
    .click({ force: true });
});

Then("no set was logged and the page is unchanged", async ({ page }) => {
  await expect(page.getByText(/Série 1: /)).toHaveCount(0);
});

// --- Scenario: professional read-only view ------------------------------------

When("the professional logs in and opens the client's training execution page", async ({
  page,
}) => {
  await login(page, "bdd.exec-pro3@example.com", h.TEST_PASSWORD);
  await page.goto(`/clients/${linkId}/training-execution`);
  await page.waitForLoadState("networkidle");
});

Then("the page shows today's session in the history with no logging controls", async ({
  page,
}) => {
  await expect(page.getByText("Histórico de sessões")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar série" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Concluir treino de hoje" })).toHaveCount(0);
});
