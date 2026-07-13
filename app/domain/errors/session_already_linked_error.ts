export class SessionAlreadyLinkedError extends Error {
  constructor() {
    super('Cette séance réalisée est déjà liée à une autre séance planifiée')
    this.name = 'SessionAlreadyLinkedError'
  }
}
