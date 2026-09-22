// PRD 07 §5.3 — pure predicate for session auto-completion: a Session is
// COMPLETED once every prescribed exercise has at least one logged set per
// its own targetSets count. A Session with no prescribed exercises at all
// is never "complete" this way (there's nothing to have logged) — that
// shouldn't happen in practice (PRD 06 generation always copies at least
// the weekday template's exercises), but the function stays defensive
// rather than vacuously-true on an empty list.
export interface ExerciseSetProgress {
  sessionExerciseId: string;
  targetSets: number;
  loggedSets: number;
}

export function isSessionComplete(exercises: ExerciseSetProgress[]): boolean {
  if (exercises.length === 0) return false;
  return exercises.every((e) => e.loggedSets >= e.targetSets);
}
