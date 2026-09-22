import type { BodyAssessment } from "@prisma/client";
import type { SignedMediaStore } from "../domain/ports/signed-media-store.port";
import type { PhotoRef } from "../domain/ports/body-assessment.repository.port";

// PRD 04 §5.7 — the DB only ever stores object keys; a signed, time-limited
// GET URL is minted here, at serialize time, for every response that
// includes photos. Never cached/stored.
async function resolvePhotos(
  entity: BodyAssessment,
  store: SignedMediaStore,
): Promise<Array<{ tag: string; url: string }>> {
  const photos = Array.isArray(entity.photos)
    ? (entity.photos as unknown as PhotoRef[])
    : [];
  return Promise.all(
    photos.map(async (p) => ({ tag: p.tag, url: await store.createDownloadUrl(p.key) })),
  );
}

export async function toPublicBodyAssessment(
  entity: BodyAssessment,
  store: SignedMediaStore,
) {
  return {
    id: entity.id,
    clientId: entity.clientId,
    source: entity.source,
    validatedById: entity.validatedById,
    recordedAt: entity.recordedAt,
    protocolVersion: entity.protocolVersion,
    weight: entity.weight,
    height: entity.height,
    bmi: entity.bmi,
    circumferences: entity.circumferences,
    waistHipRatio: entity.waistHipRatio,
    skinfolds: entity.skinfolds,
    bodyFatPercent: entity.bodyFatPercent,
    bodyFatSource: entity.bodyFatSource,
    bodyFatOverrideNote: entity.bodyFatOverrideNote,
    postureScreening: entity.postureScreening,
    photos: await resolvePhotos(entity, store),
    goalType: entity.goalType,
    goalTargetValue: entity.goalTargetValue,
    goalTargetDate: entity.goalTargetDate,
    goalNote: entity.goalNote,
    note: entity.note,
    createdAt: entity.createdAt,
  };
}

export function toPublicBodyAssessments(
  entities: BodyAssessment[],
  store: SignedMediaStore,
) {
  return Promise.all(entities.map((e) => toPublicBodyAssessment(e, store)));
}
