export abstract class ConnectorScheduler {
  abstract start(): Promise<void>
  abstract stop(): void
  abstract addConnector(connectorId: number, userId: number, intervalMinutes: number): void
  abstract removeConnector(connectorId: number): void
  abstract updateInterval(connectorId: number, newIntervalMinutes: number): void
}
