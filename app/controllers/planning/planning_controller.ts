import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GeneratePlan from '#use_cases/planning/generate_plan'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'
import GetWeekDetail from '#use_cases/planning/get_week_detail'
import AdjustPlan from '#use_cases/planning/adjust_plan'
import LinkCompletedSession from '#use_cases/planning/link_completed_session'
import { generatePlanValidator } from '#validators/planning/generate_plan_validator'
import {
  adjustSessionValidator,
  linkCompletedSessionValidator,
} from '#validators/planning/adjust_session_validator'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'
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
    private linkCompletedSessionUseCase: LinkCompletedSession
  ) {}

  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const overview = await this.getPlanOverview.execute(user.id)

    if (!overview) return inertia.render('Planning/Index', { overview: null })

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
      },
    })
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

  async generate({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(generatePlanValidator)

    try {
      await this.generatePlanUseCase.execute({
        userId: user.id,
        vdot: data.vdot,
        sessionsPerWeek: data.sessions_per_week,
        preferredDays: data.preferred_days,
        planDurationWeeks: data.plan_duration_weeks,
      })

      if (request.accepts(['json'])) {
        return response.ok({ ok: true })
      }
      return response.redirect().toPath('/planning')
    } catch (error) {
      if (error instanceof NoActiveGoalError || error instanceof ActivePlanExistsError) {
        if (request.accepts(['json'])) {
          return response.unprocessableEntity({ message: error.message })
        }
        session.flash('error', error.message)
        return response.redirect().back()
      }
      throw error
    }
  }

  async updateSession({ params, request, response, auth, session }: HttpContext) {
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
        session.flash('error', error.message)
        return response.redirect().back()
      }
      if (error instanceof PlannedSessionForbiddenError) {
        session.flash('error', error.message)
        return response.redirect().back()
      }
      throw error
    }
  }

  async linkSession({ params, request, response, auth, session }: HttpContext) {
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
        session.flash('error', error.message)
        return response.redirect().back()
      }
      throw error
    }
  }
}
