import env from '#start/env'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes('change-me')
}

/**
 * Vrai si la configuration serveur necessaire au provider est presente.
 *
 * Source unique : les deux controleurs connecteurs divergeaient auparavant, l'un
 * testant les placeholders `change-me` et l'autre non.
 */
export function isProviderConfigured(provider: ConnectorProvider): boolean {
  switch (provider) {
    case ConnectorProvider.Strava:
      return (
        !isPlaceholder(env.get('STRAVA_CLIENT_ID')) &&
        !isPlaceholder(env.get('STRAVA_CLIENT_SECRET'))
      )
    case ConnectorProvider.OpenWearables:
      // La cle de chiffrement est indispensable : sans elle, le modele Lucid
      // jette a l'ecriture de la cle API.
      return Boolean(env.get('OPEN_WEARABLES_BASE_URL') && env.get('CONNECTOR_ENCRYPTION_KEY'))
    default:
      return false
  }
}
