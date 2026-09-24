import { test } from '@japa/runner'
import UpdateSession from '#use_cases/sessions/update_session'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { FixedLoadCalculator, StaticSportRepository } from '#tests/helpers/base_mocks'
import type { SessionRepository } from '#domain/interfaces/session_repository'
import type { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

type UpdateData = Partial<Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>>

const CURVE = [
  { time: 0, value: 140 },
  { time: 60, value: 150 },
]

const BASE_SESSION: TrainingSession = {
  id: 1,
  userId: 42,
  sportId: 1,
  sportName: 'Course à pied',
  date: '2026-02-25',
  durationMinutes: 45,
  distanceKm: 5,
  avgHeartRate: 150,
  perceivedEffort: null,
  sportMetrics: {
    heartRateCurve: CURVE,
    cadenceAvg: 170,
    hrZones: { z1: 0, z2: 100, z3: 0, z4: 0, z5: 0 },
    trimp: 90,
  },
  notes: null,
  createdAt: '2026-02-25T10:00:00.000Z',
}

function makeUseCase(repo: SessionRepository, profiles?: UserProfileRepository) {
  return new UpdateSession(
    repo,
    profiles ?? makeMockUserProfileRepository(),
    new StaticSportRepository(),
    new FixedLoadCalculator({ value: 33, method: 'rpe' })
  )
}

function capturingRepo(sink: { data?: UpdateData }, session = BASE_SESSION): SessionRepository {
  return makeMockSessionRepository({
    findById: async () => ({ ...session }),
    update: async (_id, data) => {
      sink.data = data
      return { ...session, ...data }
    },
  })
}

test.group('UpdateSession — use case', () => {
  test('mise à jour réussie avec charge recalculée', async ({ assert }) => {
    const sink: { data?: UpdateData } = {}
    const result = await makeUseCase(capturingRepo(sink)).execute(1, 42, {
      sportId: 1,
      date: '2026-02-26',
      durationMinutes: 60,
      distanceKm: 10,
    })

    assert.equal(sink.data!.date, '2026-02-26')
    assert.equal(sink.data!.distanceKm, 10)
    assert.equal(sink.data!.trainingLoad, 33)
    assert.equal(result.durationMinutes, 60)
  })

  test('séance inexistante → SessionNotFoundError', async ({ assert }) => {
    const repo = makeMockSessionRepository({ findById: async () => null })
    await assert.rejects(
      () =>
        makeUseCase(repo).execute(1, 42, { sportId: 1, date: '2026-01-01', durationMinutes: 1 }),
      SessionNotFoundError
    )
  })

  test('séance appartenant à un autre user → SessionForbiddenError', async ({ assert }) => {
    const repo = makeMockSessionRepository({ findById: async () => ({ ...BASE_SESSION }) })
    await assert.rejects(
      () =>
        makeUseCase(repo).execute(1, 99, { sportId: 1, date: '2026-01-01', durationMinutes: 1 }),
      SessionForbiddenError
    )
  })

  test('les courbes existantes sont conservées (fusion, pas de remplacement)', async ({
    assert,
  }) => {
    const sink: { data?: UpdateData } = {}
    await makeUseCase(capturingRepo(sink)).execute(1, 42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
      avgHeartRate: 150,
      cadenceAvg: 175,
    })

    const metrics = sink.data!.sportMetrics as Record<string, unknown>
    assert.deepEqual(metrics.heartRateCurve, CURVE)
    assert.equal(metrics.cadenceAvg, 175)
  })

  test('une métrique effacée (null) est retirée', async ({ assert }) => {
    const sink: { data?: UpdateData } = {}
    await makeUseCase(capturingRepo(sink)).execute(1, 42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
      cadenceAvg: null,
    })

    assert.notProperty(sink.data!.sportMetrics, 'cadenceAvg')
  })

  test('sans FCmax connue, les zones et le TRIMP obsolètes sont retirés', async ({ assert }) => {
    const sink: { data?: UpdateData } = {}
    await makeUseCase(capturingRepo(sink)).execute(1, 42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
      avgHeartRate: null,
    })

    const metrics = sink.data!.sportMetrics as Record<string, unknown>
    assert.notProperty(metrics, 'hrZones')
    assert.notProperty(metrics, 'trimp')
  })

  test('avec FCmax, les zones sont recalculées depuis la courbe stockée', async ({ assert }) => {
    const sink: { data?: UpdateData } = {}
    const profiles = makeMockUserProfileRepository({
      findByUserId: async () => ({ maxHeartRate: 190, restingHeartRate: 50 }) as UserProfile,
    })
    await makeUseCase(capturingRepo(sink), profiles).execute(1, 42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
      avgHeartRate: 145,
    })

    const metrics = sink.data!.sportMetrics as Record<string, unknown>
    assert.isObject(metrics.hrZones)
    assert.isNumber(metrics.cardiacDrift)
  })
})
