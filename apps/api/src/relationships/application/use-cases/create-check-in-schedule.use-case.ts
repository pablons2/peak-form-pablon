import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CheckInCadence,
  CheckInScheduleType,
  LinkStatus,
} from "@prisma/client";
import type { CreateCheckInScheduleInput } from "@peakform/validation";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../domain/ports/check-in-schedule.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";
import { computeNextDueDate } from "../../domain/compute-next-due-date";

// PRD 02 §5.6 — check-in scheduling. An APPROVED Professional creates a
// CheckInSchedule against one of their ACTIVE links:
//   ONE_OFF   — a single reminder for a specific date (dueDate required);
//   RECURRING — a cadence (WEEKLY/BIWEEKLY/MONTHLY) plus an anchor (weekday
//               0-6 for weekly/biweekly, day-of-month 1-31 for monthly);
//               nextDueAt is computed at creation time by the Domain-layer
//               pure function computeNextDueDate.
// Both types carry an optional free-text note shown to the Client.
@Injectable()
export class CreateCheckInScheduleUseCase {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
  ) {}

  async execute(input: {
    professionalId: string;
    linkId: string;
    data: CreateCheckInScheduleInput;
  }) {
    const link = await this.links.findById(input.linkId);
    if (!link) throw new NotFoundException("Link not found");
    if (link.professionalId !== input.professionalId) {
      throw new ForbiddenException(
        "You can only schedule check-ins for your own clients",
      );
    }
    if (link.status !== LinkStatus.ACTIVE) {
      throw new ConflictException(
        "Check-ins require an ACTIVE professional-client link",
      );
    }

    const resolved = resolveSchedule(input.data, new Date());

    return this.schedules.create({
      linkId: link.id,
      type: input.data.type,
      cadence: resolved.cadence ?? null,
      anchor: resolved.anchor ?? null,
      dueDate: resolved.dueDate ?? null,
      nextDueAt: resolved.nextDueAt,
      note: input.data.note ?? null,
      createdById: input.professionalId,
    });
  }
}

// Validates the cadence/anchor combination and computes the first due date.
// WEEKLY/BIWEEKLY anchor on a weekday (0-6); MONTHLY anchors on a
// day-of-month 1-31 (clamped to the month's length in date-math).
function resolveSchedule(
  data: CreateCheckInScheduleInput,
  now: Date,
): { nextDueAt: Date; cadence: CheckInCadence | null; anchor: number | null; dueDate: Date | null } {
  if (data.type === CheckInScheduleType.ONE_OFF) {
    const dueDate = startOfDayUtc(data.dueDate);
    if (dueDate.getTime() <= now.getTime()) {
      throw new BadRequestException("dueDate must be in the future");
    }
    return { nextDueAt: dueDate, cadence: null, anchor: null, dueDate };
  }

  if (data.cadence === CheckInCadence.MONTHLY) {
    if (data.anchor < 1 || data.anchor > 31) {
      throw new BadRequestException(
        "MONTHLY anchor must be a day-of-month between 1 and 31",
      );
    }
  } else if (data.anchor < 0 || data.anchor > 6) {
    throw new BadRequestException(
      "WEEKLY/BIWEEKLY anchor must be a weekday 0-6 (Sunday=0)",
    );
  }

  return {
    nextDueAt: computeNextDueDate(data.cadence, data.anchor, now),
    cadence: data.cadence,
    anchor: data.anchor,
    dueDate: null,
  };
}

function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
