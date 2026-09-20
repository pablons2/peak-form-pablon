import type { ContraindicationTag } from "@prisma/client";

export const CONTRAINDICATION_TAG_REPOSITORY = Symbol(
  "CONTRAINDICATION_TAG_REPOSITORY",
);

/// Read access to the contraindication vocabulary this module owns (PRD 05
/// §6). PRD 03 will consume the same port when mapping intake answers to a
/// Client's contraindications profile.
export interface ContraindicationTagRepository {
  listAll(): Promise<ContraindicationTag[]>;
  /// Which of the given codes actually exist — used to validate incoming
  /// contraindicationCodes on exercise writes.
  existingCodes(codes: string[]): Promise<Set<string>>;
}
