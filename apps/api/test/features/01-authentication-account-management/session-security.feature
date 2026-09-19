@prd-01
Feature: Session security and account lifecycle
  Server-side enforcement of token validity, session invalidation on password
  reset, and deactivation/reactivation semantics (PRD 01 §5.3–§5.5, §10 ACs
  5, 6, 8).

  Scenario: Protected routes reject missing, invalid, or expired access tokens
    Given a verified client "duda@example.com" with password "S3cure!Pass"
    Then a request to a protected route with no access token is rejected with status 401
    And a request to a protected route with a malformed access token is rejected with status 401
    And a request to a protected route with an expired access token is rejected with status 401

  Scenario: Password reset invalidates all prior sessions
    Given a verified client "erik@example.com" with password "S3cure!Pass" who is logged in
    When the client requests a password reset for "erik@example.com"
    Then a reset email is sent to "erik@example.com"
    When the client resets the password using the emailed token to "N3wPassw0rd!"
    Then the reset is accepted
    And the client's previous access token is rejected with status 401
    And the client's previous refresh token is rejected with status 401
    And logging in with email "erik@example.com" and password "S3cure!Pass" is rejected with status 401
    But logging in with email "erik@example.com" and password "N3wPassw0rd!" succeeds

  Scenario: Reactivating an account restores status without touching approvalStatus
    Given an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    And an approved professional "pro@example.com" with password "S3cure!Pass" whose account is deactivated
    When the admin reactivates "pro@example.com"
    Then the professional's status is "ACTIVE"
    And the professional's approvalStatus is still "APPROVED"
    And the professional can log in with password "S3cure!Pass"
