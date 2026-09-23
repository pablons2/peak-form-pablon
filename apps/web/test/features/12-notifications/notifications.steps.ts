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

async function apiToken(email: string): Promise<string> {
  const res = await h.apiPost("/auth/login", {
    email,
    password: h.TEST_PASSWORD,
  });
  if (res.status !== 200) throw new Error(`login failed for ${email}`);
  return res.body.accessToken as string;
}

// --- Scenario: new-message notification in list + nav badge ----------------

Given('an approved professional "bdd.notif-pro@example.com"', async () => {
  await h.seedProfessional("bdd.notif-pro@example.com", { approved: true });
});

Given(
  'a verified client "bdd.notif-client@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.notif-pro@example.com"',
  async () => {
    await h.seedClient("bdd.notif-client@example.com");
    await h.seedActiveLink("bdd.notif-pro@example.com", "bdd.notif-client@example.com");
  },
);

Given("the professional sends a message via the API", async () => {
  // The client's own signup already left an unread EMAIL_VERIFICATION
  // notification — clear it first so the badge assertion below is about
  // exactly the one NEW_MESSAGE this step produces.
  const clientToken = await apiToken("bdd.notif-client@example.com");
  await h.apiPost("/notifications/read-all", {}, clientToken);

  const proToken = await apiToken("bdd.notif-pro@example.com");
  const threads = await h.apiGet("/messaging/threads", proToken);
  const threadId = (threads.body.threads as { id: string }[])[0]?.id;
  if (!threadId) throw new Error("no thread found for seeded link");
  const sent = await h.apiPost(
    `/messaging/threads/${threadId}/messages`,
    { body: "Oi!" },
    proToken,
  );
  if (sent.status !== 201) throw new Error(`message send failed: ${sent.status}`);
});

When('the client "bdd.notif-client@example.com" logs in and opens notifications', async ({ page }) => {
  await login(page, "bdd.notif-client@example.com", h.TEST_PASSWORD);
  await page.goto("/notifications");
  await page.waitForLoadState("networkidle");
});

Then("the notifications nav item shows a badge of 1", async ({ page }) => {
  const navLink = page
    .locator("aside")
    .getByRole("link", { name: /Notificações/ });
  await expect(navLink).toContainText("1");
});

Then('the notification list shows "Nova mensagem de BDD Professional"', async ({ page }) => {
  await expect(
    page.getByText("Nova mensagem de BDD Professional"),
  ).toBeVisible();
});

When("the client marks the notification as read", async ({ page }) => {
  await page.getByRole("button", { name: "Marcar como lida" }).first().click();
  await page.waitForLoadState("networkidle");
});

Then("the notification is no longer unread", async ({ page }) => {
  await expect(page.getByText("não lida")).toHaveCount(0);
});

Then("the notifications nav badge is gone", async ({ page }) => {
  const navLink = page
    .locator("aside")
    .getByRole("link", { name: /Notificações/ });
  await expect(navLink).not.toContainText(/\d/);
});

// --- Scenario: preferences ------------------------------------------------

Given('an approved professional "bdd.notif-pro2@example.com"', async () => {
  await h.seedProfessional("bdd.notif-pro2@example.com", { approved: true });
});

Given(
  'a verified client "bdd.notif-client2@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.notif-pro2@example.com"',
  async () => {
    await h.seedClient("bdd.notif-client2@example.com");
    await h.seedActiveLink(
      "bdd.notif-pro2@example.com",
      "bdd.notif-client2@example.com",
    );
  },
);

When('the client "bdd.notif-client2@example.com" logs in and opens notifications', async ({ page }) => {
  await login(page, "bdd.notif-client2@example.com", h.TEST_PASSWORD);
  await page.goto("/notifications");
  await page.waitForLoadState("networkidle");
});

When('the client turns off email for "Nova mensagem" and saves preferences', async ({ page }) => {
  const row = page.getByRole("listitem").filter({ hasText: "Nova mensagem" });
  await row.getByRole("checkbox", { name: "E-mail" }).uncheck();
  await page.getByRole("button", { name: "Salvar preferências" }).click();
});

Then("the preferences confirmation is shown", async ({ page }) => {
  await expect(page.getByText("Preferências salvas.")).toBeVisible();
});

Then('the API shows email disabled for "NEW_MESSAGE"', async () => {
  const token = await apiToken("bdd.notif-client2@example.com");
  const res = await h.apiGet("/notifications/preferences", token);
  const prefs = res.body.preferences as {
    type: string;
    emailEnabled: boolean;
  }[];
  const newMessage = prefs.find((p) => p.type === "NEW_MESSAGE");
  expect(newMessage).toBeTruthy();
  expect(newMessage!.emailEnabled).toBe(false);
});

Then('the "Decisão de aprovação" email checkbox is disabled and checked', async ({ page }) => {
  const row = page
    .getByRole("listitem")
    .filter({ hasText: "Decisão de aprovação" });
  const checkbox = row.getByRole("checkbox", { name: "E-mail" });
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toBeChecked();
});

// --- Scenario: push not configured ----------------------------------------

Given('a verified client "bdd.notif-client3@example.com"', async () => {
  await h.seedClient("bdd.notif-client3@example.com");
});

When('the client "bdd.notif-client3@example.com" logs in and opens notifications', async ({ page }) => {
  await login(page, "bdd.notif-client3@example.com", h.TEST_PASSWORD);
  await page.goto("/notifications");
  await page.waitForLoadState("networkidle");
});

Then("the push section explains push is not configured in this environment", async ({ page }) => {
  await expect(
    page.getByText("Notificações push não estão configuradas neste ambiente."),
  ).toBeVisible();
});
