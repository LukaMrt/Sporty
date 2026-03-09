import { DateTime } from 'luxon'
import ConnectorModel from '#models/connector'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type {
  UpsertConnectorInput,
  ConnectorRecord,
  ConnectorFullRecord,
  UpdateTokensInput,
} from '#domain/interfaces/connector_repository'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'

export default class LucidConnectorRepository extends ConnectorRepository {
  async findFullByUserAndProvider(
    userId: number,
    provider: ConnectorProvider
  ): Promise<ConnectorFullRecord | null> {
    const connector = await ConnectorModel.query()
      .where('user_id', userId)
      .where('provider', provider)
      .first()
    if (!connector) return null
    return {
      id: connector.id,
      status: connector.status,
      accessToken: connector.encryptedAccessToken,
      refreshToken: connector.encryptedRefreshToken,
      tokenExpiresAtSeconds: connector.tokenExpiresAt
        ? Math.floor(connector.tokenExpiresAt.toSeconds())
        : null,
    }
  }

  async findByUserAndProvider(
    userId: number,
    provider: ConnectorProvider
  ): Promise<ConnectorRecord | null> {
    const connector = await ConnectorModel.query()
      .where('user_id', userId)
      .where('provider', provider)
      .first()
    return connector
      ? { status: connector.status, accessToken: connector.encryptedAccessToken }
      : null
  }

  async disconnect(userId: number, provider: ConnectorProvider): Promise<void> {
    await ConnectorModel.query().where('user_id', userId).where('provider', provider).delete()
  }

  async upsert(data: UpsertConnectorInput): Promise<void> {
    await ConnectorModel.updateOrCreate(
      { userId: data.userId, provider: data.provider },
      {
        encryptedAccessToken: data.accessToken,
        encryptedRefreshToken: data.refreshToken,
        tokenExpiresAt: DateTime.fromSeconds(data.tokenExpiresAtSeconds),
        status: data.status,
      }
    )
  }

  async updateTokens(
    userId: number,
    provider: ConnectorProvider,
    data: UpdateTokensInput
  ): Promise<void> {
    const connector = await ConnectorModel.query()
      .where('user_id', userId)
      .where('provider', provider)
      .firstOrFail()
    connector.encryptedAccessToken = data.accessToken
    connector.encryptedRefreshToken = data.refreshToken
    connector.tokenExpiresAt = DateTime.fromSeconds(data.tokenExpiresAtSeconds)
    await connector.save()
  }

  async setStatus(
    userId: number,
    provider: ConnectorProvider,
    status: ConnectorStatus
  ): Promise<void> {
    await ConnectorModel.query()
      .where('user_id', userId)
      .where('provider', provider)
      .update({ status })
  }
}
