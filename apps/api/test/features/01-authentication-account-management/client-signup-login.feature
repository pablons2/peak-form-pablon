@prd-01
Feature: Client signup, email verification, and login
  Clients sign up with email+password or Google OAuth and use the app
  immediately — no approval gate (PRD 01 §5.1–§5.3, §10 ACs 1, 2, 7).

  Scenario: Client signs up with credentials, verifies email, and logs in
    When a client submits signup with email "ana@example.com", password "S3cure!Pass", full name "Ana Souza", born "1995-03-20", sex "FEMALE"
    Then the signup is accepted
    And a verification email is sent to "ana@example.com"
    When the client verifies their email using the token from that email
    Then the verification is accepted
    When the client logs in with email "ana@example.com" and password "S3cure!Pass"
    Then the login succeeds with an access token for role "CLIENT"
    And an httpOnly refresh token cookie is set
    And the client's ClientProfile persists dateOfBirth "1995-03-20" and biologicalSex "FEMALE"

  Scenario: Client cannot log in before verifying their email
    Given a client signed up with email "bea@example.com" and password "S3cure!Pass" but never verified
    When the client logs in with email "bea@example.com" and password "S3cure!Pass"
    Then the request is rejected with status 403

  Scenario: Client signup is rejected without dateOfBirth and biologicalSex
    When a client submits signup with email "carlos@example.com", password "S3cure!Pass", full name "Carlos Lima" but no dateOfBirth or biologicalSex
    Then the request is rejected with status 400
    And no account exists for "carlos@example.com"

  Scenario: Client signs up and logs in via Google OAuth with no email-verification step
    When a client signs in with the Google identity "carol@example.com" named "Carol Dias"
    Then the response indicates signup completion is required
    When the client completes Google signup born "1992-07-11", sex "FEMALE"
    Then the client receives an access token and an httpOnly refresh token cookie
    And the client never received a verification email
    When the client signs in with the Google identity "carol@example.com" named "Carol Dias" again
    Then the response is authenticated with an access token
