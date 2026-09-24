import { inject } from '@adonisjs/core'
import RecomputeSessionMetrics from '#use_cases/sessions/recompute_session_metrics'
import { Logger } from '#domain/interfaces/logger'

/** `profile:hr_changed` → recalcul des métriques FC et de la charge de toutes les séances */
@inject()
export default class RecomputeSessionMetricsListener {
  constructor(
    private recompute: RecomputeSessionMetrics,
    private logger: Logger
  ) {}

  async handle({ userId }: { userId: number }): Promise<void> {
    // Hors du cycle de la requête : plusieurs centaines de séances JSONB
    setImmediate(() => {
      this.recompute.execute(userId).catch((error) => {
        this.logger.error({ err: error, userId }, 'Session metrics recompute failed')
      })
    })
  }
}
