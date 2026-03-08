export class ConnectorNotFoundError extends Error {
  constructor(provider?: string) {
    super(provider ? `Connecteur ${provider} introuvable` : 'Connecteur introuvable')
    this.name = 'ConnectorNotFoundError'
  }
}
