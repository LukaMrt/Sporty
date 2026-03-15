import { test } from '@japa/runner'
import SyncConnector from '#use_cases/connectors/sync_connector'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { ConnectorByIdRecord } from '#domain/interfaces/connector_repository'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
} from '#domain/interfaces/import_activity_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { ActivityMapper } from '#domain/interfaces/activity_mapper'
import type { MappedSessionData } from '#domain/interfaces/activity_mapper'
import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  ActivityFilters,
  ActivitySummary,
  ActivityDetail,
} from '#domain/interfaces/connector'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { RateLimitExceededError } from '#domain/errors/rate_limit_exceeded_error'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus as ConnectorStatusType } from '#domain/value_objects/connector_status'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConnectorRecord(overrides: Partial<ConnectorByIdRecord> = {}): ConnectorByIdRecord {
  return {
    id: 1,
    userId: 10,
    provider: ConnectorProvider.Strava,
    status: ConnectorStatus.Connected,
    autoImportEnabled: true,
    ...overrides,
  }
}

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
    async getConnectionStatus(): Promise<ConnectorStatusType> {
      return 'connected' as ConnectorStatusType
    }
    async disconnect(): Promise<void> {}
  }
  return Object.assign(new MockConnector(), overrides)
}

function makeFactory(connector: Connector | null = makeConnector()): ConnectorFactory {
  class Mock extends ConnectorFactory {
    async make(_userId: number) {
      return connector
    }
  }
  return new Mock()
}

function makeMapper(mapped?: Partial<MappedSessionData>): ActivityMapper {
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

function makeRateLimiter(): RateLimitManager {
  class Mock extends RateLimitManager {
    update() {}
    async waitIfNeeded() {}
  }
  return new Mock()
}

function makeRegistry(
  overrides: {
    connector?: Connector | null
    mapper?: Partial<MappedSessionData>
  } = {}
): ConnectorRegistry {
  const factory = makeFactory(overrides.connector ?? makeConnector())
  const mapper = makeMapper(overrides.mapper)
  const rateLimiter = makeRateLimiter()

  class Mock extends ConnectorRegistry {
    getFactory() {
      return factory
    }
    getMapper() {
      return mapper
    }
    getRateLimitManager() {
      return rateLimiter
    }
  }
  return new Mock()
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
    async setFailed(_id: number, _reason: string) {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeConnectorRepo(
  record: ConnectorByIdRecord | null = makeConnectorRecord(),
  overrides: Partial<ConnectorRepository> = {}
): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findById(_id: number) {
      return record
    }
    async updateLastSyncAt(_id: number) {}
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

function makeUseCase(
  options: {
    record?: ConnectorByIdRecord | null
    connector?: Connector | null
    connectorRepoOverrides?: Partial<ConnectorRepository>
    importRepoOverrides?: Partial<ImportActivityRepository>
    sports?: SportSummary[]
    sessionRepoOverrides?: Partial<SessionRepository>
    mapperOverrides?: Partial<MappedSessionData>
  } = {}
) {
  return new SyncConnector(
    makeRegistry({
      connector: options.connector ?? makeConnector(),
      mapper: options.mapperOverrides,
    }),
    makeConnectorRepo(
      options.record !== undefined ? options.record : makeConnectorRecord(),
      options.connectorRepoOverrides ?? {}
    ),
    makeImportActivityRepo(options.importRepoOverrides ?? {}),
    makeSportRepo(options.sports ?? []),
    makeSessionRepo(options.sessionRepoOverrides ?? {})
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('SyncConnector', () => {
  test('retourne permanent_error si le connecteur est introuvable', async ({ assert }) => {
    const useCase = makeUseCase({ record: null })
    const result = await useCase.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'permanent_error')
  })

  test("AC#3 — retourne permanent_error si status error (sans appeler l'API)", async ({
    assert,
  }) => {
    let apiCalled = false
    const connector = makeConnector({
      async listActivities() {
        apiCalled = true
        return []
      },
    })
    const record = makeConnectorRecord({ status: ConnectorStatus.Error })
    const useCase = makeUseCase({ record, connector })
    const result = await useCase.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'permanent_error')
    assert.isFalse(apiCalled)
  })

  test("AC#3 — retourne permanent_error si status disconnected (sans appeler l'API)", async ({
    assert,
  }) => {
    let apiCalled = false
    const connector = makeConnector({
      async listActivities() {
        apiCalled = true
        return []
      },
    })
    const record = makeConnectorRecord({ status: ConnectorStatus.Disconnected })
    const useCase = makeUseCase({ record, connector })
    const result = await useCase.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'permanent_error')
    assert.isFalse(apiCalled)
  })

  test('AC#3 — met le status à error dans la BD', async ({ assert }) => {
    let statusSet: ConnectorStatusType | null = null
    const record = makeConnectorRecord({ status: ConnectorStatus.Error })
    const useCase = makeUseCase({
      record,
      connectorRepoOverrides: {
        async setStatus(_userId, _provider, status) {
          statusSet = status
        },
      },
    })
    await useCase.execute({ connectorId: 1 })
    assert.equal(statusSet, ConnectorStatus.Error)
  })

  test('AC#2 — skip import si auto_import_enabled=false', async ({ assert }) => {
    const importRepo = makeImportActivityRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportActivityStatus.New, rawData: {} }]
      },
    })
    const record = makeConnectorRecord({ autoImportEnabled: false })

    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(record),
      importRepo,
      makeSportRepo([{ id: 5, name: 'Running', slug: 'running' }]),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test('retourne success avec 0 imported quand aucune activité new', async ({ assert }) => {
    const importRepo = makeImportActivityRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportActivityStatus.Imported, rawData: {} }]
      },
    })
    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(),
      importRepo,
      makeSportRepo(),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test('AC#1 — importe les activités new et retourne le nombre importé', async ({ assert }) => {
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
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(),
      importRepo,
      makeSportRepo([{ id: 5, name: 'Running', slug: 'running' }]),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 1 })
  })

  test('skip les activités dont le sport est inconnu', async ({ assert }) => {
    const importRepo = makeImportActivityRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportActivityStatus.New, rawData: {} }]
      },
    })
    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(),
      importRepo,
      makeSportRepo([]),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test("ConnectorAuthError levée par l'API → permanent_error et status mis à error", async ({
    assert,
  }) => {
    let statusSet: ConnectorStatusType | null = null
    const connector = makeConnector({
      async listActivities() {
        throw new ConnectorAuthError('strava')
      },
    })
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(makeConnectorRecord(), {
        async setStatus(_userId, _provider, status) {
          statusSet = status
        },
      }),
      makeImportActivityRepo(),
      makeSportRepo(),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'permanent_error')
    assert.equal(statusSet, ConnectorStatus.Error)
  })

  test('AC#4 — RateLimitExceededError → temporary_error', async ({ assert }) => {
    const connector = makeConnector({
      async listActivities() {
        throw new RateLimitExceededError(900)
      },
    })
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(),
      makeImportActivityRepo(),
      makeSportRepo(),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'temporary_error')
  })

  test('erreur temporaire générique → temporary_error', async ({ assert }) => {
    const connector = makeConnector({
      async listActivities() {
        throw new Error('network timeout')
      },
    })
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(),
      makeImportActivityRepo(),
      makeSportRepo(),
      makeSessionRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'temporary_error')
    assert.isTrue('reason' in result && result.reason.includes('network timeout'))
  })

  test('updateLastSyncAt est appelé après sync réussi', async ({ assert }) => {
    let lastSyncUpdated = false
    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(makeConnectorRecord(), {
        async updateLastSyncAt() {
          lastSyncUpdated = true
        },
      }),
      makeImportActivityRepo(),
      makeSportRepo(),
      makeSessionRepo()
    )
    await uc.execute({ connectorId: 1 })
    assert.isTrue(lastSyncUpdated)
  })
})
