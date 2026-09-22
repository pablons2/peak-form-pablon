import { Inject, Injectable } from "@nestjs/common";
import {
  CheckInScheduleStatus,
  CheckInScheduleType,
} from "@prisma/client";
import {
  CHECK_IN_DUE,
  DOMAIN_EVENT_BUS,
  type CheckInDuePayload,
  type DomainEventBus,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../domain/ports/check-in-schedule.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";
import { computeNextDueDate } from "../../domain/compute-next-due-date";

// PRD 02 §5.6 — the firing job (invoked on an interval by the
// infrastructure-layer CheckInDueJobService). Queries ACTIVE schedules whose
// nextDueAt has passed and, for each match:
//   - emits exactly one CHECK_IN_DUE domain event (consumed by PRD 12's
//     Notification dispatcher — this module never talks to email/push);
//   - advances a RECURRING schedule's nextDueAt by its cadence via the
//     Domain-layer pure function computeNextDueDate;
//   - moves a ONE_OFF schedule to FIRED (the Professional creates a new
//     one-off for another reminder).
// Each occurrence is claimed atomically (guard on status + exact nextDueAt)
// so exactly one event is emitted even if two job instances race.
@Injectable()
export class RunCheckInDueJobUseCase {
  constructor(
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { now: Date }) {
    const now = input.now;

    // §5.1 — PENDING invites auto-expire after 30 days (lazy sweep).
    await this.links.expireStalePending(now);

    const due = await this.schedules.findDue(now);
    const fired: string[] = [];

    for (const schedule of due) {
      if (!schedule.nextDueAt) continue;

      const isRecurring =
        schedule.type === CheckInScheduleType.RECURRING;
      const claimed = await this.schedules.claimDue(
        schedule.id,
        schedule.nextDueAt,
        {
          status: isRecurring
            ? CheckInScheduleStatus.ACTIVE
            : CheckInScheduleStatus.FIRED,
          nextDueAt: isRecurring
            ? computeNextDueDate(
                schedule.cadence!,
                schedule.anchor!,
                now,
              )
            : schedule.nextDueAt,
          lastFiredAt: now,
        },
      );
      // Lost the claim — another job instance already fired this occurrence.
      if (!claimed) continue;

      const payload: CheckInDuePayload = {
        scheduleId: schedule.id,
        linkId: schedule.linkId,
        professionalId: schedule.link.professionalId,
        clientId: schedule.link.clientId,
        specialization: schedule.link.specialization,
        dueAt: schedule.nextDueAt,
        note: schedule.note,
      };
      await this.events.emit({ name: CHECK_IN_DUE, payload });
      fired.push(schedule.id);
    }

    return { firedCount: fired.length, firedScheduleIds: fired };
  }
}
