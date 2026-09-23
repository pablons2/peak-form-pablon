@prd-12
Feature: Notifications (web)
  Web-layer coverage of PRD 12 §6/§7: the in-app notification list and nav
  badge, the preference toggles, and the push opt-in section's
  environment-aware fallback copy. Trigger mechanics, exactly-once
  deduplication, locked/locked-out preference rules, and the synchronous
  account-security path are proven once at the API layer in apps/api's
  notifications.feature (PRD 15 §7), not re-proven here.

  Scenario: A client sees a new-message notification in the list, and the badge clears after reading
    Given an approved professional "bdd.notif-pro@example.com"
    And a verified client "bdd.notif-client@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.notif-pro@example.com"
    And the professional sends a message via the API
    When the client "bdd.notif-client@example.com" logs in and opens notifications
    Then the notifications nav item shows a badge of 1
    And the notification list shows "Nova mensagem de BDD Professional"
    When the client marks the notification as read
    Then the notification is no longer unread
    And the notifications nav badge is gone

  Scenario: Disabling a trigger's email in preferences persists, while the approval email stays locked
    Given an approved professional "bdd.notif-pro2@example.com"
    And a verified client "bdd.notif-client2@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.notif-pro2@example.com"
    When the client "bdd.notif-client2@example.com" logs in and opens notifications
    And the client turns off email for "Nova mensagem" and saves preferences
    Then the preferences confirmation is shown
    And the API shows email disabled for "NEW_MESSAGE"
    And the "Decisão de aprovação" email checkbox is disabled and checked

  Scenario: With VAPID unset, the push section explains push is not configured
    Given a verified client "bdd.notif-client3@example.com"
    When the client "bdd.notif-client3@example.com" logs in and opens notifications
    Then the push section explains push is not configured in this environment
