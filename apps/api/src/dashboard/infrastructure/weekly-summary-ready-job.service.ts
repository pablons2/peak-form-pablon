import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { RunWeeklySummaryReadyJobUseCase } from "../application/use-cases/run-weekly-summary-ready-job.use-case";

// PRD 12 §5.1 — Infrastructure-layer scheduled job, same shape/interval as
// the codebase's other firing jobs. The use-case itself gates to Mondays;
// the tick just polls. Disabled when
// WEEKLY_SUMMARY_SCHEDULER_DISABLED=1 (BDD invokes the use-case directly).
const CHECK_INTERVAL_MS = 60_000;

@Injectable()
export class WeeklySummaryReadyJobService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WeeklySummaryReadyJobService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly runJob: RunWeeklySummaryReadyJobUseCase) {}

  onModuleInit(): void {
    if (process.env.WEEKLY_SUMMARY_SCHEDULER_DISABLED === "1") return;
    this.timer = setInterval(() => {
      this.runJob
        .execute({ now: new Date() })
        .catch((err: unknown) =>
          this.logger.error(
            "Weekly-summary-ready job failed",
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
