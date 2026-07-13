export class SessionDayConflictError extends Error {
  constructor() {
    super('Une autre séance est déjà planifiée ce jour-là')
    this.name = 'SessionDayConflictError'
  }
}
