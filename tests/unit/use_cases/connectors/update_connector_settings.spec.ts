import { test } from '@japa/runner'
import UpdateConnectorSettings from '#use_cases/connectors/update_connector_settings'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type {
  UpsertConnectorInput,
  ConnectorRecord,
  ConnectorFullRecord,
  UpdateTokensInput,
  UpdateSettingsInput,
} from '#domain/interfaces/connector_repository'
import { ConnectorNotFoundError } from '#domain/errors/connector_not_found_error'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { ConnectorProvider as ConnectorProviderType } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus as ConnectorStatusType } from '#domain/value_objects/connector_status'

// ─── Mock ────────────────────────────────────────────────────────────────────

function makeConnectorRepository(
  overrides: Partial<ConnectorRepository> = {}
): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findById() {
      return null
    }
    async updateLastSyncAt() {}
    async findAllAutoImportEnabled() {
      return []
    }
    async upsert(_data: UpsertConnectorInput): Promise<void> {}
    async findFullByUserAndProvider(
      _userId: number,
      _provider: ConnectorProviderType
    ): Promise<ConnectorFullRecord | null> {
      return null
    }
    async findByUserAndProvider(
      _userId: number,
      _provider: ConnectorProviderType
    ): Promise<ConnectorRecord | null> {
      return null
    }
    async disconnect(_userId: number, _provider: ConnectorProviderType): Promise<void> {}
    async updateTokens(
      _userId: number,
      _provider: ConnectorProviderType,
      _data: UpdateTokensInput
    ): Promise<void> {}
    async setStatus(
      _userId: number,
      _provider: ConnectorProviderType,
      _status: ConnectorStatusType
    ): Promise<void> {}
    async updateSettings(
      _userId: number,
      _provider: ConnectorProviderType,
      _data: UpdateSettingsInput
    ): Promise<void> {}
    async findSettings() {
      return null
    }
  }
  return Object.assign(new Mock(), overrides)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('UpdateConnectorSettings', () => {
  test('met à jour les settings quand le connecteur est connected', async ({ assert }) => {
    let capturedSettings: UpdateSettingsInput | null = null

    const repo = makeConnectorRepository({
      async findFullByUserAndProvider() {
        return {
          id: 42,
          status: ConnectorStatus.Connected,
          accessToken: 'tok',
          refreshToken: 'ref',
          tokenExpiresAtSeconds: 9999,
        }
      },
      async updateSettings(_userId, _provider, data) {
        capturedSettings = data
      },
    })

    const useCase = new UpdateConnectorSettings(repo)

    await useCase.execute({
      userId: 1,
      provider: ConnectorProvider.Strava,
      autoImportEnabled: true,
      pollingIntervalMinutes: 10,
    })

    assert.deepEqual(capturedSettings, {
      autoImportEnabled: true,
      pollingIntervalMinutes: 10,
    })
  })

  test("lance ConnectorNotFoundError si le connecteur n'existe pas", async ({ assert }) => {
    const repo = makeConnectorRepository({
      async findFullByUserAndProvider() {
        return null
      },
    })

    const useCase = new UpdateConnectorSettings(repo)

    try {
      await useCase.execute({
        userId: 1,
        provider: ConnectorProvider.Strava,
        autoImportEnabled: true,
        pollingIntervalMinutes: 15,
      })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, ConnectorNotFoundError)
    }
  })

  test('lance ConnectorNotFoundError si le connecteur est en erreur', async ({ assert }) => {
    const repo = makeConnectorRepository({
      async findFullByUserAndProvider() {
        return {
          id: 42,
          status: ConnectorStatus.Error,
          accessToken: 'tok',
          refreshToken: 'ref',
          tokenExpiresAtSeconds: 9999,
        }
      },
    })

    const useCase = new UpdateConnectorSettings(repo)

    try {
      await useCase.execute({
        userId: 1,
        provider: ConnectorProvider.Strava,
        autoImportEnabled: true,
        pollingIntervalMinutes: 15,
      })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, ConnectorNotFoundError)
    }
  })
})
