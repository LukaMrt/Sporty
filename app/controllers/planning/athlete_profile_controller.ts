import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import EstimateVdot from '#use_cases/planning/estimate_vdot'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { BiologicalSex } from '#domain/value_objects/planning_types'
import {
  confirmVdotValidator,
  updateAthleteProfileValidator,
  estimateVdotValidator,
} from '#validators/planning/athlete_profile_validator'

@inject()
export default class AthleteProfileController {
  constructor(
    private estimateVdotUseCase: EstimateVdot,
    private userProfileRepository: UserProfileRepository,
    private sessionRepository: SessionRepository,
    private trainingLoadCalculator: TrainingLoadCalculator,
    private fitnessProfileCalculator: FitnessProfileCalculator
  ) {}

  async show({ inertia, auth, session }: HttpContext) {
    const userId = auth.user!.id
    const profile = await this.userProfileRepository.findByUserId(userId)

    // VDOT : priorité à la valeur confirmée en session, sinon estimation
    const confirmedVdot: number | undefined = session.get('confirmedVdot') as number | undefined
    let vdot: number | null = confirmedVdot ?? null
    let paceZones = null
    let fitnessProfile = null

    if (vdot !== null) {
      paceZones = derivePaceZones(vdot)
    }
    fitnessProfile = await this.#getFitnessProfile(userId, profile)

    return inertia.render('Planning/AthleteProfile', {
      profile: profile
        ? {
            trainingState: profile.trainingState,
            maxHeartRate: profile.maxHeartRate,
            restingHeartRate: profile.restingHeartRate,
            vma: profile.vma,
            sex: profile.sex,
            speedUnit: profile.preferences.speedUnit,
          }
        : null,
      vdot,
      paceZones,
      fitnessProfile: fitnessProfile
        ? {
            ctl: Math.round(fitnessProfile.chronicTrainingLoad),
            atl: Math.round(fitnessProfile.acuteTrainingLoad),
            tsb: Math.round(fitnessProfile.trainingStressBalance),
            acwr: Math.round(fitnessProfile.acuteChronicWorkloadRatio * 100) / 100,
          }
        : null,
    })
  }

  async estimateVdot({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(estimateVdotValidator)
    const userId = auth.user!.id

    const questionnaire =
      data.frequency && data.experience && data.typical_distance
        ? {
            frequency: data.frequency,
            experience: data.experience,
            typicalDistance: data.typical_distance,
          }
        : undefined

    const result = await this.estimateVdotUseCase.execute(userId, questionnaire)

    return response.json({
      vdot: result.vdot,
      method: result.method,
      paceZones: result.paceZones,
      fitnessProfile: result.fitnessProfile
        ? {
            ctl: Math.round(result.fitnessProfile.chronicTrainingLoad),
            atl: Math.round(result.fitnessProfile.acuteTrainingLoad),
            tsb: Math.round(result.fitnessProfile.trainingStressBalance),
            acwr: Math.round(result.fitnessProfile.acuteChronicWorkloadRatio * 100) / 100,
          }
        : null,
    })
  }

  async confirmVdot({ request, response, session }: HttpContext) {
    const { vdot } = await request.validateUsing(confirmVdotValidator)
    session.put('confirmedVdot', vdot)
    return response.json({ vdot, paceZones: derivePaceZones(vdot) })
  }

  async updateProfile({ request, response, auth, session, i18n }: HttpContext) {
    const data = await request.validateUsing(updateAthleteProfileValidator)
    const userId = auth.user!.id

    await this.userProfileRepository.update(userId, {
      sex: data.sex ? (data.sex as BiologicalSex) : undefined,
      maxHeartRate: data.max_heart_rate ?? undefined,
      restingHeartRate: data.resting_heart_rate ?? undefined,
      vma: data.vma ?? undefined,
    })

    session.flash('success', i18n.t('profile.flash.updated'))
    return response.redirect().back()
  }

  async #getFitnessProfile(
    userId: number,
    profile: Awaited<ReturnType<UserProfileRepository['findByUserId']>>
  ) {
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
