import { Inject, Injectable } from "@nestjs/common";
import {
  PREFERENCE_ELIGIBLE_TYPES,
  isEmailLocked,
} from "../../domain/notification-types";
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepository,
} from "../../domain/ports/notification-preference.repository.port";

// §5.3 — the effective preference for every preference-eligible type,
// stored rows merged over the defaults (both channels on). `emailLocked`
// tells the UI which email toggles must render disabled — enforced for
// real in UpdatePreferenceUseCase/dispatcher, the flag is just UX honesty.
@Injectable()
export class GetMyPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
  ) {}

  async execute(input: { userId: string }) {
    const stored = await this.preferences.listForUser(input.userId);
    const byType = new Map(stored.map((p) => [p.type, p]));
    return PREFERENCE_ELIGIBLE_TYPES.map((type) => {
      const row = byType.get(type);
      return {
        type,
        emailEnabled: isEmailLocked(type) ? true : (row?.emailEnabled ?? true),
        pushEnabled: row?.pushEnabled ?? true,
        emailLocked: isEmailLocked(type),
      };
    });
  }
}
