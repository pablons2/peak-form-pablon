import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { RunMissedSessionJobUseCase } from "../application/use-cases/run-missed-session-job.use-case";

// PRD 07 §5.4 — Infrastructure-layer scheduled job, same shape/interval as
// PRD 02's CheckInDueJobService. Disabled when
// MISSED_SESSION_SCHEDULER_DISABLED=1 (BDD suites invoke the use-case
// directly for determinism).
const CHECK_INTERVAL_MS = 60_000;

@Injectable()
export class MissedSessionJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MissedSessionJobService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly runJob: RunMissedSessionJobUseCase) {}

  onModuleInit(): void {
    if (process.env.MISSED_SESSION_SCHEDULER_DISABLED === "1") return;
    this.timer = setInterval(() => {
      this.runJob
        .execute({ now: new Date() })
        .catch((err: unknown) =>
          this.logger.error(
            "Missed-session job failed",
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
