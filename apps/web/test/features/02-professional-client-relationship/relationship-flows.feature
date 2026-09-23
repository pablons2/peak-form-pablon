@prd-02
Feature: Professional ↔ Client relationship (web)
  Web-layer coverage of PRD 02 §10: a Professional invites a Client through
  the UI and the Client accepts, both personas' screens reflect the resulting
  ACTIVE link, unlinking moves it to history, and a Professional-created
  check-in shows up read-only on the Client's team page. API-level coverage
  of the business rules (one-PT-one-Nutritionist, force-unlink, nextDueAt
  math, the CHECK_IN_DUE event) lives in apps/api's link-lifecycle.feature
  (PRD 15 §6 — Application-layer rules are proven once at that layer, not
  re-proven through the UI).

  Scenario: Professional invites a client through the UI and the client accepts
    Given an approved professional "bdd.rel-pro@example.com"
    And a verified client "bdd.rel-client@example.com"
    When the professional logs in and invites "bdd.rel-client@example.com" as "Personal trainer" from the clients page
    Then the invite appears under "Pendentes" on the clients page
    When the client logs in and accepts the pending invite from the team page
    Then the client sees the professional under "Time atual"
    When the professional logs in again and opens the clients page
    Then the client appears under "Ativos"

  Scenario: Client unlinks a relationship from the team page
    Given an approved professional "bdd.rel-pro2@example.com"
    And a verified client "bdd.rel-client2@example.com" already linked to them as "PERSONAL_TRAINER"
    When the client logs in and unlinks the professional from the team page
    Then the professional no longer appears under "Time atual"
    And the relationship appears in "Histórico"

  Scenario: A professional's check-in schedule shows up read-only on the client's team page
    Given an approved professional "bdd.rel-pro3@example.com"
    And a verified client "bdd.rel-client3@example.com" already linked to them as "PERSONAL_TRAINER"
    When the professional logs in and creates a weekly check-in for that client from the client detail page
    Then the client logs in and sees the upcoming check-in on the team page with no edit or cancel controls

  Scenario: Professional views client detail page and sees rich profile card (redesign-plan §5.4)
    Given an approved professional "bdd.detail-pro@example.com"
    And a verified client "bdd.detail-client@example.com" with completed intake (age 28, 180cm, 75kg, primary goal "Ganhar massa muscular")
    And they are linked as "PERSONAL_TRAINER"
    When the professional logs in and opens the client detail page
    Then the professional sees a profile card with:
      | avatar with client initials |
      | client name and email |
      | status badge "Ativo" |
      | intake status indicator |
      | quick stats grid showing active check-ins count |
      | quick stats grid showing training plans count |
      | quick stats grid showing last activity date |
    And the page shows tabs for "Geral", "Treino", "Avaliações", "Mensagens"

  Scenario: Contraindication alert displays prominently on client detail page when client has flags
    Given an approved professional "bdd.contraindication-pro@example.com"
    And a verified client "bdd.contraindication-client@example.com" with completed intake including:
      | pain flags: "Dor no joelho esquerdo", "Lesão no ombro" |
      | medical conditions: "Hipertensão" |
      | contraindicated exercises: "KNEE_LOAD_CAUTION", "SHOULDER_IMPINGEMENT_CAUTION" |
    And they are linked as "PERSONAL_TRAINER"
    When the professional logs in and opens the client detail page
    Then the professional sees a prominent "Alertas de Contraindicação" card with:
      | warning icon |
      | list of pain flags |
      | list of medical conditions |
      | list of contraindicated exercise categories |
      | link to view full health intake |

  Scenario: No contraindication alert displays when client has no flags
    Given an approved professional "bdd.clean-intake-pro@example.com"
    And a verified client "bdd.clean-intake-client@example.com" with completed intake (no pain flags or medical conditions)
    And they are linked as "PERSONAL_TRAINER"
    When the professional logs in and opens the client detail page
    Then no "Alertas de Contraindicação" card is visible
    And the profile card displays normally without alerts
