import { Injectable } from "@nestjs/common";
import {
  CheckInScheduleStatus,
  type CheckInSchedule,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CheckInScheduleRepository,
  CreateScheduleInput,
  ScheduleUpdateData,
  ScheduleWithLink,
} from "../domain/ports/check-in-schedule.repository.port";

// Schedule rows are always read together with their link's parties so the
// CHECK_IN_DUE event can name both sides without a second query.
const WITH_LINK = {
  link: { include: { professional: true, client: true } },
} satisfies Prisma.CheckInScheduleInclude;

@Injectable()
export class PrismaCheckInScheduleRepository
  implements CheckInScheduleRepository
{
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateScheduleInput): Promise<CheckInSchedule> {
    return this.prisma.checkInSchedule.create({ data: input });
  }

  findById(id: string): Promise<ScheduleWithLink | null> {
    return this.prisma.checkInSchedule.findUnique({
      where: { id },
      include: WITH_LINK,
    }) as Promise<ScheduleWithLink | null>;
  }

  listByLink(linkId: string): Promise<CheckInSchedule[]> {
    return this.prisma.checkInSchedule.findMany({
      where: { linkId },
      orderBy: [{ status: "asc" }, { nextDueAt: "asc" }],
    });
  }

  update(id: string, data: ScheduleUpdateData): Promise<CheckInSchedule> {
    return this.prisma.checkInSchedule.update({ where: { id }, data });
  }

  findDue(now: Date): Promise<ScheduleWithLink[]> {
    return this.prisma.checkInSchedule.findMany({
      where: {
        status: CheckInScheduleStatus.ACTIVE,
        nextDueAt: { lte: now },
      },
      include: WITH_LINK,
      orderBy: { nextDueAt: "asc" },
    });
  }

  claimDue(
    id: string,
    expectedNextDueAt: Date,
    data: {
      status?: CheckInScheduleStatus;
      nextDueAt?: Date | null;
      lastFiredAt?: Date;
    },
  ): Promise<CheckInSchedule | null> {
    // Guard on both status and the exact nextDueAt seen by the firing query —
    // a second job instance racing us finds the row already advanced or
    // cancelled and loses the claim (exactly-once firing per occurrence).
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.checkInSchedule.findFirst({
        where: {
          id,
          status: CheckInScheduleStatus.ACTIVE,
          nextDueAt: expectedNextDueAt,
        },
      });
      if (!current) return null;
      return tx.checkInSchedule.update({ where: { id }, data });
    });
  }

  async cancelActiveForLink(linkId: string): Promise<number> {
    const result = await this.prisma.checkInSchedule.updateMany({
      where: { linkId, status: CheckInScheduleStatus.ACTIVE },
      data: { status: CheckInScheduleStatus.CANCELLED },
    });
    return result.count;
  }
}
