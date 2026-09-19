import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { RunCheckInDueJobUseCase } from "../application/use-cases/run-check-in-due-job.use-case";

// PRD 02 §5.6 — Infrastructure-layer scheduled job. Ticks every minute and
// runs the firing use-case, which queries ACTIVE schedules whose nextDueAt
// has passed, emits CHECK_IN_DUE, and advances/fires them. Disabled when
// CHECK_IN_SCHEDULER_DISABLED=1 (BDD suites invoke the use-case directly so
// scenarios stay deterministic).
const CHECK_INTERVAL_MS = 60_000;

@Injectable()
export class CheckInDueJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CheckInDueJobService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly runJob: RunCheckInDueJobUseCase) {}

  onModuleInit(): void {
    if (process.env.CHECK_IN_SCHEDULER_DISABLED === "1") return;
    this.timer = setInterval(() => {
      this.runJob
        .execute({ now: new Date() })
        .catch((err: unknown) =>
          this.logger.error(
            "Check-in due job failed",
            err instanceof Error ? err.stack : String(err),
          ),
        );
    }, CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
