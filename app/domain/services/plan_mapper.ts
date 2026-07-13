import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'

/**
 * Reconstruit les GeneratedWeek d'un plan persisté (contexte de recalibration).
 * Ne garde que les semaines dont le numéro est >= fromWeekNumber.
 */
export function toGeneratedWeeks(
  weeks: PlannedWeek[],
  sessions: PlannedSession[],
  fromWeekNumber: number
): GeneratedWeek[] {
  return weeks
    .filter((w) => w.weekNumber >= fromWeekNumber)
    .map((w) => ({
      weekNumber: w.weekNumber,
      phaseName: w.phaseName,
      isRecoveryWeek: w.isRecoveryWeek,
      targetVolumeMinutes: w.targetVolumeMinutes,
      sessions: sessions
        .filter((s) => s.weekNumber === w.weekNumber)
        .map((s) => ({
          dayOfWeek: s.dayOfWeek,
          sessionType: s.sessionType,
          targetDurationMinutes: s.targetDurationMinutes,
          targetDistanceKm: s.targetDistanceKm,
          targetPacePerKm: s.targetPacePerKm,
          intensityZone: s.intensityZone,
          intervals: s.intervals,
          targetLoadTss: s.targetLoadTss ?? 0,
        })),
    }))
}
