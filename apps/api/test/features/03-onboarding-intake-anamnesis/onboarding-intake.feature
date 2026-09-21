@prd-03
Feature: Onboarding / Intake (Anamnesis + PAR-Q)
  Safety-critical screening before any training plan can be assigned (PRD 03
  §1). A Client's questionnaire (readiness/PAR-Q, body-map pain flags,
  medical conditions, availability, equipment) produces a machine-readable
  contraindications profile drawn from PRD 05's ContraindicationTag
  vocabulary (§5.2) and gates plan assignment (§5.3) until COMPLETED or
  SKIPPED_WITH_ACKNOWLEDGEMENT. A Professional may only review their own
  linked Clients' intake (§4); annotations stay tied to the specific version
  they were written against (§5.4).

  Scenario: Completing an intake with no flags allows plan assignment
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client starts the intake questionnaire
    And the client answers every readiness question "no"
    And the client completes the intake
    Then the intake status is "COMPLETED" with no contraindication tags
    And plan assignment is allowed for the client
    And plan assignment is not allowed for a client with no intake at all

  Scenario: Completing is blocked until every readiness question is answered
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client starts the intake questionnaire
    And the client tries to complete the intake without answering readiness questions
    Then the request is rejected with 400

  Scenario: A current body-region pain flag produces the matching contraindication tag
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the client starts the intake questionnaire
    And the client answers every readiness question "no"
    And the client flags a CURRENT "LOWER_BACK" pain
    And the client flags a PAST "KNEE_LEFT" pain
    And the client completes the intake
    Then the intake status is "COMPLETED" and includes only the contraindication tag "LOWER_BACK_LOAD_CAUTION"
    When the professional views the client's intake
    Then the professional sees the pain flags and the contraindication tags

  Scenario: A PAR-Q "yes" answer does not block completion
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client starts the intake questionnaire
    And the client answers every readiness question "no"
    And the client answers "HEART_CONDITION" with "yes"
    And the client completes the intake
    Then the intake status is "COMPLETED" and includes only the contraindication tag "BLOOD_PRESSURE_CAUTION"

  Scenario: Skipping requires the acknowledgement flag and still records safety data
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client starts the intake questionnaire
    And the client flags a CURRENT "NECK" pain
    And the client tries to skip without acknowledging the disclaimer
    Then the request is rejected with 400
    When the client skips the intake with the disclaimer acknowledged
    Then the intake status is "SKIPPED_WITH_ACKNOWLEDGEMENT" and includes only the contraindication tag "NECK_STRAIN_CAUTION"
    And plan assignment is allowed for the client

  Scenario: A professional can only view intake data for their own linked clients
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the professional tries to view the client's intake without a link
    Then the request is rejected with 403

  Scenario: A new intake version does not overwrite or delete a professional's prior annotation
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the client starts the intake questionnaire
    And the client answers every readiness question "no"
    And the client completes the intake
    And the professional annotates the client's latest intake with "Liberado para treino leve"
    And the client starts a new intake version
    And the client answers every readiness question "no"
    And the client completes the intake
    Then the client's intake is now at version 2
    And the professional's annotation from version 1 is still present in the version history
