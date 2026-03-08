import { DateTime } from 'luxon'
import ConnectorModel from '#models/connector'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { UpsertConnectorInput, ConnectorRecord } from '#domain/interfaces/connector_repository'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

export default class LucidConnectorRepository extends ConnectorRepository {
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
}
