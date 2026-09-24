import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import {
  APPROVAL_DECISION,
  CHECK_IN_DUE,
  DOMAIN_EVENT_BUS,
  MISSED_FOOD_LOG,
  MISSED_SESSION,
  NEW_MESSAGE,
  PLAN_UPDATED,
  SESSION_REMINDER,
  TRAINING_PLAN_CREATED,
  WEEKLY_SUMMARY_READY,
  type ApprovalDecisionPayload,
  type CheckInDuePayload,
  type DomainEventBus,
  type MissedFoodLogPayload,
  type MissedSessionPayload,
  type NewMessagePayload,
  type PlanUpdatedPayload,
  type SessionReminderPayload,
  type TrainingPlanCreatedPayload,
  type WeeklySummaryReadyPayload,
} from "../../shared/domain-events/domain-event-bus.port";
import { DispatchNotificationUseCase } from "../application/use-cases/dispatch-notification.use-case";
import {
  USER_DIRECTORY,
  type UserDirectory,
} from "../domain/ports/user-directory.port";

type DispatchInput = {
  recipientUserId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
};

// PRD 12 §5.4 — the Infrastructure-layer subscriber that turns each owning
// module's domain event into per-recipient dispatches. Same shape as PRD
// 11's LinkStatusChangedListener: a thin adapter around the Application
// use-case, and every handler catches-and-logs rather than letting a
// delivery failure fail the user's original action (accept link, send
// message, approve professional).
@Injectable()
export class NotificationEventListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    @Inject(DOMAIN_EVENT_BUS) private readonly bus: DomainEventBus,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectory,
    private readonly dispatch: DispatchNotificationUseCase,
  ) {}

  onModuleInit(): void {
    this.subscribe(SESSION_REMINDER, (p) => {
      const payload = p as SessionReminderPayload;
      return [
        {
          recipientUserId: payload.clientId,
          type: NotificationType.SESSION_REMINDER,
          payload: { ...payload },
        },
      ];
    });

    this.subscribe(MISSED_SESSION, (p) => {
      const payload = p as MissedSessionPayload;
      // §5.1 — Client-facing; the "optional digest to the linked
      // Professional" is §8's deferred digest-bundling, not a per-event fan-out.
      return [
        {
          recipientUserId: payload.clientId,
          type: NotificationType.MISSED_SESSION,
          payload: { ...payload },
        },
      ];
    });

    this.subscribe(MISSED_FOOD_LOG, (p) => {
      const payload = p as MissedFoodLogPayload;
      return [
        {
          recipientUserId: payload.clientId,
          type: NotificationType.MISSED_FOOD_LOG,
          payload: { ...payload },
        },
      ];
    });

    this.subscribe(NEW_MESSAGE, async (p) => {
      const payload = p as NewMessagePayload;
      const senderName = await this.users.findDisplayName(payload.senderId);
      return [
        {
          recipientUserId: payload.recipientId,
          type: NotificationType.NEW_MESSAGE,
          payload: { ...payload, senderName: senderName ?? undefined },
        },
      ];
    });

    this.subscribe(PLAN_UPDATED, (p) => {
      const payload = p as PlanUpdatedPayload;
      return [
        {
          recipientUserId: payload.clientId,
          type: NotificationType.PLAN_UPDATED,
          payload: { ...payload },
        },
      ];
    });

    this.subscribe(WEEKLY_SUMMARY_READY, (p) => {
      const payload = p as WeeklySummaryReadyPayload;
      // §5.1 — Client and Professional-facing: one notification each.
      return [
        {
          recipientUserId: payload.clientId,
          type: NotificationType.WEEKLY_SUMMARY_READY,
          payload: { ...payload },
        },
        ...payload.professionalIds.map((professionalId) => ({
          recipientUserId: professionalId,
          type: NotificationType.WEEKLY_SUMMARY_READY,
          payload: { ...payload, forProfessional: true },
        })),
      ];
    });

    this.subscribe(CHECK_IN_DUE, (p) => {
      const payload = p as CheckInDuePayload;
      return [
        {
          recipientUserId: payload.clientId,
          type: NotificationType.CHECK_IN_DUE,
          payload: { ...payload, dueAt: payload.dueAt.toISOString() },
        },
      ];
    });

    this.subscribe(APPROVAL_DECISION, (p) => {
      const payload = p as ApprovalDecisionPayload;
      return [
        {
          recipientUserId: payload.professionalUserId,
          type: NotificationType.APPROVAL_DECISION,
          payload: { ...payload },
        },
      ];
    });
  }

  private subscribe(
    name: string,
    map: (payload: Record<string, unknown>) => DispatchInput[] | Promise<DispatchInput[]>,
  ): void {
    this.bus.on(name, async (event) => {
      try {
        const dispatches = await map(event.payload);
        for (const input of dispatches) {
          await this.dispatch.execute(input);
        }
      } catch (err) {
        this.logger.error(
          `Failed to dispatch ${name} notification`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    });
  }
}
