import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'

export interface UpsertConnectorInput {
  userId: number
  provider: ConnectorProvider
  accessToken: string
  refreshToken: string
  tokenExpiresAtSeconds: number
  status: ConnectorStatus
}

export interface ConnectorRecord {
  status: ConnectorStatus
  accessToken: string | null
}

export interface ConnectorFullRecord {
  id: number
  status: ConnectorStatus
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAtSeconds: number | null
}

export interface UpdateTokensInput {
  accessToken: string
  refreshToken: string
  tokenExpiresAtSeconds: number
}

export interface UpdateSettingsInput {
  autoImportEnabled: boolean
  pollingIntervalMinutes: number
}

export interface ConnectorSettingsRecord {
  autoImportEnabled: boolean
  pollingIntervalMinutes: number
}

export abstract class ConnectorRepository {
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
}
