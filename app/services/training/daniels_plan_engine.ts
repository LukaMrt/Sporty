import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import type {
  GeneratedPlan,
  GeneratedWeek,
  GeneratedSession,
} from '#domain/interfaces/training_plan_engine'
import type { PlanRequest } from '#domain/value_objects/plan_request'
import type { RecalibrationContext } from '#domain/value_objects/recalibration_context'
import type { MaintenancePlanRequest } from '#domain/value_objects/maintenance_plan_request'
import type { TransitionPlanRequest } from '#domain/value_objects/transition_plan_request'
import type { IntervalBlock } from '#domain/entities/planned_session'
import type { PaceZones } from '#domain/value_objects/pace_zones'
import {
  SessionType,
  IntensityZone,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import {
  WEEK_DAY_ORDER,
  chronologicalDayIndex,
  parseIsoDate,
  daysBetween,
} from '#domain/services/plan_calendar'
import { predictTimeMinutes } from '#domain/services/vdot_calculator'

// ---------------------------------------------------------------------------
// Daniels phases — internal constants
// ---------------------------------------------------------------------------

const DANIELS_PHASES = [{ name: 'FI' }, { name: 'EQ' }, { name: 'TQ' }, { name: 'FQ' }] as const

type PhaseName = (typeof DANIELS_PHASES)[number]['name']

// ---------------------------------------------------------------------------
// Distance category helper
// ---------------------------------------------------------------------------

type DistanceCategory = '5k' | '10k' | 'half' | 'marathon'

function getDistanceCategory(distanceKm: number): DistanceCategory {
  if (distanceKm <= 5) return '5k'
  if (distanceKm <= 10) return '10k'
  if (distanceKm <= 21.1) return 'half'
  return 'marathon'
}

// ---------------------------------------------------------------------------
// Quality session matrix per phase × distance
// ---------------------------------------------------------------------------

type QualityMix = SessionType[]

const QUALITY_MATRIX: Record<DistanceCategory, Record<PhaseName, QualityMix>> = {
  '5k': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo],
    TQ: [SessionType.Repetition, SessionType.Interval], // 5k : R > I (Daniels §4.3 : R 200-400m prioritaire)
    FQ: [SessionType.Tempo, SessionType.Repetition],
  },
  '10k': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo],
    TQ: [SessionType.Interval, SessionType.Tempo],
    FQ: [SessionType.Tempo, SessionType.Interval],
  },
  'half': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo],
    TQ: [SessionType.Interval, SessionType.Tempo, SessionType.MarathonPace],
    FQ: [SessionType.Tempo, SessionType.MarathonPace],
  },
  'marathon': {
    FI: [SessionType.Easy],
    EQ: [SessionType.Repetition, SessionType.Tempo, SessionType.MarathonPace],
    TQ: [SessionType.Interval, SessionType.Tempo, SessionType.MarathonPace],
    FQ: [SessionType.MarathonPace, SessionType.Tempo],
  },
}

// ---------------------------------------------------------------------------
// Volume rules (Daniels percentages applied to work minutes)
// ---------------------------------------------------------------------------

// Cap par séance easy : évite d'absorber tout le volume résiduel sur un seul jour (§7.1 TID pyramidal)
const MAX_EASY_SESSION_MINUTES = 90

const VOLUME_RULES = {
  longRunMaxPct: 0.3,
  intervalMaxPct: 0.08,
  tempoMaxPct: 0.1,
  repetitionMaxPct: 0.05,
  weeklyProgressionMax: 0.1,
  recoveryReduction: 0.25, // deterministic 25% (midpoint of Daniels 20-30%)
  recoveryFrequency: 3, // every 3-4 weeks
  taperAlpha: 1.5, // Mujika non-linear exponent
}

// Plafond de volume hebdomadaire par distance cible : la progression +10%/sem
// s'arrête au pic (Daniels plafonne le volume ; sans cap, un plan de 16+
// semaines dépasse des volumes irréalistes pour un amateur).
const PEAK_WEEKLY_VOLUME_MINUTES: Record<DistanceCategory, number> = {
  '5k': 300,
  '10k': 360,
  'half': 420,
  'marathon': 480,
}

// ---------------------------------------------------------------------------
// Taper configuration
// ---------------------------------------------------------------------------

function getTaperWeeks(distanceKm: number): number {
  if (distanceKm <= 10) return 2
  if (distanceKm <= 21.1) return 3 // 14-21 days per Mujika & Padilla
  return 3
}

// ---------------------------------------------------------------------------
// Interval templates
// ---------------------------------------------------------------------------

function buildWarmup(paceZones: PaceZones): IntervalBlock {
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

function buildCooldown(paceZones: PaceZones): IntervalBlock {
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

function buildIntervalSession(targetMinutes: number, paceZones: PaceZones): IntervalBlock[] {
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

function buildTempoSession(targetMinutes: number, paceZones: PaceZones): IntervalBlock[] {
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

function buildRepetitionSession(targetMinutes: number, paceZones: PaceZones): IntervalBlock[] {
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

function buildMarathonPaceSession(targetMinutes: number, paceZones: PaceZones): IntervalBlock[] {
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

function buildStrides(paceZones: PaceZones): IntervalBlock[] {
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

function buildLongRunIntervals(
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

function formatPace(paceMinPerKm: number): string {
  const totalSeconds = Math.round(paceMinPerKm * 60)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function parsePaceMinPerKm(pace: string | null): number | null {
  if (!pace) return null
  const [mins, secs] = pace.split(':').map(Number)
  if (Number.isNaN(mins) || Number.isNaN(secs)) return null
  return mins + secs / 60
}

function intensityForSession(type: SessionType): IntensityZone {
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

function midPace(zone: { minPacePerKm: number; maxPacePerKm: number }): number {
  return (zone.minPacePerKm + zone.maxPacePerKm) / 2
}

function paceForSession(type: SessionType, paceZones: PaceZones): string | null {
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

function buildIntervalsForSession(
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
// TSS prévisionnel
// ---------------------------------------------------------------------------

// rTSS estimé : IF² × durée(h) × 100, IF = allure seuil / allure de la portion.
// Sert de charge planifiée de référence pour la recalibration hebdomadaire.
function tssFor(minutes: number, paceMinPerKm: number | null, thresholdPace: number): number {
  if (!paceMinPerKm || minutes <= 0) return 0
  const intensityFactor = thresholdPace / paceMinPerKm
  return intensityFactor ** 2 * (minutes / 60) * 100
}

function estimateSessionTss(
  type: SessionType,
  durationMinutes: number,
  targetPace: string | null,
  intervals: IntervalBlock[] | null,
  paceZones: PaceZones
): number {
  const thresholdPace = paceZones.threshold.minPacePerKm
  const easyPace = midPace(paceZones.easy)

  const fromBlocks = (blocks: IntervalBlock[]): number =>
    blocks.reduce((sum, block) => {
      const work = tssFor(
        (block.durationMinutes ?? 0) * block.repetitions,
        parsePaceMinPerKm(block.targetPace),
        thresholdPace
      )
      const recovery =
        block.recoveryDurationMinutes && block.recoveryType === 'jog'
          ? tssFor(block.recoveryDurationMinutes * block.repetitions, easyPace, thresholdPace)
          : 0
      return sum + work + recovery
    }, 0)

  switch (type) {
    case SessionType.Interval:
    case SessionType.Tempo:
    case SessionType.Repetition:
    case SessionType.MarathonPace:
    case SessionType.LongRun:
      // Les blocs décrivent la séance complète (échauffement/retour au calme inclus)
      if (intervals && intervals.length > 0) return Math.round(fromBlocks(intervals))
      return Math.round(
        tssFor(durationMinutes, parsePaceMinPerKm(targetPace) ?? easyPace, thresholdPace)
      )
    case SessionType.Rest:
      return 0
    default:
      // Easy/Recovery/Race : durée × allure cible (les strides éventuels sont négligeables)
      return Math.round(
        tssFor(durationMinutes, parsePaceMinPerKm(targetPace) ?? easyPace, thresholdPace)
      )
  }
}

// ---------------------------------------------------------------------------
// DanielsPlanEngine implementation
// ---------------------------------------------------------------------------

export default class DanielsPlanEngine extends TrainingPlanEngine {
  generatePlan(request: PlanRequest): GeneratedPlan {
    const { totalWeeks, sessionsPerWeek, preferredDays, paceZones, currentWeeklyVolumeMinutes } =
      request
    const distanceCategory = getDistanceCategory(request.targetDistanceKm)

    // Distribute weeks across 4 phases equally
    const phaseWeeks = this.#distributePhaseWeeks(totalWeeks)

    // Calculate weekly volumes with progression
    const weeklyVolumes = this.#calculateWeeklyVolumes(
      totalWeeks,
      currentWeeklyVolumeMinutes,
      distanceCategory
    )

    // Apply taper if event date exists
    const taperWeeks = request.eventDate ? getTaperWeeks(request.targetDistanceKm) : 0

    const weeks: GeneratedWeek[] = []
    let weekNumber = 1

    for (const [phaseIdx, phase] of DANIELS_PHASES.entries()) {
      const weeksInPhase = phaseWeeks[phaseIdx]

      for (let w = 0; w < weeksInPhase; w++) {
        const isRecoveryWeek =
          weekNumber > 1 && weekNumber % (VOLUME_RULES.recoveryFrequency + 1) === 0
        const isTaperWeek = taperWeeks > 0 && weekNumber > totalWeeks - taperWeeks

        let volume = weeklyVolumes[weekNumber - 1]
        if (isTaperWeek) {
          const weeksToRace = totalWeeks - weekNumber + 1
          const progress = (taperWeeks - weeksToRace + 1) / taperWeeks // 0→1
          const taperPct = 0.6 * Math.pow(progress, VOLUME_RULES.taperAlpha) // Mujika non-linear
          volume = Math.round(volume * (1 - taperPct))
        }

        const sessions = this.#buildWeekSessions(
          sessionsPerWeek,
          preferredDays,
          volume,
          phase.name,
          distanceCategory,
          paceZones,
          isTaperWeek
        )

        weeks.push({
          weekNumber,
          phaseName: phase.name,
          isRecoveryWeek,
          targetVolumeMinutes: volume,
          sessions,
        })

        weekNumber++
      }
    }

    this.#placeRaceSession(weeks, request)

    return {
      weeks,
      methodology: TrainingMethodology.Daniels,
      totalWeeks,
    }
  }

  recalibrate(context: RecalibrationContext): GeneratedPlan {
    const { originalRequest, newPaceZones, remainingWeeks } = context
    const totalWeeks = originalRequest.totalWeeks
    const remainingCount = remainingWeeks.length

    if (remainingCount === 0) {
      return { weeks: [], methodology: TrainingMethodology.Daniels, totalWeeks: 0 }
    }

    // Les semaines régénérées conservent les numéros des semaines restantes
    // (voir contrat RecalibrationContext) — jamais de décalage, sinon la
    // dernière semaine du plan serait supprimée sans être recréée.
    const firstWeekNumber = remainingWeeks[0].weekNumber

    // Determine which phase each remaining week belongs to (preserve original phase distribution)
    const phaseWeeks = this.#distributePhaseWeeks(totalWeeks)
    const phaseForWeek = (weekNum: number): { name: PhaseName } => {
      let cumulative = 0
      for (const [idx, phase] of DANIELS_PHASES.entries()) {
        cumulative += phaseWeeks[idx]
        if (weekNum <= cumulative) return { name: phase.name }
      }
      return { name: 'FQ' }
    }

    // Volume de départ : la valeur fournie par l'appelant (facteur de charge
    // déjà appliqué) prime sur le volume existant de la première semaine.
    const startVolume =
      originalRequest.currentWeeklyVolumeMinutes > 0
        ? originalRequest.currentWeeklyVolumeMinutes
        : (remainingWeeks[0]?.targetVolumeMinutes ?? 0)
    const distanceCategory = getDistanceCategory(originalRequest.targetDistanceKm)
    const weeklyVolumes = this.#calculateWeeklyVolumes(
      remainingCount,
      startVolume,
      distanceCategory,
      firstWeekNumber - 1
    )
    const taperWeeks = originalRequest.eventDate
      ? getTaperWeeks(originalRequest.targetDistanceKm)
      : 0

    const weeks: GeneratedWeek[] = []

    for (const [i, remainingWeek] of remainingWeeks.entries()) {
      const weekNumber = remainingWeek.weekNumber
      const phase = phaseForWeek(weekNumber)

      const isRecoveryWeek =
        weekNumber > 1 && weekNumber % (VOLUME_RULES.recoveryFrequency + 1) === 0
      const isTaperWeek = taperWeeks > 0 && weekNumber > totalWeeks - taperWeeks

      let volume = weeklyVolumes[i]
      if (isTaperWeek) {
        const weeksToRace = totalWeeks - weekNumber + 1
        const progress = (taperWeeks - weeksToRace + 1) / taperWeeks
        const taperPct = 0.6 * Math.pow(progress, VOLUME_RULES.taperAlpha)
        volume = Math.round(volume * (1 - taperPct))
      }

      const sessions = this.#buildWeekSessions(
        originalRequest.sessionsPerWeek,
        originalRequest.preferredDays,
        volume,
        phase.name,
        distanceCategory,
        newPaceZones,
        isTaperWeek
      )

      weeks.push({
        weekNumber,
        phaseName: phase.name,
        isRecoveryWeek,
        targetVolumeMinutes: volume,
        sessions,
      })
    }

    this.#placeRaceSession(weeks, { ...originalRequest, paceZones: newPaceZones })

    return {
      weeks,
      methodology: TrainingMethodology.Daniels,
      totalWeeks: remainingCount,
    }
  }

  generateMaintenancePlan(request: MaintenancePlanRequest): GeneratedPlan {
    const { paceZones, sessionsPerWeek, preferredDays, currentWeeklyVolumeMinutes } = request
    const maintenanceVolume = Math.round(currentWeeklyVolumeMinutes * 0.35) // 30-40% of peak

    const weeks: GeneratedWeek[] = []
    for (let w = 1; w <= 4; w++) {
      const isRecoveryWeek = w === 4
      const volume = isRecoveryWeek ? Math.round(maintenanceVolume * 0.75) : maintenanceVolume

      const sessions = this.#buildMaintenanceWeekSessions(
        sessionsPerWeek,
        preferredDays,
        volume,
        paceZones,
        isRecoveryWeek
      )

      weeks.push({
        weekNumber: w,
        phaseName: 'MAINT',
        isRecoveryWeek,
        targetVolumeMinutes: volume,
        sessions,
      })
    }

    return {
      weeks,
      methodology: TrainingMethodology.Daniels,
      totalWeeks: 4,
    }
  }

  generateTransitionPlan(request: TransitionPlanRequest): GeneratedPlan {
    const { paceZones, sessionsPerWeek, preferredDays, previousPeakVolumeMinutes, raceDistanceKm } =
      request
    const transitionWeeks = raceDistanceKm >= 21.1 ? 4 : 2
    const transitionVolume = Math.round(previousPeakVolumeMinutes * 0.65) // 60-70%

    const weeks: GeneratedWeek[] = []
    for (let w = 1; w <= transitionWeeks; w++) {
      const volume = Math.round(transitionVolume * (0.6 + (w / transitionWeeks) * 0.4))

      const sessions: GeneratedSession[] = []
      const days = this.#resolveDays(sessionsPerWeek, preferredDays)

      for (const day of days) {
        const durationMinutes = Math.round(volume / days.length)
        const targetPacePerKm = formatPace(midPace(paceZones.easy))
        sessions.push({
          dayOfWeek: day,
          sessionType: SessionType.Easy,
          targetDurationMinutes: durationMinutes,
          targetDistanceKm: null,
          targetPacePerKm,
          intensityZone: IntensityZone.Z2,
          intervals: null,
          targetLoadTss: estimateSessionTss(
            SessionType.Easy,
            durationMinutes,
            targetPacePerKm,
            null,
            paceZones
          ),
        })
      }

      weeks.push({
        weekNumber: w,
        phaseName: 'TRANS',
        isRecoveryWeek: false,
        targetVolumeMinutes: volume,
        sessions,
      })
    }

    return {
      weeks,
      methodology: TrainingMethodology.Daniels,
      totalWeeks: transitionWeeks,
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  #distributePhaseWeeks(totalWeeks: number): number[] {
    const base = Math.floor(totalWeeks / 4)
    const remainder = totalWeeks % 4
    return DANIELS_PHASES.map((_, i) => base + (i < remainder ? 1 : 0))
  }

  // Calcule les volumes hebdomadaires avec progression +10%/semaine, plafond de
  // pic par distance et semaines de récupération intégrées. La semaine
  // post-récupération repart du volume de récup (pas de la progression
  // non-réduite), ce qui évite les sauts > 10% (Daniels §4.4 : max +10%/semaine).
  // weekOffset permet d'aligner les numéros de semaine sur le plan global (ex :
  // recalibration depuis la semaine 6 → offset = 5 pour que la récupération
  // tombe aux bonnes semaines).
  #calculateWeeklyVolumes(
    totalWeeks: number,
    startVolume: number,
    distanceCategory: DistanceCategory,
    weekOffset = 0
  ): number[] {
    const peakVolume = PEAK_WEEKLY_VOLUME_MINUTES[distanceCategory]
    const volumes: number[] = []
    let base = startVolume

    for (let i = 0; i < totalWeeks; i++) {
      const weekNumber = i + 1 + weekOffset
      const isRecovery = weekNumber > 1 && weekNumber % (VOLUME_RULES.recoveryFrequency + 1) === 0
      const progressionVolume =
        i === 0
          ? Math.min(base, peakVolume)
          : Math.min(Math.round(base * (1 + VOLUME_RULES.weeklyProgressionMax)), peakVolume)
      const volume = isRecovery
        ? Math.round(progressionVolume * (1 - VOLUME_RULES.recoveryReduction))
        : progressionVolume

      volumes.push(volume)
      base = volume // la semaine suivante progresse depuis le volume réel (pas la progression idéale)
    }

    return volumes
  }

  // Jours retenus pour la semaine, triés dans l'ordre chronologique lundi→dimanche
  // (dayOfWeek 0 = dimanche est le DERNIER jour d'une semaine de plan).
  #resolveDays(sessionsPerWeek: number, preferredDays: number[]): number[] {
    const days = [...new Set(preferredDays)].slice(0, sessionsPerWeek)
    for (const d of WEEK_DAY_ORDER) {
      if (days.length >= sessionsPerWeek) break
      if (!days.includes(d)) days.push(d)
    }
    return days.sort((a, b) => chronologicalDayIndex(a) - chronologicalDayIndex(b))
  }

  #buildWeekSessions(
    sessionsPerWeek: number,
    preferredDays: number[],
    weekVolume: number,
    phase: PhaseName,
    distanceCategory: DistanceCategory,
    paceZones: PaceZones,
    isTaperWeek: boolean
  ): GeneratedSession[] {
    const days = this.#resolveDays(sessionsPerWeek, preferredDays)

    const qualityTypes = QUALITY_MATRIX[distanceCategory][phase]
    const sessions: GeneratedSession[] = []

    // Long run on the chronologically last day of the week
    const longRunDay = days[days.length - 1]
    const longRunMinutes = Math.min(
      Math.round(weekVolume * VOLUME_RULES.longRunMaxPct),
      180 // cap at 3h
    )

    sessions.push(
      this.#makeSession(
        longRunDay,
        SessionType.LongRun,
        longRunMinutes,
        buildLongRunIntervals(longRunMinutes, phase, distanceCategory, paceZones),
        paceZones
      )
    )

    // Quality sessions (max 2 for non-taper, max 1 for taper)
    const maxQuality = isTaperWeek ? 1 : Math.min(2, qualityTypes.length)
    const remainingDays = days.filter((d) => d !== longRunDay)

    for (let q = 0; q < maxQuality && q < remainingDays.length; q++) {
      const type = qualityTypes[q % qualityTypes.length]
      const qualityMinutes = this.#qualitySessionDuration(type, weekVolume)

      sessions.push(
        this.#makeSession(
          remainingDays[q],
          type,
          qualityMinutes,
          buildIntervalsForSession(type, qualityMinutes, paceZones),
          paceZones
        )
      )
    }

    // Fill remaining days with easy runs
    const usedDays = sessions.map((s) => s.dayOfWeek)
    const easyDays = remainingDays.filter((d) => !usedDays.includes(d))
    const remainingVolume =
      weekVolume - sessions.reduce((sum, s) => sum + s.targetDurationMinutes, 0)
    const easyPerSession =
      easyDays.length > 0
        ? Math.min(MAX_EASY_SESSION_MINUTES, Math.round(remainingVolume / easyDays.length))
        : 0

    for (const [idx, day] of easyDays.entries()) {
      const addStrides = (phase === 'FI' || phase === 'EQ') && idx < 2 && !isTaperWeek
      sessions.push(
        this.#makeSession(
          day,
          SessionType.Easy,
          Math.max(20, easyPerSession),
          addStrides ? buildStrides(paceZones) : null,
          paceZones
        )
      )
    }

    return sessions.sort(
      (a, b) => chronologicalDayIndex(a.dayOfWeek) - chronologicalDayIndex(b.dayOfWeek)
    )
  }

  #makeSession(
    dayOfWeek: number,
    type: SessionType,
    durationMinutes: number,
    intervals: IntervalBlock[] | null,
    paceZones: PaceZones
  ): GeneratedSession {
    const targetPacePerKm = paceForSession(type, paceZones)
    return {
      dayOfWeek,
      sessionType: type,
      targetDurationMinutes: durationMinutes,
      targetDistanceKm: null,
      targetPacePerKm,
      intensityZone: intensityForSession(type),
      intervals,
      targetLoadTss: estimateSessionTss(
        type,
        durationMinutes,
        targetPacePerKm,
        intervals,
        paceZones
      ),
    }
  }

  // Remplace la fin de la dernière semaine par la course elle-même quand la
  // date d'événement tombe dans cette semaine : séance Race le jour J, aucune
  // séance planifiée après (repos post-course).
  #placeRaceSession(weeks: GeneratedWeek[], request: PlanRequest): void {
    if (!request.eventDate || weeks.length === 0) return

    const elapsedDays = daysBetween(request.startDate, request.eventDate)
    if (elapsedDays < 0) return
    const eventWeekNumber = Math.floor(elapsedDays / 7) + 1

    const lastWeek = weeks[weeks.length - 1]
    if (lastWeek.weekNumber !== eventWeekNumber) return

    const raceDow = parseIsoDate(request.eventDate).getDay()
    const raceChrono = chronologicalDayIndex(raceDow)

    const raceDurationMinutes = Math.round(
      request.targetTimeMinutes ?? predictTimeMinutes(request.targetDistanceKm * 1000, request.vdot)
    )
    const racePace = formatPace(raceDurationMinutes / request.targetDistanceKm)

    lastWeek.sessions = lastWeek.sessions.filter(
      (s) => chronologicalDayIndex(s.dayOfWeek) < raceChrono
    )
    // Le volume hebdo affiché reste le volume d'entraînement (course exclue)
    lastWeek.targetVolumeMinutes = lastWeek.sessions.reduce(
      (sum, s) => sum + s.targetDurationMinutes,
      0
    )
    lastWeek.sessions.push({
      dayOfWeek: raceDow,
      sessionType: SessionType.Race,
      targetDurationMinutes: raceDurationMinutes,
      targetDistanceKm: request.targetDistanceKm,
      targetPacePerKm: racePace,
      intensityZone: intensityForSession(SessionType.Race),
      intervals: null,
      targetLoadTss: estimateSessionTss(
        SessionType.Race,
        raceDurationMinutes,
        racePace,
        null,
        request.paceZones
      ),
    })
  }

  #qualitySessionDuration(type: SessionType, weekVolume: number): number {
    const maxPct =
      type === SessionType.Interval
        ? VOLUME_RULES.intervalMaxPct
        : type === SessionType.Tempo
          ? VOLUME_RULES.tempoMaxPct
          : type === SessionType.Repetition
            ? VOLUME_RULES.repetitionMaxPct
            : VOLUME_RULES.tempoMaxPct // MarathonPace uses tempo budget

    // Total session = warmup(15) + work + cooldown(10)
    const workMinutes = Math.round(weekVolume * maxPct)
    return workMinutes + 25
  }

  #buildMaintenanceWeekSessions(
    sessionsPerWeek: number,
    preferredDays: number[],
    volume: number,
    paceZones: PaceZones,
    isRecoveryWeek: boolean
  ): GeneratedSession[] {
    const days = this.#resolveDays(Math.min(sessionsPerWeek, preferredDays.length), preferredDays)
    const sessions: GeneratedSession[] = []
    const perSession = Math.round(volume / days.length)

    for (const [i, day] of days.entries()) {
      // 2 structured + rest easy; in recovery week all easy
      const isStructured = !isRecoveryWeek && i < 2
      const type = isStructured
        ? i === 0
          ? SessionType.Tempo
          : SessionType.Interval
        : SessionType.Easy

      sessions.push(
        this.#makeSession(
          day,
          type,
          perSession,
          isStructured ? buildIntervalsForSession(type, perSession, paceZones) : null,
          paceZones
        )
      )
    }

    return sessions
  }
}
