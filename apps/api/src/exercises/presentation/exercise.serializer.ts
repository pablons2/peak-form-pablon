import type { ExerciseWithTags } from "../domain/ports/exercise.repository.port";

// Public wire shape for an exercise — shared by the browse/detail and admin
// controllers. Tags serialize with their display copy (label/description), so
// consumers render warnings in the user's language without a second lookup.
export function toPublicExercise(exercise: ExerciseWithTags) {
  return {
    id: exercise.id,
    name: exercise.name,
    mediaUrl: exercise.mediaUrl,
    muscleGroups: exercise.muscleGroups,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    cues: exercise.cues,
    mistakes: exercise.mistakes,
    visibility: exercise.visibility,
    ownerProfessionalId: exercise.ownerProfessionalId,
    sourceApiId: exercise.sourceApiId,
    createdAt: exercise.createdAt,
    contraindicationTags: exercise.contraindicationTags.map((t) => ({
      code: t.code,
      label: t.label,
      description: t.description,
    })),
    owner: exercise.ownerProfessional
      ? {
          id: exercise.ownerProfessional.id,
          fullName: exercise.ownerProfessional.fullName,
          email: exercise.ownerProfessional.email,
        }
      : null,
  };
}
