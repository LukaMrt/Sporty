export class InvalidCredentialsError extends Error {
  constructor() {
    super('Identifiants incorrects')
    this.name = 'InvalidCredentialsError'
  }
}
