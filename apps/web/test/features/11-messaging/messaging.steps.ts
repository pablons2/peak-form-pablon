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

// Resolves a seeded user's own id once, up front (in a Given step) rather
// than via a throwaway API login buried inside a When step that's also
// driving the browser — keeps the id resolution failure-mode independent of
// (and clearly separated from) whatever the UI interaction itself does.
async function getUserId(email: string): Promise<string> {
  const login_ = await h.apiPost("/auth/login", { email, password: h.TEST_PASSWORD });
  if (login_.status !== 200) throw new Error(`login failed for ${email}: ${login_.status}`);
  const me = await h.apiGet("/auth/me", login_.body.accessToken as string);
  if (!me.body.id) throw new Error(`/auth/me returned no id for ${email}`);
  return me.body.id as string;
}

async function unlinkRelationship(linkId: string, clientEmail: string): Promise<void> {
  const clientLogin = await h.apiPost("/auth/login", {
    email: clientEmail,
    password: h.TEST_PASSWORD,
  });
  const token = clientLogin.body.accessToken as string;
  const res = await h.apiPost(`/links/${linkId}/unlink`, {}, token);
  if (res.status !== 200) throw new Error(`unlink failed: ${res.status}`);
}

let linkId: string;
let proId: string;
let clientId: string;

// --- Scenario: exchange messages ------------------------------------------

Given('an approved professional "bdd.msg-pro@example.com"', async () => {
  await h.seedProfessional("bdd.msg-pro@example.com", { approved: true });
  proId = await getUserId("bdd.msg-pro@example.com");
});

Given(
  'a verified client "bdd.msg-client@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.msg-pro@example.com"',
  async () => {
    await h.seedClient("bdd.msg-client@example.com");
    clientId = await getUserId("bdd.msg-client@example.com");
    linkId = await h.seedActiveLink("bdd.msg-pro@example.com", "bdd.msg-client@example.com");
  },
);

When("the professional logs in and opens the thread with the client", async ({ page }) => {
  await login(page, "bdd.msg-pro@example.com", h.TEST_PASSWORD);
  await page.goto(`/messages/with/${clientId}`);
  await page.waitForLoadState("networkidle");
});

When('the professional sends the message "Oi! Como foi o treino?"', async ({ page }) => {
  await page.getByLabel("Mensagem").fill("Oi! Como foi o treino?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the message appears in the thread", async ({ page }) => {
  await expect(page.getByText("Oi! Como foi o treino?")).toBeVisible();
});

When("the client logs in and opens the thread with the professional", async ({ page }) => {
  await login(page, "bdd.msg-client@example.com", h.TEST_PASSWORD);
  await page.goto(`/messages/with/${proId}`);
  await page.waitForLoadState("networkidle");
});

Then('the client sees the message "Oi! Como foi o treino?"', async ({ page }) => {
  await expect(page.getByText("Oi! Como foi o treino?")).toBeVisible();
});

// --- Scenario: unlink turns the thread read-only ---------------------------

Given('an approved professional "bdd.msg-pro2@example.com"', async () => {
  await h.seedProfessional("bdd.msg-pro2@example.com", { approved: true });
  proId = await getUserId("bdd.msg-pro2@example.com");
});

Given(
  'a verified client "bdd.msg-client2@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.msg-pro2@example.com"',
  async () => {
    await h.seedClient("bdd.msg-client2@example.com");
    clientId = await getUserId("bdd.msg-client2@example.com");
    linkId = await h.seedActiveLink("bdd.msg-pro2@example.com", "bdd.msg-client2@example.com");
  },
);

Given(
  'the professional already sent the message "Antes do desligamento" in that thread',
  async () => {
    const proLogin = await h.apiPost("/auth/login", {
      email: "bdd.msg-pro2@example.com",
      password: h.TEST_PASSWORD,
    });
    const proToken = proLogin.body.accessToken as string;
    const thread = await h.apiGet(`/messaging/threads/with/${clientId}`, proToken);
    const threadId = (thread.body.thread as { id: string }).id;
    const send = await h.apiPost(
      `/messaging/threads/${threadId}/messages`,
      { body: "Antes do desligamento" },
      proToken,
    );
    if (send.status !== 201) throw new Error(`seed message failed: ${send.status}`);
  },
);

When("the client unlinks the relationship", async () => {
  await unlinkRelationship(linkId, "bdd.msg-client2@example.com");
});

When("the professional opens the thread again", async ({ page }) => {
  await login(page, "bdd.msg-pro2@example.com", h.TEST_PASSWORD);
  await page.goto(`/messages/with/${clientId}`);
  await page.waitForLoadState("networkidle");
});

Then("the thread shows a read-only notice and no composer", async ({ page }) => {
  await expect(page.getByText("a conversa ficou disponível apenas para")).toBeVisible();
  await expect(page.getByLabel("Mensagem")).toHaveCount(0);
});

Then("the earlier message is still visible", async ({ page }) => {
  await expect(page.getByText("Antes do desligamento")).toBeVisible();
});

// --- Scenario: HTML-looking text renders literally -------------------------

Given('an approved professional "bdd.msg-pro3@example.com"', async () => {
  await h.seedProfessional("bdd.msg-pro3@example.com", { approved: true });
  proId = await getUserId("bdd.msg-pro3@example.com");
});

Given(
  'a verified client "bdd.msg-client3@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.msg-pro3@example.com"',
  async () => {
    await h.seedClient("bdd.msg-client3@example.com");
    clientId = await getUserId("bdd.msg-client3@example.com");
    await h.seedActiveLink("bdd.msg-pro3@example.com", "bdd.msg-client3@example.com");
  },
);

When("the third professional logs in and opens the thread with the third client", async ({
  page,
}) => {
  await login(page, "bdd.msg-pro3@example.com", h.TEST_PASSWORD);
  await page.goto(`/messages/with/${clientId}`);
  await page.waitForLoadState("networkidle");
});

When('the professional sends the message "<b>bold<script>xss-marker"', async ({ page }) => {
  await page.getByLabel("Mensagem").fill("<b>bold<script>xss-marker");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.waitForLoadState("networkidle");
});

Then("the message renders as literal text, not as bold or a script", async ({ page }) => {
  await expect(page.getByText("<b>bold<script>xss-marker")).toBeVisible();
  await expect(page.locator("script", { hasText: "xss-marker" })).toHaveCount(0);
  await expect(page.locator("b", { hasText: "bold" })).toHaveCount(0);
});
