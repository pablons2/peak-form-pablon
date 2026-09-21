import type {
  MesocycleWithTemplates,
  TemplateExerciseWithExercise,
  TrainingPlanWithMesocycles,
  WeeklyTemplateWithExercises,
} from "../domain/ports/training-plan.repository.port";
import type {
  SessionExerciseWithExercise,
  SessionWithExercises,
} from "../domain/ports/session.repository.port";

function toPublicTemplateExercise(e: TemplateExerciseWithExercise) {
  return {
    id: e.id,
    exerciseId: e.exerciseId,
    exerciseName: e.exercise.name,
    contraindicationTagCodes: e.exercise.contraindicationTags.map((t) => t.code),
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
  };
}

function toPublicWeeklyTemplate(t: WeeklyTemplateWithExercises) {
  return {
    id: t.id,
    weekday: t.weekday,
    name: t.name,
    exercises: t.exercises.map(toPublicTemplateExercise),
  };
}

export function toPublicMesocycle(m: MesocycleWithTemplates) {
  return {
    id: m.id,
    trainingPlanId: m.trainingPlanId,
    order: m.order,
    weeks: m.weeks,
    goal: m.goal,
    isDeload: m.isDeload,
    weeklyTemplates: m.weeklyTemplates.map(toPublicWeeklyTemplate),
  };
}

export function toPublicTrainingPlan(plan: TrainingPlanWithMesocycles) {
  return {
    id: plan.id,
    clientId: plan.clientId,
    professionalId: plan.professionalId,
    authoredById: plan.authoredById,
    name: plan.name,
    startDate: plan.startDate,
    status: plan.status,
    isStarterTemplate: plan.isStarterTemplate,
    createdAt: plan.createdAt,
    mesocycles: plan.mesocycles.map(toPublicMesocycle),
  };
}

function toPublicSessionExercise(e: SessionExerciseWithExercise) {
  return {
    id: e.id,
    exerciseId: e.exerciseId,
    exerciseName: e.exercise.name,
    contraindicationTagCodes: e.exercise.contraindicationTags.map((t) => t.code),
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
  };
}

export function toPublicSession(session: SessionWithExercises) {
  return {
    id: session.id,
    mesocycleId: session.mesocycleId,
    date: session.date,
    originalDate: session.originalDate,
    status: session.status,
    overriddenFromTemplate: session.overriddenFromTemplate,
    sessionExercises: session.sessionExercises.map(toPublicSessionExercise),
  };
}
