import { test } from '@japa/runner'
import GetDashboardMetrics from '#use_cases/dashboard/get_dashboard_metrics'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 1,
    userId: 1,
    sportId: 1,
    sportName: 'Course à pied',
    date: '2026-02-20',
    durationMinutes: 60,
    distanceKm: 10,
    avgHeartRate: null,
    perceivedEffort: null,
    sportMetrics: {},
    notes: null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  }
}

function makePaginatedResult(
  sessions: TrainingSession[],
  total?: number
): PaginatedResult<TrainingSession> {
  return {
    data: sessions,
    meta: { total: total ?? sessions.length, page: 1, perPage: 20, lastPage: 1 },
  }
}

test.group('GetDashboardMetrics — use case', () => {
  test('retourne heroMetric null si moins de 2 séances avec distance dans la période courante', async ({
    assert,
  }) => {
    const repo = makeMockSessionRepository({
      async findByUserIdAndDateRange(_userId, start, _end) {
        // période précédente : vide
        if (start < '2026-01-01') return []
        // période courante : 1 seule séance
        return [makeSession({ id: 1, distanceKm: 10 })]
      },
      async findAllByUserId() {
        return makePaginatedResult([], 1)
      },
    })

    const useCase = new GetDashboardMetrics(repo)
    const result = await useCase.execute(1)

    assert.isNull(result.heroMetric)
    assert.equal(result.sessionCount, 1)
  })

  test('allure calculée comme durée_totale / distance_totale (pas moyenne des allures)', async ({
    assert,
  }) => {
    // 2 séances : 10km en 60min (6'/km) et 1km en 10min (10'/km)
    // Vraie allure = 70min / 11km ≈ 6.364 min/km
    // Mauvaise allure (moyenne des allures) = (6 + 10) / 2 = 8 min/km
    const sessions = [
      makeSession({ id: 1, durationMinutes: 60, distanceKm: 10 }),
      makeSession({ id: 2, durationMinutes: 10, distanceKm: 1 }),
    ]

    const repo = makeMockSessionRepository({
      async findByUserIdAndDateRange(_userId, start) {
        if (start < '2026-01-01') return []
        return sessions
      },
      async findAllByUserId() {
        return makePaginatedResult([], 2)
      },
    })

    const useCase = new GetDashboardMetrics(repo)
    const result = await useCase.execute(1)

    assert.isNotNull(result.heroMetric)
    const expectedPace = 70 / 11 // ≈ 6.364 min/km
    assert.approximately(result.heroMetric!.currentPace, expectedPace, 0.001)
  })

  test('sparkline contient au maximum 8 points', async ({ assert }) => {
    const sessions = Array.from({ length: 12 }, (_, i) =>
      makeSession({ id: i + 1, durationMinutes: 60, distanceKm: 10 })
    )

    const repo = makeMockSessionRepository({
      async findByUserIdAndDateRange(_userId, start) {
        if (start < '2026-01-01') return []
        return sessions
      },
      async findAllByUserId() {
        return makePaginatedResult([], 12)
      },
    })

    const useCase = new GetDashboardMetrics(repo)
    const result = await useCase.execute(1)

    assert.isNotNull(result.heroMetric)
    assert.isAtMost(result.heroMetric!.sparklineData.length, 8)
  })

  test("tendance négative quand l'allure s'améliore (on court plus vite)", async ({ assert }) => {
    // Période courante : 6 min/km
    const currentSessions = [
      makeSession({ id: 1, durationMinutes: 60, distanceKm: 10 }),
      makeSession({ id: 2, durationMinutes: 60, distanceKm: 10 }),
    ]
    // Période précédente : 7 min/km (plus lent)
    const previousSessions = [
      makeSession({ id: 3, durationMinutes: 70, distanceKm: 10 }),
      makeSession({ id: 4, durationMinutes: 70, distanceKm: 10 }),
    ]

    let callCount = 0
    const repo = makeMockSessionRepository({
      async findByUserIdAndDateRange() {
        callCount++
        // Premier appel = période courante, deuxième = précédente
        return callCount === 1 ? currentSessions : previousSessions
      },
      async findAllByUserId() {
        return makePaginatedResult([], 4)
      },
    })

    const useCase = new GetDashboardMetrics(repo)
    const result = await useCase.execute(1)

    assert.isNotNull(result.heroMetric)
    // currentPace=6, previousPace=7, trend = (6-7)*60 = -60s (amélioration)
    assert.isNotNull(result.heroMetric!.trendSeconds)
    assert.isBelow(result.heroMetric!.trendSeconds!, 0)
  })

  test('retourne sessionCount = 0 si aucune séance', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      async findByUserIdAndDateRange() {
        return []
      },
      async findAllByUserId() {
        return makePaginatedResult([], 0)
      },
    })

    const useCase = new GetDashboardMetrics(repo)
    const result = await useCase.execute(1)

    assert.isNull(result.heroMetric)
    assert.equal(result.sessionCount, 0)
  })
})
