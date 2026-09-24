@trainer-refactor
Feature: Trainer-Facing Session Review Tab (Phase 3.2)
  As a personal trainer
  I want to review my clients' logged workout sessions
  So I can track their performance and provide coaching feedback

  Background:
    Given a professional user "trainer@example.com" with role "PROFESSIONAL" and specialization "PERSONAL_TRAINER"
    And a client user "client@example.com" with role "CLIENT"
    And the professional is APPROVED
    And the professional and client have an ACTIVE link
    And the client has completed the health intake
    And a training plan exists with 1 completed session and 1 missed session

  Scenario: Trainer views session review tab in client detail hub
    When the professional logs in
    And navigates to the client detail page
    Then the "Execução" tab is visible in the tabs
    And the tab displays "2 sessões"

  Scenario: Trainer expands a session to view exercise details
    When the professional logs in
    And navigates to the client detail page
    And clicks on the "Execução" tab
    And clicks on the most recent completed session
    Then the session expands to show all exercises
    And each exercise shows:
      """
      - Exercise name and image
      - Prescribed sets/reps/load
      - Actual completed sets/reps/load
      - Status badge (✓ Completo or ⚠ Incompleto)
      """

  Scenario: Trainer sees comparison of prescribed vs actual performance
    When the professional logs in
    And navigates to the client detail page
    And clicks on the "Execução" tab
    And expands the completed session
    Then each exercise card displays side-by-side comparison:
      """
      - Left column: "Prescrito" with target sets/reps/load/RPE/RIR
      - Right column: "✓ Completo" with actual completed sets count
      - Average actual reps calculated from all logged sets
      """

  Scenario: Trainer can see individual set logs with timestamps
    When the professional logs in
    And navigates to the client detail page
    And clicks on the "Execução" tab
    And expands a session with logged sets
    Then each logged set is displayed with:
      """
      - Set number and logged time
      - Actual reps, load, RPE/RIR
      - Client's note if present
      """

  Scenario: Trainer sees missed session clearly marked
    When the professional logs in
    And navigates to the client detail page
    And clicks on the "Execução" tab
    Then missed sessions are clearly marked:
      """
      - Red/destructive status badge with "Perdido" label
      - Icon indicator (⚠) in the session list
      - "Nenhuma série registrada" message when expanded
      """

  Scenario: Empty state when no sessions exist
    Given the training plan has no sessions
    When the professional logs in
    And navigates to the client detail page
    And clicks on the "Execução" tab
    Then a friendly empty state is displayed:
      """
      - Alert icon
      - Message: "Nenhuma sessão de treino registrada ainda."
      """
