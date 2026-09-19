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
