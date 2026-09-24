/** Objectif inexistant ou appartenant à un autre utilisateur (même réponse : pas de fuite d'existence) */
export class GoalNotFoundError extends Error {
  readonly i18nKey = 'planning.errors.goalNotFound'

  constructor(goalId: number) {
    super(`Goal #${goalId} not found`)
    this.name = 'GoalNotFoundError'
  }
}
