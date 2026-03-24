export class PlannedSessionNotFoundError extends Error {
  constructor(id?: number) {
    super(id !== undefined ? `Séance planifiée #${id} introuvable` : 'Séance planifiée introuvable')
    this.name = 'PlannedSessionNotFoundError'
  }
}
