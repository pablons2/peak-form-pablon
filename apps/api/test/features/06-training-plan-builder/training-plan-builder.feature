@prd-06
Feature: Training Plan Builder
  Only a Professional with the PERSONAL_TRAINER specialization authors a
  prescription (PRD 06 §1/§4) for their own linked Client, and only once
  that Client's intake (PRD 03) is COMPLETED or SKIPPED_WITH_ACKNOWLEDGEMENT
  (§5.1). Saving a mesocycle's weekly template auto-generates dated Session
  instances (§5.4); moving/cancelling/editing one dated instance never
  touches the template or any other generated session. Adding an exercise
  flagged against the Client's contraindications profile (PRD 05 tags vs
  PRD 03 profile) surfaces a warning and is audited (§5.6). Starter
  Templates let a Client without a Professional self-assign a pre-built plan
  they cannot edit (§5.8).

  Scenario: A professional without the Personal Trainer specialization cannot create a plan
    Given an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "NUTRITIONIST" link with "nutri@example.com"
    When the professional tries to create a training plan for the client
    Then the request is rejected with 403

  Scenario: Creating a plan for a client with an incomplete intake is blocked
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the professional tries to create a training plan for the client
    Then the request is rejected with 403

  Scenario: Saving a weekly template auto-generates dated sessions across the mesocycle span
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    When the professional creates a training plan for the client starting 2026-01-05
    And the professional adds a 2-week mesocycle to the plan
    And the professional saves a weekly template with sessions on MONDAY and WEDNESDAY
    Then 4 sessions were generated for the mesocycle
    And the generated sessions fall on 2026-01-05, 2026-01-07, 2026-01-12 and 2026-01-14
    When the professional saves the weekly template again unchanged
    Then still 4 sessions exist for the mesocycle

  Scenario: Moving, cancelling and editing one session leaves the template and other sessions untouched
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional created a custom exercise "Prancha BDD"
    And the professional has a plan with a mesocycle and a MONDAY/WEDNESDAY weekly template
    When the professional moves the first generated session to 2026-01-06
    Then that session's date is 2026-01-06 and its originalDate is preserved and it is marked overridden
    When the professional cancels the second generated session
    Then that session's status is CANCELLED, not MISSED, and no replacement session was created
    When the professional edits the third generated session's exercises to just "Prancha BDD"
    Then that session's exercises are just "Prancha BDD" and it is marked overridden
    And the mesocycle's weekly template still prescribes "Agachamento Livre BDD" on MONDAY

  Scenario: Adding a contraindicated exercise shows a warning and is audited
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the client "cli@example.com" has completed their intake with a current lower-back pain flag
    And the professional created a custom exercise "Levantamento Terra BDD" tagged "LOWER_BACK_LOAD_CAUTION"
    And the professional has a plan with a mesocycle
    When the professional saves a weekly template prescribing "Levantamento Terra BDD" on MONDAY
    Then the response includes a contraindication warning for "Levantamento Terra BDD"
    And an audit log entry "CONTRAINDICATED_EXERCISE_PRESCRIBED" records the client and the matched tag

  Scenario: A client without a professional self-assigns a Starter Template but cannot edit it
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And the professional created a custom exercise "Agachamento Livre BDD"
    And the professional authored a starter template with a mesocycle and a MONDAY weekly template
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in with no professional
    When the client self-assigns the starter template
    Then the client has their own new plan cloned from the template with generated sessions
    When the client tries to edit one of the generated session's exercises
    Then the request is rejected with 403
