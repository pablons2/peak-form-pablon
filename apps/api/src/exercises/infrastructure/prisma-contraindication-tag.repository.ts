import { Injectable } from "@nestjs/common";
import type { ContraindicationTag } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { ContraindicationTagRepository } from "../domain/ports/contraindication-tag.repository.port";

@Injectable()
export class PrismaContraindicationTagRepository
  implements ContraindicationTagRepository
{
  constructor(private readonly prisma: PrismaService) {}

  listAll(): Promise<ContraindicationTag[]> {
    return this.prisma.contraindicationTag.findMany({
      orderBy: { code: "asc" },
    });
  }

  async existingCodes(codes: string[]): Promise<Set<string>> {
    const rows = await this.prisma.contraindicationTag.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    return new Set(rows.map((r) => r.code));
  }
}
