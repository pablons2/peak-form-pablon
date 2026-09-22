@prd-10
Feature: Productivity / Habits
  Client-only, health-adjacent habits with daily/weekday cadence and streak
  tracking, plus a flat personal task list (§5). No Professional or Admin
  account has any visibility into this data at all (§4) — this module's
  data model is also fully isolated from TrainingPlan/NutritionPlan/
  BodyAssessment at the schema level (§6/§10).

  Scenario: A Client creates a DAILY habit and checks it off today, idempotently
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client creates a DAILY habit named "Beber agua"
    Then the habit is created with status 201
    When the client checks that habit off for today
    Then the check-in is created with status 201
    And the habit's streak is 1 and it is checked off today
    When the client checks that habit off for today again
    Then the check-in is still created with status 201
    And there is still exactly 1 check-in row for that habit in the database

  Scenario: Consecutive check-ins build a streak, and a missed day resets it without deleting history
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And that client has a DAILY habit named "Dormir 8h" created 10 days ago
    And that habit has check-ins for each of the last 3 days including today
    When the client lists their habits
    Then the habit's streak is 3
    Given that client has another DAILY habit named "Mobilidade" created 10 days ago
    And that habit has check-ins for today and for 3 days ago only
    When the client lists their habits
    Then the streak for "Mobilidade" is 1
    And the check-in from 3 days ago still exists in the database

  Scenario: A SPECIFIC_WEEKDAYS habit only counts its due weekdays, and skips non-due days without counting them
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And that client has a SPECIFIC_WEEKDAYS habit named "Yoga" due on today's and yesterday's weekdays, created 10 days ago
    And that habit has check-ins for today and yesterday only
    When the client lists their habits
    Then the streak for "Yoga" is 2

  Scenario: A Client can create, list, complete and un-complete a personal task
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    When the client creates a task with text "Agendar avaliacao"
    Then the task is created with status 201
    When the client lists their tasks
    Then the task "Agendar avaliacao" is in the list, not done, with no completedAt
    When the client marks that task as done
    Then the task is done and has a completedAt timestamp
    When the client marks that task as not done
    Then the task is not done and has no completedAt

  Scenario: No Professional or Admin account can access this module's endpoints at all
    Given an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in
    And an admin "admin@example.com" with password "S3cure!Pass" who is logged in
    When the professional tries to list habits
    Then the request is rejected with status 403
    When the professional tries to create a habit
    Then the request is rejected with status 403
    When the professional tries to list tasks
    Then the request is rejected with status 403
    When the professional tries to create a task
    Then the request is rejected with status 403
    When the professional tries to fetch the today feed
    Then the request is rejected with status 403
    When the admin tries to list habits
    Then the request is rejected with status 403
    When the admin tries to create a habit
    Then the request is rejected with status 403
    When the admin tries to list tasks
    Then the request is rejected with status 403
    When the admin tries to create a task
    Then the request is rejected with status 403
    When the admin tries to fetch the today feed
    Then the request is rejected with status 403

  Scenario: A Client cannot patch, check into, or delete another Client's habit or task
    Given a verified client "cli-a@example.com" with password "S3cure!Pass" who is logged in
    And that client has a DAILY habit named "Habito da A"
    And that client has a task with text "Tarefa da A"
    And a verified client "cli-b@example.com" with password "S3cure!Pass" who is logged in
    When client B tries to patch client A's habit
    Then the request is rejected with status 404
    When client B tries to check into client A's habit
    Then the request is rejected with status 404
    When client B tries to delete client A's habit check-in
    Then the request is rejected with status 404
    When client B tries to patch client A's task
    Then the request is rejected with status 404
    When client B tries to delete client A's task
    Then the request is rejected with status 404

  Scenario: This module's schema has no foreign key into TrainingPlan, NutritionPlan, or BodyAssessment
    Then habit_definitions, habit_check_ins and personal_tasks have zero foreign keys into training_plans, nutrition_plans or body_assessments

  Scenario: The Today feed surfaces due habits (each carrying checkedToday) and due tasks, and excludes archived/non-due habits and done tasks
    Given a verified client "cli@example.com" with password "S3cure!Pass" who is logged in
    And that client has a DAILY habit named "Habito de hoje" that is due and unchecked today
    And that client has a DAILY habit named "Habito ja feito" that is due and checked today
    And that client has a DAILY habit named "Habito arquivado" that is archived
    And that client has a SPECIFIC_WEEKDAYS habit named "Habito de outro dia" that is not due today
    And that client has a task with text "Tarefa de hoje" due today, not done
    And that client has a task with text "Tarefa concluida" due today, done
    When the client fetches the today feed
    Then the today feed includes "Habito de hoje" and "Tarefa de hoje"
    And the today feed includes "Habito ja feito" with checkedToday true
    And the today feed excludes "Habito arquivado", "Habito de outro dia" and "Tarefa concluida"
