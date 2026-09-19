import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

// Shared UI flows — plain helpers because several scenarios drive the same
// login sequence with different expected landing pages.
async function fillLoginForm(page: Page, email: string, password: string) {
  await page.goto("/login");
  // Dev server compiles routes on demand — networkidle is a cheap guard so
  // the submit click can't land before hydration wires up the form handlers.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function pollForToken(email: string): Promise<string> {
  // MailHog delivery is near-instant but async — give it a few seconds.
  for (let i = 0; i < 10; i++) {
    try {
      return await h.emailedToken(email);
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return h.emailedToken(email);
}

// --- Scenario: client signup → verify → login -------------------------------

When("a visitor opens the client signup page", async ({ page }) => {
  // The UI scenario owns bdd.ana/bdd.nodata — clear leftovers from previous
  // runs so the signup below always starts fresh (parallel-safe: each
  // scenario only deletes emails it owns).
  h.deleteUser("bdd.ana@example.com");
  h.deleteUser("bdd.nodata@example.com");
  await page.goto("/signup/client");
});

When(
  'submits valid client details for email "bdd.ana@example.com"',
  async ({ page }) => {
    await page.getByLabel("Nome completo").fill("Ana BDD");
    await page.getByLabel("Email").fill("bdd.ana@example.com");
    await page.getByLabel("Senha").fill(h.TEST_PASSWORD);
    await page.getByLabel("Data de nascimento").fill("1995-03-20");
    await page.getByLabel("Sexo biológico").selectOption("FEMALE");
    await page.getByRole("button", { name: "Criar conta" }).click();
  },
);

Then(
  'a verification email arrives for "bdd.ana@example.com"',
  async ({ page }) => {
    await expect(page.getByText(/Conta criada!/)).toBeVisible();
    await pollForToken("bdd.ana@example.com");
  },
);

When(
  "the visitor verifies their email using the code from that email",
  async ({ page }) => {
    const token = await pollForToken("bdd.ana@example.com");
    await page.goto("/verify-email");
    await page.getByLabel("Código de verificação").fill(token);
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByText(/Email verificado!/)).toBeVisible();
  },
);

When('logs in with email "bdd.ana@example.com"', async ({ page }) => {
  await fillLoginForm(page, "bdd.ana@example.com", h.TEST_PASSWORD);
});

Then("they land on the dashboard", async ({ page }) => {
  await page.waitForURL("**/dashboard");
  await expect(page.getByText(/Olá,/)).toBeVisible();
});

// --- Scenario: dob/sex required ---------------------------------------------

When(
  "submits the form with everything filled except dateOfBirth and biologicalSex",
  async ({ page }) => {
    await page.getByLabel("Nome completo").fill("Sem Dados");
    await page.getByLabel("Email").fill("bdd.nodata@example.com");
    await page.getByLabel("Senha").fill(h.TEST_PASSWORD);
    await page.getByRole("button", { name: "Criar conta" }).click();
  },
);

Then(
  "the signup form shows field errors and stays on the page",
  async ({ page }) => {
    await expect(page).toHaveURL(/\/signup\/client/);
    // zod resolver marks both missing fields — assert an error surfaced
    // without coupling the scenario to the exact message text.
    await expect(page.locator(".text-destructive").first()).toBeVisible();
  },
);

// --- Scenarios: professional approval gating --------------------------------

Given(
  'a verified professional "bdd.pro@example.com" pending approval',
  async () => {
    await h.seedProfessional("bdd.pro@example.com");
  },
);

Given(
  'a professional "bdd.pro2@example.com" approved by an admin',
  async () => {
    await h.seedProfessional("bdd.pro2@example.com", { approved: true });
  },
);

When(
  'they log in through the UI with email "bdd.pro@example.com"',
  async ({ page }) => {
    await fillLoginForm(page, "bdd.pro@example.com", h.TEST_PASSWORD);
  },
);

When(
  'they log in through the UI with email "bdd.pro2@example.com"',
  async ({ page }) => {
    await fillLoginForm(page, "bdd.pro2@example.com", h.TEST_PASSWORD);
  },
);

Then("they land on the waiting-for-approval screen", async ({ page }) => {
  await page.waitForURL("**/pending-approval");
  await expect(page.getByText("Aguardando aprovação")).toBeVisible();
});

Then(
  "navigating directly to the dashboard still shows the approval screen",
  async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/pending-approval");
    await expect(page.getByText("Aguardando aprovação")).toBeVisible();
  },
);

// --- Scenario: unauthenticated redirect -------------------------------------

When(
  "a visitor opens the dashboard without logging in",
  async ({ page }) => {
    await page.goto("/dashboard");
  },
);

Then("they are redirected to the login page", async ({ page }) => {
  await page.waitForURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

// --- Scenario: password reset ------------------------------------------------

Given('a verified client "bdd.reset@example.com"', async () => {
  await h.seedClient("bdd.reset@example.com");
});

When(
  'they request a password reset for "bdd.reset@example.com"',
  async ({ page }) => {
    await page.goto("/password-reset");
    await page.getByLabel("Email").fill("bdd.reset@example.com");
    await page.getByRole("button", { name: "Enviar código" }).click();
    await expect(page.getByText(/você receberá um código/)).toBeVisible();
  },
);

When(
  'set a new password "N3wPassw0rd!" using the emailed code',
  async ({ page }) => {
    const token = await pollForToken("bdd.reset@example.com");
    await page.goto("/password-reset/confirm");
    await page.getByLabel("Código recebido por email").fill(token);
    await page.getByLabel("Nova senha").fill("N3wPassw0rd!");
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(page.getByText(/Senha redefinida!/)).toBeVisible();
  },
);

Then("they can log in with the new password", async ({ page }) => {
  await fillLoginForm(page, "bdd.reset@example.com", "N3wPassw0rd!");
  await page.waitForURL("**/dashboard");
});

Then("logging in with the old password shows an error", async ({ page }) => {
  await fillLoginForm(page, "bdd.reset@example.com", h.TEST_PASSWORD);
  await expect(page.getByRole("alert")).toBeVisible();
});
