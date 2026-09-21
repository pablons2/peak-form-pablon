import { Injectable } from "@nestjs/common";
import { IntakeStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateIntakeData,
  IntakeRepository,
  IntakeWithAnnotations,
  UpdateIntakeData,
} from "../domain/ports/intake.repository.port";

const WITH_ANNOTATIONS = {
  painFlags: true,
  annotations: {
    orderBy: { createdAt: "asc" },
    include: {
      professional: { select: { id: true, fullName: true, email: true } },
    },
  },
} satisfies Prisma.IntakeAssessmentInclude;

@Injectable()
export class PrismaIntakeRepository implements IntakeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<IntakeWithAnnotations | null> {
    return this.prisma.intakeAssessment.findUnique({
      where: { id },
      include: WITH_ANNOTATIONS,
    });
  }

  findDraftForClient(clientId: string): Promise<IntakeWithAnnotations | null> {
    return this.prisma.intakeAssessment.findFirst({
      where: { clientId, status: IntakeStatus.IN_PROGRESS },
      orderBy: { version: "desc" },
      include: WITH_ANNOTATIONS,
    });
  }

  listVersionsForClient(clientId: string): Promise<IntakeWithAnnotations[]> {
    return this.prisma.intakeAssessment.findMany({
      where: { clientId },
      orderBy: { version: "desc" },
      include: WITH_ANNOTATIONS,
    });
  }

  async create(data: CreateIntakeData): Promise<IntakeWithAnnotations> {
    const agg = await this.prisma.intakeAssessment.aggregate({
      where: { clientId: data.clientId },
      _max: { version: true },
    });
    const version = (agg._max.version ?? 0) + 1;
    return this.prisma.intakeAssessment.create({
      data: { clientId: data.clientId, version, status: IntakeStatus.IN_PROGRESS },
      include: WITH_ANNOTATIONS,
    });
  }

  update(id: string, data: UpdateIntakeData): Promise<IntakeWithAnnotations> {
    const { painFlags, ...fields } = data;
    return this.prisma.intakeAssessment.update({
      where: { id },
      data: {
        ...(fields as Prisma.IntakeAssessmentUpdateInput),
        // Full replace, same "set" semantics as PRD 05's
        // Exercise.contraindicationTags — a write that omits a previously
        // flagged region must actually remove it.
        ...(painFlags
          ? { painFlags: { deleteMany: {}, create: painFlags } }
          : {}),
      },
      include: WITH_ANNOTATIONS,
    });
  }

  async addAnnotation(intakeAssessmentId: string, professionalId: string, note: string) {
    return this.prisma.professionalAnnotation.create({
      data: { intakeAssessmentId, professionalId, note },
      include: {
        professional: { select: { id: true, fullName: true, email: true } },
      },
    });
  }
}
