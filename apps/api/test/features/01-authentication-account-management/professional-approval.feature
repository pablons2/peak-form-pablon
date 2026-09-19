@prd-01
Feature: Professional approval queue
  Professionals can log in immediately but are gated on approvalStatus until
  an Admin approves them (PRD 01 §5.1, §5.6, §10 ACs 3, 4). Professional-only
  routes are represented by a probe endpoint carrying the exact guard stack
  PRD 02/06 endpoints will use (@Roles(PROFESSIONAL) + ApprovalStatusGuard).

  Scenario: A pending professional can log in but cannot reach professional-only routes
    Given a professional "paulo@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"
    When the professional logs in with email "paulo@example.com" and password "S3cure!Pass"
    Then the login succeeds with an access token for role "PROFESSIONAL"
    When the professional requests a professional-only route
    Then the request is rejected with status 403

  Scenario: Admin approves a pending professional; access is granted immediately and audited
    Given an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    And a professional "paula@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"
    When the admin lists the pending professionals
    Then "paula@example.com" appears in the queue with verification note "CREF 12345-G/SP"
    When the admin approves "paula@example.com"
    Then the professional can access a professional-only route
    And an audit log entry records the approval of "paula@example.com" by "admin@example.com"

  Scenario: Admin rejects a professional; the account can still log in but stays blocked
    Given an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    And a professional "reje@example.com" with password "S3cure!Pass" and approval status "PENDING_APPROVAL"
    When the admin rejects "reje@example.com" with reason "credentials could not be verified"
    Then the professional can still log in with password "S3cure!Pass"
    But the professional cannot access a professional-only route
    And an audit log entry records the rejection of "reje@example.com" by "admin@example.com"

  Scenario: A non-admin cannot see the approval queue
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client requests the pending professionals queue
    Then the request is rejected with status 403
