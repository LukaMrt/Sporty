import { test } from '@japa/runner'
import SyncConnector from '#use_cases/connectors/sync_connector'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
} from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { ActivityMapper } from '#domain/interfaces/activity_mapper'
import type { MappedSessionData } from '#domain/interfaces/activity_mapper'
import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  ActivityFilters,
  ActivitySummary,
  ActivityDetail,
} from '#domain/interfaces/connector'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConnector(overrides: Partial<Connector> = {}): Connector {
  class MockConnector extends Connector {
    readonly id = 42
    async authenticate(): Promise<ConnectorTokens> {
      return { accessToken: 'a', refreshToken: 'r', expiresAt: 9999 }
    }
    async listActivities(_filters: ActivityFilters): Promise<ActivitySummary[]> {
      return []
    }
    async getActivityDetail(_externalId: string): Promise<ActivityDetail> {
      return {
        externalId: 'ext1',
        name: 'Run',
        sportType: 'Run',
        startDate: '2026-03-14',
        durationSeconds: 3600,
        distanceMeters: 10000,
        averageHeartRate: 150,
        metrics: {},
        notes: null,
      }
    }
    async getConnectionStatus(): Promise<ConnectorStatus> {
      return 'connected' as ConnectorStatus
    }
    async disconnect(): Promise<void> {}
  }
  return Object.assign(new MockConnector(), overrides)
}

function makeImportActivityRepo(
  overrides: Partial<ImportActivityRepository> = {}
): ImportActivityRepository {
  class Mock extends ImportActivityRepository {
    async upsertMany(_connectorId: number, _activities: StagingActivityInput[]) {}
    async findByConnectorId(_connectorId: number): Promise<StagingActivityRecord[]> {
      return []
    }
    async findByIds(_ids: number[], _connectorId: number): Promise<StagingActivityRecord[]> {
      return []
    }
    async setImported(_id: number, _sessionId: number) {}
    async setIgnored(_id: number, _userId: number) {}
    async setNew(_id: number, _userId: number) {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeConnectorFactory(connector: Connector | null = null): ConnectorFactory {
  class Mock extends ConnectorFactory {
    async make(_userId: number) {
      return connector
    }
  }
  return new Mock()
}

function makeConnectorRepo(overrides: Partial<ConnectorRepository> = {}): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findAllAutoImportEnabled() {
      return []
    }
    async upsert() {}
    async findFullByUserAndProvider() {
      return null
    }
    async findByUserAndProvider() {
      return null
    }
    async disconnect() {}
    async updateTokens() {}
    async setStatus() {}
    async updateSettings() {}
    async findSettings() {
      return null
    }
  }
  return Object.assign(new Mock(), overrides)
}

function makeSportRepo(sports: SportSummary[] = []): SportRepository {
  class Mock extends SportRepository {
    async findAll() {
      return sports
    }
  }
  return new Mock()
}

function makeSessionRepo(overrides: Partial<SessionRepository> = {}): SessionRepository {
  class Mock extends SessionRepository {
    async create(data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>) {
      return { id: 100, sportName: 'Running', createdAt: '2026-03-14', ...data }
    }
    async findAllByUserId() {
      return { data: [], meta: { total: 0, perPage: 10, page: 1, lastPage: 1 } }
    }
    async findById() {
      return null
    }
    async findByIdIncludingTrashed() {
      return null
    }
    async update() {
      return {} as TrainingSession
    }
    async findTrashedByUserId() {
      return []
    }
    async softDelete() {}
    async restore() {}
    async findByUserIdAndDateRange() {
      return []
    }
  }
  return Object.assign(new Mock(), overrides)
}

function makeActivityMapper(mapped?: Partial<MappedSessionData>): ActivityMapper {
  class Mock extends ActivityMapper {
    map() {
      return {
        sportSlug: 'running',
        date: '2026-03-14',
        durationMinutes: 60,
        distanceKm: 10,
        avgHeartRate: 150,
        importedFrom: 'strava',
        externalId: 'ext1',
        sportMetrics: {},
        ...mapped,
      }
    }
  }
  return new Mock()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('SyncConnector', () => {
  test('retourne permanent_error si le connecteur est null', async ({ assert }) => {
    const useCase = new SyncConnector(
      makeImportActivityRepo(),
      makeConnectorFactory(null),
      makeConnectorRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeActivityMapper()
    )

    const result = await useCase.execute({ connectorId: 1, userId: 10 })

    assert.equal(result.outcome, 'permanent_error')
  })

  test('retourne success avec 0 imported quand aucune activité new', async ({ assert }) => {
    const connector = makeConnector()
    const importRepo = makeImportActivityRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportActivityStatus.Imported, rawData: {} }]
      },
    })

    const useCase = new SyncConnector(
      importRepo,
      makeConnectorFactory(connector),
      makeConnectorRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeActivityMapper()
    )

    const result = await useCase.execute({ connectorId: 42, userId: 10 })

    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test('importe les activités new et retourne le nombre importé', async ({ assert }) => {
    const connector = makeConnector({
      async listActivities() {
        return [
          {
            externalId: 'ext1',
            name: 'Run',
            sportType: 'Run',
            startDate: '2026-03-14',
            durationSeconds: 3600,
            distanceMeters: 10000,
            averageHeartRate: 150,
          },
        ]
      },
    })

    const importRepo = makeImportActivityRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportActivityStatus.New, rawData: {} }]
      },
    })

    const useCase = new SyncConnector(
      importRepo,
      makeConnectorFactory(connector),
      makeConnectorRepo(),
      makeSportRepo([{ id: 5, name: 'Running', slug: 'running' }]),
      makeSessionRepo(),
      makeActivityMapper()
    )

    const result = await useCase.execute({ connectorId: 42, userId: 10 })

    assert.deepEqual(result, { outcome: 'success', imported: 1 })
  })

  test('skip les activités dont le sport est inconnu', async ({ assert }) => {
    const connector = makeConnector()
    const importRepo = makeImportActivityRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportActivityStatus.New, rawData: {} }]
      },
    })

    const useCase = new SyncConnector(
      importRepo,
      makeConnectorFactory(connector),
      makeConnectorRepo(),
      makeSportRepo([]), // aucun sport → slug 'running' introuvable
      makeSessionRepo(),
      makeActivityMapper()
    )

    const result = await useCase.execute({ connectorId: 42, userId: 10 })

    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test('ConnectorAuthError → permanent_error et status mis à error', async ({ assert }) => {
    let statusSet: ConnectorStatus | null = null
    const connector = makeConnector({
      async listActivities() {
        throw new ConnectorAuthError('Strava')
      },
    })

    const connectorRepo = makeConnectorRepo({
      async setStatus(_userId, _provider, status) {
        statusSet = status
      },
    })

    const useCase = new SyncConnector(
      makeImportActivityRepo(),
      makeConnectorFactory(connector),
      connectorRepo,
      makeSportRepo(),
      makeSessionRepo(),
      makeActivityMapper()
    )

    const result = await useCase.execute({ connectorId: 42, userId: 10 })

    assert.equal(result.outcome, 'permanent_error')
    assert.equal(statusSet, 'error')
  })

  test('erreur temporaire (non-auth) → temporary_error', async ({ assert }) => {
    const connector = makeConnector({
      async listActivities() {
        throw new Error('429 Too Many Requests')
      },
    })

    const useCase = new SyncConnector(
      makeImportActivityRepo(),
      makeConnectorFactory(connector),
      makeConnectorRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeActivityMapper()
    )

    const result = await useCase.execute({ connectorId: 42, userId: 10 })

    assert.equal(result.outcome, 'temporary_error')
    assert.isTrue('reason' in result && result.reason.includes('429'))
  })
})
