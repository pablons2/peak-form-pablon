// PRD 06 §5.6 — cross-references an exercise's PRD 05 contraindicationTags
// against the Client's current intake contraindications profile (PRD 03).
// A match is a warning, never a hard block (§8 — "no hard-blocking in v1");
// the caller decides what to do with the returned codes (persist the
// prescription regardless, surface the warning, write the audit entry).
export function matchContraindications(
  exerciseTagCodes: string[],
  clientTagCodes: string[],
): string[] {
  const clientSet = new Set(clientTagCodes);
  return exerciseTagCodes.filter((code) => clientSet.has(code));
}
