@prd-07
Feature: Client Training Execution
  The Client's own view of PRD 06's generated Sessions: today's session or a
  rest day (§5.1), logging actual performance per set with a "last time"
  reference (§5.2), auto-completion once every prescribed set is logged
  (§5.3), and the missed-session safety net that never touches a
  deliberately CANCELLED session (§5.4). Professionals get read-only access
  to their own linked Clients' history and nothing else (§4).

  Scenario: The Today view shows the scheduled session, or a clear rest-day state
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    When the client checks today's session before any plan exists
    Then the response reports a rest day with no session
    When the professional builds a plan with a session scheduled for today
    And the client checks today's session
    Then the response shows today's scheduled session with its prescribed exercise

  Scenario: Logging a set updates the last-time reference for that exercise on its next occurrence
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional builds a 2-week plan on today's weekday, starting a week ago
    When the client logs a set of 8 reps at 60kg on last week's session
    And the client checks today's session
    Then today's session shows "Last time: 60kg x 8" for that exercise

  Scenario: Logging every prescribed set auto-completes the session; logging fewer requires a manual complete
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional builds a plan with 2 prescribed sets for a session scheduled for today
    When the client logs both prescribed sets for today's session
    Then today's session is automatically COMPLETED
    Given the professional builds a second plan with 2 prescribed sets for a session scheduled for today
    When the client logs only 1 of the 2 prescribed sets for that session
    And the client manually marks that session complete
    Then that session is COMPLETED with exactly 1 logged set on file, not fabricated data

  Scenario: A Client can still log a set late, against a session whose date has already passed
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional builds a 2-week plan on today's weekday, starting a week ago
    When the client logs a set on last week's already-past session
    Then the log is accepted and its loggedAt is well after the session's own date

  Scenario: The missed-session job flags an overdue session with no logs, skips one with a log, and never touches a cancelled one
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional builds a 3-week-old plan with three past sessions: untouched, logged, and cancelled
    When the missed-session job runs
    Then the untouched session is flagged MISSED
    And the logged session stays SCHEDULED
    And the cancelled session stays CANCELLED

  Scenario: A Professional cannot silently wipe a Client's already-logged performance by replacing a session's exercises
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional builds a plan with a session scheduled for today
    And the client logs a set on today's session
    When the professional tries to replace that session's exercises
    Then the request is rejected with 409, not a raw server error

  Scenario: A Professional has read-only access to a linked Client's history and cannot log or edit it
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional builds a plan with a session scheduled for today
    When the professional views the client's execution history
    Then the response includes today's session
    When the professional tries to log a set on the client's session
    Then the request is rejected with 403
    Given an APPROVED professional "other@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    When that other professional, with no link to the client, tries to view the client's execution history
    Then the request is rejected with 403
