@prd-09
Feature: Today / This Week Dashboard
  The Client's landing screen — a single aggregating call per view (§7) that
  composes live state from Training (PRD 07), Nutrition (PRD 08), Habits/
  Tasks (PRD 10), Messaging (PRD 11) and check-in schedules (PRD 02), plus a
  computed weekly summary (§5.2) from Training (PRD 07) and Body Assessment
  (PRD 04). No new persisted entity (§6) — every fact is read live from its
  owning module.

  Scenario: The Today view aggregates today's session, unread messages, habits/tasks due, and the next check-in
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER" linked ACTIVE to that client
    And that link has a check-in due tomorrow
    And that professional sent that client an unread message "Como foi o treino hoje?"
    And that client has a COMPLETED training session today with one logged set
    And that client has a DAILY habit named "Alongar" due and unchecked today
    And that client has a task with text "Comprar whey" due today, not done
    When the client fetches the Today dashboard
    Then the Today response has status 200
    And the Today response's training session is today's and COMPLETED, not a rest day
    And the Today response shows 1 unread message from "pro@example.com"
    And the Today response's habits include "Alongar" and its tasks include "Comprar whey"
    And the Today response's checkInDue is tomorrow

  Scenario: The Today view degrades gracefully for a Client with no Professional, no active nutrition plan, and no habits
    Given a verified client "solo@example.com" with password "S3cure!Pass" who is logged in
    When the client fetches the Today dashboard
    Then the Today response has status 200
    And the Today response's training session is null and it is a rest day
    And the Today response's nutrition has a null activeTarget and zero totals
    And the Today response's habits and tasks are both empty
    And the Today response's checkInDue is null

  Scenario: The This Week strip reflects each day's session status, and non-CANCELLED sessions drive the adherence percent
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER" linked ACTIVE to that client
    And that client has a COMPLETED training session today with one logged set
    And that client has a MISSED training session 2 days ago
    And that client has a CANCELLED training session 3 days ago
    When the client fetches the Week dashboard
    Then the Week response has status 200
    And the Week strip shows COMPLETED for today and MISSED 2 days ago
    And the Week strip shows REST for days with no session
    And the Week trainingAdherence is 1 completed out of 2 scheduled

  Scenario: The weekly summary's volume trend and weight trend are computed from this week vs. the prior week
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And an APPROVED professional "pro@example.com" with specialization "PERSONAL_TRAINER" linked ACTIVE to that client
    And that client has a COMPLETED training session today with a logged set of 10 reps at 60kg
    And that client has a COMPLETED training session 9 days ago with a logged set of 10 reps at 40kg
    And that client has a body assessment of 81kg recorded 9 days ago
    And that client has a body assessment of 79.5kg recorded today
    When the client fetches the Week dashboard
    Then the Week response's volumeTrend shows this week heavier than the prior week
    And the Week response's weightTrend shows a loss versus the prior entry

  Scenario: No Professional or Admin account can access the dashboard endpoints at all
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    When the professional tries to fetch the Today dashboard
    Then the request is rejected with status 403
    When the professional tries to fetch the Week dashboard
    Then the request is rejected with status 403
    When the admin tries to fetch the Today dashboard
    Then the request is rejected with status 403
    When the admin tries to fetch the Week dashboard
    Then the request is rejected with status 403
