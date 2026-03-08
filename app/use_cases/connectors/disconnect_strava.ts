import { inject } from '@adonisjs/core'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

@inject()
export default class DisconnectStrava {
  constructor(private connectorRepository: ConnectorRepository) {}

  async execute(userId: number): Promise<void> {
    const connector = await this.connectorRepository.findByUserAndProvider(
      userId,
      ConnectorProvider.Strava
    )

    // Appel deauthorize best-effort : on ne bloque pas si Strava est indisponible
    if (connector?.accessToken) {
      try {
        await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ access_token: connector.accessToken }),
        })
      } catch {
        // Ignoré volontairement : la déconnexion locale doit toujours réussir (AC#5)
      }
    }

    await this.connectorRepository.disconnect(userId, ConnectorProvider.Strava)
  }
}
