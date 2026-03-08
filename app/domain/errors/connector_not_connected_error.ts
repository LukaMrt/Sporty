export class ConnectorNotConnectedError extends Error {
  constructor(provider?: string) {
    super(provider ? `Connecteur ${provider} non connecté` : 'Connecteur non connecté')
    this.name = 'ConnectorNotConnectedError'
  }
}
