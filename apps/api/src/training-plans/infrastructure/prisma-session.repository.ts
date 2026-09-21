import { Injectable } from "@nestjs/common";
import { SessionStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { WeeklyTemplateExerciseWriteData } from "../domain/ports/training-plan.repository.port";
import type {
  GenerateSessionData,
  SessionRepository,
  SessionWithExercises,
} from "../domain/ports/session.repository.port";

const WITH_EXERCISES = {
  sessionExercises: {
    include: {
      exercise: {
        select: { id: true, name: true, contraindicationTags: { select: { code: true } } },
      },
    },
    orderBy: { order: "asc" },
  },
} satisfies Prisma.SessionInclude;

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<SessionWithExercises | null> {
    return this.prisma.session.findUnique({ where: { id }, include: WITH_EXERCISES });
  }

  listForMesocycle(mesocycleId: string): Promise<SessionWithExercises[]> {
    return this.prisma.session.findMany({
      where: { mesocycleId },
      include: WITH_EXERCISES,
      orderBy: { date: "asc" },
    });
  }

  async existingDatesForMesocycle(mesocycleId: string): Promise<Set<string>> {
    const rows = await this.prisma.session.findMany({
      where: { mesocycleId },
      select: { date: true },
    });
    return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
  }

  async generateMany(mesocycleId: string, sessions: GenerateSessionData[]): Promise<void> {
    if (sessions.length === 0) return;
    await this.prisma.$transaction(
      sessions.map((s) =>
        this.prisma.session.create({
          data: {
            mesocycleId,
            date: s.date,
            sessionExercises: { create: s.exercises },
          },
        }),
      ),
    );
  }

  move(id: string, newDate: Date): Promise<SessionWithExercises> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.session.findUniqueOrThrow({ where: { id } });
      return tx.session.update({
        where: { id },
        data: {
          date: newDate,
          originalDate: current.originalDate ?? current.date,
          overriddenFromTemplate: true,
        },
        include: WITH_EXERCISES,
      });
    });
  }

  cancel(id: string): Promise<SessionWithExercises> {
    return this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.CANCELLED },
      include: WITH_EXERCISES,
    });
  }

  async replaceExercises(
    id: string,
    exercises: WeeklyTemplateExerciseWriteData[],
  ): Promise<SessionWithExercises> {
    await this.prisma.$transaction([
      this.prisma.sessionExercise.deleteMany({ where: { sessionId: id } }),
      this.prisma.session.update({
        where: { id },
        data: {
          overriddenFromTemplate: true,
          sessionExercises: { create: exercises },
        },
      }),
    ]);
    return (await this.findById(id))!;
  }
}
