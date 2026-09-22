@prd-04
Feature: Body Assessment (web)
  Web-layer coverage of PRD 04 §10: a Client self-logs weight through the
  quick-entry UI, a Professional fills out the formal-assessment form and
  sees the server-computed values, and the manual body-fat override flow is
  reachable and requires a note. The exact formulas, append-only
  enforcement, and the missing-DOB/sex guard are proven once at the API
  layer in apps/api's body-assessment.feature (PRD 15 §7), not re-proven
  here.

  Scenario: Client self-logs a weight entry through the UI
    Given a verified client "bdd.body-client@example.com"
    When the client logs in and opens the body assessment page
    And the client self-logs a weight of "78.5"
    Then the history shows a self-reported entry with "78.5"

  Scenario: Professional fills out the formal assessment form and sees computed values
    Given an approved professional "bdd.body-pro@example.com"
    And a verified client "bdd.body-client2@example.com" with an ACTIVE link to "bdd.body-pro@example.com"
    When the professional logs in and opens the client's body assessment page
    And the professional fills in weight "80" and height "178" and submits the formal assessment
    Then the page confirms the computed BMI "25.2"

  Scenario: A manual body-fat override requires a note before it can be submitted
    Given an approved professional "bdd.body-pro2@example.com"
    And a verified client "bdd.body-client3@example.com" with an ACTIVE link to "bdd.body-pro2@example.com"
    When the second professional logs in and opens the client's body assessment page
    And the professional turns on the manual body-fat override without filling the note
    And the professional fills in weight "75" and height "170" and submits the formal assessment
    Then the form shows an error about the missing override method
    When the professional fills in the override method "Bioimpedância InBody 770" and submits again
    Then the page confirms the manual override was recorded
