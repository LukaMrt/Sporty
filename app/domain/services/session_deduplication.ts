import type { TrainingSession } from '#domain/entities/training_session'

/** Tolérance relative sur la durée et la distance */
const TOLERANCE = 0.1

function close(a: number, b: number): boolean {
  const ref = Math.max(a, b)
  return ref === 0 || Math.abs(a - b) / ref <= TOLERANCE
}

/**
 * Cherche parmi les séances du même jour une séance correspondant à la même sortie :
 * même sport, durée à ±10 % et, si les deux sont connues, distance à ±10 %.
 */
export function findDuplicateSession(
  candidate: { sportId: number; durationMinutes: number; distanceKm: number | null },
  sameDaySessions: Pick<TrainingSession, 'id' | 'sportId' | 'durationMinutes' | 'distanceKm'>[]
): Pick<TrainingSession, 'id'> | null {
  return (
    sameDaySessions.find(
      (s) =>
        s.sportId === candidate.sportId &&
        close(s.durationMinutes, candidate.durationMinutes) &&
        (s.distanceKm === null ||
          candidate.distanceKm === null ||
          close(s.distanceKm, candidate.distanceKm))
    ) ?? null
  )
}
