import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'
import type { ActiveConnectorRecord } from '#domain/interfaces/connector_repository'
import type { Logger } from '#domain/interfaces/logger'

export type SyncOutcome = 'success' | 'permanent_error' | 'temporary_error'
export type SyncFn = (connectorId: number) => Promise<{ outcome: SyncOutcome }>
export type LoadConnectorsFn = () => Promise<ActiveConnectorRecord[]>

type ConnectorTimer = {
  userId: number
  intervalMinutes: number
  /** Timeout du premier tick (jitter), puis intervalle régulier */
  handle: NodeJS.Timeout
}

/**
 * Planificateur en mémoire (mono-instance).
 * Chaque connecteur démarre avec un décalage aléatoire (jitter) pour éviter
 * que tous les connecteurs interrogent leur API au même instant après un redémarrage.
 */
export class SyncScheduler extends ConnectorScheduler {
  private timers = new Map<number, ConnectorTimer>()
  private running = new Set<number>()

  constructor(
    private syncFn: SyncFn,
    private loadConnectorsFn: LoadConnectorsFn,
    private logger?: Logger,
    private random: () => number = Math.random
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
      clearTimeout(timer.handle)
    }
    this.timers.clear()
  }

  addConnector(connectorId: number, userId: number, intervalMinutes: number): void {
    this.removeConnector(connectorId)

    const ms = intervalMinutes * 60 * 1000
    // Premier tick décalé d'une fraction aléatoire de l'intervalle, puis régulier.
    // clearTimeout/clearInterval sont interchangeables en Node : un seul handle suffit.
    const timer: ConnectorTimer = {
      userId,
      intervalMinutes,
      handle: setTimeout(
        () => {
          void this.runSync(connectorId)
          timer.handle = setInterval(() => void this.runSync(connectorId), ms)
          timer.handle.unref?.()
        },
        Math.floor(this.random() * ms)
      ),
    }
    timer.handle.unref?.()
    this.timers.set(connectorId, timer)
  }

  removeConnector(connectorId: number): void {
    const existing = this.timers.get(connectorId)
    if (existing) {
      clearTimeout(existing.handle)
      this.timers.delete(connectorId)
    }
  }

  updateInterval(connectorId: number, newIntervalMinutes: number): void {
    const existing = this.timers.get(connectorId)
    if (existing) {
      this.addConnector(connectorId, existing.userId, newIntervalMinutes)
    }
  }

  private async runSync(connectorId: number): Promise<void> {
    // Une synchro longue ne doit pas se chevaucher avec la suivante
    if (this.running.has(connectorId)) return
    this.running.add(connectorId)
    try {
      const result = await this.syncFn(connectorId)
      if (result.outcome === 'permanent_error') {
        this.logger?.warn({ connectorId }, 'Connector sync stopped after permanent error')
        this.removeConnector(connectorId)
      } else if (result.outcome === 'temporary_error') {
        this.logger?.info({ connectorId }, 'Connector sync failed temporarily, will retry')
      }
    } catch (error) {
      // Erreur inattendue : on garde le timer pour la prochaine tentative
      this.logger?.error({ connectorId, err: error }, 'Unexpected connector sync error')
    } finally {
      this.running.delete(connectorId)
    }
  }
}
