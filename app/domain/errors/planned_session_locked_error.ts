export class PlannedSessionLockedError extends Error {
  constructor() {
    super('Une séance déjà complétée ne peut plus être modifiée')
    this.name = 'PlannedSessionLockedError'
  }
}
