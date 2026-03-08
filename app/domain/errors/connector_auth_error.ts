export class ConnectorAuthError extends Error {
  constructor(provider?: string) {
    super(
      provider
        ? `Échec d'authentification pour ${provider}`
        : "Échec d'authentification du connecteur"
    )
    this.name = 'ConnectorAuthError'
  }
}
