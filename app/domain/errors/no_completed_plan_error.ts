export class NoCompletedPlanError extends Error {
  readonly i18nKey = 'planning.errors.noCompletedPlan'

  constructor() {
    super('Aucun plan terminé trouvé pour cet utilisateur')
    this.name = 'NoCompletedPlanError'
  }
}
