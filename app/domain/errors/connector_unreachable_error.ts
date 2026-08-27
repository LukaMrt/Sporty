export class ConnectorUnreachableError extends Error {
  constructor(provider?: string) {
    super(provider ? `Connecteur ${provider} injoignable` : 'Connecteur injoignable')
    this.name = 'ConnectorUnreachableError'
  }
}
