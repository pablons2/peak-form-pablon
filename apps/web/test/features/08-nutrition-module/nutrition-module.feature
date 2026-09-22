@prd-08
Feature: Nutrition Module (web)
  Web-layer coverage of PRD 08 §10: a Nutritionist reviews and confirms a
  draft target and the Client then sees it as their active target, a Client
  logs a food diary entry and sees running totals vs. that target, and the
  not-found barcode flow falls back to manual entry gracefully. The exact
  Mifflin-St Jeor formula, the DRAFT-never-leaks guarantee, snapshot
  immutability, and weekly-summary parity are proven once at the API layer
  in apps/api's nutrition-module.feature (PRD 15 §7), not re-proven here.

  Scenario: A Nutritionist confirms a draft and the Client sees it as their active target
    Given an approved NUTRITIONIST professional "bdd.nutri-pro@example.com"
    And a verified client "bdd.nutri-client@example.com" with a recorded body assessment and an ACTIVE NUTRITIONIST link to "bdd.nutri-pro@example.com"
    When the nutritionist logs in and opens the client's nutrition page
    And the nutritionist generates a draft target
    And the nutritionist confirms the target with calorie goal "2200"
    Then the page shows the plan status as active
    When the client logs in and opens the nutrition page
    Then the client sees an active target of "2200" kcal

  Scenario: A Client logs a food diary entry and sees running totals vs. their target
    Given a verified client "bdd.nutri-client2@example.com" with a confirmed nutrition target from "bdd.nutri-pro2@example.com"
    When the client logs in and opens the nutrition page
    And the client looks up the known barcode and logs it
    Then the diary shows the logged food and updated totals

  Scenario: A barcode that is not found falls back to manual entry
    Given a verified client "bdd.nutri-client3@example.com"
    When the client logs in and opens the nutrition page
    And the client looks up an unknown barcode
    Then the page shows a not-found message with a manual-entry form
    When the client fills in the manual entry and submits it
    Then the diary shows the manually entered food
