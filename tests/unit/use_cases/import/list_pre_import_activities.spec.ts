import { test } from '@japa/runner'
import ListPreImportActivities, {
  ConnectorNotConnectedError,
} from '#use_cases/import/list_pre_import_activities'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
  ImportedActivityRef,
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
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { SessionExternalRef } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeConnector(
  id: number,
  overrides: Partial<{ listActivities: (f: ActivityFilters) => Promise<ActivitySummary[]> }> = {}
): Connector {
  class Mock extends Connector {
    readonly id = id
    async authenticate(): Promise<ConnectorTokens> {
      return { accessToken: '', refreshToken: '', expiresAt: 0 }
    }
    async listActivities(): Promise<ActivitySummary[]> {
      return []
    }
    async getActivityDetail(): Promise<ActivityDetail> {
      throw new Error('Not implemented')
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
    async upsertMany(): Promise<void> {}
    async findByConnectorId(): Promise<StagingActivityRecord[]> {
      return []
    }
    async findByIds(): Promise<StagingActivityRecord[]> {
      return []
    }
    async setImported(): Promise<void> {}
    async setIgnored(): Promise<void> {}
    async setNew(): Promise<void> {}
    async setFailed(): Promise<void> {}
    async markImportedBulk(_connectorId: number, _refs: ImportedActivityRef[]): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

function makeSessionRepository(
  overrides: Partial<{
    findByUserAndExternalIds: (
      userId: number,
      externalIds: string[]
    ) => Promise<SessionExternalRef[]>
  }> = {}
): SessionRepository {
  class Mock extends SessionRepository {
    async create(): Promise<TrainingSession> {
      throw new Error('not implemented')
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
      throw new Error('not implemented')
    }
    async findTrashedByUserId(): Promise<TrainingSession[]> {
      return []
    }
    async softDelete(): Promise<void> {}
    async restore(): Promise<void> {}
    async findByUserIdAndDateRange(): Promise<TrainingSession[]> {
      return []
    }
    async findByUserAndExternalIds(): Promise<SessionExternalRef[]> {
      return []
    }
  }
  return Object.assign(new Mock(), overrides)
}

const MOCK_ACTIVITIES: ActivitySummary[] = [
  {
    externalId: '101',
    name: 'Run 1',
    sportType: 'Run',
    startDate: '2026-01-01T08:00:00',
    durationSeconds: 3600,
    distanceMeters: null,
    averageHeartRate: null,
  },
  {
    externalId: '102',
    name: 'Ride 1',
    sportType: 'Ride',
    startDate: '2026-01-02T09:00:00',
    durationSeconds: 7200,
    distanceMeters: null,
    averageHeartRate: null,
  },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('ListPreImportActivities', () => {
  test('throws ConnectorNotConnectedError quand connecteur absent (AC#4)', async ({ assert }) => {
    const useCase = new ListPreImportActivities(
      makeImportActivityRepository(),
      makeConnectorFactory(null),
      makeSessionRepository()
    )

    await assert.rejects(() => useCase.execute({ userId: 1 }), ConnectorNotConnectedError)
  })

  test('appelle connector.listActivities avec after par defaut 1 mois (AC#1)', async ({
    assert,
  }) => {
    let capturedFilters: ActivityFilters | null = null

    const connector = makeConnector(42, {
      listActivities: async (filters) => {
        capturedFilters = filters
        return MOCK_ACTIVITIES
      },
    })

    const useCase = new ListPreImportActivities(
      makeImportActivityRepository(),
      makeConnectorFactory(connector),
      makeSessionRepository()
    )

    const before = Date.now()
    await useCase.execute({ userId: 1 })
    const after = Date.now()

    assert.isNotNull(capturedFilters)
    const afterMs = capturedFilters!.after!.getTime()
    assert.isAbove(afterMs, before - 30 * 24 * 3600 * 1000 - 1000)
    assert.isBelow(afterMs, after - 30 * 24 * 3600 * 1000 + 1000)
  })

  test('sauvegarde les activites en staging via connector.id (AC#2)', async ({ assert }) => {
    const connector = makeConnector(42, {
      listActivities: async () => MOCK_ACTIVITIES,
    })

    const upserted: { connectorId: number; activities: StagingActivityInput[] }[] = []
    const importRepo = makeImportActivityRepository({
      upsertMany: async (connectorId, activities) => {
        upserted.push({ connectorId, activities })
      },
      findByConnectorId: async () => [
        { id: 1, externalId: '101', status: ImportActivityStatus.New, rawData: null },
        { id: 2, externalId: '102', status: ImportActivityStatus.New, rawData: null },
      ],
    })

    const useCase = new ListPreImportActivities(
      importRepo,
      makeConnectorFactory(connector),
      makeSessionRepository()
    )
    const result = await useCase.execute({ userId: 1 })

    assert.equal(upserted.length, 1)
    assert.equal(upserted[0].connectorId, 42)
    assert.equal(upserted[0].activities.length, 2)
    assert.equal(upserted[0].activities[0].externalId, '101')
    assert.equal(result.length, 2)
  })

  test('retourne la liste complete avec statuts existants (AC#3)', async ({ assert }) => {
    const connector = makeConnector(42, {
      listActivities: async () => MOCK_ACTIVITIES,
    })

    const existingRecords: StagingActivityRecord[] = [
      { id: 1, externalId: '101', status: ImportActivityStatus.Imported, rawData: null },
      { id: 2, externalId: '102', status: ImportActivityStatus.Ignored, rawData: null },
    ]

    const importRepo = makeImportActivityRepository({
      upsertMany: async () => {},
      findByConnectorId: async () => existingRecords,
    })

    const useCase = new ListPreImportActivities(
      importRepo,
      makeConnectorFactory(connector),
      makeSessionRepository()
    )
    const result = await useCase.execute({ userId: 1 })

    assert.equal(result[0].status, ImportActivityStatus.Imported)
    assert.equal(result[1].status, ImportActivityStatus.Ignored)
  })

  test('transmet after/before des params quand fournis (Task 3)', async ({ assert }) => {
    let capturedFilters: ActivityFilters | null = null

    const connector = makeConnector(42, {
      listActivities: async (filters) => {
        capturedFilters = filters
        return []
      },
    })

    const useCase = new ListPreImportActivities(
      makeImportActivityRepository(),
      makeConnectorFactory(connector),
      makeSessionRepository()
    )

    const afterDate = new Date('2026-01-01')
    const beforeDate = new Date('2026-02-01')
    await useCase.execute({ userId: 1, after: afterDate, before: beforeDate })

    assert.deepEqual(capturedFilters!.after, afterDate)
    assert.deepEqual(capturedFilters!.before, beforeDate)
  })

  test('AC#3 story 10.3 — marque comme importées les activités déjà présentes en session', async ({
    assert,
  }) => {
    const connector = makeConnector(42, {
      listActivities: async () => MOCK_ACTIVITIES,
    })

    const markImportedCalls: { connectorId: number; refs: ImportedActivityRef[] }[] = []
    const importRepo = makeImportActivityRepository({
      markImportedBulk: async (connectorId, refs) => {
        markImportedCalls.push({ connectorId, refs })
      },
      findByConnectorId: async () => [
        { id: 1, externalId: '101', status: ImportActivityStatus.New, rawData: null },
        { id: 2, externalId: '102', status: ImportActivityStatus.New, rawData: null },
      ],
    })

    const sessionRepo = makeSessionRepository({
      findByUserAndExternalIds: async () => [
        { externalId: '101', id: 55 }, // activité 101 déjà importée en session #55
      ],
    })

    const useCase = new ListPreImportActivities(
      importRepo,
      makeConnectorFactory(connector),
      sessionRepo
    )
    await useCase.execute({ userId: 1 })

    assert.equal(markImportedCalls.length, 1)
    assert.equal(markImportedCalls[0].connectorId, 42)
    assert.equal(markImportedCalls[0].refs.length, 1)
    assert.equal(markImportedCalls[0].refs[0].externalId, '101')
    assert.equal(markImportedCalls[0].refs[0].sessionId, 55)
  })

  test('AC#3 story 10.3 — ne fait pas markImportedBulk si aucune session existante', async ({
    assert,
  }) => {
    const connector = makeConnector(42, {
      listActivities: async () => MOCK_ACTIVITIES,
    })

    const markImportedCalls: unknown[] = []
    const importRepo = makeImportActivityRepository({
      markImportedBulk: async (_connectorId, _refs) => {
        markImportedCalls.push(true)
      },
    })

    const useCase = new ListPreImportActivities(
      importRepo,
      makeConnectorFactory(connector),
      makeSessionRepository()
    )
    await useCase.execute({ userId: 1 })

    assert.equal(markImportedCalls.length, 0)
  })
})
