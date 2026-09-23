import { Inject, Injectable } from "@nestjs/common";
import { ApprovalStatus, Role, UserStatus } from "@prisma/client";
import {
  computeTrainingAdherence,
  lastSevenDays,
  type SessionSummaryInput,
} from "../../../dashboard/domain/weekly-summary";
import { GetWeeklyAdherenceSummaryUseCase } from "../../../nutrition/application/use-cases/get-weekly-adherence-summary.use-case";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../../auth/domain/ports/user.repository.port";

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
}

// PRD 13 §5.6 — aggregate, non-per-client analytics. Deliberately reuses
// the exact same formulas every per-client view already shows rather than
// hand-rolling a second aggregate calculation that could drift from them:
// computeTrainingAdherence (PRD 09's dashboard/domain/weekly-summary) and
// GetWeeklyAdherenceSummaryUseCase (PRD 08's nutrition module — its
// NutritionAccess already lets ADMIN read any client unconditionally).
// "Active" Professionals additionally requires APPROVED — a PENDING/
// REJECTED Professional isn't part of the running practice yet/anymore.
@Injectable()
export class GetAdminAnalyticsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly weeklyNutritionAdherence: GetWeeklyAdherenceSummaryUseCase,
  ) {}

  async execute(input: { adminId: string; now: Date }) {
    const [clients, professionals] = await Promise.all([
      this.users.listAll({ role: Role.CLIENT, status: UserStatus.ACTIVE }),
      this.users.listAll({ role: Role.PROFESSIONAL, status: UserStatus.ACTIVE }),
    ]);

    const activeProfessionals = professionals.filter(
      (p) => p.professionalProfile?.approvalStatus === ApprovalStatus.APPROVED,
    );
    const bySpecialization: Record<string, number> = {};
    for (const pro of activeProfessionals) {
      for (const spec of pro.professionalProfile?.specializations ?? []) {
        bySpecialization[spec] = (bySpecialization[spec] ?? 0) + 1;
      }
    }

    const today = input.now.toISOString().slice(0, 10);
    const days = lastSevenDays(today);
    const weekStart = days[0]!; // lastSevenDays always returns exactly 7 entries

    const [trainingPercents, nutritionPercents] = await Promise.all([
      Promise.all(
        clients.map(async (client) => {
          const allSessions = await this.sessions.listForClient(client.id);
          const thisWeek: SessionSummaryInput[] = allSessions
            .map((s) => ({
              date: s.date.toISOString().slice(0, 10),
              status: s.status as SessionSummaryInput["status"],
              tonnage: 0, // not needed for an adherence percent
            }))
            .filter((s) => s.date >= weekStart && s.date <= today);
          return computeTrainingAdherence(thisWeek).percent;
        }),
      ),
      Promise.all(
        clients.map(async (client) => {
          const summary = await this.weeklyNutritionAdherence.execute({
            viewer: { id: input.adminId, role: Role.ADMIN },
            clientId: client.id,
            now: input.now,
          });
          return summary.daysLogged > 0 ? summary.averageAdherencePercent : null;
        }),
      ),
    ]);

    return {
      activeClients: clients.length,
      activeProfessionals: {
        total: activeProfessionals.length,
        bySpecialization,
      },
      averageWeeklyTrainingAdherencePercent: average(trainingPercents),
      averageWeeklyNutritionAdherencePercent: average(nutritionPercents),
    };
  }
}
