export class NoActivePlanError extends Error {
  readonly i18nKey = 'planning.errors.noActivePlan'

  constructor() {
    super('No active plan found')
    this.name = 'NoActivePlanError'
  }
}
