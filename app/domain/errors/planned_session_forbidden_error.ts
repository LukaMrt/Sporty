export class PlannedSessionForbiddenError extends Error {
  readonly i18nKey = 'planning.errors.plannedSessionForbidden'

  constructor() {
    super("Cette séance planifiée n'appartient pas à votre plan actif")
    this.name = 'PlannedSessionForbiddenError'
  }
}
