import { test } from '@japa/runner'
import type { AnalysisSession } from '#domain/services/analysis/aggregations'
import {
  distanceBySport,
  newSwimRecords,
  swimPaceTrend,
  swimRecords,
} from '#domain/services/analysis/swimming'

function swim(partial: Partial<AnalysisSession> & { id: number; date: string }): AnalysisSession {
  return {
    sportSlug: 'swimming',
    durationMinutes: 30,
    distanceKm: 1.5,
    avgHeartRate: null,
    trainingLoad: null,
    analysis: null,
    ...partial,
  }
}

test.group('Analyse natation', () => {
  test('swimPaceTrend : allure par semaine pondérée par la distance', ({ assert }) => {
    const trend = swimPaceTrend([
      swim({ id: 1, date: '2026-09-21', durationMinutes: 30, distanceKm: 1.5 }), // 2'00
      swim({ id: 2, date: '2026-09-23', durationMinutes: 10, distanceKm: 0.4 }), // 2'30
      swim({ id: 3, date: '2026-09-23', sportSlug: 'running', distanceKm: 10 }),
    ])

    assert.lengthOf(trend, 1)
    assert.equal(trend[0].week, '2026-09-21')
    // 40 min / 1 900 m = 2,105 min/100 m
    assert.approximately(trend[0].pacePer100m, 2.11, 0.01)
    assert.equal(trend[0].distanceM, 1900)
  })

  test('swimRecords : meilleure allure parmi les séances assez longues', ({ assert }) => {
    const records = swimRecords([
      swim({ id: 1, date: '2026-09-01', durationMinutes: 8, distanceKm: 0.4 }), // 2'00
      swim({ id: 2, date: '2026-09-02', durationMinutes: 33, distanceKm: 1.5 }), // 2'12
    ])

    assert.deepEqual(
      records.map((r) => [r.distance, r.sessionId]),
      [
        [400, 1],
        [1000, 2],
        [1500, 2],
      ]
    )
  })

  test('newSwimRecords : seuls les records battus', ({ assert }) => {
    const before = [{ distance: 400 as const, pacePer100m: 2, sessionId: 1, date: '2026-01-01' }]
    const period = [
      { distance: 400 as const, pacePer100m: 2.1, sessionId: 2, date: '2026-09-01' },
      { distance: 1000 as const, pacePer100m: 2.2, sessionId: 2, date: '2026-09-01' },
    ]
    assert.deepEqual(
      newSwimRecords(period, before).map((r) => r.distance),
      [1000]
    )
  })

  test('distanceBySport : jamais additionnée entre sports', ({ assert }) => {
    assert.deepEqual(
      distanceBySport([
        swim({ id: 1, date: '2026-09-01' }),
        swim({ id: 2, date: '2026-09-02', sportSlug: 'running', distanceKm: 10 }),
        swim({ id: 3, date: '2026-09-03', sportSlug: 'running', distanceKm: null }),
      ]),
      { swimming: 1.5, running: 10 }
    )
  })
})
