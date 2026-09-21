import { Inject, Injectable } from "@nestjs/common";
import { Weekday } from "@prisma/client";
import {
  candidateSessionSlots,
  computeMesocycleStartDate,
  sumWeeksBeforeOrder,
} from "../domain/mesocycle-scheduling";
import type { GenerateSessionData } from "../domain/ports/session.repository.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../domain/ports/session.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type MesocycleWithTemplates,
  type TrainingPlanRepository,
} from "../domain/ports/training-plan.repository.port";

// PRD 06 §5.4 — "on saving a mesocycle's weekly template, the system
// generates dated Session instances covering every week of that mesocycle's
// span." Shared by SaveWeeklyTemplateUseCase (re-saving a template) and the
// clone use-cases (cloning a mesocycle is, structurally, "saving" a fresh
// set of templates into a new context). Additive-only per §5.4: a date that
// already has a Session row is left completely untouched.
@Injectable()
export class SessionGenerationService {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async generateForMesocycle(mesocycleId: string): Promise<void> {
    const mesocycle = await this.plans.findMesocycleById(mesocycleId);
    if (!mesocycle) return;
    const plan = await this.plans.findById(mesocycle.trainingPlanId);
    if (!plan) return;

    const priorWeeks = sumWeeksBeforeOrder(plan.mesocycles, mesocycle.order);
    const mesocycleStart = computeMesocycleStartDate(plan.startDate, priorWeeks);
    const templateWeekdays = mesocycle.weeklyTemplates.map((t) => t.weekday);
    const slots = candidateSessionSlots(mesocycleStart, mesocycle.weeks, templateWeekdays);
    if (slots.length === 0) return;

    const existingDates = await this.sessions.existingDatesForMesocycle(mesocycleId);
    const templateByWeekday = new Map(
      mesocycle.weeklyTemplates.map((t) => [t.weekday, t]),
    );

    const toGenerate: GenerateSessionData[] = slots
      .filter((slot) => !existingDates.has(slot.date.toISOString().slice(0, 10)))
      .map((slot) => this.toGenerateData(slot.date, slot.weekday, templateByWeekday))
      .filter((data): data is GenerateSessionData => data !== null);

    await this.sessions.generateMany(mesocycleId, toGenerate);
  }

  private toGenerateData(
    date: Date,
    weekday: Weekday,
    templateByWeekday: Map<Weekday, MesocycleWithTemplates["weeklyTemplates"][number]>,
  ): GenerateSessionData | null {
    const template = templateByWeekday.get(weekday);
    if (!template) return null;
    return {
      date,
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
    };
  }
}
