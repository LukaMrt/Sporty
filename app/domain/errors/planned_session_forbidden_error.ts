export class PlannedSessionForbiddenError extends Error {
  constructor() {
    super("Cette séance planifiée n'appartient pas à votre plan actif")
    this.name = 'PlannedSessionForbiddenError'
  }
}
