@prd-05
Feature: Exercise library (web)
  Web-layer coverage of PRD 05 §10: the catalog is browsable and searchable
  for every role, Professionals author custom exercises through the form, and
  Admins review + promote customs into the global library. Business rules —
  private-visibility scoping, import idempotency, the audit entry — are
  proven once at the API layer in apps/api's exercise-library.feature
  (PRD 15 §6), not re-proven through the UI.

  Scenario: Client browses and searches the exercise library
    Given the exercise catalog has been imported
    And a verified client "bdd.ex-client@example.com"
    When the client logs in and opens the exercise library
    Then the imported exercises appear in the results
    When the client searches for "terra"
    Then the results include "Levantamento Terra (Deadlift)" but not "Agachamento Livre (Back Squat)"
    When the client opens the exercise detail
    Then the execution cues, common mistakes and contraindications are shown

  Scenario: Professional authors a private custom exercise
    Given the exercise catalog has been imported
    And an approved professional "bdd.ex-pro@example.com"
    And an approved professional "bdd.ex-other@example.com"
    When the professional logs in and creates a custom exercise "Prancha Lateral BDD" through the form
    Then the exercise detail shows it as "Privado"
    And it appears under "Meus exercícios personalizados" on the library page
    And the other professional searching for "Prancha Lateral BDD" sees no results

  Scenario: Admin promotes a custom exercise to the global library
    Given the exercise catalog has been imported
    And an approved professional "bdd.ex-pro2@example.com" with a custom exercise "Ponte de Glúteo BDD"
    When the admin logs in and opens the exercise review queue
    Then the custom exercise is listed with its author
    When the admin promotes it
    Then it leaves the review queue
    And a client finds "Ponte de Glúteo BDD" when searching the library
