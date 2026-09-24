import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GeneratePlan from '#use_cases/planning/generate_plan'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'
import GetWeekDetail from '#use_cases/planning/get_week_detail'
import AdjustPlan from '#use_cases/planning/adjust_plan'
import LinkCompletedSession from '#use_cases/planning/link_completed_session'
import GenerateTransitionPlan from '#use_cases/planning/generate_transition_plan'
import GenerateMaintenancePlan from '#use_cases/planning/generate_maintenance_plan'
import AbandonPlan from '#use_cases/planning/abandon_plan'
import GetPostPlanState from '#use_cases/planning/get_post_plan_state'
import AdvancePlanLifecycle from '#use_cases/planning/advance_plan_lifecycle'
import { generatePlanValidator } from '#validators/planning/generate_plan_validator'
import {
  adjustSessionValidator,
  linkCompletedSessionValidator,
} from '#validators/planning/adjust_session_validator'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'
import { NoCompletedPlanError } from '#domain/errors/no_completed_plan_error'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'

@inject()
export default class PlanningController {
  constructor(
    private generatePlanUseCase: GeneratePlan,
    private getPlanOverview: GetPlanOverview,
    private getWeekDetail: GetWeekDetail,
    private adjustPlanUseCase: AdjustPlan,
    private linkCompletedSessionUseCase: LinkCompletedSession,
    private generateTransitionPlanUseCase: GenerateTransitionPlan,
    private generateMaintenancePlanUseCase: GenerateMaintenancePlan,
    private abandonPlanUseCase: AbandonPlan,
    private getPostPlanStateUseCase: GetPostPlanState,
    private advancePlanLifecycle: AdvancePlanLifecycle
  ) {}

  /** Traduit une erreur métier (clé i18n si disponible) */
  #message(error: Error, i18n: HttpContext['i18n']): string {
    const key = (error as Error & { i18nKey?: string }).i18nKey
    return key ? i18n.t(key) : error.message
  }

  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    // Transitions explicites (idempotentes, sous verrou) avant la lecture
    await this.advancePlanLifecycle.execute(user.id)
    const overview = await this.getPlanOverview.execute(user.id)

    if (overview) {
      const { fitnessProfile, ...rest } = overview
      return inertia.render('Planning/Index', {
        overview: {
          ...rest,
          fitnessProfile: fitnessProfile
            ? {
                ctl: Math.round(fitnessProfile.chronicTrainingLoad),
                atl: Math.round(fitnessProfile.acuteTrainingLoad),
                tsb: Math.round(fitnessProfile.trainingStressBalance),
                acwr: Math.round(fitnessProfile.acuteChronicWorkloadRatio * 100) / 100,
              }
            : null,
          inactivityLevel: rest.inactivityLevel,
          daysSinceLastSession: rest.daysSinceLastSession,
        },
        postPlanState: null,
      })
    }

    const postPlanState = await this.getPostPlanStateUseCase.execute(user.id)
    return inertia.render('Planning/Index', { overview: null, postPlanState })
  }

  async weekDetail({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const overview = await this.getPlanOverview.execute(user.id)
    if (!overview) {
      return response.notFound({ error: 'No active plan' })
    }

    const weekNumber = Number(params.weekNumber)
    const detail = await this.getWeekDetail.execute(overview.plan.id, weekNumber)
    if (!detail) {
      return response.notFound({ error: 'Week not found' })
    }

    return response.ok(detail)
  }

  async generate({ request, response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(generatePlanValidator)

    try {
      const result = await this.generatePlanUseCase.execute({
        userId: user.id,
        vdot: data.vdot,
        sessionsPerWeek: data.sessions_per_week,
        preferredDays: data.preferred_days,
        planDurationWeeks: data.plan_duration_weeks,
      })

      if (request.accepts(['json'])) {
        return response.ok({ ok: true, volumeAdjusted: result.volumeAdjusted })
      }
      if (result.volumeAdjusted) {
        session.flash('warning', i18n.t('planning.flash.volumeAdjusted'))
      }
      return response.redirect().toPath('/planning')
    } catch (error) {
      if (error instanceof NoActiveGoalError || error instanceof ActivePlanExistsError) {
        if (request.accepts(['json'])) {
          return response.unprocessableEntity({ message: this.#message(error, i18n) })
        }
        session.flash('error', this.#message(error, i18n))
        return response.redirect().back()
      }
      throw error
    }
  }

  async generateTransition({ response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      await this.generateTransitionPlanUseCase.execute(user.id)
      return response.redirect().toPath('/planning')
    } catch (error) {
      if (error instanceof NoCompletedPlanError) {
        session.flash('error', this.#message(error, i18n))
        return response.redirect().back()
      }
      throw error
    }
  }

  async generateMaintenance({ response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      await this.generateMaintenancePlanUseCase.execute(user.id)
      return response.redirect().toPath('/planning')
    } catch (error) {
      if (error instanceof NoCompletedPlanError) {
        session.flash('error', this.#message(error, i18n))
        return response.redirect().back()
      }
      throw error
    }
  }

  async abandon({ response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.abandonPlanUseCase.execute(user.id)
    return response.redirect().toPath('/planning')
  }

  async updateSession({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(adjustSessionValidator)

    try {
      await this.adjustPlanUseCase.execute({
        userId: user.id,
        sessionId: Number(params.id),
        dayOfWeek: data.day_of_week,
        targetDurationMinutes: data.target_duration_minutes,
        targetPacePerKm: data.target_pace_per_km,
      })
      return response.redirect().back()
    } catch (error) {
      if (error instanceof PlannedSessionNotFoundError) {
        session.flash('error', this.#message(error, i18n))
        return response.redirect().back()
      }
      if (error instanceof PlannedSessionForbiddenError) {
        session.flash('error', this.#message(error, i18n))
        return response.redirect().back()
      }
      throw error
    }
  }

  async linkSession({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(linkCompletedSessionValidator)

    try {
      await this.linkCompletedSessionUseCase.execute({
        userId: user.id,
        plannedSessionId: Number(params.id),
        completedSessionId: data.completed_session_id,
      })
      return response.redirect().back()
    } catch (error) {
      if (
        error instanceof PlannedSessionNotFoundError ||
        error instanceof PlannedSessionForbiddenError ||
        error instanceof SessionNotFoundError
      ) {
        session.flash('error', this.#message(error, i18n))
        return response.redirect().back()
      }
      throw error
    }
  }
}
