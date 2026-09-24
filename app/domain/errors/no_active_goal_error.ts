export class NoActiveGoalError extends Error {
  readonly i18nKey = 'planning.errors.noActiveGoal'

  constructor() {
    super('Aucun objectif actif trouvé pour cet utilisateur')
    this.name = 'NoActiveGoalError'
  }
}
