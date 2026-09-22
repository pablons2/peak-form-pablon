import { Inject, Injectable } from "@nestjs/common";
import {
  BODY_ASSESSMENT_REPOSITORY,
  type BodyAssessmentRepository,
} from "../../../body-assessments/domain/ports/body-assessment.repository.port";
import { ListMySessionsUseCase } from "../../../client-training-execution/application/use-cases/list-my-sessions.use-case";
import type { SessionExecutionView } from "../../../client-training-execution/application/session-execution-composer.service";
import {
  computeTrainingAdherence,
  computeVolumeTrend,
  computeWeekStrip,
  computeWeightTrend,
  lastSevenDays,
  type SessionSummaryInput,
} from "../../domain/weekly-summary";

function toSummary(session: SessionExecutionView): SessionSummaryInput {
  const tonnage = session.exercises.reduce(
    (sum, e) =>
      sum +
      e.logs.reduce((s, log) => s + (log.actualLoad ?? 0) * log.actualReps, 0),
    0,
  );
  return {
    date: session.date.toISOString().slice(0, 10),
    status: session.status as SessionSummaryInput["status"],
    tonnage,
  };
}

// PRD 09 §5.2/§6 — the 7-day strip + weekly summary card. Reuses
// ListMySessionsUseCase's full history (the same query/composition PRD 07's
// own "/training-execution/sessions" route uses) rather than adding a new
// date-ranged repository query — this module introduces no new persisted
// query surface, only a read-side filter/reduction over data the owning
// module already exposes.
@Injectable()
export class GetWeekDashboardUseCase {
  constructor(
    private readonly listMySessions: ListMySessionsUseCase,
    @Inject(BODY_ASSESSMENT_REPOSITORY)
    private readonly bodyAssessments: BodyAssessmentRepository,
  ) {}

  async execute(input: { clientId: string; now: Date }) {
    const today = input.now.toISOString().slice(0, 10);
    const days = lastSevenDays(today);
    const weekStart = days[0]!; // lastSevenDays always returns exactly 7 entries
    const priorWeekStart = lastSevenDays(weekStart)[0]!;

    const [allSessions, assessments] = await Promise.all([
      this.listMySessions.execute({ clientId: input.clientId }),
      this.bodyAssessments.listForClient(input.clientId),
    ]);

    const summaries = allSessions.map(toSummary);
    const thisWeek = summaries.filter((s) => s.date >= weekStart && s.date <= today);
    const priorWeek = summaries.filter(
      (s) => s.date >= priorWeekStart && s.date < weekStart,
    );

    return {
      strip: computeWeekStrip(thisWeek, days),
      trainingAdherence: computeTrainingAdherence(thisWeek),
      volumeTrend: computeVolumeTrend(thisWeek, priorWeek),
      weightTrend: computeWeightTrend(
        assessments.map((a) => ({
          recordedAt: a.recordedAt.toISOString(),
          weight: a.weight,
        })),
        weekStart,
      ),
    };
  }
}
