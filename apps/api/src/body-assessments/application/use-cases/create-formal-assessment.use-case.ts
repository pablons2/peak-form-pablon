import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  BodyAssessmentSource,
  BodyFatSource,
  Role,
  type BodyAssessment,
} from "@prisma/client";
import type { CreateFormalAssessmentInput } from "@peakform/validation";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../../auth/domain/ports/user.repository.port";
import {
  computeAgeYears,
  computeBmi,
  computeBodyDensityJacksonPollock7,
  computeBodyFatPercentSiri,
  computeWaistHipRatio,
  POLLOCK7_PROTOCOL_VERSION,
  sumSkinfoldsMm,
} from "../../domain/body-composition";
import {
  BODY_ASSESSMENT_REPOSITORY,
  type BodyAssessmentRepository,
} from "../../domain/ports/body-assessment.repository.port";
import { BodyAssessmentAccess } from "../body-assessment-access.service";

// PRD 04 §5.2 — the Professional's (or Admin's, §4) formal assessment: full
// Pollock 7-site protocol, server-computed BMI/WHR/%BF. Field order in the
// input DTO matches the physical-exam flow (§7): basic → circumferences →
// skinfolds → posture → goals.
@Injectable()
export class CreateFormalAssessmentUseCase {
  constructor(
    @Inject(BODY_ASSESSMENT_REPOSITORY)
    private readonly repo: BodyAssessmentRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly access: BodyAssessmentAccess,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    clientId: string;
    data: CreateFormalAssessmentInput;
  }): Promise<BodyAssessment> {
    await this.access.assertCanCreateFormal(input.actor, input.clientId);

    const client = await this.users.findById(input.clientId);
    if (!client || client.role !== Role.CLIENT) {
      throw new BadRequestException("Client not found");
    }
    // §5.2/§10 — missing-DOB/sex guard: reject rather than silently
    // computing an incorrect or default body-fat estimate. In this codebase
    // ClientProfile's dateOfBirth/biologicalSex are required-not-null once
    // the row exists (PRD 01 §6) — the only way either is "missing" is the
    // row not existing at all (e.g. a malformed/seeded account), so that's
    // the actual condition checked.
    if (!client.clientProfile) {
      throw new BadRequestException(
        "This client's date of birth and biological sex must be on file before a formal assessment can be computed",
      );
    }

    const { data } = input;
    const recordedAt = new Date();
    const ageYears = computeAgeYears(
      client.clientProfile.dateOfBirth,
      recordedAt,
    );

    let bodyFatPercent: number | null = null;
    let bodyFatSource: BodyFatSource | null = null;
    let bodyFatOverrideNote: string | null = null;
    if (data.bodyFatOverride) {
      bodyFatPercent = data.bodyFatOverride.percent;
      bodyFatSource = BodyFatSource.MANUAL_OVERRIDE;
      bodyFatOverrideNote = data.bodyFatOverride.note;
    } else if (data.skinfolds) {
      const sum7 = sumSkinfoldsMm(data.skinfolds);
      const bodyDensity = computeBodyDensityJacksonPollock7({
        sum7Mm: sum7,
        ageYears,
        biologicalSex: client.clientProfile.biologicalSex,
      });
      bodyFatPercent = computeBodyFatPercentSiri(bodyDensity);
      bodyFatSource = BodyFatSource.COMPUTED_POLLOCK7;
    }

    const bmi = computeBmi(data.weight, data.height);
    const waistHipRatio =
      data.circumferences?.waist != null && data.circumferences?.hip != null
        ? computeWaistHipRatio(data.circumferences.waist, data.circumferences.hip)
        : null;

    return this.repo.create({
      clientId: input.clientId,
      source: BodyAssessmentSource.PROFESSIONAL_VALIDATED,
      validatedById: input.actor.id,
      recordedAt,
      protocolVersion: POLLOCK7_PROTOCOL_VERSION,
      weight: data.weight,
      height: data.height,
      bmi,
      circumferences: data.circumferences ?? null,
      waistHipRatio,
      skinfolds: data.skinfolds ?? null,
      bodyFatPercent,
      bodyFatSource,
      bodyFatOverrideNote,
      postureScreening: data.postureScreening ?? null,
      photos: data.photos ?? null,
      goalType: data.goal?.goalType ?? null,
      goalTargetValue: data.goal?.goalTargetValue ?? null,
      goalTargetDate: data.goal?.goalTargetDate ?? null,
      goalNote: data.goal?.goalNote ?? null,
    });
  }
}
