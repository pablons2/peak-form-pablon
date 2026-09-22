@prd-09
Feature: Today / This Week Dashboard (web)
  Web-layer coverage of PRD 09 §10: the Client's landing screen after login
  shows today's session, due habits/tasks, and — on the "Esta semana" tab —
  the 7-day strip, all from one page load. Client-only by design (§4).

  Scenario: The dashboard's "Hoje" tab shows today's training session and due habits/tasks
    Given a verified client "bdd.dash-client@example.com"
    And an APPROVED professional "bdd.dash-pro@example.com" linked to that client
    And that client has a training session scheduled for today
    And that client already has the habit "Alongar"
    And that client already has a task "Comprar whey" due today
    When the client logs in
    Then the dashboard's "Hoje" tab shows "Treino de hoje"
    And the dashboard's "Hoje" tab shows the habit "Alongar"
    And the dashboard's "Hoje" tab shows the task "Comprar whey"

  Scenario: Switching to the "Esta semana" tab shows the 7-day strip
    Given a verified client "bdd.dash-week-client@example.com"
    And an APPROVED professional "bdd.dash-week-pro@example.com" linked to that client
    And that client has a training session scheduled for today
    When the client logs in
    And the client switches to the "Esta semana" tab
    Then the dashboard shows the weekly summary card

  Scenario: A Client with no Professional and no history sees a plain rest-day dashboard, not an error
    Given a verified client "bdd.dash-solo@example.com"
    When the client logs in
    Then the dashboard's "Hoje" tab shows "Dia de descanso"
