import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import EstimateVdot from '#use_cases/planning/estimate_vdot'
import ConfirmVdot from '#use_cases/planning/confirm_vdot'
import GetProfile from '#use_cases/profile/get_profile'
import UpdateProfile from '#use_cases/profile/update_profile'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { BiologicalSex } from '#domain/value_objects/planning_types'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import {
  confirmVdotValidator,
  updateAthleteProfileValidator,
  estimateVdotValidator,
} from '#validators/planning/athlete_profile_validator'

function toFitnessDto(fitness: FitnessProfile | null) {
  return fitness
    ? {
        ctl: Math.round(fitness.chronicTrainingLoad),
        atl: Math.round(fitness.acuteTrainingLoad),
        tsb: Math.round(fitness.trainingStressBalance),
        acwr: Math.round(fitness.acuteChronicWorkloadRatio * 100) / 100,
      }
    : null
}

@inject()
export default class AthleteProfileController {
  constructor(
    private estimateVdotUseCase: EstimateVdot,
    private confirmVdotUseCase: ConfirmVdot,
    private getProfile: GetProfile,
    private updateProfileUseCase: UpdateProfile,
    private getFitnessProfile: GetFitnessProfile
  ) {}

  async show({ inertia, auth }: HttpContext) {
    const userId = auth.user!.id
    const [profile, fitness] = await Promise.all([
      this.getProfile.execute(userId),
      this.getFitnessProfile.execute(userId),
    ])

    const vdot = profile?.vdot ?? null
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
      paceZones: vdot !== null ? derivePaceZones(vdot) : null,
      fitnessProfile: toFitnessDto(fitness.profile),
    })
  }

  async estimateVdot({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(estimateVdotValidator)

    const questionnaire =
      data.frequency && data.experience && data.typical_distance
        ? {
            frequency: data.frequency,
            experience: data.experience,
            typicalDistance: data.typical_distance,
          }
        : undefined

    const recentPerformance =
      data.distance && data.time ? { distanceKm: data.distance, timeMinutes: data.time } : undefined

    const result = await this.estimateVdotUseCase.execute(
      auth.user!.id,
      questionnaire,
      recentPerformance,
      data.vma
    )

    return response.json({
      vdot: result.vdot,
      method: result.method,
      paceZones: result.paceZones,
      fitnessProfile: toFitnessDto(result.fitnessProfile),
    })
  }

  async confirmVdot({ request, response, auth }: HttpContext) {
    const { vdot } = await request.validateUsing(confirmVdotValidator)
    return response.json(await this.confirmVdotUseCase.execute(auth.user!.id, vdot))
  }

  async updateProfile({ request, response, auth, session, i18n }: HttpContext) {
    const data = await request.validateUsing(updateAthleteProfileValidator)

    // Via UpdateProfile : un changement de FC déclenche le recalcul des séances
    await this.updateProfileUseCase.execute(auth.user!.id, {
      sex: data.sex ? (data.sex as BiologicalSex) : undefined,
      maxHeartRate: data.max_heart_rate ?? undefined,
      restingHeartRate: data.resting_heart_rate ?? undefined,
      vma: data.vma ?? undefined,
    })

    session.flash('success', i18n.t('profile.flash.updated'))
    return response.redirect().back()
  }
}
