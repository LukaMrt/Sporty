export class ActivePlanExistsError extends Error {
  constructor() {
    super('Un plan actif existe déjà pour cet utilisateur')
    this.name = 'ActivePlanExistsError'
  }
}
