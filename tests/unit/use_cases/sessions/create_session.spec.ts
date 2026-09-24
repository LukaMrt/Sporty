import { test } from '@japa/runner'
import CreateSession from '#use_cases/sessions/create_session'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { makeMockGpxFileStorage } from '#tests/helpers/mock_gpx_file_storage'
import {
  FixedLoadCalculator,
  RecordingEventEmitter,
  SilentLogger,
  StaticSportRepository,
} from '#tests/helpers/base_mocks'
import { GpxParser, type GpxParseResult } from '#domain/interfaces/gpx_parser'
import type { SessionRepository } from '#domain/interfaces/session_repository'
import type { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import { InvalidSessionMetricsError } from '#domain/errors/invalid_session_metrics_error'

type SessionData = Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>

class StubGpxParser extends GpxParser {
  constructor(private result: GpxParseResult) {
    super()
  }
  parse(): GpxParseResult {
    return this.result
  }
}

function capturingRepo(sink: { data?: SessionData }): SessionRepository {
  return makeMockSessionRepository({
    create: async (data) => {
      sink.data = data
      return { id: 1, sportName: 'Course à pied', createdAt: '', ...data }
    },
  })
}

function makeUseCase(
  deps: {
    repo?: SessionRepository
    profiles?: UserProfileRepository
    storage?: GpxFileStorage
    parser?: GpxParser
    emitter?: RecordingEventEmitter
  } = {}
) {
  return new CreateSession(
    deps.repo ?? makeMockSessionRepository(),
    deps.profiles ?? makeMockUserProfileRepository(),
    new StaticSportRepository(),
    new FixedLoadCalculator({ value: 42, method: 'rpe' }),
    deps.storage ?? makeMockGpxFileStorage(),
    deps.parser ?? new StubGpxParser({ durationSeconds: 0, distanceMeters: 0 }),
    deps.emitter ?? new RecordingEventEmitter(),
    new SilentLogger()
  )
}

const PROFILE = { maxHeartRate: 190, restingHeartRate: 50 } as UserProfile

test.group('CreateSession — use case', () => {
  test('crée une séance avec le userId du serveur et émet session:completed', async ({
    assert,
  }) => {
    const sink: { data?: SessionData } = {}
    const emitter = new RecordingEventEmitter()
    const result = await makeUseCase({ repo: capturingRepo(sink), emitter }).execute(42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
    })

    assert.equal(result.userId, 42)
    assert.equal(sink.data!.userId, 42)
    assert.deepEqual(emitter.events, [
      { event: 'session:completed', data: { sessionId: 1, userId: 42 } },
    ])
  })

  test('les champs optionnels sont null par défaut', async ({ assert }) => {
    const sink: { data?: SessionData } = {}
    await makeUseCase({ repo: capturingRepo(sink) }).execute(1, {
      sportId: 1,
      date: '2026-01-01',
      durationMinutes: 30,
    })

    assert.isNull(sink.data!.distanceKm)
    assert.isNull(sink.data!.avgHeartRate)
    assert.isNull(sink.data!.perceivedEffort)
    assert.isNull(sink.data!.notes)
  })

  test('la charge est calculée et stockée à la création', async ({ assert }) => {
    const sink: { data?: SessionData } = {}
    await makeUseCase({ repo: capturingRepo(sink) }).execute(1, {
      sportId: 1,
      date: '2026-01-01',
      durationMinutes: 30,
      perceivedEffort: 3,
    })

    assert.equal(sink.data!.trainingLoad, 42)
    assert.equal(sink.data!.loadMethod, 'rpe')
  })

  test('les métriques scalaires sont stockées dans sportMetrics', async ({ assert }) => {
    const sink: { data?: SessionData } = {}
    await makeUseCase({ repo: capturingRepo(sink) }).execute(1, {
      sportId: 1,
      date: '2026-01-01',
      durationMinutes: 30,
      minHeartRate: 110,
      maxHeartRate: 180,
      cadenceAvg: 172,
      elevationGain: null,
    })

    const metrics = sink.data!.sportMetrics as Record<string, unknown>
    assert.equal(metrics.minHeartRate, 110)
    assert.equal(metrics.maxHeartRate, 180)
    assert.equal(metrics.cadenceAvg, 172)
    assert.notProperty(metrics, 'elevationGain')
  })

  test('FC moyenne + profil → zones mono-zone et TRIMP calculés côté serveur', async ({
    assert,
  }) => {
    const sink: { data?: SessionData } = {}
    await makeUseCase({
      repo: capturingRepo(sink),
      profiles: makeMockUserProfileRepository({ findByUserId: async () => PROFILE }),
    }).execute(1, { sportId: 1, date: '2026-01-01', durationMinutes: 60, avgHeartRate: 150 })

    const metrics = sink.data!.sportMetrics as Record<string, unknown>
    assert.isObject(metrics.hrZones)
    assert.isNumber(metrics.trimp)
  })

  test('avec un GPX temporaire : courbes relues côté serveur, fichier déplacé', async ({
    assert,
  }) => {
    const sink: { data?: SessionData } = {}
    let readWith: [string, number] | null = null
    let movedWith: [string, number, number] | null = null
    const storage = makeMockGpxFileStorage({
      readTempFile: async (tempId, userId) => {
        readWith = [tempId, userId]
        return Buffer.from('<gpx/>')
      },
      moveTempFile: async (tempId, userId, sessionId) => {
        movedWith = [tempId, userId, sessionId]
        return 'storage/gpx/7/1.gpx'
      },
    })
    const curve = [
      { time: 0, value: 140 },
      { time: 600, value: 150 },
    ]
    await makeUseCase({
      repo: capturingRepo(sink),
      storage,
      parser: new StubGpxParser({
        durationSeconds: 600,
        distanceMeters: 2000,
        heartRateCurve: curve,
      }),
    }).execute(7, {
      sportId: 1,
      date: '2026-01-01',
      durationMinutes: 10,
      gpxTempId: '11111111-1111-1111-1111-111111111111',
    })

    assert.deepEqual(readWith, ['11111111-1111-1111-1111-111111111111', 7])
    assert.deepEqual(movedWith, ['11111111-1111-1111-1111-111111111111', 7, 1])
    assert.deepEqual((sink.data!.sportMetrics as Record<string, unknown>).heartRateCurve, curve)
  })

  test('FC min > FC moyenne → InvalidSessionMetricsError', async ({ assert }) => {
    await assert.rejects(
      () =>
        makeUseCase().execute(1, {
          sportId: 1,
          date: '2026-01-01',
          durationMinutes: 30,
          minHeartRate: 160,
          avgHeartRate: 150,
        }),
      InvalidSessionMetricsError
    )
  })
})
