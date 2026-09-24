import { inject } from '@adonisjs/core'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import { Logger } from '#domain/interfaces/logger'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorNotConnectedError } from '#domain/errors/connector_not_connected_error'
import SyncWellness from '#use_cases/wellness/sync_wellness'

const DAY_MS = 86_400_000
/** Fenêtre par requête : limite la taille des réponses et permet la progression */
const CHUNK_DAYS = 90

export interface BackfillResult {
  stagedSessions: number
  wellnessDays: number
}

/**
 * Import de l'historique (A3) : met en staging les séances des `months`
 * derniers mois (l'utilisateur choisit ensuite quoi importer) et récupère les
 * métriques de récupération de la même période. Lancé en tâche de fond.
 */
@inject()
export default class BackfillConnector {
  constructor(
    private registry: ConnectorRegistry,
    private connectorRepository: ConnectorRepository,
    private importSessionRepository: ImportSessionRepository,
    private syncWellness: SyncWellness,
    private logger: Logger
  ) {}

  async execute(userId: number, provider: ConnectorProvider, months = 24): Promise<BackfillResult> {
    if (!this.registry.has(provider)) throw new ConnectorNotConnectedError(provider)
    const connector = await this.registry.getFactory(provider).make(userId)
    const record = await this.connectorRepository.findFullByUserAndProvider(userId, provider)
    if (!connector || !record) throw new ConnectorNotConnectedError(provider)

    const now = Date.now()
    const start = now - months * 30 * DAY_MS
    let stagedSessions = 0
    let wellnessDays = 0

    for (let chunkStart = start; chunkStart < now; chunkStart += CHUNK_DAYS * DAY_MS) {
      const after = new Date(chunkStart)
      const before = new Date(Math.min(chunkStart + CHUNK_DAYS * DAY_MS, now))
      const sessions = await connector.listSessions({ after, before })
      await this.importSessionRepository.upsertMany(
        record.id,
        sessions.map((s) => ({
          externalId: s.externalId,
          rawData: s as unknown as Record<string, unknown>,
        }))
      )
      stagedSessions += sessions.length
      wellnessDays += await this.syncWellness.execute(userId, provider, after, before)
      this.logger.info(
        { userId, provider, until: before.toISOString().slice(0, 10), stagedSessions },
        'Backfill progress'
      )
    }

    return { stagedSessions, wellnessDays }
  }
}
