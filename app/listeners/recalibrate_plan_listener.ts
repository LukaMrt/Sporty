import { inject } from '@adonisjs/core'
import RecalibratePlan from '#use_cases/planning/recalibrate_plan'
import type { WeekSummary } from '#domain/value_objects/week_summary'

@inject()
export default class RecalibratePlanListener {
  constructor(private recalibratePlanUseCase: RecalibratePlan) {}

  async handle({
    userId,
    weekSummary,
  }: {
    userId: number
    planId: number
    weekSummary: WeekSummary
  }): Promise<void> {
    await this.recalibratePlanUseCase.execute(userId, weekSummary)
  }
}
