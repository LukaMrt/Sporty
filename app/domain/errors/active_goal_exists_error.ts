export class ActiveGoalExistsError extends Error {
  readonly i18nKey = 'planning.errors.activeGoalExists'

  constructor() {
    super('Un seul objectif actif a la fois')
    this.name = 'ActiveGoalExistsError'
  }
}
