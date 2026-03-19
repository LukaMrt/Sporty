import { test } from '@japa/runner'
import ImportSessions from '#use_cases/import/import_sessions'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type {
  StagingSessionInput,
  StagingSessionRecord,
  ImportedSessionRef,
} from '#domain/interfaces/import_session_repository'
import { DailyRateLimitError } from '#domain/errors/daily_rate_limit_error'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  SessionFilters,
  MappingContext,
  MappedSessionSummary,
  MappedSessionData,
} from '#domain/interfaces/connector'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import { SportRepository } from '#domain/interfaces/sport_repository'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeConnector(
  id: number,
  overrides: Partial<{ getSessionDetail: (externalId: string) => Promise<MappedSessionData> }> = {}
): Connector {
  class Mock extends Connector {
    readonly id = id
    async authenticate(): Promise<ConnectorTokens> {
      return { accessToken: '', refreshToken: '', expiresAt: 0 }
    }
    async listSessions(_f: SessionFilters): Promise<MappedSessionSummary[]> {
      return []
    }
    async getSessionDetail(
      externalId: string,
      _context?: MappingContext
    ): Promise<MappedSessionData> {
      return {
        externalId,
        sportSlug: 'running',
        date: '2026-01-01',
        durationMinutes: 60,
        distanceKm: 10,
        avgHeartRate: 150,
        importedFrom: 'strava',
        sportMetrics: {
          allure: null,
          calories: null,
          elevationGain: null,
          maxHeartRate: null,
          deviceName: null,
        },
      }
    }
    async getConnectionStatus(): Promise<ConnectorStatus> {
      throw new Error('Not implemented')
    }
    async disconnect(): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeConnectorFactory(connector: Connector | null = null): ConnectorFactory {
  class Mock extends ConnectorFactory {
    async make(): Promise<Connector | null> {
      return connector
    }
  }
  return new Mock()
}

function makeImportSessionRepository(
  overrides: Partial<ImportSessionRepository> = {}
): ImportSessionRepository {
  class Mock extends ImportSessionRepository {
    async upsertMany(_connectorId: number, _sessions: StagingSessionInput[]): Promise<void> {}
    async findByConnectorId(): Promise<StagingSessionRecord[]> {
      return []
    }
    async findByIds(ids: number[], _connectorId: number): Promise<StagingSessionRecord[]> {
      return ids.map((id) => ({
        id,
        externalId: String(id * 100),
        status: ImportSessionStatus.New,
        rawData: null,
      }))
    }
    async setImported(): Promise<void> {}
    async setIgnored(): Promise<void> {}
    async setNew(): Promise<void> {}
    async setFailed(): Promise<void> {}
    async markImportedBulk(_connectorId: number, _refs: ImportedSessionRef[]): Promise<void> {}
    async resetForReimport(): Promise<null> {
      return null
    }
  }
  return Object.assign(new Mock(), overrides)
}

function makeSessionRepository(overrides: Partial<SessionRepository> = {}): SessionRepository {
  class Mock extends SessionRepository {
    async create(
      data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
    ): Promise<TrainingSession> {
      return {
        id: 999,
        userId: data.userId,
        sportId: data.sportId,
        sportName: 'Running',
        date: data.date,
        durationMinutes: data.durationMinutes,
        distanceKm: data.distanceKm,
        avgHeartRate: data.avgHeartRate,
        perceivedEffort: data.perceivedEffort,
        sportMetrics: data.sportMetrics,
        notes: data.notes,
        importedFrom: data.importedFrom,
        externalId: data.externalId,
        createdAt: new Date().toISOString(),
      }
    }
    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return { data: [], meta: { total: 0, perPage: 10, page: 1, lastPage: 1 } }
    }
    async findById(): Promise<TrainingSession | null> {
      return null
    }
    async findByIdIncludingTrashed(): Promise<TrainingSession | null> {
      return null
    }
    async update(): Promise<TrainingSession> {
      throw new Error()
    }
    async findTrashedByUserId(): Promise<TrainingSession[]> {
      return []
    }
    async softDelete(): Promise<void> {}
    async restore(): Promise<void> {}
    async findByUserIdAndDateRange(): Promise<TrainingSession[]> {
      return []
    }
    async findByUserAndExternalIds(): Promise<{ externalId: string; id: number }[]> {
      return []
    }
    async forceDelete(): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeSportRepository(sports: SportSummary[] = []): SportRepository {
  class Mock extends SportRepository {
    async findAll(): Promise<SportSummary[]> {
      return sports
    }
  }
  return new Mock()
}

function makeUserProfileRepository(profile: UserProfile | null = null): UserProfileRepository {
  class Mock extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return profile
    }
    async update(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
  }
  return new Mock()
}

function makeUseCase(
  overrides: {
    importRepo?: ImportSessionRepository
    connectorFactory?: ConnectorFactory
    sportRepo?: SportRepository
    sessionRepo?: SessionRepository
    userProfileRepo?: UserProfileRepository
  } = {}
): ImportSessions {
  return new ImportSessions(
    overrides.importRepo ?? makeImportSessionRepository(),
    overrides.connectorFactory ?? makeConnectorFactory(makeConnector(42)),
    overrides.sportRepo ?? makeSportRepository([{ id: 1, name: 'Running', slug: 'running' }]),
    overrides.sessionRepo ?? makeSessionRepository(),
    overrides.userProfileRepo ?? makeUserProfileRepository()
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('ImportSessions', () => {
  test('importe sequentiellement les sessions et met a jour le statut (AC#2)', async ({
    assert,
  }) => {
    const setImportedCalls: { id: number; sessionId: number }[] = []

    const useCase = makeUseCase({
      importRepo: makeImportSessionRepository({
        setImported: async (id, sessionId) => {
          setImportedCalls.push({ id, sessionId })
        },
      }),
    })

    const result = await useCase.execute({ userId: 1, importSessionIds: [10, 20] })

    assert.equal(result.completed, 2)
    assert.equal(result.failed, 0)
    assert.equal(result.total, 2)
    assert.equal(setImportedCalls.length, 2)
    assert.equal(setImportedCalls[0].sessionId, 999)
  })

  test('continue et incremente failed si une session echoue (AC#4)', async ({ assert }) => {
    let callCount = 0
    const connector = makeConnector(42, {
      getSessionDetail: async (externalId) => {
        callCount++
        if (callCount === 1) throw new Error('Strava API error')
        return {
          externalId,
          sportSlug: 'cycling',
          date: '2026-01-02',
          durationMinutes: 120,
          distanceKm: 30,
          avgHeartRate: null,
          importedFrom: 'strava',
          sportMetrics: {},
        }
      },
    })

    const useCase = makeUseCase({
      connectorFactory: makeConnectorFactory(connector),
      sportRepo: makeSportRepository([{ id: 2, name: 'Vélo', slug: 'cycling' }]),
    })

    const result = await useCase.execute({ userId: 1, importSessionIds: [10, 20] })

    assert.equal(result.failed, 1)
    assert.equal(result.completed, 1)
  })

  test('lance ConnectorNotConnectedError si pas de connecteur', async ({ assert }) => {
    const useCase = makeUseCase({
      connectorFactory: makeConnectorFactory(null),
    })

    try {
      await useCase.execute({ userId: 1, importSessionIds: [1] })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })

  test('cree la session avec importedFrom=strava et externalId (AC#2)', async ({ assert }) => {
    const createdSessions: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>[] = []

    const useCase = makeUseCase({
      sessionRepo: makeSessionRepository({
        create: async (data) => {
          createdSessions.push(data)
          return {
            id: 1,
            userId: data.userId,
            sportId: data.sportId,
            sportName: 'Running',
            date: data.date,
            durationMinutes: data.durationMinutes,
            distanceKm: data.distanceKm,
            avgHeartRate: data.avgHeartRate,
            perceivedEffort: data.perceivedEffort,
            sportMetrics: data.sportMetrics,
            notes: data.notes,
            importedFrom: data.importedFrom,
            externalId: data.externalId,
            createdAt: new Date().toISOString(),
          }
        },
      }),
    })

    await useCase.execute({ userId: 5, importSessionIds: [10] })

    assert.equal(createdSessions.length, 1)
    assert.equal(createdSessions[0].importedFrom, 'strava')
    assert.equal(createdSessions[0].userId, 5)
  })

  test('incremente failed si le sport slug est inconnu', async ({ assert }) => {
    const useCase = makeUseCase({
      sportRepo: makeSportRepository([{ id: 99, name: 'Natation', slug: 'natation' }]),
    })

    const result = await useCase.execute({ userId: 1, importSessionIds: [10] })

    assert.equal(result.failed, 1)
    assert.equal(result.completed, 0)
  })

  test("AC#2 story 10.2 — DailyRateLimitError stoppe l'import et retourne dailyLimitReached", async ({
    assert,
  }) => {
    const connector = makeConnector(42, {
      getSessionDetail: async () => {
        throw new DailyRateLimitError()
      },
    })

    const useCase = makeUseCase({
      connectorFactory: makeConnectorFactory(connector),
    })

    const result = await useCase.execute({ userId: 1, importSessionIds: [10, 20, 30] })

    assert.isTrue(result.dailyLimitReached)
    assert.equal(result.completed, 0)
    assert.equal(result.total, 3)
  })

  test('AC#2 story 10.2 — sessions partiellement importées avant DailyRateLimitError', async ({
    assert,
  }) => {
    let callCount = 0
    const connector = makeConnector(42, {
      getSessionDetail: async (externalId) => {
        callCount++
        if (callCount >= 2) throw new DailyRateLimitError()
        return {
          externalId,
          sportSlug: 'running',
          date: '2026-01-01',
          durationMinutes: 60,
          distanceKm: null,
          avgHeartRate: null,
          importedFrom: 'strava',
          sportMetrics: {},
        }
      },
    })

    const useCase = makeUseCase({
      connectorFactory: makeConnectorFactory(connector),
    })

    const result = await useCase.execute({ userId: 1, importSessionIds: [10, 20, 30] })

    assert.isTrue(result.dailyLimitReached)
    assert.equal(result.completed, 1)
    assert.equal(result.total, 3)
  })
})
