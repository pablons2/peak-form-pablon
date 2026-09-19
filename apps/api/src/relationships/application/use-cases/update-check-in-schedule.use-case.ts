import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CheckInCadence, CheckInScheduleType, CheckInScheduleStatus } from "@prisma/client";
import type { UpdateCheckInScheduleInput } from "@peakform/validation";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../domain/ports/check-in-schedule.repository.port";
import { computeNextDueDate } from "../../domain/compute-next-due-date";

// PRD 02 §5.6 — editing/cancelling. A Professional can edit an ACTIVE
// schedule's cadence/anchor/note (RECURRING) or dueDate/note (ONE_OFF) at
// any time; changing the cadence/anchor/dueDate recomputes nextDueAt from
// now via the Domain-layer pure function. Cancelling is a separate use-case.
@Injectable()
export class UpdateCheckInScheduleUseCase {
  constructor(
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
  ) {}

  async execute(input: {
    professionalId: string;
    scheduleId: string;
    data: UpdateCheckInScheduleInput;
  }) {
    const schedule = await this.schedules.findById(input.scheduleId);
    if (!schedule) throw new NotFoundException("Check-in schedule not found");
    if (schedule.createdById !== input.professionalId) {
      throw new ForbiddenException(
        "You can only edit check-in schedules you created",
      );
    }
    if (schedule.status !== CheckInScheduleStatus.ACTIVE) {
      throw new ConflictException(
        "Only an ACTIVE schedule can be edited — create a new one instead",
      );
    }

    const cadence = input.data.cadence ?? schedule.cadence;
    const anchor = input.data.anchor ?? schedule.anchor;
    const dueDate = input.data.dueDate
      ? startOfDayUtc(input.data.dueDate)
      : schedule.dueDate;

    // Re-validate the merged cadence/anchor combination.
    if (schedule.type === CheckInScheduleType.RECURRING) {
      if (cadence === CheckInCadence.MONTHLY) {
        if (anchor == null || anchor < 1 || anchor > 31) {
          throw new BadRequestException(
            "MONTHLY anchor must be a day-of-month between 1 and 31",
          );
        }
      } else if (anchor == null || anchor < 0 || anchor > 6) {
        throw new BadRequestException(
          "WEEKLY/BIWEEKLY anchor must be a weekday 0-6 (Sunday=0)",
        );
      }
    } else if (dueDate && dueDate.getTime() <= Date.now()) {
      throw new BadRequestException("dueDate must be in the future");
    }

    // Only cadence/anchor/dueDate changes move the due date; a note-only
    // edit keeps the existing schedule untouched.
    const scheduleChanged =
      input.data.cadence !== undefined ||
      input.data.anchor !== undefined ||
      input.data.dueDate !== undefined;
    const nextDueAt = scheduleChanged
      ? schedule.type === CheckInScheduleType.RECURRING
        ? computeNextDueDate(cadence!, anchor!, new Date())
        : dueDate!
      : schedule.nextDueAt;

    return this.schedules.update(schedule.id, {
      cadence: cadence ?? null,
      anchor: anchor ?? null,
      dueDate: dueDate ?? null,
      nextDueAt,
    });
  }
}

function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
