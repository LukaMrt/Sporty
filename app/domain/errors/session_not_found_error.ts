export class SessionNotFoundError extends Error {
  constructor(id?: number) {
    super(id !== undefined ? `Séance #${id} introuvable` : 'Séance introuvable')
    this.name = 'SessionNotFoundError'
  }
}
