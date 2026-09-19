import { Injectable } from "@nestjs/common";
import {
  LinkStatus,
  Specialization,
  type Prisma,
  type ProfessionalClientLink,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateLinkInput,
  LinkRepository,
  LinkUpdateData,
  LinkWithParties,
} from "../domain/ports/link.repository.port";

const WITH_PARTIES = {
  professional: true,
  client: true,
} satisfies Prisma.ProfessionalClientLinkInclude;

@Injectable()
export class PrismaLinkRepository implements LinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<LinkWithParties | null> {
    return this.prisma.professionalClientLink.findUnique({
      where: { id },
      include: WITH_PARTIES,
    });
  }

  findLatestByKey(
    professionalId: string,
    clientId: string,
    specialization: Specialization,
  ): Promise<ProfessionalClientLink | null> {
    return this.prisma.professionalClientLink.findFirst({
      where: { professionalId, clientId, specialization },
      orderBy: { createdAt: "desc" },
    });
  }

  findActiveForClient(
    clientId: string,
    specialization: Specialization,
  ): Promise<ProfessionalClientLink | null> {
    return this.prisma.professionalClientLink.findFirst({
      where: { clientId, specialization, status: LinkStatus.ACTIVE },
    });
  }

  create(input: CreateLinkInput): Promise<LinkWithParties> {
    return this.prisma.professionalClientLink.create({
      data: input,
      include: WITH_PARTIES,
    });
  }

  update(id: string, data: LinkUpdateData): Promise<LinkWithParties> {
    return this.prisma.professionalClientLink.update({
      where: { id },
      data,
      include: WITH_PARTIES,
    });
  }

  listForProfessional(professionalId: string): Promise<LinkWithParties[]> {
    return this.prisma.professionalClientLink.findMany({
      where: { professionalId },
      include: WITH_PARTIES,
      orderBy: { createdAt: "desc" },
    });
  }

  listForClient(clientId: string): Promise<LinkWithParties[]> {
    return this.prisma.professionalClientLink.findMany({
      where: { clientId },
      include: WITH_PARTIES,
      orderBy: { createdAt: "desc" },
    });
  }

  listAll(): Promise<LinkWithParties[]> {
    return this.prisma.professionalClientLink.findMany({
      include: WITH_PARTIES,
      orderBy: { createdAt: "desc" },
    });
  }

  async expireStalePending(now: Date): Promise<number> {
    const result = await this.prisma.professionalClientLink.updateMany({
      where: { status: LinkStatus.PENDING, expiresAt: { lt: now } },
      data: { status: LinkStatus.EXPIRED },
    });
    return result.count;
  }
}
