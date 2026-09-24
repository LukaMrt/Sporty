import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { WebhookVerifier } from '#domain/interfaces/webhook_verifier'
import { Logger } from '#domain/interfaces/logger'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import SyncConnector from '#use_cases/connectors/sync_connector'
import SyncWellness from '#use_cases/wellness/sync_wellness'

export type WebhookOutcome = 'invalid_signature' | 'ignored' | 'processed'

interface OwWebhookEvent {
  type?: string
  data?: { user_id?: string; userId?: string }
}

/**
 * Webhooks Open Wearables (A2) : import quasi temps réel au lieu d'attendre le
 * prochain tick de polling (qui reste en filet de sécurité).
 * - `workout.*` → synchronisation des séances
 * - `sleep.*`, `timeseries.*` → métriques de récupération des 3 derniers jours
 */
@inject()
export default class HandleOpenWearablesWebhook {
  constructor(
    private verifier: WebhookVerifier,
    private connectorRepository: ConnectorRepository,
    private syncConnector: SyncConnector,
    private syncWellness: SyncWellness,
    private logger: Logger
  ) {}

  async execute(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<WebhookOutcome> {
    if (!this.verifier.verify(rawBody, headers)) return 'invalid_signature'

    let event: OwWebhookEvent
    try {
      event = JSON.parse(rawBody) as OwWebhookEvent
    } catch {
      return 'ignored'
    }
    const externalUserId = event.data?.user_id ?? event.data?.userId
    if (!event.type || !externalUserId) return 'ignored'

    const connector = await this.connectorRepository.findByExternalUserId(
      ConnectorProvider.OpenWearables,
      externalUserId
    )
    if (!connector) return 'ignored'

    // Traitement différé : le webhook doit répondre vite (sinon Svix relance)
    const task = event.type.startsWith('workout.')
      ? () => this.syncConnector.execute({ connectorId: connector.id })
      : event.type.startsWith('sleep.') || event.type.startsWith('timeseries.')
        ? () =>
            this.syncWellness.execute(
              connector.userId,
              ConnectorProvider.OpenWearables,
              new Date(Date.now() - 3 * 86_400_000)
            )
        : null
    if (!task) return 'ignored'

    setImmediate(() => {
      task().catch((error: unknown) => {
        this.logger.error({ err: error, type: event.type }, 'Webhook processing failed')
      })
    })
    return 'processed'
  }
}
