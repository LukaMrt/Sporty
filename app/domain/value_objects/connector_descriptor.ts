import { ConnectorProvider } from '#domain/value_objects/connector_provider'

/**
 * Mode d'authentification d'un connecteur.
 * - `oauth` : redirection vers le provider puis callback (Strava)
 * - `api_key` : l'utilisateur saisit une cle, pas de redirection
 */
export const ConnectorAuthKind = {
  OAuth: 'oauth',
  ApiKey: 'api_key',
} as const

export type ConnectorAuthKind = (typeof ConnectorAuthKind)[keyof typeof ConnectorAuthKind]

export interface ConnectorDescriptor {
  provider: ConnectorProvider
  authKind: ConnectorAuthKind
  /** Segment du namespace i18n : `connectors.<i18nKey>.*` */
  i18nKey: string
}

export const CONNECTOR_DESCRIPTORS: Record<ConnectorProvider, ConnectorDescriptor> = {
  [ConnectorProvider.Strava]: {
    provider: ConnectorProvider.Strava,
    authKind: ConnectorAuthKind.OAuth,
    i18nKey: 'strava',
  },
  [ConnectorProvider.OpenWearables]: {
    provider: ConnectorProvider.OpenWearables,
    authKind: ConnectorAuthKind.ApiKey,
    i18nKey: 'openWearables',
  },
}

const KNOWN_PROVIDERS = new Set<string>(Object.values(ConnectorProvider))

/**
 * Vrai si le slug correspond a un provider connu du domaine.
 *
 * A ne pas confondre avec `ConnectorRegistry.has()`, qui indique si une factory
 * est effectivement enregistree pour ce provider. Un provider peut etre connu du
 * domaine sans etre encore branche : les routes doivent alors repondre 404, pas 500.
 */
export function isKnownProvider(value: string): value is ConnectorProvider {
  return KNOWN_PROVIDERS.has(value)
}

export function describeProvider(provider: ConnectorProvider): ConnectorDescriptor {
  return CONNECTOR_DESCRIPTORS[provider]
}
