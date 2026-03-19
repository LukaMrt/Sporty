import { test } from '@japa/runner'
import SyncConnector from '#use_cases/connectors/sync_connector'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import type { ConnectorByIdRecord } from '#domain/interfaces/connector_repository'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type {
  StagingSessionInput,
  StagingSessionRecord,
  ImportedSessionRef,
} from '#domain/interfaces/import_session_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  SessionFilters,
  MappingContext,
  MappedSessionSummary,
  MappedSessionData,
} from '#domain/interfaces/connector'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { RateLimitExceededError } from '#domain/errors/rate_limit_exceeded_error'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'
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
    async listSessions(_filters: SessionFilters): Promise<MappedSessionSummary[]> {
      return []
    }
    async getSessionDetail(
      _externalId: string,
      _context?: MappingContext
    ): Promise<MappedSessionData> {
      return {
        externalId: 'ext1',
        sportSlug: 'running',
        date: '2026-03-14',
        durationMinutes: 60,
        distanceKm: 10,
        avgHeartRate: 150,
        importedFrom: 'strava',
        sportMetrics: {},
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
  } = {}
): ConnectorRegistry {
  const factory = makeFactory(overrides.connector ?? makeConnector())
  const rateLimiter = makeRateLimiter()

  class Mock extends ConnectorRegistry {
    getFactory() {
      return factory
    }
    getRateLimitManager() {
      return rateLimiter
    }
  }
  return new Mock()
}

function makeImportSessionRepo(
  overrides: Partial<ImportSessionRepository> = {}
): ImportSessionRepository {
  class Mock extends ImportSessionRepository {
    async upsertMany(_connectorId: number, _sessions: StagingSessionInput[]) {}
    async findByConnectorId(_connectorId: number): Promise<StagingSessionRecord[]> {
      return []
    }
    async findByIds(_ids: number[], _connectorId: number): Promise<StagingSessionRecord[]> {
      return []
    }
    async setImported(_id: number, _sessionId: number) {}
    async setIgnored(_id: number, _userId: number) {}
    async setNew(_id: number, _userId: number) {}
    async setFailed(_id: number, _reason: string) {}
    async markImportedBulk(_connectorId: number, _refs: ImportedSessionRef[]): Promise<void> {}
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
    async findByUserAndExternalIds() {
      return []
    }
  }
  return Object.assign(new Mock(), overrides)
}

function makeUserProfileRepo(): UserProfileRepository {
  class Mock extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return null
    }
    async update(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
  }
  return new Mock()
}

function makeUseCase(
  options: {
    record?: ConnectorByIdRecord | null
    connector?: Connector | null
    connectorRepoOverrides?: Partial<ConnectorRepository>
    importRepoOverrides?: Partial<ImportSessionRepository>
    sports?: SportSummary[]
    sessionRepoOverrides?: Partial<SessionRepository>
  } = {}
) {
  return new SyncConnector(
    makeRegistry({ connector: options.connector ?? makeConnector() }),
    makeConnectorRepo(
      options.record !== undefined ? options.record : makeConnectorRecord(),
      options.connectorRepoOverrides ?? {}
    ),
    makeImportSessionRepo(options.importRepoOverrides ?? {}),
    makeSportRepo(options.sports ?? []),
    makeSessionRepo(options.sessionRepoOverrides ?? {}),
    makeUserProfileRepo()
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
      async listSessions() {
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
      async listSessions() {
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

  test('AC#3 — disconnected ne modifie pas le status en BD', async ({ assert }) => {
    let statusSet: ConnectorStatusType | null = null
    const record = makeConnectorRecord({ status: ConnectorStatus.Disconnected })
    const useCase = makeUseCase({
      record,
      connectorRepoOverrides: {
        async setStatus(_userId, _provider, status) {
          statusSet = status
        },
      },
    })
    const result = await useCase.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'permanent_error')
    assert.isNull(statusSet)
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
    const importRepo = makeImportSessionRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportSessionStatus.New, rawData: {} }]
      },
    })
    const record = makeConnectorRecord({ autoImportEnabled: false })

    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(record),
      importRepo,
      makeSportRepo([{ id: 5, name: 'Running', slug: 'running' }]),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test('retourne success avec 0 imported quand aucune session new', async ({ assert }) => {
    const importRepo = makeImportSessionRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportSessionStatus.Imported, rawData: {} }]
      },
    })
    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(),
      importRepo,
      makeSportRepo(),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test('AC#1 — importe les sessions new et retourne le nombre importé', async ({ assert }) => {
    const connector = makeConnector({
      async listSessions() {
        return [
          {
            externalId: 'ext1',
            name: 'Run',
            sportSlug: 'running',
            date: '2026-03-14',
            durationMinutes: 60,
            distanceKm: 10,
            avgHeartRate: 150,
          },
        ]
      },
    })
    const importRepo = makeImportSessionRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportSessionStatus.New, rawData: {} }]
      },
    })
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(),
      importRepo,
      makeSportRepo([{ id: 5, name: 'Running', slug: 'running' }]),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 1 })
  })

  test('skip les sessions dont le sport est inconnu', async ({ assert }) => {
    const importRepo = makeImportSessionRepo({
      async findByConnectorId() {
        return [{ id: 1, externalId: 'ext1', status: ImportSessionStatus.New, rawData: {} }]
      },
    })
    const uc = new SyncConnector(
      makeRegistry(),
      makeConnectorRepo(),
      importRepo,
      makeSportRepo([]),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.deepEqual(result, { outcome: 'success', imported: 0 })
  })

  test("ConnectorAuthError levée par l'API → permanent_error et status mis à error", async ({
    assert,
  }) => {
    let statusSet: ConnectorStatusType | null = null
    const connector = makeConnector({
      async listSessions() {
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
      makeImportSessionRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'permanent_error')
    assert.equal(statusSet, ConnectorStatus.Error)
  })

  test('AC#4 — RateLimitExceededError → temporary_error', async ({ assert }) => {
    const connector = makeConnector({
      async listSessions() {
        throw new RateLimitExceededError(900)
      },
    })
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(),
      makeImportSessionRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    const result = await uc.execute({ connectorId: 1 })
    assert.equal(result.outcome, 'temporary_error')
  })

  test('erreur temporaire générique → temporary_error', async ({ assert }) => {
    const connector = makeConnector({
      async listSessions() {
        throw new Error('network timeout')
      },
    })
    const uc = new SyncConnector(
      makeRegistry({ connector }),
      makeConnectorRepo(),
      makeImportSessionRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeUserProfileRepo()
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
      makeImportSessionRepo(),
      makeSportRepo(),
      makeSessionRepo(),
      makeUserProfileRepo()
    )
    await uc.execute({ connectorId: 1 })
    assert.isTrue(lastSyncUpdated)
  })
})
