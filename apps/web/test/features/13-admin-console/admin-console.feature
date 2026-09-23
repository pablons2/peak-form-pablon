@prd-13
Feature: Admin Console (web)
  Web-layer coverage of PRD 13's console screens: the approval queue, the
  user list's deactivate/reactivate, and relationship oversight's
  force-unlink surfaced through the audit log. The underlying actions and
  their audit trail are proven at the API layer (apps/api's
  admin-console.feature, PRD 15 §7); these scenarios prove the console UI
  itself drives them correctly.

  Scenario: Admin approves a pending professional from the console
    Given a pending professional "bdd.admin-pro1@example.com"
    When the admin logs in and opens the approvals queue
    And the admin approves "bdd.admin-pro1@example.com"
    Then the approvals queue no longer lists "bdd.admin-pro1@example.com"

  Scenario: Admin deactivates and reactivates a client from the console
    Given a verified client "bdd.admin-cli1@example.com"
    When the admin logs in and opens the users list filtered by "bdd.admin-cli1@example.com"
    And the admin deactivates the listed user
    Then the user list shows "bdd.admin-cli1@example.com" as "Desativado"
    When the admin reactivates the listed user
    Then the user list shows "bdd.admin-cli1@example.com" as "Ativo"

  Scenario: Admin force-unlinks a relationship from the console and sees it in the audit log
    Given an approved professional "bdd.admin-pro2@example.com"
    And a verified client "bdd.admin-cli2@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.admin-pro2@example.com"
    When the admin logs in and opens the links list
    And the admin force-unlinks that relationship
    Then the link no longer appears as "Ativo"
    When the admin opens the audit log filtered by action "LINK_FORCE_UNLINKED"
    Then the audit log shows an entry
