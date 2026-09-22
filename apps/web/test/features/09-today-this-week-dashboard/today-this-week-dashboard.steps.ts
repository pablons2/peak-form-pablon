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

let currentClientEmail: string;
let currentProfessionalEmail: string;
let currentExerciseId: string;

// --- Scenario: "Hoje" tab shows today's session and due habits/tasks -------

Given('a verified client "bdd.dash-client@example.com"', async () => {
  currentClientEmail = "bdd.dash-client@example.com";
  await h.seedClient(currentClientEmail);
});

Given('an APPROVED professional "bdd.dash-pro@example.com" linked to that client', async () => {
  currentProfessionalEmail = "bdd.dash-pro@example.com";
  await h.seedProfessional(currentProfessionalEmail, { approved: true });
  await h.seedActiveLink(currentProfessionalEmail, currentClientEmail, "PERSONAL_TRAINER");
});

Given("that client has a training session scheduled for today", async () => {
  currentExerciseId = await h.seedCustomExercise(currentProfessionalEmail, "Agachamento Dash BDD");
  await h.seedPlanWithTodaySession(currentProfessionalEmail, currentClientEmail, currentExerciseId);
});

Given('that client already has the habit "Alongar"', async () => {
  await h.seedHabit(currentClientEmail, "Alongar");
});

Given('that client already has a task "Comprar whey" due today', async () => {
  await h.seedTask(currentClientEmail, "Comprar whey");
});

Then('the dashboard\'s "Hoje" tab shows "Treino de hoje"', async ({ page }) => {
  await expect(page.getByText("Treino de hoje")).toBeVisible();
});

Then('the dashboard\'s "Hoje" tab shows the habit {string}', async ({ page }, name: string) => {
  await expect(page.getByText(name)).toBeVisible();
});

Then('the dashboard\'s "Hoje" tab shows the task {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

// --- Scenario: switching to "Esta semana" shows the strip -------------------

Given('a verified client "bdd.dash-week-client@example.com"', async () => {
  currentClientEmail = "bdd.dash-week-client@example.com";
  await h.seedClient(currentClientEmail);
});

Given('an APPROVED professional "bdd.dash-week-pro@example.com" linked to that client', async () => {
  currentProfessionalEmail = "bdd.dash-week-pro@example.com";
  await h.seedProfessional(currentProfessionalEmail, { approved: true });
  await h.seedActiveLink(currentProfessionalEmail, currentClientEmail, "PERSONAL_TRAINER");
});

When('the client switches to the "Esta semana" tab', async ({ page }) => {
  await page.getByRole("tab", { name: "Esta semana" }).click();
});

Then("the dashboard shows the weekly summary card", async ({ page }) => {
  await expect(page.getByText("Resumo da semana")).toBeVisible();
});

// --- Scenario: a solo Client gets a plain rest-day dashboard ----------------

Given('a verified client "bdd.dash-solo@example.com"', async () => {
  currentClientEmail = "bdd.dash-solo@example.com";
  await h.seedClient(currentClientEmail);
});

Then('the dashboard\'s "Hoje" tab shows "Dia de descanso"', async ({ page }) => {
  await expect(page.getByText("Dia de descanso")).toBeVisible();
});

// --- Shared step: log in (lands on /dashboard for a Client) -----------------

When("the client logs in", async ({ page }) => {
  await login(page, currentClientEmail, h.TEST_PASSWORD);
});
