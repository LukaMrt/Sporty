import { test } from '@japa/runner'
import EnrichSessionWithGpx from '#use_cases/sessions/enrich_session_with_gpx'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import type { GpxParser, GpxParseResult } from '#domain/interfaces/gpx_parser'
import type { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 1,
    userId: 42,
    sportId: 1,
    sportName: 'Course à pied',
    date: '2026-01-15',
    durationMinutes: 30,
    distanceKm: 5,
    avgHeartRate: 140,
    perceivedEffort: 3,
    sportMetrics: {},
    notes: 'Belle sortie',
    createdAt: '2026-01-15T10:00:00.000Z',
    gpxFilePath: null,
    ...overrides,
  }
}

function makeGpxResult(overrides: Partial<GpxParseResult> = {}): GpxParseResult {
  return {
    durationSeconds: 3600,
    distanceMeters: 10000,
    avgHeartRate: 155,
    minHeartRate: 120,
    maxHeartRate: 178,
    cadenceAvg: 170,
    elevationGain: 150,
    elevationLoss: 145,
    paceCurve: [{ time: 0, value: 5.5 }],
    heartRateCurve: [{ time: 0, value: 155 }],
    gpsTrack: [{ lat: 48.8, lon: 2.3, time: 0 }],
    splits: [{ km: 1, paceSeconds: 330 }],
    ...overrides,
  }
}

function makeMockGpxParser(result: GpxParseResult): GpxParser {
  return {
    parse: () => result,
  } as unknown as GpxParser
}

function makeMockGpxFileStorage(savedPath = 'storage/gpx/42/1.gpx'): GpxFileStorage {
  return {
    saveTempFile: async () => 'temp-id',
    moveTempFile: async () => savedPath,
    saveFile: async () => savedPath,
  } as unknown as GpxFileStorage
}

const gpxContent = Buffer.from('<gpx/>')

test.group('EnrichSessionWithGpx — use case', () => {
  test('enrichit la séance avec les données GPX', async ({ assert }) => {
    const existing = makeSession()
    let updatedData: Partial<TrainingSession> | null = null

    const repo = makeMockSessionRepository({
      findById: async () => existing,
      update: async (_id, data) => {
        updatedData = data
        return { ...existing, ...data }
      },
    })

    const useCase = new EnrichSessionWithGpx(
      repo,
      makeMockGpxParser(makeGpxResult()),
      makeMockGpxFileStorage()
    )
    await useCase.execute(1, 42, gpxContent)

    assert.isNotNull(updatedData)
    assert.equal(updatedData!.durationMinutes, 60) // 3600s = 60 min
    assert.equal(updatedData!.distanceKm, 10) // 10000m = 10km
    assert.equal(updatedData!.avgHeartRate, 155)
    assert.equal(updatedData!.gpxFilePath, 'storage/gpx/42/1.gpx')
  })

  test('les métriques GPX sont mergées dans sportMetrics', async ({ assert }) => {
    const existing = makeSession({ sportMetrics: { someCustomKey: 'preserved' } })
    let updatedSportMetrics: Record<string, unknown> | null = null

    const repo = makeMockSessionRepository({
      findById: async () => existing,
      update: async (_id, data) => {
        updatedSportMetrics = data.sportMetrics as Record<string, unknown>
        return { ...existing, ...data }
      },
    })

    const useCase = new EnrichSessionWithGpx(
      repo,
      makeMockGpxParser(makeGpxResult()),
      makeMockGpxFileStorage()
    )
    await useCase.execute(1, 42, gpxContent)

    assert.equal(updatedSportMetrics!['someCustomKey'], 'preserved')
    assert.equal(updatedSportMetrics!['minHeartRate'], 120)
    assert.equal(updatedSportMetrics!['maxHeartRate'], 178)
    assert.equal(updatedSportMetrics!['cadenceAvg'], 170)
    assert.equal(updatedSportMetrics!['elevationGain'], 150)
    assert.deepEqual(updatedSportMetrics!['splits'], [{ km: 1, paceSeconds: 330 }])
  })

  test('perceivedEffort et notes sont conservés (valeurs manuelles)', async ({ assert }) => {
    const existing = makeSession({ perceivedEffort: 4, notes: 'Note importante' })
    let updatedData: Partial<TrainingSession> | null = null

    const repo = makeMockSessionRepository({
      findById: async () => existing,
      update: async (_id, data) => {
        updatedData = data
        return { ...existing, ...data }
      },
    })

    const useCase = new EnrichSessionWithGpx(
      repo,
      makeMockGpxParser(makeGpxResult()),
      makeMockGpxFileStorage()
    )
    await useCase.execute(1, 42, gpxContent)

    // perceivedEffort et notes ne sont PAS dans updatedData (non écrasés)
    assert.isUndefined(updatedData!.perceivedEffort)
    assert.isUndefined(updatedData!.notes)
  })

  test('la date existante est conservée', async ({ assert }) => {
    const existing = makeSession({ date: '2026-01-15' })
    let updatedData: Partial<TrainingSession> | null = null

    const repo = makeMockSessionRepository({
      findById: async () => existing,
      update: async (_id, data) => {
        updatedData = data
        return { ...existing, ...data }
      },
    })

    const useCase = new EnrichSessionWithGpx(
      repo,
      makeMockGpxParser(makeGpxResult({ startTime: '2026-03-01T08:00:00Z' })),
      makeMockGpxFileStorage()
    )
    await useCase.execute(1, 42, gpxContent)

    // date non modifiée par le use case
    assert.isUndefined(updatedData!.date)
  })

  test("lève SessionNotFoundError si la séance n'existe pas", async ({ assert }) => {
    const repo = makeMockSessionRepository({ findById: async () => null })

    const useCase = new EnrichSessionWithGpx(
      repo,
      makeMockGpxParser(makeGpxResult()),
      makeMockGpxFileStorage()
    )
    await assert.rejects(() => useCase.execute(999, 42, gpxContent), SessionNotFoundError)
  })

  test('lève SessionForbiddenError si la séance appartient à un autre utilisateur', async ({
    assert,
  }) => {
    const repo = makeMockSessionRepository({
      findById: async () => makeSession({ userId: 99 }),
    })

    const useCase = new EnrichSessionWithGpx(
      repo,
      makeMockGpxParser(makeGpxResult()),
      makeMockGpxFileStorage()
    )
    await assert.rejects(() => useCase.execute(1, 42, gpxContent), SessionForbiddenError)
  })
})
