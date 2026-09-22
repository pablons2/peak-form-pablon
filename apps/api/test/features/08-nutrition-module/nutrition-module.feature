@prd-08
Feature: Nutrition Module (API)
  As a Nutritionist, Client, and Admin
  I want calorie/macro targets that never auto-activate and a food diary with a trustworthy history
  So that nutrition guidance always goes through a licensed professional and past logs stay accurate

  Scenario: A draft nutrition target is never visible to the Client until a Nutritionist confirms it
    Given an active NUTRITIONIST link between a professional and a client with a recorded body assessment
    When the nutritionist generates a draft nutrition target for the client
    Then the draft is created with status "DRAFT" and no confirmedByProfessionalAt
    And the client's own active-plan endpoint returns null
    When the nutritionist confirms the draft
    Then the plan becomes "ACTIVE" with confirmedByProfessionalAt set
    And the client's own active-plan endpoint now returns the confirmed target

  Scenario: Generating a draft is blocked when the client has no body assessment on file
    Given an active NUTRITIONIST link between a professional and a client with no body assessment
    When the nutritionist generates a draft nutrition target for the client
    Then the request is rejected with a client-error status

  Scenario: A Professional without the NUTRITIONIST specialization cannot create or confirm a nutrition plan
    Given an active PERSONAL_TRAINER link between a professional and a client with a recorded body assessment
    When that professional generates a draft nutrition target for the client
    Then the request is rejected with status 403

  Scenario: Confirming a plan always sets ACTIVE and confirmedByProfessionalAt together
    Given an active NUTRITIONIST link between a professional and a client with a recorded body assessment
    And the nutritionist has generated a draft nutrition target for the client
    When the nutritionist confirms the draft
    Then the plan becomes "ACTIVE" with confirmedByProfessionalAt set

  Scenario: An Admin can generate and confirm a nutrition plan without any link to the client
    Given a client with a recorded body assessment and no professional link at all
    When an admin generates a draft nutrition target for the client
    Then the draft is created with status "DRAFT" and no confirmedByProfessionalAt
    When the admin confirms the draft
    Then the plan becomes "ACTIVE" with confirmedByProfessionalAt set

  Scenario: A barcode lookup that Open Food Facts reports as not found returns no fabricated nutrients
    Given a client logged in with a valid session
    When the client looks up an unknown barcode
    Then the barcode lookup returns null

  Scenario: A food diary entry's nutrient snapshot survives a later correction to the cached food item
    Given a client logged in with a valid session
    And a cached food item is seeded with known nutrients
    When the client logs a diary entry for that cached food item
    Then the diary entry's nutrient snapshot matches the nutrients at log time
    When the cached food item's nutrients are corrected
    Then the diary entry's nutrient snapshot is still the original value

  Scenario: A Professional has no mutating route to write another client's food diary or hydration
    Given a client logged in with a valid session
    When a request is made to a food-diary write route scoped to a professional
    Then the route does not exist

  Scenario: The weekly adherence summary is identical for the Client and the Nutritionist
    Given an active NUTRITIONIST link between a professional and a client with a recorded body assessment
    And the nutritionist has generated and confirmed a draft nutrition target for the client
    And the client has logged food diary entries this week
    When the client fetches their own weekly adherence summary
    And the nutritionist fetches the client's weekly adherence summary
    Then both summaries report the same days logged and the same average adherence percent
