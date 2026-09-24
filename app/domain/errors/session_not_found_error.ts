export class SessionNotFoundError extends Error {
  readonly i18nKey = 'planning.errors.sessionNotFound'

  constructor(id?: number) {
    super(id !== undefined ? `Séance #${id} introuvable` : 'Séance introuvable')
    this.name = 'SessionNotFoundError'
  }
}
