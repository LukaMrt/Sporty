export class SessionDateMismatchError extends Error {
  constructor() {
    super('La date de la séance réalisée ne correspond pas à la semaine planifiée')
    this.name = 'SessionDateMismatchError'
  }
}
