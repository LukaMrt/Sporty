export class ConnectorNotConnectedError extends Error {
  constructor(provider?: string) {
    super(provider ? `Connector ${provider} not connected` : 'Connector not connected')
    this.name = 'ConnectorNotConnectedError'
  }
}
