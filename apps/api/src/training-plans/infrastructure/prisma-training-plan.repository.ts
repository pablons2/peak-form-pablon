import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateMesocycleData,
  CreateTrainingPlanData,
  MesocycleWithTemplates,
  TrainingPlanRepository,
  TrainingPlanWithMesocycles,
  UpdateMesocycleData,
  UpdateTrainingPlanData,
  WeeklyTemplateWriteData,
} from "../domain/ports/training-plan.repository.port";

const WITH_TEMPLATE_EXERCISE = {
  exercise: {
    select: { id: true, name: true, contraindicationTags: { select: { code: true } } },
  },
} satisfies Prisma.WeeklyMicrocycleTemplateExerciseInclude;

const WITH_MESOCYCLES = {
  mesocycles: {
    orderBy: { order: "asc" },
    include: {
      weeklyTemplates: {
        include: { exercises: { include: WITH_TEMPLATE_EXERCISE, orderBy: { order: "asc" } } },
      },
    },
  },
} satisfies Prisma.TrainingPlanInclude;

const WITH_TEMPLATES = {
  weeklyTemplates: {
    include: { exercises: { include: WITH_TEMPLATE_EXERCISE, orderBy: { order: "asc" } } },
  },
} satisfies Prisma.MesocycleInclude;

@Injectable()
export class PrismaTrainingPlanRepository implements TrainingPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TrainingPlanWithMesocycles | null> {
    return this.prisma.trainingPlan.findUnique({ where: { id }, include: WITH_MESOCYCLES });
  }

  listForClient(clientId: string): Promise<TrainingPlanWithMesocycles[]> {
    return this.prisma.trainingPlan.findMany({
      where: { clientId },
      include: WITH_MESOCYCLES,
      orderBy: { createdAt: "desc" },
    });
  }

  listForProfessional(professionalId: string): Promise<TrainingPlanWithMesocycles[]> {
    return this.prisma.trainingPlan.findMany({
      where: { professionalId },
      include: WITH_MESOCYCLES,
      orderBy: { createdAt: "desc" },
    });
  }

  listStarterTemplates(): Promise<TrainingPlanWithMesocycles[]> {
    return this.prisma.trainingPlan.findMany({
      where: { isStarterTemplate: true },
      include: WITH_MESOCYCLES,
      orderBy: { createdAt: "desc" },
    });
  }

  create(data: CreateTrainingPlanData): Promise<TrainingPlanWithMesocycles> {
    return this.prisma.trainingPlan.create({ data, include: WITH_MESOCYCLES });
  }

  update(id: string, data: UpdateTrainingPlanData): Promise<TrainingPlanWithMesocycles> {
    return this.prisma.trainingPlan.update({
      where: { id },
      data,
      include: WITH_MESOCYCLES,
    });
  }

  async createMesocycle(data: CreateMesocycleData): Promise<MesocycleWithTemplates> {
    const agg = await this.prisma.mesocycle.aggregate({
      where: { trainingPlanId: data.trainingPlanId },
      _max: { order: true },
    });
    const order = (agg._max.order ?? 0) + 1;
    return this.prisma.mesocycle.create({
      data: {
        trainingPlanId: data.trainingPlanId,
        order,
        weeks: data.weeks,
        goal: data.goal,
        isDeload: data.isDeload,
      },
      include: WITH_TEMPLATES,
    });
  }

  findMesocycleById(id: string): Promise<MesocycleWithTemplates | null> {
    return this.prisma.mesocycle.findUnique({ where: { id }, include: WITH_TEMPLATES });
  }

  updateMesocycle(id: string, data: UpdateMesocycleData): Promise<MesocycleWithTemplates> {
    return this.prisma.mesocycle.update({ where: { id }, data, include: WITH_TEMPLATES });
  }

  async replaceWeeklyTemplates(
    mesocycleId: string,
    entries: WeeklyTemplateWriteData[],
  ): Promise<MesocycleWithTemplates> {
    await this.prisma.$transaction([
      this.prisma.weeklyMicrocycleTemplate.deleteMany({ where: { mesocycleId } }),
      ...entries.map((entry) =>
        this.prisma.weeklyMicrocycleTemplate.create({
          data: {
            mesocycleId,
            weekday: entry.weekday,
            name: entry.name,
            exercises: { create: entry.exercises },
          },
        }),
      ),
    ]);
    return (await this.findMesocycleById(mesocycleId))!;
  }
}
