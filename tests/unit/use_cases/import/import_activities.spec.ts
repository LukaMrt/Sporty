import { test } from '@japa/runner'
import ImportActivities from '#use_cases/import/import_activities'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
} from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  ActivityFilters,
  ActivitySummary,
  ActivityDetail,
} from '#domain/interfaces/connector'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import { SportRepository } from '#domain/interfaces/sport_repository'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import type { ImportProgressPort, ImportProgress } from '#domain/interfaces/import_progress_port'
import { ActivityMapper } from '#domain/interfaces/activity_mapper'
import type { MappedSessionData } from '#domain/interfaces/activity_mapper'
import { ImportProgressStore } from '#services/import_progress_store'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeConnector(
  id: number,
  overrides: Partial<{ getActivityDetail: (externalId: string) => Promise<ActivityDetail> }> = {}
): Connector {
  class Mock extends Connector {
    readonly id = id
    async authenticate(): Promise<ConnectorTokens> {
      return { accessToken: '', refreshToken: '', expiresAt: 0 }
    }
    async listActivities(_f: ActivityFilters): Promise<ActivitySummary[]> {
      return []
    }
    async getActivityDetail(externalId: string): Promise<ActivityDetail> {
      return {
        externalId,
        name: 'Test Run',
        sportType: 'Run',
        startDate: '2026-01-01T08:00:00',
        durationSeconds: 3600,
        distanceMeters: 10000,
        averageHeartRate: 150,
        metrics: {
          averageSpeed: 2.78,
          calories: null,
          totalElevationGain: null,
          maxHeartrate: null,
          deviceName: null,
        },
        notes: null,
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

function makeImportActivityRepository(
  overrides: Partial<ImportActivityRepository> = {}
): ImportActivityRepository {
  class Mock extends ImportActivityRepository {
    async upsertMany(_connectorId: number, _activities: StagingActivityInput[]): Promise<void> {}
    async findByConnectorId(): Promise<StagingActivityRecord[]> {
      return []
    }
    async findByIds(ids: number[]): Promise<StagingActivityRecord[]> {
      return ids.map((id) => ({
        id,
        externalId: String(id * 100),
        status: ImportActivityStatus.New,
        rawData: null,
      }))
    }
    async setImported(): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeProgressPort(): ImportProgressPort {
  return new ImportProgressStore()
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

function makeActivityMapper(sportSlug = 'running'): ActivityMapper {
  class Mock extends ActivityMapper {
    map(detail: ActivityDetail): MappedSessionData {
      return {
        sportSlug,
        date: detail.startDate.slice(0, 10),
        durationMinutes: detail.durationSeconds / 60,
        distanceKm: detail.distanceMeters ? detail.distanceMeters / 1000 : null,
        avgHeartRate: detail.averageHeartRate,
        importedFrom: 'strava',
        externalId: detail.externalId,
        sportMetrics: {},
      }
    }
  }
  return new Mock()
}

function makeUseCase(
  overrides: {
    importRepo?: ImportActivityRepository
    connectorFactory?: ConnectorFactory
    sportRepo?: SportRepository
    sessionRepo?: SessionRepository
    progressPort?: ImportProgressPort
    mapper?: ActivityMapper
  } = {}
): ImportActivities {
  return new ImportActivities(
    overrides.importRepo ?? makeImportActivityRepository(),
    overrides.connectorFactory ?? makeConnectorFactory(makeConnector(42)),
    overrides.sportRepo ?? makeSportRepository([{ id: 1, name: 'Running', slug: 'running' }]),
    overrides.sessionRepo ?? makeSessionRepository(),
    overrides.progressPort ?? makeProgressPort(),
    overrides.mapper ?? makeActivityMapper()
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('ImportActivities', () => {
  test('importe sequentiellement les activites et met a jour le statut (AC#2)', async ({
    assert,
  }) => {
    const setImportedCalls: { id: number; sessionId: number }[] = []

    const useCase = makeUseCase({
      importRepo: makeImportActivityRepository({
        setImported: async (id, sessionId) => {
          setImportedCalls.push({ id, sessionId })
        },
      }),
    })

    const result = await useCase.execute({ userId: 1, importActivityIds: [10, 20] })

    assert.equal(result.completed, 2)
    assert.equal(result.failed, 0)
    assert.equal(result.total, 2)
    assert.equal(setImportedCalls.length, 2)
    assert.equal(setImportedCalls[0].sessionId, 999)
  })

  test('continue et incremente failed si une activite echoue (AC#4)', async ({ assert }) => {
    let callCount = 0
    const connector = makeConnector(42, {
      getActivityDetail: async (externalId) => {
        callCount++
        if (callCount === 1) throw new Error('Strava API error')
        return {
          externalId,
          name: 'Ride',
          sportType: 'Ride',
          startDate: '2026-01-02T09:00:00',
          durationSeconds: 7200,
          distanceMeters: 30000,
          averageHeartRate: null,
          metrics: {},
          notes: null,
        }
      },
    })

    const useCase = makeUseCase({
      connectorFactory: makeConnectorFactory(connector),
      sportRepo: makeSportRepository([{ id: 2, name: 'Vélo', slug: 'velo' }]),
      mapper: makeActivityMapper('velo'),
    })

    const result = await useCase.execute({ userId: 1, importActivityIds: [10, 20] })

    assert.equal(result.failed, 1)
    assert.equal(result.completed, 1)
  })

  test('lance ConnectorNotConnectedError si pas de connecteur', async ({ assert }) => {
    const useCase = makeUseCase({
      connectorFactory: makeConnectorFactory(null),
    })

    try {
      await useCase.execute({ userId: 1, importActivityIds: [1] })
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

    await useCase.execute({ userId: 5, importActivityIds: [10] })

    assert.equal(createdSessions.length, 1)
    assert.equal(createdSessions[0].importedFrom, 'strava')
    assert.equal(createdSessions[0].userId, 5)
  })

  test('incremente failed si le sport slug est inconnu', async ({ assert }) => {
    const useCase = makeUseCase({
      sportRepo: makeSportRepository([{ id: 99, name: 'Natation', slug: 'natation' }]),
      mapper: makeActivityMapper('running'),
    })

    const result = await useCase.execute({ userId: 1, importActivityIds: [10] })

    assert.equal(result.failed, 1)
    assert.equal(result.completed, 0)
  })
})

test.group('ImportProgressStore', () => {
  test('init et incremente correctement', ({ assert }) => {
    const store = new ImportProgressStore()
    store.init(1, 5)

    store.incrementCompleted(1)
    store.incrementCompleted(1)
    store.incrementFailed(1)

    const p = store.get(1)
    assert.deepEqual(p, { total: 5, completed: 2, failed: 1, errors: [] })
  })

  test('retourne null si userId absent', ({ assert }) => {
    const store = new ImportProgressStore()
    assert.isNull(store.get(99))
  })

  test('clear supprime la progression', ({ assert }) => {
    const store = new ImportProgressStore()
    store.init(1, 3)
    store.clear(1)
    assert.isNull(store.get(1))
  })
})

test.group('ImportProgress type contract', () => {
  test('ImportProgressPort est bien abstrait (ne peut pas etre instancie directement)', ({
    assert,
  }) => {
    const store = new ImportProgressStore()
    store.init(42, 10)
    const progress: ImportProgress | null = store.get(42)
    assert.isNotNull(progress)
    assert.equal(progress!.total, 10)
  })
})
