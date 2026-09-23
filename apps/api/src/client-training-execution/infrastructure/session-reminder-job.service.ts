import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { RunSessionReminderJobUseCase } from "../application/use-cases/run-session-reminder-job.use-case";

// PRD 12 §5.1 — Infrastructure-layer scheduled job, same shape/interval as
// PRD 07's MissedSessionJobService (which it sits next to). Disabled when
// SESSION_REMINDER_SCHEDULER_DISABLED=1 (BDD suites invoke the use-case
// directly for determinism).
const CHECK_INTERVAL_MS = 60_000;

@Injectable()
export class SessionReminderJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionReminderJobService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly runJob: RunSessionReminderJobUseCase) {}

  onModuleInit(): void {
    if (process.env.SESSION_REMINDER_SCHEDULER_DISABLED === "1") return;
    this.timer = setInterval(() => {
      this.runJob
        .execute({ now: new Date() })
        .catch((err: unknown) =>
          this.logger.error(
            "Session-reminder job failed",
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
