import { test } from '@japa/runner'
import { OpenWearablesConnector } from '#connectors/open_wearables/open_wearables_connector'
import { encodeExternalId } from '#connectors/open_wearables/open_wearables_external_id'
import type { Fetcher } from '#connectors/open_wearables/open_wearables_http_client'
import type { RawOwTimeSeriesSample, RawOwWorkout } from '#connectors/open_wearables/types'
import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

const noRateLimit = {
  update() {},
  async waitIfNeeded() {},
} as RateLimitManager

function makeWorkout(overrides: Partial<RawOwWorkout> = {}): RawOwWorkout {
  return {
    id: 'a0000000-0000-0000-0000-000000000000',
    type: 'pool_swimming',
    name: null,
    start_time: '2026-09-20T07:30:00+02:00',
    end_time: '2026-09-20T08:00:00+02:00',
    zone_offset: '+02:00',
    duration_seconds: 1800,
    source: {
      provider: 'garmin',
      source: 'garmin',
      device: null,
      device_type: 'watch',
      device_name: 'Forerunner 965',
    },
    calories_kcal: 320,
    distance_meters: 1500,
    avg_heart_rate_bpm: 130,
    max_heart_rate_bpm: 155,
    avg_pace_sec_per_km: null,
    elevation_gain_meters: null,
    ...overrides,
  }
}

/** Serveur OW minimal : la liste de workouts et les échantillons FC donnés */
function makeConnector(workouts: RawOwWorkout[], heartRateSamples: RawOwTimeSeriesSample[] = []) {
  const page = (data: unknown[]) =>
    new Response(
      JSON.stringify({
        data,
        pagination: { next_cursor: null, previous_cursor: null, has_more: false, total_count: 0 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  const fetcher: Fetcher = async (input) => {
    const url = input instanceof Request ? input.url : input.toString()
    return page(url.includes('/events/workouts') ? workouts : heartRateSamples)
  }

  return new OpenWearablesConnector(
    1,
    'user-1',
    'key',
    'http://ow.test',
    'X-API-Key',
    noRateLimit,
    {
      fetcher,
    }
  )
}

test.group('OpenWearablesConnector — natation', () => {
  test('liste : nom par défaut lisible et slug swimming', async ({ assert }) => {
    const [summary] = await makeConnector([makeWorkout()]).listSessions({
      after: new Date('2026-09-19'),
      before: new Date('2026-09-21'),
    })

    assert.equal(summary.sportSlug, 'swimming')
    assert.equal(summary.name, 'Natation en piscine 07:30')
    assert.equal(summary.distanceKm, 1.5)
  })

  test('détail : allure en min/100 m et sous-type piscine', async ({ assert }) => {
    const workout = makeWorkout()
    const detail = await makeConnector([workout]).getSessionDetail(
      encodeExternalId(workout.start_time, workout.type)
    )

    assert.equal(detail.sportSlug, 'swimming')
    const metrics = detail.sportMetrics as Record<string, unknown>
    assert.equal(metrics.subType, 'pool')
    // 1 500 m en 30 min → 2'00/100 m
    assert.closeTo(metrics.allure as number, 2, 0.001)
  })

  test('détail : courbe FC trop trouée ignorée, FC moyenne conservée', async ({ assert }) => {
    const workout = makeWorkout()
    // 3 minutes de cardio sur 30 : la montre a décroché dans l'eau
    const samples: RawOwTimeSeriesSample[] = Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.parse(workout.start_time) + i * 15_000).toISOString(),
      zone_offset: '+02:00',
      type: 'heart_rate',
      value: 130,
      unit: 'bpm',
      source: workout.source,
      is_daily_total: null,
    }))
    const detail = await makeConnector([workout], samples).getSessionDetail(
      encodeExternalId(workout.start_time, workout.type)
    )

    const metrics = detail.sportMetrics as Record<string, unknown>
    assert.notProperty(metrics, 'heartRateCurve')
    assert.isTrue(metrics.heartRateCurveDiscarded)
    assert.equal(detail.avgHeartRate, 130)
  })

  test('détail : mouvements de bras additionnés depuis swimming_stroke_count', async ({
    assert,
  }) => {
    const workout = makeWorkout()
    const at = (seconds: number) =>
      new Date(Date.parse(workout.start_time) + seconds * 1000).toISOString()
    const stroke = (seconds: number, value: number, daily = false): RawOwTimeSeriesSample => ({
      timestamp: at(seconds),
      zone_offset: '+02:00',
      type: 'swimming_stroke_count',
      value,
      unit: 'count',
      source: workout.source,
      is_daily_total: daily,
    })
    const samples = [
      stroke(60, 18),
      stroke(120, 20),
      stroke(180, 5000, true), // total journalier : ignoré
      stroke(7200, 30), // hors séance : ignoré
    ]

    const detail = await makeConnector([workout], samples).getSessionDetail(
      encodeExternalId(workout.start_time, workout.type)
    )

    assert.equal((detail.sportMetrics as Record<string, unknown>).strokes, 38)
  })
})
