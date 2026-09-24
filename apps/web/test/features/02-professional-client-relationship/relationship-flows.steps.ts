import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import * as h from "../../support/helpers";

const { Given, When, Then } = createBdd();

// playwright-bdd passes Gherkin data tables as its own DataTable class, which
// @playwright/test does not re-export — a structural stand-in is enough here.
interface BddDataTable {
  rows(): string[][];
}

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
    // The next step navigates this same tab away (client's login) — without
    // waiting for the created schedule to render, the in-flight server action
    // can be aborted by that navigation before it commits, and the check-in
    // never exists (the reproducible "flake" this scenario used to have).
    await expect(page.getByText("Semanal — Sexta-feira")).toBeVisible();
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

// --- Phase 3.x: client detail hub + plan builder media scenarios --------------
//
// The hub scenarios (redesign-plan §5.4) and the plan-builder media/
// contraindication scenarios share one professional+client pair per scenario
// and read the same screens, so they keep per-scenario emails (reruns stay
// idempotent via each seed's delete-first) and module state for the ids the
// When/Then steps need.

let hubProEmail: string;
let hubClientEmail: string;
let hubExerciseId: string;
let hubContraindicatedExerciseId: string;
let hubSessionId: string;

// pt-BR intake vocabulary → wire codes (mirrors intake/labels.ts, kept local
// so the step reads the scenario's plain language directly).
const PAIN_FLAG_REGIONS: Record<string, string> = {
  "dor no joelho esquerdo": "KNEE_LEFT",
  "dor no joelho": "KNEE_LEFT",
  "lesão no ombro": "SHOULDER_LEFT",
};
const CONDITION_CODES: Record<string, string> = {
  hipertensão: "HYPERTENSION",
};
// PRD 05 tag code → the body region whose CURRENT pain flag derives it
// (apps/api/src/intake/domain/map-intake-to-contraindication-tags.ts).
const TAG_SOURCE_REGIONS: Record<string, string> = {
  KNEE_LOAD_CAUTION: "KNEE_LEFT",
  SHOULDER_IMPINGEMENT_CAUTION: "SHOULDER_LEFT",
};

function parseDelimited(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function regionForPainFlagLabel(label: string): string {
  const region = PAIN_FLAG_REGIONS[label.toLowerCase()];
  if (!region) throw new Error(`No body region mapped for pain flag "${label}"`);
  return region;
}

function regionForTagCode(code: string): string {
  const region = TAG_SOURCE_REGIONS[code];
  if (!region) throw new Error(`No body region mapped for tag "${code}"`);
  return region;
}

function conditionForLabel(label: string): string {
  const code = CONDITION_CODES[label.toLowerCase()];
  if (!code) throw new Error(`No medical condition mapped for "${label}"`);
  return code;
}

for (const email of [
  "bdd.detail-pro@example.com",
  "bdd.contraindication-pro@example.com",
  "bdd.clean-intake-pro@example.com",
  "bdd.trainer-display-pro@example.com",
  "bdd.exercise-media-pro@example.com",
  "bdd.contraindicated-ex-pro@example.com",
  "bdd.e2e-plan-pro@example.com",
]) {
  Given(`an approved professional "${email}"`, async () => {
    await h.seedProfessional(email, { approved: true });
    hubProEmail = email;
  });
}

// Regex patterns: the parenthesized intake details would otherwise parse as
// optional cucumber-expression text.
Given(
  /^a verified client "bdd\.detail-client@example\.com" with completed intake \(age 28, 180cm, 75kg, primary goal "Ganhar massa muscular"\)$/,
  async ({}) => {
    await h.seedClient("bdd.detail-client@example.com");
    await h.seedCompletedIntake("bdd.detail-client@example.com");
    hubClientEmail = "bdd.detail-client@example.com";
  },
);

Given(
  'a verified client "bdd.contraindication-client@example.com" with completed intake including:',
  async ({}, dataTable: BddDataTable) => {
    await h.seedClient("bdd.contraindication-client@example.com");
    const rows = dataTable.rows().map(([first]) => first ?? "");
    const painFlags = rows
      .find((r) => r.startsWith("pain flags:"))
      ?.replace(/^pain flags:\s*/, "");
    const conditions = rows
      .find((r) => r.startsWith("medical conditions:"))
      ?.replace(/^medical conditions:\s*/, "");
    await h.seedCompletedIntake("bdd.contraindication-client@example.com", {
      painFlags: parseDelimited(painFlags ?? "").map((label) => ({
        region: regionForPainFlagLabel(label),
        severity: 6,
        pastOrCurrent: "CURRENT" as const,
      })),
      medicalConditions: parseDelimited(conditions ?? "").map(conditionForLabel),
    });
    hubClientEmail = "bdd.contraindication-client@example.com";
  },
);

Given(
  /^a verified client "bdd\.clean-intake-client@example\.com" with completed intake \(no pain flags or medical conditions\)$/,
  async ({}) => {
    await h.seedClient("bdd.clean-intake-client@example.com");
    await h.seedCompletedIntake("bdd.clean-intake-client@example.com", {
      painFlags: [],
    });
    hubClientEmail = "bdd.clean-intake-client@example.com";
  },
);

Given(
  'a verified client "bdd.trainer-display-client@example.com" with completed intake',
  async () => {
    await h.seedClient("bdd.trainer-display-client@example.com");
    await h.seedCompletedIntake("bdd.trainer-display-client@example.com");
    hubClientEmail = "bdd.trainer-display-client@example.com";
  },
);

Given(
  'a verified client "bdd.exercise-media-client@example.com" with completed intake',
  async () => {
    await h.seedClient("bdd.exercise-media-client@example.com");
    await h.seedCompletedIntake("bdd.exercise-media-client@example.com");
    hubClientEmail = "bdd.exercise-media-client@example.com";
  },
);

Given(
  'a verified client "bdd.contraindicated-ex-client@example.com" with completed intake including contraindications:',
  async ({}, dataTable: BddDataTable) => {
    await h.seedClient("bdd.contraindicated-ex-client@example.com");
    // Contraindication tags are derived by the API from CURRENT pain flags
    // (PRD 03 §5.2), so each tag code is expressed as its source region.
    const codes = dataTable.rows().map(([first]) => first ?? "");
    await h.seedCompletedIntake("bdd.contraindicated-ex-client@example.com", {
      painFlags: codes.map((code) => ({
        region: regionForTagCode(code),
        severity: 6,
        pastOrCurrent: "CURRENT" as const,
      })),
    });
    hubClientEmail = "bdd.contraindicated-ex-client@example.com";
  },
);

Given(
  'a verified client "bdd.e2e-plan-client@example.com" with completed intake:',
  async ({}, dataTable: BddDataTable) => {
    await h.seedClient("bdd.e2e-plan-client@example.com");
    const rows = dataTable.rows().map(([first]) => first ?? "");
    const painFlags = rows
      .find((r) => r.startsWith("pain flags:"))
      ?.replace(/^pain flags:\s*/, "");
    await h.seedCompletedIntake("bdd.e2e-plan-client@example.com", {
      painFlags: parseDelimited(painFlags ?? "").map((label) => ({
        region: regionForPainFlagLabel(label),
        severity: 6,
        pastOrCurrent: "CURRENT" as const,
      })),
    });
    hubClientEmail = "bdd.e2e-plan-client@example.com";
  },
);

Given('they are linked as "PERSONAL_TRAINER"', async () => {
  await h.seedActiveLink(hubProEmail, hubClientEmail, "PERSONAL_TRAINER");
});

async function seedPlanWithSessionAndMediaExercises() {
  // One clean exercise (with media) for the preview card, plus the two
  // contraindicated ones the warning scenarios read from the same selector.
  hubExerciseId = await h.seedCustomExercise(hubProEmail, "Supino BDD Mídia", [], {
    mediaUrl: "https://cdn.peakform.test/supino-bdd.svg",
  });
  hubContraindicatedExerciseId = await h.seedCustomExercise(
    hubProEmail,
    "Back Squat BDD",
    ["KNEE_LOAD_CAUTION"],
  );
  await h.seedCustomExercise(hubProEmail, "Bench Press BDD", [
    "SHOULDER_IMPINGEMENT_CAUTION",
  ]);
  const { sessionId } = await h.seedPlanWithTodaySession(
    hubProEmail,
    hubClientEmail,
    hubExerciseId,
  );
  hubSessionId = sessionId;
}

Given("a training plan exists with a session", async () => {
  await seedPlanWithSessionAndMediaExercises();
});

Given("a training plan with a session exists for this client", async () => {
  await seedPlanWithSessionAndMediaExercises();
});

When(
  "the professional logs in and opens the client detail page",
  async ({ page }) => {
    await login(page, hubProEmail, h.TEST_PASSWORD);
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Ver detalhes" }).click();
    await page.waitForLoadState("networkidle");
  },
);

async function openSessionEdit(page: Page) {
  await login(page, hubProEmail, h.TEST_PASSWORD);
  await page.goto(`/sessions/${hubSessionId}/edit`);
  await page.waitForLoadState("networkidle");
}

When(
  "the professional opens the session and selects an exercise from the dropdown",
  async ({ page }) => {
    await openSessionEdit(page);
    const select = page.locator("select").first();
    await select.click();
    await select.selectOption(hubExerciseId);
  },
);

When("the professional opens the session's exercise selector", async ({ page }) => {
  await openSessionEdit(page);
});

When("the professional opens the session to edit exercises", async ({ page }) => {
  await openSessionEdit(page);
});

Then("the professional sees a profile card with:", async ({ page }, dataTable) => {
  for (const [row] of dataTable.rows()) {
    if (row === "avatar with client initials") {
      await expect(page.getByText("BC", { exact: true })).toBeVisible();
    } else if (row === "client name and email") {
      await expect(page.getByText("BDD Client")).toBeVisible();
      await expect(page.getByText(hubClientEmail)).toBeVisible();
    } else if (row === 'status badge "Ativo"') {
      await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
    } else if (row === "intake status indicator") {
      await expect(page.getByText("Triagem completa")).toBeVisible();
    } else if (row === "quick stats grid showing active check-ins count") {
      await expect(page.getByText("CHECK-INS ATIVOS")).toBeVisible();
    } else if (row === "quick stats grid showing training plans count") {
      await expect(page.getByText("PLANOS")).toBeVisible();
    } else if (row === "quick stats grid showing link type") {
      await expect(page.getByText("TIPO")).toBeVisible();
    } else {
      throw new Error(`Unhandled profile-card row: ${row}`);
    }
  }
});

Then(
  "the page shows tabs for {string}, {string}, {string}, {string}",
  async ({ page }, tab1: string, tab2: string, tab3: string, tab4: string) => {
    for (const label of [tab1, tab2, tab3, tab4]) {
      await expect(page.getByRole("tab", { name: new RegExp(label) })).toBeVisible();
    }
  },
);

Then(
  'the professional sees a prominent "Alertas de Contraindicação" card with:',
  async ({ page }, dataTable) => {
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Alertas de Contraindicação" });
    await expect(alert).toBeVisible();
    for (const [row] of dataTable.rows()) {
      if (row === "warning icon") {
        await expect(alert.locator("svg").first()).toBeVisible();
      } else if (row === "list of pain flags") {
        await expect(alert.getByText("Joelho esquerdo, Ombro esquerdo")).toBeVisible();
      } else if (row === "list of medical conditions") {
        await expect(alert.getByText("Hipertensão")).toBeVisible();
      } else if (row === "list of contraindicated exercise categories") {
        await expect(alert.getByText("KNEE_LOAD_CAUTION")).toBeVisible();
      } else if (row === "link to view full health intake") {
        await expect(alert.getByText("Ver triagem completa")).toBeVisible();
      } else {
        throw new Error(`Unhandled contraindication-card row: ${row}`);
      }
    }
  },
);

Then('no "Alertas de Contraindicação" card is visible', async ({ page }) => {
  await expect(page.getByText("Alertas de Contraindicação")).toHaveCount(0);
});

Then("the profile card displays normally without alerts", async ({ page }) => {
  await expect(page.getByText("Triagem completa")).toBeVisible();
  await expect(page.getByText("Triagem Pendente")).toHaveCount(0);
});

Then("the professional sees a trainer profile card showing:", async ({ page }, dataTable) => {
  // Innermost container holding both the "Responsável" label and the
  // professional's name — i.e. the TrainerProfileCard itself.
  const card = page
    .locator("div")
    .filter({ hasText: "Responsável" })
    .filter({ hasText: "BDD Professional" })
    .last();
  await expect(card).toBeVisible();
  for (const [row] of dataTable.rows()) {
    if (row === "trainer name") {
      await expect(card.getByText("BDD Professional")).toBeVisible();
    } else if (row === "trainer email") {
      await expect(card.getByText(hubProEmail)).toBeVisible();
    } else if (row === 'trainer specialization badge ("Personal Trainer")') {
      await expect(card.getByText("Personal Trainer")).toBeVisible();
    } else {
      throw new Error(`Unhandled trainer-card row: ${row}`);
    }
  }
});

Then("the trainer and client cards appear side-by-side on desktop", async ({ page }) => {
  const cliente = await page.getByText("CLIENTE", { exact: true }).boundingBox();
  const responsavel = await page.getByText("RESPONSÁVEL", { exact: true }).boundingBox();
  expect(
    cliente && responsavel && Math.abs(cliente.y - responsavel.y) < 50,
  ).toBeTruthy();
});

Then("an exercise media preview card appears showing:", async ({ page }, dataTable) => {
  for (const [row] of dataTable.rows()) {
    if (row === "exercise image/SVG") {
      await expect(page.locator('img[alt="Supino BDD Mídia"]')).toBeVisible();
    } else if (row === "exercise name and difficulty") {
      await expect(page.getByText("Supino BDD Mídia")).toBeVisible();
      await expect(page.getByText(/Dificuldade:/)).toBeVisible();
    } else if (row === "muscle groups (badges)") {
      await expect(page.getByText("CORE")).toBeVisible();
    } else if (row === "equipment required (badges)") {
      await expect(page.getByText("BODYWEIGHT")).toBeVisible();
    } else if (row === "form cues (bulleted list)") {
      await expect(page.getByText("Técnica:")).toBeVisible();
    } else if (row === "common mistakes (bulleted list)") {
      await expect(page.getByText("Erros Comuns:")).toBeVisible();
    } else {
      throw new Error(`Unhandled media-card row: ${row}`);
    }
  }
});

Then("contraindicated exercises display with a warning indicator:", async ({ page }, dataTable) => {
  const options = await page.locator("select").first().locator("option").allTextContents();
  for (const [row] of dataTable.rows()) {
    const name = row.replace(/\s*\(.*\)$/, "");
    expect(
      options.some((text) => text.includes(name) && text.includes("⚠️")),
      `expected option "${name}" to carry a ⚠️ indicator (got: ${options.join(" | ")})`,
    ).toBeTruthy();
  }
});

Then("the professional can see why each exercise is contraindicated", async ({ page }) => {
  const select = page.locator("select").first();
  await select.selectOption(hubContraindicatedExerciseId);
  await expect(
    page.getByText("Exercício contraindicado para este cliente").first(),
  ).toBeVisible();
  await expect(page.getByText("Contraindicações:")).toBeVisible();
});

Then(
  "the professional can override and include a contraindicated exercise if they choose",
  async ({ page }) => {
    // The contraindicated exercise is still selected from the previous step;
    // saving goes through and the persistent warning states the override.
    await page.getByRole("button", { name: "Salvar exercícios desta sessão" }).click();
    await expect(page.getByText("A prescrição foi salva mesmo assim")).toBeVisible();
  },
);

Then("the professional can select from available exercises", async ({ page }) => {
  const optionCount = await page.locator("select").first().locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

Then(
  "when they select an exercise, ExerciseSelectorWithPreview displays:",
  async ({ page }, dataTable) => {
    const select = page.locator("select").first();
    await select.click();
    await select.selectOption(hubExerciseId);
    for (const [row] of dataTable.rows()) {
      if (row === "Exercise image/SVG") {
        await expect(page.locator('img[alt="Supino BDD Mídia"]')).toBeVisible();
      } else if (row === "Form cues") {
        await expect(page.getByText("Técnica:")).toBeVisible();
      } else if (row === "Common mistakes") {
        await expect(page.getByText("Erros Comuns:")).toBeVisible();
      } else {
        throw new Error(`Unhandled selector-preview row: ${row}`);
      }
    }
  },
);

Then("contraindicated exercises show a ⚠️ indicator", async ({ page }) => {
  const options = await page.locator("select").first().locator("option").allTextContents();
  expect(
    options.some((text) => text.includes("Back Squat BDD") && text.includes("⚠️")),
    `expected "Back Squat BDD" to carry a ⚠️ indicator (got: ${options.join(" | ")})`,
  ).toBeTruthy();
});

Then(
  "the professional can click to view full details of a contraindicated exercise",
  async ({ page }) => {
    const select = page.locator("select").first();
    await select.selectOption(hubContraindicatedExerciseId);
    await expect(
      page.getByText("Exercício contraindicado para este cliente").first(),
    ).toBeVisible();
  },
);

Then(
  "the professional can save the session with their exercise choices",
  async ({ page }) => {
    await page.getByRole("button", { name: "Salvar exercícios desta sessão" }).click();
    await expect(page.getByText("A prescrição foi salva mesmo assim")).toBeVisible();
  },
);

Then("when they close the form, changes are persisted", async ({ page }) => {
  await page.reload();
  await page.waitForLoadState("networkidle");
  const value = await page.locator("select").first().inputValue();
  expect(value).toBe(hubContraindicatedExerciseId);
});
