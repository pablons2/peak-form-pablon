@prd-13
Feature: Admin Console
  The operator-facing surface for user/role management, Professional
  approval, exercise-library curation, relationship oversight, audit-log
  review, and basic usage analytics (PRD 13). Approval, force-unlink, and
  exercise-promotion themselves are already exercised end-to-end by their
  owning modules' own suites (PRD 01/02/05) — these scenarios prove the
  Admin Console's own additions: the user list/search, the audit-log
  viewer, and the analytics aggregate, wired against those same actions.

  Scenario: Admin lists and searches users across every role and status
    Given an admin "admin@example.com" who is logged in
    And a verified client "cli@example.com"
    And an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER"
    When the admin lists users filtered by role "CLIENT"
    Then only "cli@example.com" is returned
    When the admin searches users for "pro@example"
    Then only "pro@example.com" is returned

  Scenario: Admin deactivates and reactivates a client account through the console
    Given an admin "admin@example.com" who is logged in
    And a verified client "cli@example.com"
    When the admin deactivates "cli@example.com"
    Then the user list shows "cli@example.com" with status "DEACTIVATED"
    When the admin reactivates "cli@example.com"
    Then the user list shows "cli@example.com" with status "ACTIVE"

  Scenario: Approving a pending professional is reflected in the user list and the audit log
    Given an admin "admin@example.com" who is logged in
    And a PENDING professional "pro@example.com" with specialization "NUTRITIONIST"
    When the admin approves "pro@example.com"
    Then the user list shows "pro@example.com" with approval status "APPROVED"
    And the audit log filtered by action "PROFESSIONAL_APPROVED" includes an entry for "pro@example.com"

  Scenario: Force-unlinking a relationship is reflected in the audit log, filterable by action and entity
    Given an admin "admin@example.com" who is logged in
    And an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER"
    And a verified client "cli@example.com"
    And the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the admin force-unlinks that relationship
    Then the audit log filtered by action "LINK_FORCE_UNLINKED" includes exactly one entry
    And the audit log filtered by entity "ProfessionalClientLink" includes exactly one entry

  Scenario: Promoting a custom exercise is reflected in the audit log, filterable by actor and date range
    Given an admin "admin@example.com" who is logged in
    And an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER"
    And the professional has authored a custom exercise "Supino inclinado BDD"
    When the admin promotes "Supino inclinado BDD" to the global library
    Then the audit log filtered by actor "admin@example.com" includes an entry for "Supino inclinado BDD"
    And the audit log filtered by a date range spanning today includes an entry for "Supino inclinado BDD"
    But the audit log filtered by a date range before today has no entry for "Supino inclinado BDD"

  Scenario: The audit log has no route to edit or delete an entry
    Given an admin "admin@example.com" who is logged in
    When the admin attempts to delete the audit log
    Then the request is rejected as not found

  Scenario: Admin views aggregate usage analytics across clients and professionals
    Given an admin "admin@example.com" who is logged in
    And a verified client "active-cli@example.com" with a COMPLETED training session today
    And a verified client "idle-cli@example.com" with no activity this week
    And an APPROVED professional "pro-pt@example.com" with specialization "PERSONAL_TRAINER"
    And a PENDING professional "pro-pending@example.com" with specialization "NUTRITIONIST"
    When the admin views the analytics dashboard
    Then it reports 2 active clients
    And it reports 1 active professional for specialization "PERSONAL_TRAINER"
    And the average weekly training adherence is 100 percent
