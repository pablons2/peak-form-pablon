import type { ClientIntake } from "@/features/relationships/api-client";
import type { PublicExercise } from "@/features/exercises/api-client";

/**
 * Hook to check if exercises are contraindicated for a client.
 *
 * Uses intake data (pain flags, medical conditions, contraindication tags)
 * and exercise contraindication codes to determine if an exercise is safe.
 *
 * Returns:
 * - contraindicatedExerciseIds: Array of exercise IDs that are contraindicated
 * - isContraindicated(exerciseId): Function to check if specific exercise is contraindicated
 * - getContraindicationReasons(exerciseId): Get reasons why exercise is contraindicated
 */
export function useContraindicationFilter(intake: ClientIntake | null) {
  const clientContraindicationCodes = intake?.contraindicationTagCodes ?? [];

  function isContraindicated(exercise: PublicExercise): boolean {
    if (!exercise.contraindicationTags || exercise.contraindicationTags.length === 0) {
      return false;
    }

    // Check if any of the exercise's contraindication tags match client's codes
    return exercise.contraindicationTags.some((tag) =>
      clientContraindicationCodes.includes(tag.code)
    );
  }

  function getContraindicationReasons(exercise: PublicExercise): string[] {
    if (!exercise.contraindicationTags) return [];

    return exercise.contraindicationTags
      .filter((tag) => clientContraindicationCodes.includes(tag.code))
      .map((tag) => tag.label);
  }

  return {
    isContraindicated,
    getContraindicationReasons,
    clientContraindicationCodes,
  };
}
