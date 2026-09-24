import { inject } from '@adonisjs/core'
import DetectWeekCompletion from '#use_cases/planning/detect_week_completion'

/**
 * `session:completed` → liaison automatique à la séance planifiée et détection
 * de fin de semaine (anciennement `UpdateFitnessProfileListener`, qui ne mettait
 * à jour aucun profil).
 */
@inject()
export default class DetectWeekCompletionListener {
  constructor(private detectWeekCompletion: DetectWeekCompletion) {}

  async handle({ sessionId, userId }: { sessionId: number; userId: number }): Promise<void> {
    await this.detectWeekCompletion.execute(userId, sessionId)
  }
}
