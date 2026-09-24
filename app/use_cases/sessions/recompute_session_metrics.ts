import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { Logger } from '#domain/interfaces/logger'
import { deriveSessionFields } from '#domain/services/session_derived_fields'

/**
 * Recalcule zones FC, dérive, TRIMP et charge de toutes les séances d'un
 * utilisateur à partir des données brutes stockées et du profil courant.
 * Déclenché quand FCmax, FC repos, sexe ou méthode de zones changent, et
 * utilisable pour remplir la charge des séances historiques.
 */
@inject()
export default class RecomputeSessionMetrics {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private loadCalculator: TrainingLoadCalculator,
    private logger: Logger
  ) {}

  async execute(userId: number): Promise<{ updated: number; failed: number }> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const sessions = await this.sessionRepository.findAllAliveByUserId(userId)
    let updated = 0
    let failed = 0

    for (const session of sessions) {
      try {
        const derived = deriveSessionFields(session, profile, this.loadCalculator)
        await this.sessionRepository.update(session.id, {
          sportMetrics: derived.sportMetrics,
          trainingLoad: derived.trainingLoad,
          loadMethod: derived.loadMethod,
        })
        updated++
      } catch (error) {
        failed++
        this.logger.warn({ err: error, sessionId: session.id }, 'Session metrics recompute failed')
      }
    }

    this.logger.info({ userId, updated, failed }, 'Session metrics recomputed')
    return { updated, failed }
  }
}
