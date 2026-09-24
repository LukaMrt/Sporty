import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Recalcule zones, TRIMP et charge stockée des séances (ex. après déploiement
 * de la charge stockée : l'historique n'a pas encore de `training_load`).
 */
export default class RecomputeSessionMetricsCommand extends BaseCommand {
  static commandName = 'sessions:recompute'
  static description = 'Recalcule les métriques dérivées et la charge des séances'
  static options: CommandOptions = { startApp: true }

  @flags.number({ description: 'Limiter à un utilisateur' })
  declare user?: number

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { default: RecomputeSessionMetrics } =
      await import('#use_cases/sessions/recompute_session_metrics')
    const useCase = await this.app.container.make(RecomputeSessionMetrics)

    const userIds = this.user
      ? [this.user]
      : ((await db.from('users').select('id')) as { id: number }[]).map((u) => u.id)

    for (const userId of userIds) {
      const { updated, failed } = await useCase.execute(userId)
      this.logger.info(`user ${userId}: ${updated} séances recalculées, ${failed} en échec`)
    }
  }
}
