# PRD 08 — Nutrition Module

**Module:** Nutrition
**Source:** Base document §5.8 (see also §3.6, §6, §8.2)
**Status:** Draft v1
**Depends on:** [`00-shared-reference-and-decisions.md`](./00-shared-reference-and-decisions.md), [`01-authentication-account-management.md`](./01-authentication-account-management.md) (`ClientProfile.dateOfBirth`/`biologicalSex`, required inputs to §5.1's formula), [`02-professional-client-relationship.md`](./02-professional-client-relationship.md), [`04-body-assessment.md`](./04-body-assessment.md) (BMR/TDEE draft-estimate input)
**Referenced by (downstream consumers):** [`09-today-this-week-dashboard.md`](./09-today-this-week-dashboard.md) (meals vs. target, weekly summary), [`10-productivity-habits.md`](./10-productivity-habits.md) (hydration-log boundary), [`12-notifications.md`](./12-notifications.md) (missed-food-log, "plan updated" triggers)

---

## 1. Overview

The nutrition module lets Clients log food intake and gives the Nutritionist visibility and control over calorie/macro targets. Per base doc §3.6, this is explicitly **log + educate, not auto-prescribe**: the system may suggest a starting estimate, but it must never present that estimate as an active, client-facing target until a licensed Nutritionist confirms it — this is both a safety and liability guardrail addressed directly in the product vision's failure-mode #2 (§1).

## 2. Goals

- Let Clients log food intake via search or barcode scan against free food APIs, normalized into a local cache.
- Let a Nutritionist set/confirm calorie and macro targets per Client, with the system offering only an editable draft estimate, never an auto-applied prescription.
- Provide non-clinical, automated adherence nudges (e.g., "low on protein today") without crossing into clinical advice.

## 3. Non-Goals

- The system never auto-generates or auto-activates a calorie/macro target without explicit Nutritionist confirmation — no code path sets a `NutritionPlan` to `ACTIVE` without a `confirmedByProfessionalAt` timestamp.
- No medical/diagnostic nutrition advice (e.g., no eating-disorder screening, no clinical dietary prescriptions) — out of scope entirely, this app is a logging and coaching-support tool, not a clinical nutrition system.

## 4. Personas & Permissions

Per base doc §4: "Create/edit nutrition plans" — Admin ✅, Professional ✅ (own clients only, requires `NUTRITIONIST` specialization), Client ❌. "Log food diary" — Client ✅ own only, Professional 👁 view.

| Action | Admin | Professional (Nutritionist specialization) | Client |
|---|:---:|:---:|:---:|
| Generate a draft target estimate | ✅ | ✅ (own clients) | ❌ (view only, cannot self-confirm) |
| Confirm/edit an active target | ✅ | ✅ (own clients only) | ❌ |
| Log food diary entries | — | 👁 (own clients) | ✅ (own) |
| View macro totals vs. target | — | ✅ (own clients) | ✅ (own) |

## 5. Functional Requirements

### 5.1 Draft target estimate
- System can compute a starting-point estimate using the **Mifflin-St Jeor** formula (`BMR = 10×weight(kg) + 6.25×height(cm) − 5×age(years) + s`, where `s` is `+5` for `biologicalSex: MALE` and `−161` for `FEMALE`) → TDEE via an activity multiplier, using the Client's most recent `BodyAssessment` weight/height (PRD 04) plus `ClientProfile.dateOfBirth`/`biologicalSex` (PRD 01 §6) for age and the sex-specific constant, and the Client's stated goal.
- Generating a draft is blocked server-side with a clear error if the Client has no `BodyAssessment` entry yet, or if `ClientProfile.dateOfBirth`/`biologicalSex` is missing — the same missing-input guard PRD 04 §5.2 applies to its own formula.
- This estimate is stored as a `NutritionPlan` in `DRAFT` status — visible to the Nutritionist as a suggestion, **never shown to the Client as an active target** while in `DRAFT`.

### 5.2 Nutritionist confirmation
- Nutritionist reviews the draft, edits calorie/macro values as needed, and explicitly confirms — this sets `status: ACTIVE` and `confirmedByProfessionalAt`. Only after this does the Client see the target on their food-diary screen.
- Any subsequent change to an active target also requires an explicit Nutritionist save action — there is no "auto-adjust" background job that silently changes a Client's active target.
- Optional: a structured meal plan (meal slots with suggested foods) can be attached to an active `NutritionPlan`, authored by the Nutritionist.

### 5.3 Food diary (Client)
- Search or barcode-scan food lookup, backed by:
  - **Open Food Facts** for barcode/packaged-food lookup (no API key required) — must check the response's `status` field, not just HTTP status, since a "not found" still returns HTTP 200 (base doc §8.2 caveat).
  - **USDA FoodData Central** for generic/whole-food search (requires a free `data.gov` key, ~1,000 req/hour rate limit).
  - Both sources are normalized into the local `FoodItemCache` (base doc §6) so the Client experience doesn't depend on live third-party latency, per the caching architecture in base doc §7.5.
- Client logs an entry: food item, quantity, meal slot (breakfast/lunch/dinner/snack), timestamp. A nutrient snapshot is stored on the `FoodDiaryEntry` at log time (not just a foreign key to the cache) so historical entries remain accurate even if the cached food data is later corrected/updated.
- Running macro totals vs. active target shown for the current day.

### 5.4 Hydration log
- Simple counter (e.g., glasses/liters of water per day), feeding the same daily view as food logging.

### 5.5 Non-clinical nudges
- Automated, rule-based nudges only (e.g., "You're low on protein today vs. your target", "You haven't logged lunch yet") — per base doc §3.6, anything that would read as medical/nutritional advice beyond simple adherence prompts must route through or be pre-approved by the Nutritionist, not generated freely by the system.

### 5.6 Weekly adherence summary
- A weekly summary (days logged, average macro adherence %) is generated and shared with both Client and Nutritionist, feeding into the "This Week" dashboard (PRD 09).

## 6. Data Model Additions

Uses base doc §6 entities directly:

- **NutritionPlan**: `clientId`, `nutritionistId`, `calorieTarget`, `macroTargets` (JSON: protein/carbs/fat), `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `confirmedByProfessionalAt` (nullable — null while `DRAFT`).
- **FoodDiaryEntry**: `clientId`, `foodApiRef` or `customFoodId`, `quantity`, `mealSlot`, `loggedAt`, `nutrientsSnapshot` (JSON, captured at log time).
- **FoodItemCache**: `source` (`open_food_facts`/`usda`/`custom`), `externalId`, `nutrients` (JSON, per 100g or per serving), `fetchedAt`.

## 7. UX Notes

- Client never sees a calorie/macro number that hasn't been Nutritionist-confirmed — the UI must not leak a `DRAFT` estimate into any Client-facing screen, even accidentally via a shared component with the Nutritionist's review screen.
- Barcode scanning uses the device camera (mobile-first per base doc §10) — must handle the Open Food Facts "not found" case gracefully with a manual-entry fallback.

## 8. Out of Scope / Future (Fast-Follow)

- Recipe/meal builder beyond simple meal-slot suggestions.
- Integration with wearables for activity-level auto-adjustment of TDEE estimates.

## 9. Open Questions

- None blocking. The non-clinical-advice boundary in §5.5 may need periodic review as nudge rules are added, to ensure none of them drift into prescriptive territory.

## 10. Acceptance Criteria

- No `NutritionPlan` is visible to a Client as an active target unless `status: ACTIVE` and `confirmedByProfessionalAt` is set.
- A Professional without the `NUTRITIONIST` specialization cannot create or confirm a nutrition plan, even for their own linked client.
- Logging a barcode-scanned food correctly handles the Open Food Facts `status: 0` "not found" case without misreporting nutrients.
- A `FoodDiaryEntry`'s nutrient snapshot remains unchanged even if the underlying `FoodItemCache` entry is later updated.
- Weekly adherence summary is visible to both the Client and their linked Nutritionist.
