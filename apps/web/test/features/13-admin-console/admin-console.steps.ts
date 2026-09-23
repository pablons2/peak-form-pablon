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

async function loginAsAdmin(page: Page) {
  await h.ensureAdmin();
  await login(page, h.ADMIN_EMAIL, h.TEST_PASSWORD);
}

// --- Scenario: approve a pending professional -------------------------------

Given('a pending professional "bdd.admin-pro1@example.com"', async () => {
  await h.seedProfessional("bdd.admin-pro1@example.com");
});

When("the admin logs in and opens the approvals queue", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/approvals");
  await page.waitForLoadState("networkidle");
});

When('the admin approves "bdd.admin-pro1@example.com"', async ({ page }) => {
  const row = page.locator("li").filter({ hasText: "bdd.admin-pro1@example.com" });
  await row.getByRole("button", { name: "Aprovar" }).click();
  await page.waitForLoadState("networkidle");
});

Then('the approvals queue no longer lists "bdd.admin-pro1@example.com"', async ({ page }) => {
  await expect(page.getByText("bdd.admin-pro1@example.com")).toHaveCount(0);
});

// --- Scenario: deactivate/reactivate a client -------------------------------

Given('a verified client "bdd.admin-cli1@example.com"', async () => {
  await h.seedClient("bdd.admin-cli1@example.com");
});

When(
  'the admin logs in and opens the users list filtered by "bdd.admin-cli1@example.com"',
  async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(
      `/admin/users?q=${encodeURIComponent("bdd.admin-cli1@example.com")}`,
    );
    await page.waitForLoadState("networkidle");
  },
);

When("the admin deactivates the listed user", async ({ page }) => {
  await page.getByRole("button", { name: "Desativar" }).click();
  await page.waitForLoadState("networkidle");
});

Then('the user list shows "bdd.admin-cli1@example.com" as "Desativado"', async ({ page }) => {
  // The action button flips to "Reativar" only once the row's status is
  // DEACTIVATED — a more robust signal than matching the compound
  // "Cliente · Desativado" text node.
  await expect(page.getByRole("button", { name: "Reativar" })).toBeVisible();
});

When("the admin reactivates the listed user", async ({ page }) => {
  await page.getByRole("button", { name: "Reativar" }).click();
  await page.waitForLoadState("networkidle");
});

Then('the user list shows "bdd.admin-cli1@example.com" as "Ativo"', async ({ page }) => {
  await expect(page.getByRole("button", { name: "Desativar" })).toBeVisible();
});

// --- Scenario: force-unlink + audit log -------------------------------------

Given('an approved professional "bdd.admin-pro2@example.com"', async () => {
  await h.seedProfessional("bdd.admin-pro2@example.com", { approved: true });
});

Given(
  'a verified client "bdd.admin-cli2@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.admin-pro2@example.com"',
  async () => {
    await h.seedClient("bdd.admin-cli2@example.com");
    await h.seedActiveLink("bdd.admin-pro2@example.com", "bdd.admin-cli2@example.com");
  },
);

When("the admin logs in and opens the links list", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/links");
  await page.waitForLoadState("networkidle");
});

When("the admin force-unlinks that relationship", async ({ page }) => {
  const row = page.locator("li").filter({ hasText: "bdd.admin-cli2@example.com" });
  await row.getByRole("button", { name: "Forçar desvínculo" }).click();
  await page.waitForLoadState("networkidle");
});

Then('the link no longer appears as "Ativo"', async ({ page }) => {
  const row = page.locator("li").filter({ hasText: "bdd.admin-cli2@example.com" });
  await expect(row.getByRole("button", { name: "Forçar desvínculo" })).toHaveCount(0);
});

When('the admin opens the audit log filtered by action "LINK_FORCE_UNLINKED"', async ({ page }) => {
  await page.goto("/admin/audit-log?action=LINK_FORCE_UNLINKED");
  await page.waitForLoadState("networkidle");
});

Then("the audit log shows an entry", async ({ page }) => {
  // `.first()` — the dev DB isn't reset between suite reruns, so a prior
  // run's own LINK_FORCE_UNLINKED entries for this same persistent admin
  // account can still be present; this only asserts the filtered view is
  // non-empty; the API-layer suite's admin-console.feature already proves
  // the exact-count/exact-entity assertions against a per-scenario TRUNCATE.
  await expect(page.getByText("LINK_FORCE_UNLINKED").first()).toBeVisible();
});
