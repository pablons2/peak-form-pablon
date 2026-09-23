import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import {
  registerPushSubscriptionSchema,
  unregisterPushSubscriptionSchema,
  updateNotificationPreferenceSchema,
  type RegisterPushSubscriptionInput,
  type UnregisterPushSubscriptionInput,
  type UpdateNotificationPreferenceInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { GetMyPreferencesUseCase } from "../application/use-cases/get-my-preferences.use-case";
import { ListMyNotificationsUseCase } from "../application/use-cases/list-my-notifications.use-case";
import { MarkAllNotificationsReadUseCase } from "../application/use-cases/mark-all-notifications-read.use-case";
import { MarkNotificationReadUseCase } from "../application/use-cases/mark-notification-read.use-case";
import { RegisterPushSubscriptionUseCase } from "../application/use-cases/register-push-subscription.use-case";
import { UnregisterPushSubscriptionUseCase } from "../application/use-cases/unregister-push-subscription.use-case";
import { UpdatePreferenceUseCase } from "../application/use-cases/update-preference.use-case";
import { PUSH_SENDER, type PushSender } from "../domain/ports/push-sender.port";
import { toPublicNotification } from "./notification.serializer";

// PRD 12 §4 — every authenticated role receives notifications and manages
// its own preferences, so all routes sit behind the global JWT guard only:
// no @Roles narrowing, and deliberately NO ApprovalStatusGuard — a PENDING
// or REJECTED professional is precisely who the APPROVAL_DECISION
// notification exists to reach (§5.1), so gating these routes on approval
// would hide it from its one intended audience.
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly listMy: ListMyNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAllRead: MarkAllNotificationsReadUseCase,
    private readonly getPreferences: GetMyPreferencesUseCase,
    private readonly updatePreference: UpdatePreferenceUseCase,
    private readonly registerPush: RegisterPushSubscriptionUseCase,
    private readonly unregisterPush: UnregisterPushSubscriptionUseCase,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
  ) {}

  // §7 — the caller's own in-app list + unread count (the dashboard bell's
  // badge reads the same endpoint).
  @Get()
  async listHandler(@CurrentUser() user: UserWithProfiles) {
    const { notifications, unreadCount } = await this.listMy.execute({
      userId: user.id,
    });
    return {
      notifications: notifications.map(toPublicNotification),
      unreadCount,
    };
  }

  @Patch(":id/read")
  async markReadHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    const notification = await this.markRead.execute({
      userId: user.id,
      notificationId: id,
    });
    return { notification: toPublicNotification(notification) };
  }

  @Post("read-all")
  async markAllReadHandler(@CurrentUser() user: UserWithProfiles) {
    return this.markAllRead.execute({ userId: user.id });
  }

  // §5.3 — the effective toggles for every preference-eligible type
  // (account-security types are deliberately absent — they have no
  // preference row, §5.1).
  @Get("preferences")
  async getPreferencesHandler(@CurrentUser() user: UserWithProfiles) {
    return { preferences: await this.getPreferences.execute({ userId: user.id }) };
  }

  @Put("preferences/:type")
  async updatePreferenceHandler(
    @Param("type") type: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateNotificationPreferenceSchema))
    body: UpdateNotificationPreferenceInput,
  ) {
    if (!Object.values(NotificationType).includes(type as NotificationType)) {
      throw new NotFoundException("Unknown notification type");
    }
    const preference = await this.updatePreference.execute({
      userId: user.id,
      type: type as NotificationType,
      emailEnabled: body.emailEnabled,
      pushEnabled: body.pushEnabled,
    });
    return { preference };
  }

  // §5.2 — the VAPID public key the browser needs to subscribe, wrapped so
  // a not-configured deployment returns `null` rather than a bare empty
  // body (the codebase's own maybe-null convention — see the PRD 08
  // checklist entry on bare nulls becoming empty HTTP bodies).
  @Get("push/public-key")
  pushPublicKeyHandler() {
    return { publicKey: this.pushSender.publicKey };
  }

  @HttpCode(201)
  @Post("push-subscriptions")
  async registerPushHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(registerPushSubscriptionSchema))
    body: RegisterPushSubscriptionInput,
  ) {
    await this.registerPush.execute({
      userId: user.id,
      endpoint: body.endpoint,
      keys: body.keys,
    });
    return { registered: true };
  }

  @Delete("push-subscriptions")
  async unregisterPushHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(unregisterPushSubscriptionSchema))
    body: UnregisterPushSubscriptionInput,
  ) {
    return this.unregisterPush.execute({
      userId: user.id,
      endpoint: body.endpoint,
    });
  }
}
