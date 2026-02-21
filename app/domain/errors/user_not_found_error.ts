export class UserNotFoundError extends Error {
  constructor(id?: number) {
    super(id !== undefined ? `Utilisateur #${id} introuvable` : 'Utilisateur introuvable')
    this.name = 'UserNotFoundError'
  }
}
