import { Inject, Injectable } from "@nestjs/common";
import {
  TRAINING_PLAN_REPOSITORY,
  type MesocycleWithTemplates,
  type TrainingPlanRepository,
  type TrainingPlanWithMesocycles,
  type WeeklyTemplateWriteData,
} from "../domain/ports/training-plan.repository.port";
import { SessionGenerationService } from "./session-generation.service";

// PRD 06 §5.7 — "clone copies structure and prescriptions but does not copy
// the source Client's identity or history." Copies each mesocycle's
// weeks/goal/isDeload and its weekly templates/exercises, then generates
// fresh dated Sessions from the *target* plan's own startDate — it never
// copies Session/SessionExercise rows (those are exactly the "history" the
// clone must leave behind).
@Injectable()
export class ClonePlanService {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    private readonly generation: SessionGenerationService,
  ) {}

  async cloneMesocyclesInto(
    sourcePlan: TrainingPlanWithMesocycles,
    targetPlanId: string,
  ): Promise<void> {
    for (const sourceMesocycle of sourcePlan.mesocycles) {
      await this.cloneOneMesocycleInto(sourceMesocycle, targetPlanId);
    }
  }

  async cloneOneMesocycleInto(
    sourceMesocycle: MesocycleWithTemplates,
    targetPlanId: string,
  ): Promise<MesocycleWithTemplates> {
    const newMesocycle = await this.plans.createMesocycle({
      trainingPlanId: targetPlanId,
      weeks: sourceMesocycle.weeks,
      goal: sourceMesocycle.goal,
      isDeload: sourceMesocycle.isDeload,
    });

    const entries: WeeklyTemplateWriteData[] = sourceMesocycle.weeklyTemplates.map(
      (template) => ({
        weekday: template.weekday,
        name: template.name,
        exercises: template.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          order: e.order,
          targetSets: e.targetSets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          targetLoad: e.targetLoad,
          targetPercent1RM: e.targetPercent1RM,
          targetRpe: e.targetRpe,
          targetRir: e.targetRir,
          restSeconds: e.restSeconds,
          tempo: e.tempo,
          notes: e.notes,
        })),
      }),
    );

    const withTemplates = await this.plans.replaceWeeklyTemplates(
      newMesocycle.id,
      entries,
    );
    await this.generation.generateForMesocycle(newMesocycle.id);
    return withTemplates;
  }
}
