import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

// Shared UI flows — mirrors 01-authentication-account-management's
// fillLoginForm/pattern. A single `page` plays both personas across a
// scenario by signing out and back in, rather than juggling two browser
// contexts — simpler, and NextAuth's session cookie makes it a clean swap.
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  // NextAuth's own redirect (not redirect:false) does a hard navigation once
  // the session cookie is committed — wait for it to actually land, the same
  // way 01-authentication-account-management's scenarios do, instead of a
  // bare networkidle that can resolve mid-flight and race a subsequent
  // page.goto() into being bounced back to /login by the middleware.
  await page.waitForURL(/\/(dashboard|pending-approval)/);
  await page.waitForLoadState("networkidle");
}

async function logout(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL(/\/login/);
}

function sectionByHeading(page: Page, heading: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

// --- Given: seeded personas --------------------------------------------------

const PROFESSIONALS = [
  "bdd.rel-pro@example.com",
  "bdd.rel-pro2@example.com",
  "bdd.rel-pro3@example.com",
];
for (const email of PROFESSIONALS) {
  Given(`an approved professional "${email}"`, async () => {
    await h.seedProfessional(email, { approved: true });
  });
}

Given('a verified client "bdd.rel-client@example.com"', async () => {
  await h.seedClient("bdd.rel-client@example.com");
});

Given(
  'a verified client "bdd.rel-client2@example.com" already linked to them as "PERSONAL_TRAINER"',
  async () => {
    await h.seedClient("bdd.rel-client2@example.com");
    await h.seedActiveLink(
      "bdd.rel-pro2@example.com",
      "bdd.rel-client2@example.com",
      "PERSONAL_TRAINER",
    );
  },
);

Given(
  'a verified client "bdd.rel-client3@example.com" already linked to them as "PERSONAL_TRAINER"',
  async () => {
    await h.seedClient("bdd.rel-client3@example.com");
    await h.seedActiveLink(
      "bdd.rel-pro3@example.com",
      "bdd.rel-client3@example.com",
      "PERSONAL_TRAINER",
    );
  },
);

// --- Scenario: invite through the UI, accept through the UI -----------------

When(
  'the professional logs in and invites "bdd.rel-client@example.com" as "Personal trainer" from the clients page',
  async ({ page }) => {
    await login(page, "bdd.rel-pro@example.com", h.TEST_PASSWORD);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email do cliente").fill("bdd.rel-client@example.com");
    await page.getByLabel("Personal trainer").check();
    await page.getByRole("button", { name: "Convidar cliente" }).click();
    await expect(page.getByText("Convite enviado!")).toBeVisible();
  },
);

Then('the invite appears under "Pendentes" on the clients page', async ({ page }) => {
  await expect(
    sectionByHeading(page, "Pendentes").getByText("BDD Client"),
  ).toBeVisible();
});

When(
  "the client logs in and accepts the pending invite from the team page",
  async ({ page }) => {
    await login(page, "bdd.rel-client@example.com", h.TEST_PASSWORD);
    await page.goto("/team");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Aceitar" }).click();
  },
);

Then('the client sees the professional under "Time atual"', async ({ page }) => {
  await expect(
    sectionByHeading(page, "Time atual").getByText("BDD Professional"),
  ).toBeVisible();
});

When(
  "the professional logs in again and opens the clients page",
  async ({ page }) => {
    await logout(page);
    await login(page, "bdd.rel-pro@example.com", h.TEST_PASSWORD);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
  },
);

Then('the client appears under "Ativos"', async ({ page }) => {
  await expect(sectionByHeading(page, "Ativos").getByText("BDD Client")).toBeVisible();
});

// --- Scenario: unlink from the team page -------------------------------------

When(
  "the client logs in and unlinks the professional from the team page",
  async ({ page }) => {
    await login(page, "bdd.rel-client2@example.com", h.TEST_PASSWORD);
    await page.goto("/team");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Encerrar vínculo" }).click();
  },
);

Then(
  'the professional no longer appears under "Time atual"',
  async ({ page }) => {
    await expect(
      page.getByText("Você ainda não tem um trainer ou nutricionista vinculado."),
    ).toBeVisible();
  },
);

Then('the relationship appears in "Histórico"', async ({ page }) => {
  await expect(
    sectionByHeading(page, "Histórico").getByText("BDD Professional"),
  ).toBeVisible();
});

// --- Scenario: check-in visible read-only on the client's team page ---------

When(
  "the professional logs in and creates a weekly check-in for that client from the client detail page",
  async ({ page }) => {
    await login(page, "bdd.rel-pro3@example.com", h.TEST_PASSWORD);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Ver detalhes" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Tipo de lembrete").selectOption("RECURRING");
    await page.getByLabel("Frequência").selectOption("WEEKLY");
    await page.getByLabel("Dia da semana").selectOption("5");
    await page.getByRole("button", { name: "Criar lembrete" }).click();
  },
);

Then(
  "the client logs in and sees the upcoming check-in on the team page with no edit or cancel controls",
  async ({ page }) => {
    await login(page, "bdd.rel-client3@example.com", h.TEST_PASSWORD);
    await page.goto("/team");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Semanal — Sexta-feira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
  },
);
