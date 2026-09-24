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
import type { PaceZones } from '#domain/value_objects/pace_zones'
import {
  SessionType,
  IntensityZone,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import {
  type PhaseName,
  type DistanceCategory,
  DANIELS_PHASES,
  getDistanceCategory,
  QUALITY_MATRIX,
  MAX_EASY_SESSION_MINUTES,
  VOLUME_RULES,
  getTaperWeeks,
} from '#services/training/daniels/phases'
import {
  buildStrides,
  buildLongRunIntervals,
  formatPace,
  intensityForSession,
  midPace,
  paceForSession,
  buildIntervalsForSession,
} from '#services/training/daniels/workouts'

export default class DanielsPlanEngine extends TrainingPlanEngine {
  generatePlan(request: PlanRequest): GeneratedPlan {
    const { totalWeeks, sessionsPerWeek, preferredDays, paceZones, currentWeeklyVolumeMinutes } =
      request
    const distanceCategory = getDistanceCategory(request.targetDistanceKm)

    // Distribute weeks across 4 phases equally
    const phaseWeeks = this.#distributePhaseWeeks(totalWeeks)

    // Calculate weekly volumes with progression
    const weeklyVolumes = this.#calculateWeeklyVolumes(totalWeeks, currentWeeklyVolumeMinutes)

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

    return {
      weeks,
      methodology: TrainingMethodology.Daniels,
      totalWeeks,
    }
  }

  recalibrate(context: RecalibrationContext): GeneratedPlan {
    const { originalRequest, newPaceZones, remainingWeeks, currentWeekNumber } = context
    const totalWeeks = originalRequest.totalWeeks
    const remainingCount = remainingWeeks.length

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

    // Recalculate volumes starting from current volume with new progression
    const startVolume =
      remainingWeeks[0]?.targetVolumeMinutes ?? originalRequest.currentWeeklyVolumeMinutes
    const weeklyVolumes = this.#calculateWeeklyVolumes(
      remainingCount,
      startVolume,
      currentWeekNumber - 1
    )
    const distanceCategory = getDistanceCategory(originalRequest.targetDistanceKm)
    const taperWeeks = originalRequest.eventDate
      ? getTaperWeeks(originalRequest.targetDistanceKm)
      : 0

    const weeks: GeneratedWeek[] = []

    for (let i = 0; i < remainingCount; i++) {
      const weekNumber = currentWeekNumber + i
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
      const days = preferredDays.slice(0, Math.min(sessionsPerWeek, preferredDays.length))

      for (const day of days) {
        const durationMinutes = Math.round(volume / days.length)
        sessions.push({
          dayOfWeek: day,
          sessionType: SessionType.Easy,
          targetDurationMinutes: durationMinutes,
          targetDistanceKm: null,
          targetPacePerKm: formatPace(midPace(paceZones.easy)),
          intensityZone: IntensityZone.Z2,
          intervals: null,
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

  // Calcule les volumes hebdomadaires avec progression +10%/semaine et semaines de récupération
  // intégrées. La semaine post-récupération repart du volume de récup (pas de la progression
  // non-réduite), ce qui évite les sauts > 10% (Daniels §4.4 : max +10%/semaine).
  // weekOffset permet d'aligner les numéros de semaine sur le plan global (ex : recalibration
  // depuis la semaine 6 → offset = 5 pour que la récupération tombe aux bonnes semaines).
  #calculateWeeklyVolumes(totalWeeks: number, startVolume: number, weekOffset = 0): number[] {
    const volumes: number[] = []
    let base = startVolume

    for (let i = 0; i < totalWeeks; i++) {
      const weekNumber = i + 1 + weekOffset
      const isRecovery = weekNumber > 1 && weekNumber % (VOLUME_RULES.recoveryFrequency + 1) === 0
      const progressionVolume =
        i === 0 ? base : Math.round(base * (1 + VOLUME_RULES.weeklyProgressionMax))
      const volume = isRecovery
        ? Math.round(progressionVolume * (1 - VOLUME_RULES.recoveryReduction))
        : progressionVolume

      volumes.push(volume)
      base = volume // la semaine suivante progresse depuis le volume réel (pas la progression idéale)
    }

    return volumes
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
    const days = preferredDays.slice(0, Math.min(sessionsPerWeek, preferredDays.length))
    // Pad days if fewer preferred days than sessions
    while (days.length < sessionsPerWeek) {
      for (let d = 1; d <= 7 && days.length < sessionsPerWeek; d++) {
        if (!days.includes(d)) days.push(d)
      }
    }
    days.sort((a, b) => a - b)

    const qualityTypes = QUALITY_MATRIX[distanceCategory][phase]
    const sessions: GeneratedSession[] = []

    // Long run on last day
    const longRunDay = days[days.length - 1]
    const longRunMinutes = Math.min(
      Math.round(weekVolume * VOLUME_RULES.longRunMaxPct),
      180 // cap at 3h
    )

    sessions.push({
      dayOfWeek: longRunDay,
      sessionType: SessionType.LongRun,
      targetDurationMinutes: longRunMinutes,
      targetDistanceKm: null,
      targetPacePerKm: paceForSession(SessionType.LongRun, paceZones),
      intensityZone: intensityForSession(SessionType.LongRun),
      intervals: buildLongRunIntervals(longRunMinutes, phase, distanceCategory, paceZones),
    })

    // Quality sessions (max 2 for non-taper, max 1 for taper)
    const maxQuality = isTaperWeek ? 1 : Math.min(2, qualityTypes.length)
    const remainingDays = days.filter((d) => d !== longRunDay)

    for (let q = 0; q < maxQuality && q < remainingDays.length; q++) {
      const type = qualityTypes[q % qualityTypes.length]
      const qualityMinutes = this.#qualitySessionDuration(type, weekVolume)

      sessions.push({
        dayOfWeek: remainingDays[q],
        sessionType: type,
        targetDurationMinutes: qualityMinutes,
        targetDistanceKm: null,
        targetPacePerKm: paceForSession(type, paceZones),
        intensityZone: intensityForSession(type),
        intervals: buildIntervalsForSession(type, qualityMinutes, paceZones),
      })
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
      sessions.push({
        dayOfWeek: day,
        sessionType: SessionType.Easy,
        targetDurationMinutes: Math.max(20, easyPerSession),
        targetDistanceKm: null,
        targetPacePerKm: paceForSession(SessionType.Easy, paceZones),
        intensityZone: intensityForSession(SessionType.Easy),
        intervals: addStrides ? buildStrides(paceZones) : null,
      })
    }

    return sessions.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
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
    const days = preferredDays.slice(0, Math.min(sessionsPerWeek, preferredDays.length))
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

      sessions.push({
        dayOfWeek: day,
        sessionType: type,
        targetDurationMinutes: perSession,
        targetDistanceKm: null,
        targetPacePerKm: paceForSession(type, paceZones),
        intensityZone: intensityForSession(type),
        intervals: isStructured ? buildIntervalsForSession(type, perSession, paceZones) : null,
      })
    }

    return sessions
  }
}
