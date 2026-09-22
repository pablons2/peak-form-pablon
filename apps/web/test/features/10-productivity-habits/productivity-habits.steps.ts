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

// Both the "Hoje" card and the "Hábitos" list can render the same habit
// name at once (a due, unchecked habit shows up in both), so assertions
// scope to one <section> at a time rather than a bare page-wide getByText.
function habitsSection(page: Page) {
  return page.locator("section", { hasText: "Hábitos" });
}
function todaySection(page: Page) {
  return page.locator("section", { hasText: "Hoje" });
}
function tasksSection(page: Page) {
  return page.locator("section", { hasText: "Tarefas" });
}

// Set by whichever scenario's Given step runs, and read back by the shared
// "logs in and opens the habits page" When step below — mirrors
// messaging.steps.ts's module-level linkId/proId/clientId pattern.
let currentClientEmail: string;

// --- Scenario: create a habit, check it off, streak becomes 1 ------------

Given('a verified client "bdd.habits-client@example.com"', async () => {
  currentClientEmail = "bdd.habits-client@example.com";
  await h.seedClient(currentClientEmail);
});

When("the client adds the habit {string}", async ({ page }, name: string) => {
  const section = habitsSection(page);
  await section.getByLabel("Novo hábito").fill(name);
  await section.getByRole("button", { name: "Adicionar hábito" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the habit {string} appears in the habit list", async ({ page }, name: string) => {
  await expect(habitsSection(page).getByText(name)).toBeVisible();
});

When("the client checks off the habit {string}", async ({ page }, name: string) => {
  await todaySection(page)
    .getByRole("button", { name: `Marcar ${name} como feito` })
    .click();
  await page.waitForLoadState("networkidle");
});

Then("the habit {string} shows a streak of 1 dia", async ({ page }, name: string) => {
  void name;
  await expect(habitsSection(page).getByText("Sequência: 1 dia(s)")).toBeVisible();
});

// --- Scenario: add a task, mark it done -----------------------------------

Given('a verified client "bdd.habits-client2@example.com"', async () => {
  currentClientEmail = "bdd.habits-client2@example.com";
  await h.seedClient(currentClientEmail);
});

When("the client adds the task {string}", async ({ page }, text: string) => {
  const section = tasksSection(page);
  await section.getByLabel("Nova tarefa").fill(text);
  await section.getByRole("button", { name: "Adicionar tarefa" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the task {string} appears in the task list", async ({ page }, text: string) => {
  await expect(tasksSection(page).getByText(text)).toBeVisible();
});

When("the client marks the task {string} as done", async ({ page }, text: string) => {
  await tasksSection(page)
    .getByRole("button", { name: `Concluir tarefa ${text}` })
    .click();
  await page.waitForLoadState("networkidle");
});

Then("the task {string} appears struck through", async ({ page }, text: string) => {
  // The toggle button's accessible name flips to "Reabrir tarefa ..." once
  // done — the same UI state the strikethrough styling communicates
  // visually, checked here without depending on a specific CSS class name.
  await expect(
    tasksSection(page).getByRole("button", { name: `Reabrir tarefa ${text}` }),
  ).toBeVisible();
});

// --- Scenario: "Hoje" card shows a due habit and a due task ---------------

Given('a verified client "bdd.habits-client3@example.com"', async () => {
  currentClientEmail = "bdd.habits-client3@example.com";
  await h.seedClient(currentClientEmail);
});

Given('the client already has the habit "Alongar 10 min"', async () => {
  await h.seedHabit("bdd.habits-client3@example.com", "Alongar 10 min");
});

Given('the client already has a task "Ler 10 páginas" due today', async () => {
  await h.seedTask("bdd.habits-client3@example.com", "Ler 10 páginas");
});

Then('the "Hoje" card shows the habit {string}', async ({ page }, name: string) => {
  await expect(todaySection(page).getByText(name)).toBeVisible();
});

Then('the "Hoje" card shows the task {string}', async ({ page }, text: string) => {
  await expect(todaySection(page).getByText(text)).toBeVisible();
});

// --- Shared step: log in and land on /habits -------------------------------

When("the client logs in and opens the habits page", async ({ page }) => {
  await login(page, currentClientEmail, h.TEST_PASSWORD);
  await page.goto("/habits");
  await page.waitForLoadState("networkidle");
});

