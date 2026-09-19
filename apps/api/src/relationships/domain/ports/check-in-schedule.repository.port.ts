import type {
  CheckInCadence,
  CheckInSchedule,
  CheckInScheduleStatus,
  CheckInScheduleType,
} from "@prisma/client";
import type { LinkWithParties } from "./link.repository.port";

export const CHECK_IN_SCHEDULE_REPOSITORY = Symbol(
  "CHECK_IN_SCHEDULE_REPOSITORY",
);

export type ScheduleWithLink = CheckInSchedule & { link: LinkWithParties };

export interface CreateScheduleInput {
  linkId: string;
  type: CheckInScheduleType;
  cadence: CheckInCadence | null;
  anchor: number | null;
  dueDate: Date | null;
  nextDueAt: Date;
  note: string | null;
  createdById: string;
}

export interface ScheduleUpdateData {
  cadence?: CheckInCadence | null;
  anchor?: number | null;
  dueDate?: Date | null;
  nextDueAt?: Date | null;
  note?: string | null;
  status?: CheckInScheduleStatus;
  lastFiredAt?: Date | null;
}

export interface CheckInScheduleRepository {
  create(input: CreateScheduleInput): Promise<CheckInSchedule>;
  findById(id: string): Promise<ScheduleWithLink | null>;
  listByLink(linkId: string): Promise<CheckInSchedule[]>;
  update(id: string, data: ScheduleUpdateData): Promise<CheckInSchedule>;

  /// Firing query (PRD 02 §5.6): ACTIVE schedules whose nextDueAt has passed.
  findDue(now: Date): Promise<ScheduleWithLink[]>;

  /// Atomically claims a due schedule: only updates it if it is still ACTIVE
  /// with the expected nextDueAt, so exactly one concurrent job instance can
  /// fire a given occurrence. Returns the claimed row, or null if lost.
  claimDue(
    id: string,
    expectedNextDueAt: Date,
    data: {
      status?: CheckInScheduleStatus;
      nextDueAt?: Date | null;
      lastFiredAt?: Date;
    },
  ): Promise<CheckInSchedule | null>;

  /// PRD 02 §5.6 — unlink interaction: cancels every ACTIVE schedule tied to
  /// a link; returns how many were cancelled.
  cancelActiveForLink(linkId: string): Promise<number>;
}
