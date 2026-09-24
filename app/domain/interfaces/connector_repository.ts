import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'

export type UpsertConnectorInput = {
  userId: number
  provider: ConnectorProvider
  accessToken: string
  /** Absent pour les connecteurs a cle API, qui n'ont ni refresh ni expiration. */
  refreshToken?: string | null
  tokenExpiresAtSeconds?: number | null
  /** Identifiant de l'utilisateur chez le provider (UUID open-wearables, athlete_id Strava...). */
  externalUserId?: string | null
  status: ConnectorStatus
}

export type ConnectorRecord = {
  status: ConnectorStatus
  accessToken: string | null
}

export type ConnectorFullRecord = {
  id: number
  status: ConnectorStatus
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAtSeconds: number | null
  externalUserId: string | null
}

export type UpdateTokensInput = {
  accessToken: string
  refreshToken: string
  tokenExpiresAtSeconds: number
}

export type UpdateSettingsInput = {
  autoImportEnabled: boolean
  pollingIntervalMinutes: number
}

export type ConnectorSettingsRecord = {
  autoImportEnabled: boolean
  pollingIntervalMinutes: number
}

export type ActiveConnectorRecord = {
  id: number
  userId: number
  pollingIntervalMinutes: number
}

export type ConnectorByIdRecord = {
  id: number
  userId: number
  provider: ConnectorProvider
  status: ConnectorStatus
  autoImportEnabled: boolean
  /** Dernière synchronisation réussie (ISO) */
  lastSyncAt?: string | null
}

export abstract class ConnectorRepository {
  abstract findById(id: number): Promise<ConnectorByIdRecord | null>
  abstract updateLastSyncAt(id: number): Promise<void>
  abstract findAllAutoImportEnabled(): Promise<ActiveConnectorRecord[]>
  abstract upsert(data: UpsertConnectorInput): Promise<void>
  abstract findFullByUserAndProvider(
    userId: number,
    provider: ConnectorProvider
  ): Promise<ConnectorFullRecord | null>
  abstract findByUserAndProvider(
    userId: number,
    provider: ConnectorProvider
  ): Promise<ConnectorRecord | null>
  abstract disconnect(userId: number, provider: ConnectorProvider): Promise<void>
  abstract updateTokens(
    userId: number,
    provider: ConnectorProvider,
    data: UpdateTokensInput
  ): Promise<void>
  abstract setStatus(
    userId: number,
    provider: ConnectorProvider,
    status: ConnectorStatus
  ): Promise<void>
  abstract updateSettings(
    userId: number,
    provider: ConnectorProvider,
    data: UpdateSettingsInput
  ): Promise<void>
  abstract findSettings(
    userId: number,
    provider: ConnectorProvider
  ): Promise<ConnectorSettingsRecord | null>

  /** Connecteur d'un provider par identifiant utilisateur distant (webhooks) */
  async findByExternalUserId(
    _provider: ConnectorProvider,
    _externalUserId: string
  ): Promise<ConnectorByIdRecord | null> {
    return null
  }
}
