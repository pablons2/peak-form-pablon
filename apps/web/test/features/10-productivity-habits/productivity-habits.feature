@prd-10
Feature: Productivity / Habits (web)
  Web-layer coverage of PRD 10 §10: a Client creates a custom habit and
  checks it off through the real UI (streak becomes 1), adds and completes a
  personal task, and the "Today" checklist card (PRD 09's own dependency,
  §5.4) surfaces a due unchecked habit and a due task. This module is
  Client-only by design (§4) — there is no Professional/Admin visibility to
  re-prove here.

  Scenario: A Client creates a habit, checks it off, and sees streak 1
    Given a verified client "bdd.habits-client@example.com"
    When the client logs in and opens the habits page
    And the client adds the habit "Beber água"
    Then the habit "Beber água" appears in the habit list
    When the client checks off the habit "Beber água"
    Then the habit "Beber água" shows a streak of 1 dia

  Scenario: A Client adds a task and marks it done
    Given a verified client "bdd.habits-client2@example.com"
    When the client logs in and opens the habits page
    And the client adds the task "Comprar suplemento"
    Then the task "Comprar suplemento" appears in the task list
    When the client marks the task "Comprar suplemento" as done
    Then the task "Comprar suplemento" appears struck through

  Scenario: The "Hoje" checklist card shows a due habit and a due task
    Given a verified client "bdd.habits-client3@example.com"
    And the client already has the habit "Alongar 10 min"
    And the client already has a task "Ler 10 páginas" due today
    When the client logs in and opens the habits page
    Then the "Hoje" card shows the habit "Alongar 10 min"
    And the "Hoje" card shows the task "Ler 10 páginas"

