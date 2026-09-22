import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Role, type NutritionPlan } from "@prisma/client";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../../auth/domain/ports/user.repository.port";
import {
  BODY_ASSESSMENT_REPOSITORY,
  type BodyAssessmentRepository,
} from "../../../body-assessments/domain/ports/body-assessment.repository.port";
import {
  ACTIVITY_MULTIPLIERS,
  computeAgeYearsNow,
  computeBmrMifflinStJeor,
  computeDraftCalorieTarget,
  computeDraftMacroTargets,
  computeTdee,
  type ActivityLevel,
  type NutritionGoal,
} from "../../domain/nutrition-calc";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

const ACTIVITY_LEVELS = Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[];

// PRD 04's goalType vocabulary (WEIGHT_LOSS/MUSCLE_GAIN/RECOMPOSITION/
// PERFORMANCE/REHABILITATION/OTHER) is reused as the "Client's stated goal"
// §5.1 asks for, since the most recent BodyAssessment is already the source
// of the weight/height input — PERFORMANCE/REHABILITATION/OTHER have no
// obvious calorie-adjustment direction, so they map to MAINTENANCE rather
// than guessing.
function toNutritionGoal(bodyAssessmentGoalType: string | null): NutritionGoal {
  switch (bodyAssessmentGoalType) {
    case "WEIGHT_LOSS":
      return "WEIGHT_LOSS";
    case "MUSCLE_GAIN":
      return "MUSCLE_GAIN";
    case "RECOMPOSITION":
      return "RECOMPOSITION";
    default:
      return "MAINTENANCE";
  }
}

// PRD 08 §5.1 — the draft target estimate. Uses the Client's most recent
// BodyAssessment weight/height (via the newly-exported
// BODY_ASSESSMENT_REPOSITORY) + ClientProfile.dateOfBirth/biologicalSex.
// activityLevel is caller-supplied (the Nutritionist knows the Client
// better than any stored field does) and defaults to MODERATE when omitted
// — the PRD names the formula but doesn't say where activity level comes
// from, and there's no existing field for it anywhere in the schema.
@Injectable()
export class GenerateDraftNutritionPlanUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(BODY_ASSESSMENT_REPOSITORY)
    private readonly bodyAssessments: BodyAssessmentRepository,
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    clientId: string;
    activityLevel?: ActivityLevel;
  }): Promise<NutritionPlan> {
    await this.access.assertCanManagePlanFor(input.actor, input.clientId);

    const client = await this.users.findById(input.clientId);
    if (!client || client.role !== Role.CLIENT) {
      throw new BadRequestException("Client not found");
    }
    // §5.1/§10 — same missing-input guard shape as PRD 04's formal
    // assessment: ClientProfile's dateOfBirth/biologicalSex are
    // required-not-null once the row exists, so "missing" means the row
    // doesn't exist at all.
    if (!client.clientProfile) {
      throw new BadRequestException(
        "This client's date of birth and biological sex must be on file before a nutrition draft can be generated",
      );
    }

    const latestWeight = await this.bodyAssessments.findLatestForClient(
      input.clientId,
    );
    const latestHeight = await this.bodyAssessments.findLatestWithHeightForClient(
      input.clientId,
    );
    if (!latestWeight || !latestHeight) {
      throw new BadRequestException(
        "This client needs at least one body assessment (with height on file) before a nutrition draft can be generated",
      );
    }

    const activityLevel = input.activityLevel ?? "MODERATE";
    if (!ACTIVITY_LEVELS.includes(activityLevel)) {
      throw new BadRequestException("Invalid activity level");
    }

    const now = new Date();
    const ageYears = computeAgeYearsNow(client.clientProfile.dateOfBirth, now);
    const bmr = computeBmrMifflinStJeor({
      weightKg: latestWeight.weight,
      heightCm: latestHeight.height!,
      ageYears,
      biologicalSex: client.clientProfile.biologicalSex,
    });
    const tdee = computeTdee(bmr, activityLevel);
    const goal = toNutritionGoal(latestWeight.goalType ?? latestHeight.goalType);
    const calorieTarget = computeDraftCalorieTarget(tdee, goal);
    const macroTargets = computeDraftMacroTargets(calorieTarget);

    return this.nutrition.createDraft({
      clientId: input.clientId,
      nutritionistId: input.actor.id,
      calorieTarget,
      macroTargets,
    });
  }
}
