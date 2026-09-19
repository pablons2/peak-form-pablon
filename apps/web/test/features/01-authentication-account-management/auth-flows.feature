@prd-01
Feature: Authentication & account management (web)
  Web-layer coverage of PRD 01 §10: the client signup→verify→login journey,
  approval-gated professional experience, password reset, and route
  protection — driven against the real dockerized stack (real API, real
  Postgres, MailHog for outbound email). Google OAuth UI paths stay
  uncovered until real GOOGLE_CLIENT_* credentials exist.

  Scenario: Client signs up, verifies email, and logs in through the UI
    When a visitor opens the client signup page
    And submits valid client details for email "bdd.ana@example.com"
    Then a verification email arrives for "bdd.ana@example.com"
    When the visitor verifies their email using the code from that email
    And logs in with email "bdd.ana@example.com"
    Then they land on the dashboard

  Scenario: Signup requires dateOfBirth and biologicalSex
    When a visitor opens the client signup page
    And submits the form with everything filled except dateOfBirth and biologicalSex
    Then the signup form shows field errors and stays on the page

  Scenario: A pending professional lands on the waiting-for-approval screen
    Given a verified professional "bdd.pro@example.com" pending approval
    When they log in through the UI with email "bdd.pro@example.com"
    Then they land on the waiting-for-approval screen
    And navigating directly to the dashboard still shows the approval screen

  Scenario: An approved professional reaches the dashboard
    Given a professional "bdd.pro2@example.com" approved by an admin
    When they log in through the UI with email "bdd.pro2@example.com"
    Then they land on the dashboard

  Scenario: Unauthenticated visitors are redirected to login
    When a visitor opens the dashboard without logging in
    Then they are redirected to the login page

  Scenario: Client resets their password and logs in with the new one
    Given a verified client "bdd.reset@example.com"
    When they request a password reset for "bdd.reset@example.com"
    And set a new password "N3wPassw0rd!" using the emailed code
    Then they can log in with the new password
    And logging in with the old password shows an error
