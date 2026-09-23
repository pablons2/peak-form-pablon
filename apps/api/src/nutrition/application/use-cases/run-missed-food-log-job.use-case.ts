import { Inject, Injectable } from "@nestjs/common";
import {
  DOMAIN_EVENT_BUS,
  MISSED_FOOD_LOG,
  type DomainEventBus,
  type MissedFoodLogPayload,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";

// PRD 12 §5.1's "missed food log" trigger — emitted by
// MissedFoodLogJobService's per-minute tick for every Client holding an
// ACTIVE NutritionPlan who logged zero FoodDiaryEntries *yesterday*
// (checking the completed day, never the in-progress one — a "you haven't
// logged lunch yet" nudge is PRD 08's computeNudges' job at request time;
// this notification is the "yesterday went entirely unlogged" one).
// Exactly-once-per-(client, day) is the dispatcher's dedupe key, not this
// job's concern.
@Injectable()
export class RunMissedFoodLogJobUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { now: Date }) {
    const today = new Date(
      Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()),
    );
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayISO = yesterday.toISOString().slice(0, 10);

    const clientIds = await this.nutrition.listActivePlanClientIds();
    const missed: string[] = [];
    for (const clientId of clientIds) {
      const count = await this.nutrition.countFoodDiaryEntriesOn(
        clientId,
        yesterdayISO,
      );
      if (count > 0) continue;
      const payload: MissedFoodLogPayload = { clientId, date: yesterdayISO };
      await this.events.emit({ name: MISSED_FOOD_LOG, payload });
      missed.push(clientId);
    }
    return { missedCount: missed.length, missedClientIds: missed };
  }
}
