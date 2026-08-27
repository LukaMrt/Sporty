export class InvalidApiKeyError extends Error {
  constructor(provider?: string) {
    super(provider ? `Cle API invalide pour ${provider}` : 'Cle API invalide')
    this.name = 'InvalidApiKeyError'
  }
}
