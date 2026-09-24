import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, SessionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { WeeklyTemplateExerciseWriteData } from "../domain/ports/training-plan.repository.port";
import type {
  GenerateSessionData,
  SessionRepository,
  SessionWithExercises,
  SessionWithExercisesAndClient,
} from "../domain/ports/session.repository.port";

const WITH_EXERCISES = {
  sessionExercises: {
    include: {
      exercise: {
        select: {
          id: true,
          name: true,
          mediaUrl: true,
          contraindicationTags: { select: { code: true } },
        },
      },
    },
    orderBy: { order: "asc" },
  },
} satisfies Prisma.SessionInclude;

// WITH_EXERCISES + the owning Client's id — only the PRD 12 notification
// jobs (missed-session, session-reminder) walk this far; regular reads stay
// on the lighter include.
const WITH_EXERCISES_AND_CLIENT = {
  ...WITH_EXERCISES,
  mesocycle: {
    select: { trainingPlan: { select: { clientId: true } } },
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
    try {
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
    } catch (error) {
      // PRD 07 §6 — ExerciseLog.sessionExerciseId is the Prisma-default
      // Restrict, deliberately: a Client's already-logged performance for
      // this Session must never be silently deleted just because a
      // Professional edited the day's exercises afterward. Surface the
      // conflict, same "409 instead of a raw 500" precedent
      // PrismaExerciseRepository.delete established for Exercise deletion.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new ConflictException(
          "This session already has logged performance and its exercises can't be replaced",
        );
      }
      throw error;
    }
    return (await this.findById(id))!;
  }

  findByClientAndDate(clientId: string, date: Date): Promise<SessionWithExercises | null> {
    return this.prisma.session.findFirst({
      where: { date, mesocycle: { trainingPlan: { clientId } } },
      include: WITH_EXERCISES,
    });
  }

  listForClient(clientId: string): Promise<SessionWithExercises[]> {
    return this.prisma.session.findMany({
      where: { mesocycle: { trainingPlan: { clientId } } },
      include: WITH_EXERCISES,
      orderBy: { date: "desc" },
    });
  }

  findScheduledPastDue(before: Date): Promise<SessionWithExercisesAndClient[]> {
    return this.prisma.session.findMany({
      where: { status: SessionStatus.SCHEDULED, date: { lt: before } },
      include: WITH_EXERCISES_AND_CLIENT,
    });
  }

  findScheduledOnDate(date: Date): Promise<SessionWithExercisesAndClient[]> {
    return this.prisma.session.findMany({
      where: { status: SessionStatus.SCHEDULED, date },
      include: WITH_EXERCISES_AND_CLIENT,
    });
  }

  markMissed(id: string): Promise<SessionWithExercises> {
    return this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.MISSED },
      include: WITH_EXERCISES,
    });
  }

  markCompleted(id: string): Promise<SessionWithExercises> {
    return this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.COMPLETED },
      include: WITH_EXERCISES,
    });
  }
}
