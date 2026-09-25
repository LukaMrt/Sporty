import { test } from '@japa/runner'
import { OpenWearablesConnector } from '#connectors/open_wearables/open_wearables_connector'
import { encodeExternalId } from '#connectors/open_wearables/open_wearables_external_id'
import type { Fetcher } from '#connectors/open_wearables/open_wearables_http_client'
import type { RawOwWorkout } from '#connectors/open_wearables/types'
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

/** Serveur OW minimal : la liste de workouts donnée, aucune timeseries */
function makeConnector(workouts: RawOwWorkout[]) {
  const page = (data: unknown[]) =>
    new Response(
      JSON.stringify({
        data,
        pagination: { next_cursor: null, previous_cursor: null, has_more: false, total_count: 0 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  const fetcher: Fetcher = async (input) =>
    page(String(input).includes('/events/workouts') ? workouts : [])

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
})
