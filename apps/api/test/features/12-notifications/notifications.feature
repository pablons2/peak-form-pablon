@prd-12
Feature: Notifications
  Cross-cutting notification delivery for the events surfaced elsewhere in
  the product (PRD 12). Every preference-eligible trigger writes exactly one
  Notification per intended recipient regardless of channel opt-outs (§7,
  §10); the dispatcher fans out to email and — when VAPID is configured and
  the user subscribed — web push, falling back silently to email-only (§5.2).
  The two account-security triggers (email verification, password reset)
  bypass the preference/dispatcher path entirely (§5.1.1).

  Scenario: A new message produces exactly one NEW_MESSAGE notification and an email for the recipient
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    When the professional sends the message "Bem-vindo ao programa!" in that pair's thread
    Then the client has exactly 1 notification of type "NEW_MESSAGE" titled "Nova mensagem de Test Professional"
    And an email was sent to "cli@example.com"
    And the client's unread notification count is 1
    When the client marks that notification read
    Then the client's unread notification count is 0

  Scenario: A due check-in produces a CHECK_IN_DUE notification for the client
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an ACTIVE PERSONAL_TRAINER link between them with a check-in schedule due at "2026-09-21"
    When the check-in due job runs at "2026-09-22T12:00:00.000Z"
    Then the client has exactly 1 notification of type "CHECK_IN_DUE"
    And an email was sent to "cli@example.com"

  Scenario: The session-reminder job notifies the client once per session even when re-run
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an ACTIVE PERSONAL_TRAINER link between them
    And the client has a SCHEDULED session on "2026-09-22"
    When the session-reminder job runs at "2026-09-22T08:00:00.000Z"
    Then the client has exactly 1 notification of type "SESSION_REMINDER"
    When the session-reminder job runs again at "2026-09-22T08:05:00.000Z"
    Then the client still has exactly 1 notification of type "SESSION_REMINDER"

  Scenario: The missed-session job notifies the client when yesterday's session went unlogged
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an ACTIVE PERSONAL_TRAINER link between them
    And the client has a SCHEDULED session on "2026-09-21"
    When the missed-session job runs at "2026-09-22T12:00:00.000Z"
    Then the client has exactly 1 notification of type "MISSED_SESSION"

  Scenario: Confirming a nutrition plan notifies the client
    Given an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an ACTIVE NUTRITIONIST link between them
    And the client has a recorded body assessment
    When the nutritionist generates a draft plan for the client and confirms it
    Then the client has exactly 1 notification of type "PLAN_UPDATED" titled "Plano de nutrição atualizado"
    And an email was sent to "cli@example.com"

  Scenario: The weekly-summary job notifies both the client and the linked professional
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an ACTIVE PERSONAL_TRAINER link between them
    When the weekly-summary job runs on Monday "2026-09-21T10:00:00.000Z"
    Then the client has exactly 1 notification of type "WEEKLY_SUMMARY_READY"
    And the professional has exactly 1 notification of type "WEEKLY_SUMMARY_READY"

  Scenario: The missed-food-log job notifies a client with an active plan who logged nothing yesterday
    Given an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an ACTIVE NUTRITIONIST link between them
    And the client has an ACTIVE nutrition plan
    When the missed-food-log job runs at "2026-09-22T12:00:00.000Z"
    Then the client has exactly 1 notification of type "MISSED_FOOD_LOG"

  Scenario: Disabling a non-critical trigger's email stops delivery but keeps the in-app notification
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    And the client disables email for "NEW_MESSAGE" notifications
    When the professional sends the message "Oi" in that pair's thread
    Then the client has exactly 1 notification of type "NEW_MESSAGE"
    And no email was sent to "cli@example.com"

  Scenario: The approval-decision email cannot be disabled via preferences
    Given a pending professional "pro@example.com" with password "S3cure!Pass" who is logged in
    And an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    When the professional tries to disable email for "APPROVAL_DECISION" notifications
    Then the request is rejected with status 400
    When the admin approves "pro@example.com"
    Then the professional has exactly 1 notification of type "APPROVAL_DECISION"
    And an email was sent to "pro@example.com"

  Scenario: Password reset is sent immediately regardless of preferences and leaves no preference row
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client requests a password reset for "cli@example.com"
    Then an email was sent to "cli@example.com"
    And the client has a notification of type "PASSWORD_RESET"
    And the client's preferences list contains no "PASSWORD_RESET" entry
    When the client tries to disable email for "PASSWORD_RESET" notifications
    Then the request is rejected with status 400
