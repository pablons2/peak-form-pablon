import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CheckInScheduleStatus } from "@prisma/client";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../domain/ports/check-in-schedule.repository.port";

// PRD 02 §5.6 — cancelling stops future firings without deleting the
// schedule's history (status → CANCELLED, row kept).
@Injectable()
export class CancelCheckInScheduleUseCase {
  constructor(
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
  ) {}

  async execute(input: { professionalId: string; scheduleId: string }) {
    const schedule = await this.schedules.findById(input.scheduleId);
    if (!schedule) throw new NotFoundException("Check-in schedule not found");
    if (schedule.createdById !== input.professionalId) {
      throw new ForbiddenException(
        "You can only cancel check-in schedules you created",
      );
    }
    if (schedule.status !== CheckInScheduleStatus.ACTIVE) {
      throw new ConflictException(
        `Only an ACTIVE schedule can be cancelled (status: ${schedule.status})`,
      );
    }
    return this.schedules.update(schedule.id, {
      status: CheckInScheduleStatus.CANCELLED,
    });
  }
}
