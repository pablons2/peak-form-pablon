import { Inject, Injectable } from "@nestjs/common";
import { LinkStatus } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../../relationships/domain/ports/link.repository.port";
import {
  DOMAIN_EVENT_BUS,
  WEEKLY_SUMMARY_READY,
  type DomainEventBus,
  type WeeklySummaryReadyPayload,
} from "../../../shared/domain-events/domain-event-bus.port";

// PRD 12 §5.1's "weekly summary ready" trigger — owned here because PRD 09
// owns the summary semantics. Fires once per ISO Monday (UTC): the
// notification announces the just-finished rolling 7-day window, the same
// "week" definition weekly-summary.ts/PRD 08's adherence already use, and
// `weekStart` is that window's first day (7 days before `now`).
//
// Candidates are Clients with >= 1 ACTIVE ProfessionalClientLink — the
// coaching relationship the summary exists to be shared across (PRD 09
// §5.2 "shown to both Client and Professional"). `professionalIds` carries
// every ACTIVE-linked professional of that client; the dispatcher notifies
// each (§5.1 "Client and Professional-facing"). Exactly-once per week is
// the dispatcher's `week:{clientId}:{weekStart}` dedupe key, not this job's.
@Injectable()
export class RunWeeklySummaryReadyJobUseCase {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { now: Date }) {
    const { now } = input;
    if (now.getUTCDay() !== 1) {
      return { emittedCount: 0, clientIds: [] as string[] };
    }

    const weekStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        7 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);

    const all = await this.links.listAll();
    const professionalsByClient = new Map<string, string[]>();
    for (const link of all) {
      if (link.status !== LinkStatus.ACTIVE) continue;
      const list = professionalsByClient.get(link.clientId) ?? [];
      list.push(link.professionalId);
      professionalsByClient.set(link.clientId, list);
    }

    const clientIds: string[] = [];
    for (const [clientId, professionalIds] of professionalsByClient) {
      const payload: WeeklySummaryReadyPayload = {
        clientId,
        professionalIds,
        weekStart,
      };
      await this.events.emit({ name: WEEKLY_SUMMARY_READY, payload });
      clientIds.push(clientId);
    }
    return { emittedCount: clientIds.length, clientIds };
  }
}
