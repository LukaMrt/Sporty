import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import {
  calculateVdot,
  vdotFromHistory,
  vdotFromVma,
  vdotFromQuestionnaire,
  derivePaceZones,
  type RunningFrequency,
  type RunningExperience,
  type TypicalDistance,
} from '#domain/services/vdot_calculator'
import type { PaceZones } from '#domain/value_objects/pace_zones'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'

export type VdotEstimationMethod = 'history' | 'vma' | 'manual_vma' | 'recent' | 'questionnaire'

export interface QuestionnaireAnswers {
  frequency: RunningFrequency
  experience: RunningExperience
  typicalDistance: TypicalDistance
}

export interface EstimateVdotResult {
  vdot: number
  method: VdotEstimationMethod
  paceZones: PaceZones
  fitnessProfile: FitnessProfile | null
}

@inject()
export default class EstimateVdot {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private trainingLoadCalculator: TrainingLoadCalculator,
    private fitnessProfileCalculator: FitnessProfileCalculator
  ) {}

  async execute(
    userId: number,
    questionnaire?: QuestionnaireAnswers,
    recentPerformance?: { distanceKm: number; timeMinutes: number },
    manualVma?: number
  ): Promise<EstimateVdotResult> {
    const profile = await this.userProfileRepository.findByUserId(userId)

    // ── Performance récente saisie manuellement ────────────────────────────────
    if (recentPerformance) {
      const vdot = Math.round(
        calculateVdot(recentPerformance.distanceKm * 1000, recentPerformance.timeMinutes)
      )
      const fitnessProfile = await this.#computeFitnessProfile(userId, profile)
      return {
        vdot,
        method: 'recent',
        paceZones: derivePaceZones(vdot),
        fitnessProfile,
      }
    }

    // ── VMA saisie manuellement ────────────────────────────────────────────────
    if (manualVma) {
      const vdot = Math.round(vdotFromVma(manualVma))
      const fitnessProfile = await this.#computeFitnessProfile(userId, profile)
      return {
        vdot,
        method: 'manual_vma',
        paceZones: derivePaceZones(vdot),
        fitnessProfile,
      }
    }

    // ── Niveau 1 : historique Strava des 6 dernières semaines ─────────────────
    // Requête par plage de dates : la pagination arbitraire (100 dernières
    // séances toutes activités confondues) tronquait l'historique des
    // utilisateurs multi-sports.
    const sixWeeksAgoIso = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const todayIso = new Date().toISOString().slice(0, 10)
    const recentSessions = profile?.sportId
      ? await this.sessionRepository.findByUserIdAndDateRange(userId, sixWeeksAgoIso, todayIso)
      : []

    const runningSessions = recentSessions.filter(
      (s) => s.distanceKm !== null && s.durationMinutes > 0 && s.sportId === profile?.sportId
    )

    const historyInput = runningSessions.map((s) => ({
      distanceMeters: (s.distanceKm ?? 0) * 1000,
      durationMinutes: s.durationMinutes,
      date: new Date(s.date),
    }))

    const vdotFromHist = vdotFromHistory(historyInput)
    if (vdotFromHist !== null) {
      const vdot = Math.round(vdotFromHist)
      const fitnessProfile = await this.#computeFitnessProfile(userId, profile)
      return {
        vdot,
        method: 'history',
        paceZones: derivePaceZones(vdot),
        fitnessProfile,
      }
    }

    // ── Niveau 2 : VMA depuis le profil ───────────────────────────────────────
    if (profile?.vma) {
      const vdot = Math.round(vdotFromVma(profile.vma))
      const fitnessProfile = await this.#computeFitnessProfile(userId, profile)
      return {
        vdot,
        method: 'vma',
        paceZones: derivePaceZones(vdot),
        fitnessProfile,
      }
    }

    // ── Niveau 3 : questionnaire ───────────────────────────────────────────────
    const answers = questionnaire ?? {
      frequency: 'occasional' as RunningFrequency,
      experience: 'beginner' as RunningExperience,
      typicalDistance: 'less_5k' as TypicalDistance,
    }
    const vdot = vdotFromQuestionnaire(
      answers.frequency,
      answers.experience,
      answers.typicalDistance
    )
    return {
      vdot,
      method: 'questionnaire',
      paceZones: derivePaceZones(vdot),
      fitnessProfile: null,
    }
  }

  async #computeFitnessProfile(
    userId: number,
    profile: Awaited<ReturnType<UserProfileRepository['findByUserId']>>
  ): Promise<FitnessProfile | null> {
    try {
      const allSessions = await this.sessionRepository.findByUserIdAndDateRange(
        userId,
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10)
      )
      if (allSessions.length === 0) return null

      const loadHistory = allSessions.map((s) => ({
        date: s.date,
        load: this.trainingLoadCalculator.calculate({
          durationHours: s.durationMinutes / 60,
          perceivedEffort: s.perceivedEffort ?? undefined,
          avgPaceMPerMin:
            s.distanceKm && s.durationMinutes > 0
              ? (s.distanceKm * 1000) / s.durationMinutes
              : undefined,
          maxHR: profile?.maxHeartRate ?? undefined,
          restHR: profile?.restingHeartRate ?? undefined,
          sex: profile?.sex ?? undefined,
        }),
      }))

      return this.fitnessProfileCalculator.calculate(loadHistory)
    } catch {
      return null
    }
  }
}
