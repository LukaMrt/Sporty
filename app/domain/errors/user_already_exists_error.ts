export class UserAlreadyExistsError extends Error {
  constructor() {
    super("Un utilisateur existe déjà. L'inscription est fermée.")
    this.name = 'UserAlreadyExistsError'
  }
}
