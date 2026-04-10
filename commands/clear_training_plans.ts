import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ClearTrainingPlans extends BaseCommand {
  static commandName = 'plan:clear'
  static description = 'Supprime tous les plans, semaines, séances planifiées et objectifs (dev)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const db = await this.app.container.make('lucid.db')

    this.logger.info('Suppression des données de planification...')

    // Ordre important : enfants avant parents (FK)
    await db.from('planned_sessions').delete()
    await db.from('planned_weeks').delete()
    await db.from('training_plans').delete()
    await db.from('training_goals').delete()

    // Réinitialiser le training_state dans user_profiles
    await db.from('user_profiles').update({ training_state: 'idle' })

    this.logger.success('Tables vidées et training_state remis à "idle".')
  }
}
