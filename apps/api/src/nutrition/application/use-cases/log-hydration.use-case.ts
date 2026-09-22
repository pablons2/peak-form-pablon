import { Inject, Injectable } from "@nestjs/common";
import type { HydrationLog } from "@prisma/client";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";

// PRD 08 §5.4 — the Client's own hydration counter, self-only. `date`
// defaults to today (caller-supplied so the use-case stays testable without
// mocking a clock).
@Injectable()
export class LogHydrationUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
  ) {}

  execute(input: {
    clientId: string;
    date: string;
    amount: number;
  }): Promise<HydrationLog> {
    return this.nutrition.incrementHydration(input.clientId, input.date, input.amount);
  }
}
