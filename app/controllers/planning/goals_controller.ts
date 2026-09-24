import { DateTime } from 'luxon'
import { GoalNotFoundError } from '#domain/errors/goal_not_found_error'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CreateGoal from '#use_cases/planning/create_goal'
import UpdateGoal from '#use_cases/planning/update_goal'
import AbandonGoal from '#use_cases/planning/abandon_goal'
import { ActiveGoalExistsError } from '#domain/errors/active_goal_exists_error'
import { createGoalValidator, updateGoalValidator } from '#validators/planning/goal_validator'

@inject()
export default class GoalsController {
  constructor(
    private createGoalUseCase: CreateGoal,
    private updateGoalUseCase: UpdateGoal,
    private abandonGoalUseCase: AbandonGoal
  ) {}

  async store({ request, response, auth, i18n }: HttpContext) {
    const data = await request.validateUsing(createGoalValidator)
    const userId = auth.user!.id

    try {
      const goal = await this.createGoalUseCase.execute({
        userId,
        targetDistanceKm: data.target_distance_km,
        targetTimeMinutes: data.target_time_minutes ?? null,
        eventDate: data.event_date ? DateTime.fromJSDate(data.event_date).toISODate() : null,
      })
      return response.json({ goal })
    } catch (error) {
      if (error instanceof ActiveGoalExistsError) {
        return response.unprocessableEntity({ message: i18n.t(error.i18nKey) })
      }
      throw error
    }
  }

  async update({ request, response, params, auth }: HttpContext) {
    const data = await request.validateUsing(updateGoalValidator)
    try {
      const goal = await this.updateGoalUseCase.execute({
        goalId: Number(params.id),
        userId: auth.user!.id,
        targetDistanceKm: data.target_distance_km,
        targetTimeMinutes: data.target_time_minutes,
        eventDate: data.event_date
          ? DateTime.fromJSDate(data.event_date).toISODate()
          : data.event_date,
      })
      return response.json({ goal })
    } catch (error) {
      if (error instanceof GoalNotFoundError) return response.notFound()
      throw error
    }
  }

  async abandon({ response, params, auth }: HttpContext) {
    try {
      await this.abandonGoalUseCase.execute(Number(params.id), auth.user!.id)
      return response.json({ success: true })
    } catch (error) {
      if (error instanceof GoalNotFoundError) return response.notFound()
      throw error
    }
  }
}
