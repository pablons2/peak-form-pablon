@prd-05
Feature: Exercise library
  The shared catalog every Training Plan (PRD 06) is built from (PRD 05 §1).
  A static dataset snapshot is imported once — media re-hosted in our own
  object storage — so no request path ever calls a third-party exercise API
  (§5.1, §3). Professionals author PRIVATE custom exercises visible only to
  their own account/clients (§5.3); Admins curate the library and promote
  customs to GLOBAL (§4). Search/filter covers muscle group, equipment,
  difficulty and free-text name (§5.4). Contraindication tags are drawn from
  the ContraindicationTag vocabulary this module owns (§6).

  Scenario: Catalog import is idempotent and re-hosts media in our own storage
    When the exercise catalog import job runs
    Then every dataset entry exists as a GLOBAL exercise with cues, mistakes and contraindication tags
    And every imported exercise's mediaUrl points at our own media host
    When the exercise catalog import job runs again
    Then nothing is created or updated — every entry is skipped
    And the exercise count is unchanged

  Scenario: A professional's custom exercise stays private to them and their linked clients
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And an APPROVED professional "other@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And a verified client "stranger@example.com" with password "S3cure!Pass" who is logged in
    And the client "cli@example.com" has an ACTIVE "PERSONAL_TRAINER" link with "pro@example.com"
    When the professional creates a custom exercise "Mobilidade de Tornozelo"
    Then the exercise is PRIVATE and owned by "pro@example.com"
    And "pro@example.com" finds it in search but "other@example.com" does not
    And the linked client finds it in search but the unlinked client does not

  Scenario: Admin promotes a custom exercise to the global library and the action is audited
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    When the professional creates a custom exercise "Respiração Crocodilo"
    And the admin opens the custom-exercise review queue
    Then the exercise appears in the queue with its author
    When the admin promotes the exercise
    Then the exercise is GLOBAL with no owner
    And an audit log entry "EXERCISE_PROMOTED_TO_GLOBAL" records the promotion by "admin@example.com"
    And promoting it again is rejected with 409

  Scenario: Searching and filtering the imported catalog
    Given the exercise catalog has been imported
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client searches exercises by name "agachamento"
    Then the results include "Agachamento Livre (Back Squat)"
    When the client filters exercises by muscle group "QUADRICEPS" and difficulty "ADVANCED"
    Then the results include "Salto na Caixa (Box Jump)" but not "Agachamento Livre (Back Squat)"

  Scenario: Clients cannot author exercises
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client tries to create a custom exercise
    Then the request is rejected with 403

  Scenario: Custom exercises reject unknown contraindication tag codes
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    When the professional creates a custom exercise tagged with a nonexistent code "NOT_A_REAL_TAG"
    Then the request is rejected with 400
