import type { ConnectorTokens } from '#domain/interfaces/connector'

/**
 * Échange OAuth d'un provider (autorisation + échange du code).
 * Sort l'appel HTTP et la lecture de configuration de la couche contrôleur.
 */
export abstract class OAuthClient {
  /** Le provider est-il configuré (client id/secret présents) ? */
  abstract isConfigured(): boolean
  abstract authorizationUrl(state: string): string
  abstract exchangeCode(code: string): Promise<ConnectorTokens>
}
