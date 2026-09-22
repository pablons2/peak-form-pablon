@prd-04
Feature: Body Assessment
  The clinical record of a Client's physical measurements over time (PRD 04
  §1). A Client can self-log frequently without professional involvement
  (§5.1); a Professional (or Admin, §4) records a formal assessment using
  the confirmed Pollock 7-site protocol, computing BMI/WHR/%BF server-side
  from the Client's dateOfBirth/biologicalSex (§5.2). Every entry is
  append-only (§5.4) and progress/posture photos are only ever reachable via
  signed, time-limited URLs (§5.7).

  Scenario: A client self-logs weight and it is tagged unvalidated
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client self-logs a weight of 82.4 with note "Segunda-feira, em jejum"
    Then the request succeeds and the entry is tagged "SELF_REPORTED" with no validator or protocol version
    And the client's history shows exactly 1 entry

  Scenario: A professional's formal assessment computes BMI, WHR and %BF correctly
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a male verified client "cli@example.com" with password "S3cure!Pass" born exactly 30 years ago who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the professional records a formal assessment for the client with weight 80, height 178, waist 85, hip 100, and the 7 skinfolds summing to 100mm
    Then the request succeeds with bmi 25.2, waistHipRatio 0.85, bodyFatPercent 14.6, and bodyFatSource "COMPUTED_POLLOCK7"
    And the entry's protocolVersion is "pollock7-v1"

  Scenario: A missing client profile blocks formal-assessment creation
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a client "ghost@example.com" with no client profile on file
    And the client "ghost@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the professional records a formal assessment for the client with weight 70, height 165
    Then the request is rejected with 400

  Scenario: A professional without an active link is blocked from the client's data
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the professional tries to record a formal assessment for the client without a link
    Then the request is rejected with 403
    When the professional tries to list the client's history without a link
    Then the request is rejected with 403

  Scenario: An admin can create a formal assessment without a professional link
    Given an admin "admin@example.com" who is logged in
    And a male verified client "cli@example.com" with password "S3cure!Pass" born exactly 30 years ago who is logged in
    When the admin records a formal assessment for the client with weight 80, height 178
    Then the request succeeds and the entry is tagged "PROFESSIONAL_VALIDATED"

  Scenario: A manual body-fat override requires a note and is flagged distinctly
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a male verified client "cli@example.com" with password "S3cure!Pass" born exactly 30 years ago who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the professional tries a manual body-fat override of 20 with no note
    Then the request is rejected with 400
    When the professional overrides body fat with 20 and note "Bioimpedância InBody 770"
    Then the request succeeds and the entry has bodyFatPercent 20, bodyFatSource "MANUAL_OVERRIDE", and the override note on file

  Scenario: No endpoint allows editing or deleting a body assessment
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the client self-logs a weight of 82.4 with note "Segunda-feira, em jejum"
    Then trying to edit or delete that entry is rejected with 404

  Scenario: Photos are only ever exposed as signed, per-request URLs
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client requests a photo upload URL
    Then the response is a presigned upload URL and a fresh object key
    When the client self-logs a weight of 70 with that photo key
    Then the client's history entry's photo URL is signed and distinct from the raw key
