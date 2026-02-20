export class NoRegisteredUserError extends Error {
  constructor() {
    super('Aucun utilisateur enregistré')
    this.name = 'NoRegisteredUserError'
  }
}
