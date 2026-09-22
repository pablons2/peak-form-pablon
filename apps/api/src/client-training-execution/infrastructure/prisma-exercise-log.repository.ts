import { Injectable } from "@nestjs/common";
import type { ExerciseLog } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateExerciseLogInput,
  ExerciseLogRepository,
  ExerciseLogWithSessionDate,
} from "../domain/ports/exercise-log.repository.port";

@Injectable()
export class PrismaExerciseLogRepository implements ExerciseLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  countForSessionExercise(sessionExerciseId: string): Promise<number> {
    return this.prisma.exerciseLog.count({ where: { sessionExerciseId } });
  }

  create(input: CreateExerciseLogInput): Promise<ExerciseLog> {
    return this.prisma.exerciseLog.create({ data: input });
  }

  listForSession(sessionId: string): Promise<ExerciseLog[]> {
    return this.prisma.exerciseLog.findMany({
      where: { sessionExercise: { sessionId } },
      orderBy: [{ sessionExerciseId: "asc" }, { setNumber: "asc" }],
    });
  }

  async hasAnyLogForSession(sessionId: string): Promise<boolean> {
    const count = await this.prisma.exerciseLog.count({
      where: { sessionExercise: { sessionId } },
    });
    return count > 0;
  }

  // Fetched unsorted and sorted in JS by (session date, loggedAt) rather
  // than a nested Prisma `orderBy` through two hops (sessionExercise.session
  // .date) — this dataset is small per Client/exercise pair, and sorting
  // explicitly here keeps the "most recent by session date, not by
  // submission time" rule (§5.4 late-logging) visibly correct rather than
  // trusting Prisma's nested-relation ordering to mean what it looks like it
  // means.
  async findLastForClientAndExercise(
    clientId: string,
    exerciseId: string,
    excludeSessionId: string,
  ): Promise<ExerciseLogWithSessionDate | null> {
    const logs = await this.prisma.exerciseLog.findMany({
      where: {
        sessionExercise: {
          exerciseId,
          sessionId: { not: excludeSessionId },
          session: { mesocycle: { trainingPlan: { clientId } } },
        },
      },
      include: { sessionExercise: { include: { session: { select: { date: true } } } } },
    });
    if (logs.length === 0) return null;
    logs.sort((a, b) => {
      const dateDiff =
        b.sessionExercise.session.date.getTime() - a.sessionExercise.session.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.loggedAt.getTime() - a.loggedAt.getTime();
    });
    const best = logs[0]!;
    const { sessionExercise: _sessionExercise, ...log } = best;
    return { ...log, sessionDate: best.sessionExercise.session.date };
  }
}
