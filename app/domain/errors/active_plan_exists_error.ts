export class ActivePlanExistsError extends Error {
  readonly i18nKey = 'planning.errors.activePlanExists'

  constructor() {
    super('Un plan actif existe déjà pour cet utilisateur')
    this.name = 'ActivePlanExistsError'
  }
}
