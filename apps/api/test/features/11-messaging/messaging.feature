@prd-11
Feature: Messaging
  A lightweight, text-only thread between a Client and their linked
  Professional(s), scoped strictly to existing PRD 02 relationships (§1). A
  thread is created (or reactivated) the moment the underlying link becomes
  ACTIVE, and becomes read-only (history preserved) when it's unlinked (§5.1,
  §5.3). Only the thread's two parties may read or send in it (§4, §10);
  Admin gets read-only support access to any thread (§4). Message bodies are
  plain text — never rendered as raw HTML (§5.4).

  Scenario: Accepting an invite auto-creates an ACTIVE thread, and both parties can exchange messages
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    Then a thread with status "ACTIVE" already exists for that pair, before any message is sent
    When the professional sends the message "Bem-vindo ao programa!" in that thread
    Then the message is created with status 201
    When the client fetches the thread
    Then the client sees the professional's message, now marked read
    And the professional's unread count for that thread is 0

  Scenario: A Client linked to both a PT and a Nutritionist has two independent threads
    Given an APPROVED professional "pt@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional "pt@example.com" invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    And the professional "nutri@example.com" invites "cli@example.com" for specialization "NUTRITIONIST" and the client accepts
    When the client lists their threads
    Then the client has exactly 2 distinct threads
    When the client sends the message "Oi treinador" in the thread with "pt@example.com"
    Then the thread with "nutri@example.com" has no messages

  Scenario: Unlinking makes the thread read-only; history is preserved and new sends are rejected
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    And the professional sends the message "Vamos comecar" in that thread
    When the client unlinks the relationship
    Then the thread status is "READ_ONLY" and the prior message is still visible
    And the client attempting to send a new message in that thread is rejected with status 403

  Scenario: Re-linking after an unlink reactivates the same thread rather than creating a new one
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    And the professional sends the message "Primeira mensagem" in that thread
    And the client unlinks the relationship
    When the professional invites "cli@example.com" again for specialization "PERSONAL_TRAINER" and the client accepts
    Then the thread id is unchanged, its status is "ACTIVE" again, and the earlier message is still there

  Scenario: A non-party cannot read or send messages in a thread they are not part of
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    And an APPROVED professional "other-pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "other-cli@example.com" with password "S3cure!Pass" who is logged in
    When the professional "other-pro@example.com" tries to fetch that thread
    Then the request is rejected with status 404
    When the client "other-cli@example.com" tries to send a message in that thread
    Then the request is rejected with status 404

  Scenario: An Admin has read-only support access to any thread
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    And an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    When the admin fetches that thread
    Then the admin can read it with status 200
    When the admin tries to send a message in that thread
    Then the request is rejected with status 403

  Scenario: A message body containing HTML-looking text round-trips as literal text, never interpreted
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts
    When the professional sends the message "<b>bold</b><script>alert(1)</script>" in that thread
    Then the stored message body is the exact literal string, untouched
