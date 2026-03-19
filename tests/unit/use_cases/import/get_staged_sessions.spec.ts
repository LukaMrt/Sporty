import { test } from '@japa/runner'
import GetStagedSessions from '#use_cases/import/get_staged_sessions'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type {
  StagingSessionRecord,
  ImportedSessionRef,
} from '#domain/interfaces/import_session_repository'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type {
  ConnectorFullRecord,
  ConnectorRecord,
  ConnectorByIdRecord,
  ActiveConnectorRecord,
  ConnectorSettingsRecord,
  UpdateTokensInput,
  UpdateSettingsInput,
  UpsertConnectorInput,
} from '#domain/interfaces/connector_repository'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'

function makeConnectorRepository(
  overrides: Partial<{ findFullByUserAndProvider: () => Promise<ConnectorFullRecord | null> }> = {}
): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findById(): Promise<ConnectorByIdRecord | null> {
      return null
    }
    async updateLastSyncAt() {}
    async findAllAutoImportEnabled(): Promise<ActiveConnectorRecord[]> {
      return []
    }
    async upsert(_data: UpsertConnectorInput) {}
    async findFullByUserAndProvider(): Promise<ConnectorFullRecord | null> {
      return null
    }
    async findByUserAndProvider(): Promise<ConnectorRecord | null> {
      return null
    }
    async disconnect() {}
    async updateTokens(_u: number, _p: ConnectorProvider, _d: UpdateTokensInput) {}
    async setStatus(_u: number, _p: ConnectorProvider, _s: ConnectorStatus) {}
    async updateSettings(_u: number, _p: ConnectorProvider, _d: UpdateSettingsInput) {}
    async findSettings(): Promise<ConnectorSettingsRecord | null> {
      return null
    }
  }
  return Object.assign(new Mock(), overrides)
}

function makeImportRepo(records: StagingSessionRecord[] = []): ImportSessionRepository {
  class Mock extends ImportSessionRepository {
    async upsertMany() {}
    async findByConnectorId(): Promise<StagingSessionRecord[]> {
      return records
    }
    async findByIds(): Promise<StagingSessionRecord[]> {
      return []
    }
    async setImported() {}
    async setIgnored() {}
    async setNew() {}
    async setFailed() {}
    async markImportedBulk(_connectorId: number, _refs: ImportedSessionRef[]) {}
    async resetForReimport(): Promise<null> {
      return null
    }
  }
  return new Mock()
}

test.group('GetStagedSessions', () => {
  test('retourne [] si aucun connecteur trouvé', async ({ assert }) => {
    const useCase = new GetStagedSessions(makeImportRepo(), makeConnectorRepository())
    const result = await useCase.execute(1, 'strava')
    assert.deepEqual(result, [])
  })

  test('retourne les sessions staging quand connecteur existe', async ({ assert }) => {
    const records: StagingSessionRecord[] = [
      { id: 1, externalId: 'ext-1', status: ImportSessionStatus.New, rawData: null },
      { id: 2, externalId: 'ext-2', status: ImportSessionStatus.Imported, rawData: null },
    ]
    const repo = makeConnectorRepository({
      findFullByUserAndProvider: async () => ({
        id: 42,
        status: 'error' as ConnectorStatus,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAtSeconds: null,
      }),
    })
    const useCase = new GetStagedSessions(makeImportRepo(records), repo)
    const result = await useCase.execute(1, 'strava')
    assert.equal(result.length, 2)
    assert.equal(result[0].externalId, 'ext-1')
  })
})
