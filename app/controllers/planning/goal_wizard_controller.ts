import type { HttpContext } from '@adonisjs/core/http'

export default class GoalWizardController {
  async create({ inertia }: HttpContext) {
    return inertia.render('Planning/GoalCreate', {})
  }
}
