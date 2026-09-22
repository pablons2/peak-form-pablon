import { Injectable } from "@nestjs/common";
import type { BodyAssessment, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  BodyAssessmentRepository,
  CreateBodyAssessmentData,
} from "../domain/ports/body-assessment.repository.port";

@Injectable()
export class PrismaBodyAssessmentRepository implements BodyAssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBodyAssessmentData): Promise<BodyAssessment> {
    return this.prisma.bodyAssessment.create({
      data: {
        clientId: data.clientId,
        source: data.source,
        validatedById: data.validatedById ?? null,
        recordedAt: data.recordedAt,
        protocolVersion: data.protocolVersion ?? null,
        weight: data.weight,
        height: data.height ?? null,
        bmi: data.bmi ?? null,
        circumferences: (data.circumferences ??
          undefined) as Prisma.InputJsonValue | undefined,
        waistHipRatio: data.waistHipRatio ?? null,
        skinfolds: (data.skinfolds ??
          undefined) as Prisma.InputJsonValue | undefined,
        bodyFatPercent: data.bodyFatPercent ?? null,
        bodyFatSource: data.bodyFatSource ?? null,
        bodyFatOverrideNote: data.bodyFatOverrideNote ?? null,
        postureScreening: (data.postureScreening ??
          undefined) as Prisma.InputJsonValue | undefined,
        photos: (data.photos ?? undefined) as Prisma.InputJsonValue | undefined,
        goalType: data.goalType ?? null,
        goalTargetValue: data.goalTargetValue ?? null,
        goalTargetDate: data.goalTargetDate ?? null,
        goalNote: data.goalNote ?? null,
        note: data.note ?? null,
      },
    });
  }

  listForClient(clientId: string): Promise<BodyAssessment[]> {
    return this.prisma.bodyAssessment.findMany({
      where: { clientId },
      orderBy: { recordedAt: "asc" },
    });
  }

  findLatestForClient(clientId: string): Promise<BodyAssessment | null> {
    return this.prisma.bodyAssessment.findFirst({
      where: { clientId },
      orderBy: { recordedAt: "desc" },
    });
  }

  findLatestWithHeightForClient(clientId: string): Promise<BodyAssessment | null> {
    return this.prisma.bodyAssessment.findFirst({
      where: { clientId, height: { not: null } },
      orderBy: { recordedAt: "desc" },
    });
  }
}
