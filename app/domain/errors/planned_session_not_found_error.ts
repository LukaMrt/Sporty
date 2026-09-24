export class PlannedSessionNotFoundError extends Error {
  readonly i18nKey = 'planning.errors.plannedSessionNotFound'

  constructor(id?: number) {
    super(id !== undefined ? `Séance planifiée #${id} introuvable` : 'Séance planifiée introuvable')
    this.name = 'PlannedSessionNotFoundError'
  }
}
