import { Injectable } from "@nestjs/common";
import {
  ExerciseVisibility,
  type Prisma,
  type Exercise,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateExerciseData,
  ExerciseRepository,
  ExerciseSearchFilters,
  ExerciseVisibilityScope,
  ExerciseWithTags,
  UpdateExerciseData,
} from "../domain/ports/exercise.repository.port";

const WITH_TAGS = {
  contraindicationTags: true,
  ownerProfessional: {
    select: { id: true, fullName: true, email: true },
  },
} satisfies Prisma.ExerciseInclude;

@Injectable()
export class PrismaExerciseRepository implements ExerciseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ExerciseWithTags | null> {
    return this.prisma.exercise.findUnique({
      where: { id },
      include: WITH_TAGS,
    });
  }

  findBySourceApiId(sourceApiId: string): Promise<Exercise | null> {
    return this.prisma.exercise.findUnique({ where: { sourceApiId } });
  }

  search(
    scope: ExerciseVisibilityScope,
    filters: ExerciseSearchFilters,
  ): Promise<ExerciseWithTags[]> {
    const where: Prisma.ExerciseWhereInput = {
      AND: [
        scope.unrestricted
          ? {}
          : {
              OR: [
                { visibility: ExerciseVisibility.GLOBAL },
                { ownerProfessionalId: { in: scope.privateOwnerIds } },
              ],
            },
        filters.q
          ? { name: { contains: filters.q, mode: "insensitive" } }
          : {},
        filters.muscleGroup
          ? { muscleGroups: { has: filters.muscleGroup } }
          : {},
        filters.equipment ? { equipment: { has: filters.equipment } } : {},
        filters.difficulty ? { difficulty: filters.difficulty } : {},
        filters.visibility ? { visibility: filters.visibility } : {},
        filters.ownerId ? { ownerProfessionalId: filters.ownerId } : {},
      ],
    };
    return this.prisma.exercise.findMany({
      where,
      include: WITH_TAGS,
      orderBy: { name: "asc" },
    });
  }

  create(data: CreateExerciseData): Promise<ExerciseWithTags> {
    const { contraindicationCodes, ...fields } = data;
    return this.prisma.exercise.create({
      data: {
        ...fields,
        contraindicationTags: {
          connect: contraindicationCodes.map((code) => ({ code })),
        },
      },
      include: WITH_TAGS,
    });
  }

  update(id: string, data: UpdateExerciseData): Promise<ExerciseWithTags> {
    const { contraindicationCodes, ...fields } = data;
    return this.prisma.exercise.update({
      where: { id },
      data: {
        ...fields,
        // `set` replaces the tag list wholesale — a write that omits a code
        // must actually remove the link, not silently keep it.
        ...(contraindicationCodes
          ? {
              contraindicationTags: {
                set: contraindicationCodes.map((code) => ({ code })),
              },
            }
          : {}),
      },
      include: WITH_TAGS,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.exercise.delete({ where: { id } });
  }
}
