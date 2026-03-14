import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'
import type { ActiveConnectorRecord } from '#domain/interfaces/connector_repository'

export type SyncOutcome = 'success' | 'permanent_error' | 'temporary_error'
export type SyncFn = (connectorId: number, userId: number) => Promise<{ outcome: SyncOutcome }>
export type LoadConnectorsFn = () => Promise<ActiveConnectorRecord[]>

interface ConnectorTimer {
  userId: number
  intervalMinutes: number
  handle: NodeJS.Timeout
}

export class SyncScheduler extends ConnectorScheduler {
  private timers = new Map<number, ConnectorTimer>()

  constructor(
    private syncFn: SyncFn,
    private loadConnectorsFn: LoadConnectorsFn
  ) {
    super()
  }

  async start(): Promise<void> {
    const connectors = await this.loadConnectorsFn()
    for (const connector of connectors) {
      this.addConnector(connector.id, connector.userId, connector.pollingIntervalMinutes)
    }
  }

  stop(): void {
    for (const [, timer] of this.timers) {
      clearInterval(timer.handle)
    }
    this.timers.clear()
  }

  addConnector(connectorId: number, userId: number, intervalMinutes: number): void {
    this.removeConnector(connectorId)

    const ms = intervalMinutes * 60 * 1000
    const handle = setInterval(() => {
      void this.runSync(connectorId, userId)
    }, ms)

    this.timers.set(connectorId, { userId, intervalMinutes, handle })
  }

  removeConnector(connectorId: number): void {
    const existing = this.timers.get(connectorId)
    if (existing) {
      clearInterval(existing.handle)
      this.timers.delete(connectorId)
    }
  }

  updateInterval(connectorId: number, newIntervalMinutes: number): void {
    const existing = this.timers.get(connectorId)
    if (existing) {
      this.addConnector(connectorId, existing.userId, newIntervalMinutes)
    }
  }

  private async runSync(connectorId: number, userId: number): Promise<void> {
    const result = await this.syncFn(connectorId, userId)
    if (result.outcome === 'permanent_error') {
      this.removeConnector(connectorId)
    }
  }
}
