import type {
  Mesocycle,
  MesocycleGoal,
  TrainingPlan,
  TrainingPlanStatus,
  Weekday,
  WeeklyMicrocycleTemplate,
  WeeklyMicrocycleTemplateExercise,
} from "@prisma/client";

export const TRAINING_PLAN_REPOSITORY = Symbol("TRAINING_PLAN_REPOSITORY");

export type TemplateExerciseWithExercise = WeeklyMicrocycleTemplateExercise & {
  exercise: { id: string; name: string; contraindicationTags: { code: string }[] };
};

export type WeeklyTemplateWithExercises = WeeklyMicrocycleTemplate & {
  exercises: TemplateExerciseWithExercise[];
};

export type MesocycleWithTemplates = Mesocycle & {
  weeklyTemplates: WeeklyTemplateWithExercises[];
};

export type TrainingPlanWithMesocycles = TrainingPlan & {
  mesocycles: MesocycleWithTemplates[];
};

export interface CreateTrainingPlanData {
  clientId?: string | null;
  professionalId?: string | null;
  authoredById?: string | null;
  name: string;
  startDate: Date;
  isStarterTemplate: boolean;
}

export interface UpdateTrainingPlanData {
  name?: string;
  startDate?: Date;
  status?: TrainingPlanStatus;
}

export interface CreateMesocycleData {
  trainingPlanId: string;
  weeks: number;
  goal: MesocycleGoal;
  isDeload: boolean;
}

export interface UpdateMesocycleData {
  weeks?: number;
  goal?: MesocycleGoal;
  isDeload?: boolean;
}

export interface WeeklyTemplateExerciseWriteData {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax?: number | null;
  targetLoad?: number | null;
  targetPercent1RM?: number | null;
  targetRpe?: number | null;
  targetRir?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
}

export interface WeeklyTemplateWriteData {
  weekday: Weekday;
  name: string;
  exercises: WeeklyTemplateExerciseWriteData[];
}

/// Infrastructure implements this (base doc §7.2 DIP); Application use-cases
/// depend only on this interface. Deliberately CRUD-shaped — ownership,
/// specialization gating, intake gating, and the generation algorithm all
/// live in the use-cases (base doc §7.2).
export interface TrainingPlanRepository {
  findById(id: string): Promise<TrainingPlanWithMesocycles | null>;
  listForClient(clientId: string): Promise<TrainingPlanWithMesocycles[]>;
  listForProfessional(professionalId: string): Promise<TrainingPlanWithMesocycles[]>;
  listStarterTemplates(): Promise<TrainingPlanWithMesocycles[]>;

  create(data: CreateTrainingPlanData): Promise<TrainingPlanWithMesocycles>;
  update(id: string, data: UpdateTrainingPlanData): Promise<TrainingPlanWithMesocycles>;

  /// `order` is always (current max for the plan) + 1 — server-assigned,
  /// never client-supplied (PRD 06 §6).
  createMesocycle(data: CreateMesocycleData): Promise<MesocycleWithTemplates>;
  findMesocycleById(id: string): Promise<MesocycleWithTemplates | null>;
  updateMesocycle(id: string, data: UpdateMesocycleData): Promise<MesocycleWithTemplates>;

  /// Wholesale replace — deletes the mesocycle's existing
  /// WeeklyMicrocycleTemplate rows (cascading their exercises) and creates
  /// the submitted set fresh. Never touches `Session` rows (PRD 06 §5.4 —
  /// editing the template never rewrites already-generated sessions).
  replaceWeeklyTemplates(
    mesocycleId: string,
    entries: WeeklyTemplateWriteData[],
  ): Promise<MesocycleWithTemplates>;
}
