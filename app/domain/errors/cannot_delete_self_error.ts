export class CannotDeleteSelfError extends Error {
  constructor() {
    super('Impossible de supprimer votre propre compte')
    this.name = 'CannotDeleteSelfError'
  }
}
