@prd-07
Feature: Client Training Execution (web)
  Web-layer coverage of PRD 07 §10: a Client sees today's session and logs a
  set through the real UI, a Client with nothing scheduled sees a clear
  rest-day state, the disabled form-check-video control performs no action,
  and a Professional gets a read-only view of a linked Client's history with
  no edit controls. The exact "last time" query, auto-completion, and the
  missed-session job are proven once at the API layer in apps/api's
  client-training-execution.feature (PRD 15 §7), not re-proven here.

  Scenario: Client sees today's session and logs a set through the UI
    Given an approved professional "bdd.exec-pro@example.com"
    And a verified client "bdd.exec-client@example.com" with an ACTIVE link to "bdd.exec-pro@example.com"
    And the professional created a custom exercise "Agachamento Livre Exec BDD"
    And a plan with a session scheduled for today for "bdd.exec-client@example.com"
    When the client logs in and opens today's training page
    Then the page shows today's session with "Agachamento Livre Exec BDD"
    When the client logs a set of "8" reps at "40" kg
    Then the page shows the logged set "8 reps" for that exercise
    And a rest timer is visible

  Scenario: Client with nothing scheduled sees a clear rest-day state
    Given a verified client "bdd.exec-client2@example.com"
    When the second client logs in and opens today's training page
    Then the page shows the rest-day state

  Scenario: The disabled form-check-video control performs no action
    Given an approved professional "bdd.exec-pro2@example.com"
    And a verified client "bdd.exec-client3@example.com" with an ACTIVE link to "bdd.exec-pro2@example.com"
    And the second professional created a custom exercise "Prancha Exec BDD"
    And a plan with a session scheduled for today for "bdd.exec-client3@example.com"
    When the third client logs in and opens today's training page
    Then the form-check-video button is visibly disabled
    When the client clicks the disabled form-check-video button
    Then no set was logged and the page is unchanged

  Scenario: A Professional views a linked Client's execution history read-only
    Given an approved professional "bdd.exec-pro3@example.com"
    And a verified client "bdd.exec-client4@example.com" with an ACTIVE link to "bdd.exec-pro3@example.com"
    And the third professional created a custom exercise "Remada Exec BDD"
    And a plan with a session scheduled for today for "bdd.exec-client4@example.com"
    When the professional logs in and opens the client's training execution page
    Then the page shows today's session in the history with no logging controls
