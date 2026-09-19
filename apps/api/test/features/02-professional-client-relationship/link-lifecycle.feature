@prd-02
Feature: Professional ↔ Client relationship lifecycle
  Links gate every prescriptive feature (PRD 02 §1). A Professional invites a
  Client by email; the Client accepts/declines (or requests a Professional, who
  then accepts/declines). A Client holds at most one ACTIVE link per
  specialization (§5.3), enforced server-side in the Application layer (§5.3).
  Unlinking never deletes history and cancels active check-in schedules (§5.4,
  §5.6). Admins can force-unlink any relationship (§5.5).

  Scenario: Professional invites a client; the client accepts and the link becomes ACTIVE
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER"
    Then the invite is created with status "PENDING"
    And the client is notified by email about the invite
    When the client accepts the invite
    Then the link status is "ACTIVE" with a linkedAt timestamp

  Scenario: A second ACTIVE link of the same specialization is rejected server-side
    Given an APPROVED professional "pt-one@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER"
    And an APPROVED professional "pt-two@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER"
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client already has an ACTIVE "PERSONAL_TRAINER" link with "pt-one@example.com"
    When the client accepts a pending "PERSONAL_TRAINER" invite from "pt-two@example.com"
    Then the acceptance is rejected with status 409 and message "You already have an active trainer — unlink first"

  Scenario: Unlinking preserves the relationship history and cancels active check-in schedules
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the professional has a RECURRING WEEKLY check-in schedule on that link
    When the client unlinks the relationship
    Then the link status is "UNLINKED" with unlinkedAt and the client recorded as initiator
    And the check-in schedule status is "CANCELLED"
    And the link row still exists (history preserved, nothing deleted)

  Scenario: Admin force-unlinks a relationship and the action is audited
    Given an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    And an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER"
    And a verified client "cli@example.com" with password "S3cure!Pass"
    And the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the admin force-unlinks the relationship
    Then the link status is "UNLINKED"
    And an audit log entry "LINK_FORCE_UNLINKED" records the force-unlink by "admin@example.com"

  Scenario: Recurring check-in nextDueAt is computed from cadence and anchor and advances after firing
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    And the professional creates a RECURRING WEEKLY check-in schedule anchored on Friday for that link
    Then the schedule's nextDueAt is the next Friday after creation
    When the check-in due job runs past the schedule's nextDueAt
    Then exactly one CHECK_IN_DUE event is emitted for that schedule
    And the schedule's nextDueAt advanced by 7 days
