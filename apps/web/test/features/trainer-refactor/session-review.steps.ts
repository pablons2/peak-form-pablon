// Phase 3.2: Trainer-Facing Session Review Tab BDD Steps.
// Exercises the real "Execução" tab on the client detail hub: a Background
// seeds one COMPLETED session (3 logged sets, via the real client logging +
// complete APIs) and one MISSED session (status set directly, the same end
// state run-missed-session-job produces), then the professional reads them.
import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

const TRAINER_EMAIL = "trainer@example.com";
const CLIENT_EMAIL = "client@example.com";
const EXERCISE_NAME = "Supino Review BDD";

let linkId: string;

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(dashboard|pending-approval)/);
  await page.waitForLoadState("networkidle");
}

// --- Given: seeded state ------------------------------------------------------

// seedProfessional provisions AND approves in one call — the dedicated
// "the professional is APPROVED" step below stays a no-op because the
// approval already happened here (same collapse the other suites use).
Given(
  `a professional user "${TRAINER_EMAIL}" with role "PROFESSIONAL" and specialization "PERSONAL_TRAINER"`,
  async () => {
    await h.seedProfessional(TRAINER_EMAIL, {
      approved: true,
      specializations: ["PERSONAL_TRAINER"],
    });
  },
);

Given(`a client user "${CLIENT_EMAIL}" with role "CLIENT"`, async () => {
  await h.seedClient(CLIENT_EMAIL);
});

Given("the professional is APPROVED", async () => {
  // Already approved by the professional seed above (see its comment).
});

Given("the professional and client have an ACTIVE link", async () => {
  linkId = await h.seedActiveLink(TRAINER_EMAIL, CLIENT_EMAIL, "PERSONAL_TRAINER");
});

Given("the client has completed the health intake", async () => {
  await h.seedCompletedIntake(CLIENT_EMAIL);
});

Given(
  "a training plan exists with 1 completed session and 1 missed session",
  async () => {
    const exerciseId = await h.seedCustomExercise(TRAINER_EMAIL, EXERCISE_NAME, [], {
      mediaUrl: "https://cdn.peakform.test/supino-review.svg",
    });
    await h.seedPlanWithCompletedAndMissedSessions(
      TRAINER_EMAIL,
      CLIENT_EMAIL,
      exerciseId,
    );
  },
);

Given("the training plan has no sessions", async () => {
  // The Background already seeded history for every scenario; this scenario
  // starts from "nothing ever was prescribed" instead, so sweep the plans
  // (cascades mesocycles/sessions/logs) and reseed a bare plan.
  h.deletePlansForProfessional(TRAINER_EMAIL);
  await h.seedEmptyPlan(TRAINER_EMAIL, CLIENT_EMAIL);
});

// --- When: navigation ---------------------------------------------------------

When("the professional logs in", async ({ page }) => {
  await login(page, TRAINER_EMAIL, h.TEST_PASSWORD);
});

When("navigates to the client detail page", async ({ page }) => {
  await page.goto("/clients");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Ver detalhes" }).click();
  await page.waitForLoadState("networkidle");
});

When('clicks on the "Execução" tab', async ({ page }) => {
  await page.getByRole("tab", { name: /Execução/ }).click();
});

When("clicks on the most recent completed session", async ({ page }) => {
  await page.getByRole("button").filter({ hasText: "Concluído" }).first().click();
});

When("expands the completed session", async ({ page }) => {
  await page.getByRole("button").filter({ hasText: "Concluído" }).first().click();
});

When("expands a session with logged sets", async ({ page }) => {
  await page.getByRole("button").filter({ hasText: "Concluído" }).first().click();
});

// --- Then: outcomes -----------------------------------------------------------

Then('the "Execução" tab is visible in the tabs', async ({ page }) => {
  await expect(page.getByRole("tab", { name: /Execução/ })).toBeVisible();
});

Then('the tab displays "2 sessões"', async ({ page }) => {
  await expect(page.getByRole("tab", { name: /Execução/ })).toContainText(
    "2 sessões",
  );
});

Then("the session expands to show all exercises", async ({ page }) => {
  await expect(page.getByText(EXERCISE_NAME).first()).toBeVisible();
});

Then("each exercise shows:", async ({ page }, _docString: string) => {
  await expect(page.getByText("Prescrição vs Execução")).toBeVisible();
  await expect(page.getByText("✓ Completo")).toBeVisible();
  await expect(page.getByText(/séries/).first()).toBeVisible();
});

Then("each exercise card displays side-by-side comparison:", async ({ page }, _docString: string) => {
  await expect(page.getByText("Prescrito")).toBeVisible();
  await expect(page.getByText("✓ Completo")).toBeVisible();
  await expect(page.getByText(/Média:/)).toBeVisible();
});

Then("each logged set is displayed with:", async ({ page }, _docString: string) => {
  await expect(page.getByText("Série 1").first()).toBeVisible();
  await expect(page.getByText(/\d{2}:\d{2}/).first()).toBeVisible();
  await expect(page.getByText(/reps/).first()).toBeVisible();
});

Then("missed sessions are clearly marked:", async ({ page }, _docString: string) => {
  const missedButton = page.getByRole("button").filter({ hasText: "Perdido" });
  await expect(missedButton).toBeVisible();
  await expect(missedButton.locator("svg").first()).toBeVisible();
  // The missed session is the most recent one, so it is expanded by default.
  await expect(page.getByText("Nenhuma série registrada")).toBeVisible();
});

Then("a friendly empty state is displayed:", async ({ page }, _docString: string) => {
  await expect(
    page.getByText("Nenhuma sessão de treino registrada ainda."),
  ).toBeVisible();
});
