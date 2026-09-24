/**
 * Construction des séances Daniels : échauffement / retour au calme, séances
 * d'intervalles, tempo, répétitions, allure marathon, sortie longue, et
 * correspondance type de séance → zone d'intensité et allure cible.
 */
import type { IntervalBlock } from '#domain/entities/planned_session'
import type { PaceZones } from '#domain/value_objects/pace_zones'
import { SessionType, IntensityZone } from '#domain/value_objects/planning_types'
import type { DistanceCategory, PhaseName } from '#services/training/daniels/phases'

export function buildWarmup(paceZones: PaceZones): IntervalBlock {
  return {
    type: 'warmup',
    durationMinutes: 15,
    distanceMeters: null,
    targetPace: formatPace(midPace(paceZones.easy)),
    intensityZone: IntensityZone.Z1,
    repetitions: 1,
    recoveryDurationMinutes: null,
    recoveryType: null,
  }
}

export function buildCooldown(paceZones: PaceZones): IntervalBlock {
  return {
    type: 'cooldown',
    durationMinutes: 10,
    distanceMeters: null,
    targetPace: formatPace(midPace(paceZones.easy)),
    intensityZone: IntensityZone.Z1,
    repetitions: 1,
    recoveryDurationMinutes: null,
    recoveryType: null,
  }
}

export function buildIntervalSession(targetMinutes: number, paceZones: PaceZones): IntervalBlock[] {
  const workMinutes = targetMinutes - 25 // subtract warmup (15) + cooldown (10)
  const repDuration = 4 // 4 min reps (1000-1200m typical)
  const reps = Math.max(3, Math.round(workMinutes / (repDuration * 2))) // work + equal jog recovery
  return [
    buildWarmup(paceZones),
    {
      type: 'work',
      durationMinutes: repDuration,
      distanceMeters: 1000,
      targetPace: formatPace(paceZones.interval.minPacePerKm),
      intensityZone: IntensityZone.Z5,
      repetitions: reps,
      recoveryDurationMinutes: repDuration,
      recoveryType: 'jog',
    },
    buildCooldown(paceZones),
  ]
}

export function buildTempoSession(targetMinutes: number, paceZones: PaceZones): IntervalBlock[] {
  const tempoMinutes = Math.min(targetMinutes - 25, 40)
  if (tempoMinutes <= 20) {
    // Continuous tempo
    return [
      buildWarmup(paceZones),
      {
        type: 'work',
        durationMinutes: tempoMinutes,
        distanceMeters: null,
        targetPace: formatPace(paceZones.threshold.minPacePerKm),
        intensityZone: IntensityZone.Z4,
        repetitions: 1,
        recoveryDurationMinutes: null,
        recoveryType: null,
      },
      buildCooldown(paceZones),
    ]
  }
  // Cruise intervals
  const blockMinutes = 10
  const blocks = Math.round(tempoMinutes / blockMinutes)
  return [
    buildWarmup(paceZones),
    {
      type: 'work',
      durationMinutes: blockMinutes,
      distanceMeters: null,
      targetPace: formatPace(paceZones.threshold.minPacePerKm),
      intensityZone: IntensityZone.Z4,
      repetitions: blocks,
      recoveryDurationMinutes: 1,
      recoveryType: 'rest',
    },
    buildCooldown(paceZones),
  ]
}

export function buildRepetitionSession(
  targetMinutes: number,
  paceZones: PaceZones
): IntervalBlock[] {
  const reps = Math.max(4, Math.round((targetMinutes - 25) / 6)) // ~1.5min work + ~4.5min rest
  return [
    buildWarmup(paceZones),
    {
      type: 'work',
      durationMinutes: 1.5,
      distanceMeters: 400,
      targetPace: formatPace(paceZones.repetition.minPacePerKm),
      intensityZone: IntensityZone.Z5,
      repetitions: reps,
      recoveryDurationMinutes: 4,
      recoveryType: 'rest',
    },
    buildCooldown(paceZones),
  ]
}

export function buildMarathonPaceSession(
  targetMinutes: number,
  paceZones: PaceZones
): IntervalBlock[] {
  const mpMinutes = Math.min(targetMinutes - 25, 40)
  const blockMinutes = 15
  const blocks = Math.max(2, Math.round(mpMinutes / blockMinutes))
  return [
    buildWarmup(paceZones),
    {
      type: 'work',
      durationMinutes: blockMinutes,
      distanceMeters: null,
      targetPace: formatPace(paceZones.marathon.minPacePerKm),
      intensityZone: IntensityZone.Z3,
      repetitions: blocks,
      recoveryDurationMinutes: 2,
      recoveryType: 'jog',
    },
    buildCooldown(paceZones),
  ]
}

export function buildStrides(paceZones: PaceZones): IntervalBlock[] {
  return [
    {
      type: 'work',
      durationMinutes: 0.33, // ~20 seconds
      distanceMeters: 100,
      targetPace: formatPace(paceZones.repetition.minPacePerKm),
      intensityZone: IntensityZone.Z5,
      repetitions: 6,
      recoveryDurationMinutes: 1,
      recoveryType: 'rest',
    },
  ]
}

export function buildLongRunIntervals(
  durationMinutes: number,
  phase: PhaseName,
  distanceCategory: DistanceCategory,
  paceZones: PaceZones
): IntervalBlock[] | null {
  // FI/EQ: pure easy — no intervals needed
  if (phase === 'FI' || phase === 'EQ') return null

  if (phase === 'TQ') {
    // E + T finish (last 15-20min at tempo)
    const tempoMinutes = Math.min(20, Math.round(durationMinutes * 0.2))
    const easyMinutes = durationMinutes - tempoMinutes
    return [
      {
        type: 'work',
        durationMinutes: easyMinutes,
        distanceMeters: null,
        targetPace: formatPace(midPace(paceZones.easy)),
        intensityZone: IntensityZone.Z2,
        repetitions: 1,
        recoveryDurationMinutes: null,
        recoveryType: null,
      },
      {
        type: 'work',
        durationMinutes: tempoMinutes,
        distanceMeters: null,
        targetPace: formatPace(paceZones.threshold.minPacePerKm),
        intensityZone: IntensityZone.Z4,
        repetitions: 1,
        recoveryDurationMinutes: null,
        recoveryType: null,
      },
    ]
  }

  // FQ: E + M portions for half/marathon, reduced for 5K/10K
  if (distanceCategory === 'marathon' || distanceCategory === 'half') {
    const mpMinutes = Math.min(20, Math.round(durationMinutes * 0.25))
    const easyMinutes = durationMinutes - mpMinutes
    return [
      {
        type: 'work',
        durationMinutes: easyMinutes,
        distanceMeters: null,
        targetPace: formatPace(midPace(paceZones.easy)),
        intensityZone: IntensityZone.Z2,
        repetitions: 1,
        recoveryDurationMinutes: null,
        recoveryType: null,
      },
      {
        type: 'work',
        durationMinutes: mpMinutes,
        distanceMeters: null,
        targetPace: formatPace(paceZones.marathon.minPacePerKm),
        intensityZone: IntensityZone.Z3,
        repetitions: 1,
        recoveryDurationMinutes: null,
        recoveryType: null,
      },
    ]
  }

  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm)
  const secs = Math.round((paceMinPerKm - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function intensityForSession(type: SessionType): IntensityZone {
  switch (type) {
    case SessionType.Easy:
    case SessionType.LongRun:
    case SessionType.Recovery:
      return IntensityZone.Z2
    case SessionType.MarathonPace:
      return IntensityZone.Z3
    case SessionType.Tempo:
      return IntensityZone.Z4
    case SessionType.Interval:
    case SessionType.Repetition:
      return IntensityZone.Z5
    case SessionType.Race:
      return IntensityZone.Z4
    default:
      return IntensityZone.Z1
  }
}

export function midPace(zone: { minPacePerKm: number; maxPacePerKm: number }): number {
  return (zone.minPacePerKm + zone.maxPacePerKm) / 2
}

export function paceForSession(type: SessionType, paceZones: PaceZones): string | null {
  switch (type) {
    case SessionType.Easy:
    case SessionType.LongRun:
    case SessionType.Recovery:
      return formatPace(midPace(paceZones.easy))
    case SessionType.MarathonPace:
      return formatPace(midPace(paceZones.marathon))
    case SessionType.Tempo:
      return formatPace(paceZones.threshold.minPacePerKm)
    case SessionType.Interval:
      return formatPace(paceZones.interval.minPacePerKm)
    case SessionType.Repetition:
      return formatPace(paceZones.repetition.minPacePerKm)
    default:
      return null
  }
}

export function buildIntervalsForSession(
  type: SessionType,
  targetMinutes: number,
  paceZones: PaceZones
): IntervalBlock[] | null {
  switch (type) {
    case SessionType.Interval:
      return buildIntervalSession(targetMinutes, paceZones)
    case SessionType.Tempo:
      return buildTempoSession(targetMinutes, paceZones)
    case SessionType.Repetition:
      return buildRepetitionSession(targetMinutes, paceZones)
    case SessionType.MarathonPace:
      return buildMarathonPaceSession(targetMinutes, paceZones)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// DanielsPlanEngine implementation
// ---------------------------------------------------------------------------
