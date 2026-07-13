import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ResumeFromInactivity from '#use_cases/planning/resume_from_inactivity'
import AbandonGoal from '#use_cases/planning/abandon_goal'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'

@inject()
export default class InactivityController {
  constructor(
    private resumeFromInactivityUseCase: ResumeFromInactivity,
    private abandonGoalUseCase: AbandonGoal,
    private getPlanOverviewUseCase: GetPlanOverview
  ) {}

  async resume({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    // La durée d'inactivité est recalculée côté serveur par le use case —
    // aucune donnée client n'est utilisée pour ajuster le VDOT.
    await this.resumeFromInactivityUseCase.execute(user.id)
    return response.redirect().toPath('/planning')
  }

  async abandonForNewPlan({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const overview = await this.getPlanOverviewUseCase.execute(user.id)
    if (!overview || !overview.goal) return response.redirect().toPath('/planning')

    await this.abandonGoalUseCase.execute(overview.goal.id, user.id)
    return response.redirect().toPath('/planning/goal')
  }
}
