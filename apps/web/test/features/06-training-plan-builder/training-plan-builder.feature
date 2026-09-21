@prd-06
Feature: Training Plan Builder (web)
  Web-layer coverage of PRD 06 §10: a Personal Trainer builds a plan —
  mesocycle, weekly template, generated sessions — through the UI, a
  contraindicated exercise shows a persistent warning, and a Client without
  a Professional self-assigns a Starter Template they cannot edit.
  Specialization gating, the intake-completion gate, move/cancel/edit
  isolation and the audit entry are proven once at the API layer in
  apps/api's training-plan-builder.feature (PRD 15 §7), not re-proven here.

  Scenario: Professional builds a plan through the UI and sessions are generated
    Given an approved professional "bdd.plan-pro@example.com"
    And a verified client "bdd.plan-client@example.com" with an ACTIVE Personal Trainer link to "bdd.plan-pro@example.com"
    And the client "bdd.plan-client@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento BDD" with no contraindications
    When the professional creates a plan for the client through the UI
    And the professional adds a 4-week mesocycle
    And the professional saves a weekly template with "Agachamento BDD" on Segunda-feira
    Then generated sessions appear on the mesocycle page

  Scenario: A contraindicated exercise shows a persistent warning
    Given an approved professional "bdd.plan-pro2@example.com"
    And a verified client "bdd.plan-client2@example.com" with an ACTIVE Personal Trainer link to "bdd.plan-pro2@example.com"
    And the client "bdd.plan-client2@example.com" has completed their intake with a lower-back pain flag
    And the professional created a custom exercise "Levantamento Terra BDD" tagged "LOWER_BACK_LOAD_CAUTION"
    And the professional has a plan with a mesocycle for the client
    When the professional saves a weekly template with "Levantamento Terra BDD" on Segunda-feira
    Then a contraindication warning is shown on the page

  Scenario: A client without a professional self-assigns a Starter Template and cannot edit it
    Given an approved professional "bdd.plan-pro3@example.com"
    And the professional created a custom exercise "Agachamento BDD" with no contraindications
    And the professional authored a starter template with a mesocycle and a Segunda-feira session
    And a verified client "bdd.plan-client3@example.com" with no professional
    When the client logs in and assigns the starter template
    Then the client sees their own plan with generated sessions and no edit controls
