export class SessionForbiddenError extends Error {
  constructor() {
    super('Accès à cette séance non autorisé')
    this.name = 'SessionForbiddenError'
  }
}
