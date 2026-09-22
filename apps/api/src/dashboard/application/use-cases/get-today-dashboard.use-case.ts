import { Inject, Injectable } from "@nestjs/common";
import { LinkStatus, Role } from "@prisma/client";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../../relationships/domain/ports/check-in-schedule.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../../relationships/domain/ports/link.repository.port";
import { GetTodaySessionUseCase } from "../../../client-training-execution/application/use-cases/get-today-session.use-case";
import { GetDailyFoodDiaryUseCase } from "../../../nutrition/application/use-cases/get-daily-food-diary.use-case";
import { GetTodayUseCase } from "../../../productivity/application/use-cases/get-today.use-case";
import { ListMyThreadsUseCase } from "../../../messaging/application/use-cases/list-my-threads.use-case";
import { nearestCheckIn } from "../../domain/weekly-summary";

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// PRD 09 §5.1 — the Client's landing screen. Every fact is read live from
// its owning module's own use-case/repository (§3 Non-Goals: no duplicated
// data model here) — this use-case only composes the calls and shapes one
// response, the "single aggregating API call" §7 asks for instead of the
// frontend firing five requests per load.
@Injectable()
export class GetTodayDashboardUseCase {
  constructor(
    private readonly getTodaySession: GetTodaySessionUseCase,
    private readonly getDailyDiary: GetDailyFoodDiaryUseCase,
    private readonly getTodayProductivity: GetTodayUseCase,
    private readonly listMyThreads: ListMyThreadsUseCase,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly checkInSchedules: CheckInScheduleRepository,
  ) {}

  async execute(input: { clientId: string; now: Date }) {
    const today = todayIso(input.now);

    const [training, nutrition, productivity, threads, checkInDue] =
      await Promise.all([
        this.getTodaySession.execute({ clientId: input.clientId, now: input.now }),
        this.getDailyDiary.execute({
          viewer: { id: input.clientId, role: Role.CLIENT },
          clientId: input.clientId,
          date: today,
          nowHour: input.now.getUTCHours(),
        }),
        this.getTodayProductivity.execute({ clientId: input.clientId, today }),
        this.listMyThreads.execute({
          viewer: { id: input.clientId, role: Role.CLIENT },
        }),
        this.nextCheckInDue(input.clientId),
      ]);

    const unreadThreads = threads.filter((t) => t.unreadCount > 0);

    return {
      training,
      nutrition,
      habits: productivity.habits,
      tasks: productivity.tasks,
      messages: {
        unreadTotal: unreadThreads.reduce((sum, t) => sum + t.unreadCount, 0),
        unreadThreads,
      },
      checkInDue,
    };
  }

  // Walks the Client's own ACTIVE links -> their ACTIVE check-in schedules,
  // same ownership shape PRD 02's ListCheckInSchedulesUseCase uses for a
  // single link — here fanned out across every active link since the
  // dashboard has no linkId of its own to scope by.
  private async nextCheckInDue(clientId: string): Promise<string | null> {
    const activeLinks = (await this.links.listForClient(clientId)).filter(
      (l) => l.status === LinkStatus.ACTIVE,
    );
    const schedules = (
      await Promise.all(activeLinks.map((l) => this.checkInSchedules.listByLink(l.id)))
    ).flat();
    return nearestCheckIn(
      schedules.map((s) => ({
        status: s.status,
        nextDueAt: s.nextDueAt ? s.nextDueAt.toISOString() : null,
      })),
    );
  }
}
