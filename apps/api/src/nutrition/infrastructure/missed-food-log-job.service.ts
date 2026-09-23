import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { RunMissedFoodLogJobUseCase } from "../application/use-cases/run-missed-food-log-job.use-case";

// PRD 12 §5.1 — Infrastructure-layer scheduled job, same shape/interval as
// the codebase's other firing jobs (CheckInDueJobService et al.). Disabled
// when MISSED_FOOD_LOG_SCHEDULER_DISABLED=1 (BDD invokes the use-case
// directly for determinism).
const CHECK_INTERVAL_MS = 60_000;

@Injectable()
export class MissedFoodLogJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MissedFoodLogJobService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly runJob: RunMissedFoodLogJobUseCase) {}

  onModuleInit(): void {
    if (process.env.MISSED_FOOD_LOG_SCHEDULER_DISABLED === "1") return;
    this.timer = setInterval(() => {
      this.runJob
        .execute({ now: new Date() })
        .catch((err: unknown) =>
          this.logger.error(
            "Missed-food-log job failed",
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
