import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

export type VerifiedApiKeyIdentity = {
  externalUserId: string
  displayName: string
}

/**
 * Verifie une cle API aupres du provider et resout l'identite distante.
 *
 * Ce port existe parce qu'un use case ne peut pas appeler le reseau : la regle
 * dependency-cruiser `use-cases-only-domain` lui interdit d'importer #connectors.
 */
export abstract class ApiKeyConnectorVerifier {
  abstract verify(provider: ConnectorProvider, apiKey: string): Promise<VerifiedApiKeyIdentity>
}
