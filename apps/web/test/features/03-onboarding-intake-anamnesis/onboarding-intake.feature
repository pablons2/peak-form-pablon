@prd-03
Feature: Onboarding / Intake (web)
  Web-layer coverage of PRD 03 §10: a Client walks the intake wizard end to
  end (readiness, body-map, conditions, availability/equipment) and sees the
  resulting contraindications profile, a Client can skip with the risk
  disclaimer acknowledged, and a Professional reviews a linked Client's
  finalized intake and adds a clinical annotation. The contraindication
  mapping rules and version/annotation persistence are proven once at the
  API layer in apps/api's onboarding-intake.feature (PRD 15 §7), not
  re-proven here.

  Scenario: Client completes the intake wizard and sees the contraindications profile
    Given a verified client "bdd.intake-client@example.com"
    When the client logs in and opens the intake page
    Then the wizard shows the readiness step
    When the client answers every readiness question "Não" and continues
    And the client flags "Lombar" as a current pain and continues
    And the client continues through conditions without changes
    And the client continues through availability without changes
    And the client concludes the triagem
    Then the summary shows the contraindication tag "LOWER_BACK_LOAD_CAUTION"
    And the summary shows the flagged region "Lombar"

  Scenario: Client skips the intake with the disclaimer acknowledged
    Given a verified client "bdd.intake-client2@example.com"
    When the second client logs in and opens the intake page
    And the client opens the skip dialog and confirms without acknowledging
    Then the skip is not confirmed yet
    When the client acknowledges the disclaimer and confirms the skip
    Then the summary shows the skipped status

  Scenario: Professional reviews a linked client's completed intake and annotates it
    Given an approved professional "bdd.intake-pro@example.com"
    And a verified client "bdd.intake-client3@example.com" with an ACTIVE link to "bdd.intake-pro@example.com"
    And the client "bdd.intake-client3@example.com" has completed their intake
    When the professional logs in and opens the client's intake review page
    Then the contraindication tag "LOWER_BACK_LOAD_CAUTION" is shown
    When the professional adds the annotation "Liberado para treino leve"
    Then the annotation "Liberado para treino leve" appears in the list
