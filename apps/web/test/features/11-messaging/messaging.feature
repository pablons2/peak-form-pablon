@prd-11
Feature: Messaging (web)
  Web-layer coverage of PRD 11 §10: a Client and their linked Professional
  exchange messages through the real UI, unlinking turns the thread
  read-only with the composer gone, and an HTML-looking message body renders
  as literal visible text, never parsed markup. The exact auto-creation
  mechanics, party-only enforcement, the two-threads-per-client rule, and
  Admin's read-only support access are proven once at the API layer in
  apps/api's messaging.feature (PRD 15 §7), not re-proven here.

  Scenario: A Client and their Professional exchange messages through the UI
    Given an approved professional "bdd.msg-pro@example.com"
    And a verified client "bdd.msg-client@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.msg-pro@example.com"
    When the professional logs in and opens the thread with the client
    And the professional sends the message "Oi! Como foi o treino?"
    Then the message appears in the thread
    When the client logs in and opens the thread with the professional
    Then the client sees the message "Oi! Como foi o treino?"

  Scenario: Unlinking turns the thread read-only and removes the composer
    Given an approved professional "bdd.msg-pro2@example.com"
    And a verified client "bdd.msg-client2@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.msg-pro2@example.com"
    And the professional already sent the message "Antes do desligamento" in that thread
    When the client unlinks the relationship
    And the professional opens the thread again
    Then the thread shows a read-only notice and no composer
    And the earlier message is still visible

  Scenario: A message body containing HTML-looking text renders as literal text
    Given an approved professional "bdd.msg-pro3@example.com"
    And a verified client "bdd.msg-client3@example.com" with an ACTIVE PERSONAL_TRAINER link to "bdd.msg-pro3@example.com"
    When the third professional logs in and opens the thread with the third client
    And the professional sends the message "<b>bold<script>xss-marker"
    Then the message renders as literal text, not as bold or a script
