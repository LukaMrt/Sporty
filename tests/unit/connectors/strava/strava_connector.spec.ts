import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { StravaConnector } from '#connectors/strava/strava_connector'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures')

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as unknown
}

// ─── Fixture streams inline (mini dataset) ────────────────────────────────────
// 21 points à intervalles de 30s = 600s de course (~2.4 km à ~4 m/s)

const MINI_STREAMS = [
  {
    type: 'time',
    data: [
      0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570,
      600,
    ],
  },
  {
    type: 'latlng',
    data: [
      [48.8566, 2.3522],
      [48.8573, 2.3525],
      [48.858, 2.3528],
      [48.8587, 2.353],
      [48.8594, 2.3533],
      [48.8601, 2.3536],
      [48.8608, 2.3539],
      [48.8615, 2.3542],
      [48.8622, 2.3545],
      [48.8629, 2.3548],
      [48.8636, 2.355],
      [48.8643, 2.3553],
      [48.865, 2.3556],
      [48.8657, 2.3559],
      [48.8664, 2.3562],
      [48.8671, 2.3565],
      [48.8678, 2.3568],
      [48.8685, 2.357],
      [48.8692, 2.3573],
      [48.8699, 2.3576],
      [48.8706, 2.3579],
    ],
  },
  {
    type: 'altitude',
    data: [50, 51, 52, 53, 54, 55, 55, 54, 53, 52, 51, 52, 53, 54, 55, 56, 57, 57, 56, 55, 54],
  },
  {
    type: 'heartrate',
    data: [
      140, 142, 144, 146, 148, 150, 152, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 164,
      163, 162,
    ],
  },
  {
    type: 'velocity_smooth',
    data: [
      0, 4.1, 4.2, 4.2, 4.1, 4.0, 4.1, 4.2, 4.2, 4.1, 4.0, 4.0, 4.1, 4.2, 4.2, 4.1, 4.0, 4.0, 4.1,
      4.2, 4.0,
    ],
  },
  {
    type: 'distance',
    data: [
      0, 123, 249, 375, 498, 618, 741, 867, 990, 1110, 1230, 1350, 1473, 1599, 1722, 1842, 1962,
      2085, 2208, 2328, 2448,
    ],
  },
]

const MINI_STREAMS_NO_HR = MINI_STREAMS.filter((s) => s.type !== 'heartrate')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeConnectorRepository(): ConnectorRepository {
  class Mock extends ConnectorRepository {
    async findById() {
      return null
    }
    async updateLastSyncAt() {}
    async findAllAutoImportEnabled() {
      return []
    }
    async upsert() {}
    async findFullByUserAndProvider() {
      return null
    }
    async findByUserAndProvider() {
      return null
    }
    async disconnect() {}
    async updateTokens() {}
    async setStatus() {}
    async updateSettings() {}
    async findSettings() {
      return null
    }
  }
  return new Mock()
}

function makeRateLimitManager(): RateLimitManager {
  class Mock extends RateLimitManager {
    update() {}
    async waitIfNeeded() {}
  }
  return new Mock()
}

function makeConnector(fetcher: (url: string) => unknown): StravaConnector {
  const mockFetch = async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input)
    const data = fetcher(url)
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new StravaConnector(
    1,
    42,
    { accessToken: 'tok', refreshToken: 'ref', expiresAt: 9999999999 },
    makeConnectorRepository(),
    makeRateLimitManager(),
    'client_id',
    'client_secret',
    { fetcher: mockFetch as typeof fetch }
  )
}

const FULL_DETAILED: object = {
  id: 12345,
  name: 'Morning Run',
  sport_type: 'Run',
  start_date_local: '2024-03-01T07:30:00',
  moving_time: 3600,
  distance: 10000,
  average_heartrate: 145,
  average_speed: 2.778,
  calories: 500,
  total_elevation_gain: 120,
  max_heartrate: 175,
  device_name: 'Garmin Forerunner',
}

const FIXTURE_DETAILED: object = {
  id: 17651473733,
  name: 'Afternoon Walk',
  sport_type: 'Walk',
  start_date_local: '2026-03-08T16:04:00Z',
  moving_time: 2268,
  distance: 2749.0,
  average_heartrate: 105.7,
  average_speed: 1.212,
  total_elevation_gain: 13.4,
  max_heartrate: 115.0,
  device_name: 'Apple Watch Series 10',
}

// ─── Tests : getSessionDetail (mapping) ───────────────────────────────────────

test.group('StravaConnector.getSessionDetail — session complète', () => {
  test('sport_type Run → sportSlug running', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.sportSlug, 'running')
  })

  test('start_date_local → date (10 chars)', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.date, '2024-03-01')
  })

  test('moving_time (s) → durationMinutes', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.durationMinutes, 60)
  })

  test('distance (m) → distanceKm (/1000)', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.distanceKm, 10)
  })

  test('average_heartrate → avgHeartRate', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.avgHeartRate, 145)
  })

  test('allure course = 1000 / (speed * 60)', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.approximately(
      (result.sportMetrics as Record<string, unknown>).allure as number,
      6.0,
      0.01
    )
  })

  test('importedFrom = strava', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.importedFrom, 'strava')
  })

  test('externalId = id as string', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.externalId, '12345')
  })

  test('calories dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal((result.sportMetrics as Record<string, unknown>).calories, 500)
  })

  test('elevationGain dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.sportMetrics.elevationGain, 120)
  })

  test('maxHeartRate dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.sportMetrics.maxHeartRate, 175)
  })

  test('deviceName dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(() => FULL_DETAILED)
    const result = await connector.getSessionDetail('12345')
    assert.equal((result.sportMetrics as Record<string, unknown>).deviceName, 'Garmin Forerunner')
  })
})

test.group('StravaConnector.getSessionDetail — champs optionnels absents', () => {
  test('sans FC → avgHeartRate null', async ({ assert }) => {
    const connector = makeConnector(() => ({ ...FULL_DETAILED, average_heartrate: undefined }))
    const result = await connector.getSessionDetail('12345')
    assert.isNull(result.avgHeartRate)
  })

  test('sans distance → distanceKm null', async ({ assert }) => {
    const connector = makeConnector(() => ({ ...FULL_DETAILED, distance: undefined }))
    const result = await connector.getSessionDetail('12345')
    assert.isNull(result.distanceKm)
  })

  test('distance 0 → distanceKm null', async ({ assert }) => {
    const connector = makeConnector(() => ({ ...FULL_DETAILED, distance: 0 }))
    const result = await connector.getSessionDetail('12345')
    assert.isNull(result.distanceKm)
  })

  test('sans speed → allure null', async ({ assert }) => {
    const connector = makeConnector(() => ({ ...FULL_DETAILED, average_speed: undefined }))
    const result = await connector.getSessionDetail('12345')
    assert.isNull((result.sportMetrics as Record<string, unknown>).allure)
  })

  test('sport_type vélo → allure en km/h (speed * 3.6)', async ({ assert }) => {
    const connector = makeConnector(() => ({
      ...FULL_DETAILED,
      sport_type: 'Ride',
      average_speed: 10,
    }))
    const result = await connector.getSessionDetail('12345')
    assert.approximately(
      (result.sportMetrics as Record<string, unknown>).allure as number,
      36.0,
      0.01
    )
  })

  test('sport inconnu → sportSlug other', async ({ assert }) => {
    const connector = makeConnector(() => ({ ...FULL_DETAILED, sport_type: 'Yoga' }))
    const result = await connector.getSessionDetail('12345')
    assert.equal(result.sportSlug, 'other')
  })
})

test.group('StravaConnector.getSessionDetail — fixture réelle Strava (Afternoon Walk)', () => {
  test('name correct', async ({ assert }) => {
    const connector = makeConnector(() => FIXTURE_DETAILED)
    const result = await connector.getSessionDetail('17651473733')
    assert.equal(result.sportSlug, 'walking')
  })

  test('distance 2749m → 2.749 km', async ({ assert }) => {
    const connector = makeConnector(() => FIXTURE_DETAILED)
    const result = await connector.getSessionDetail('17651473733')
    assert.approximately(result.distanceKm!, 2.749, 0.001)
  })

  test('moving_time 2268s → 38 min (arrondi)', async ({ assert }) => {
    const connector = makeConnector(() => FIXTURE_DETAILED)
    const result = await connector.getSessionDetail('17651473733')
    assert.equal(result.durationMinutes, 38)
  })

  test('average_heartrate → 105.7', async ({ assert }) => {
    const connector = makeConnector(() => FIXTURE_DETAILED)
    const result = await connector.getSessionDetail('17651473733')
    assert.equal(result.avgHeartRate, 105.7)
  })

  test('allure marche = 1000 / (1.212 * 60) ≈ 13.75 min/km', async ({ assert }) => {
    const connector = makeConnector(() => FIXTURE_DETAILED)
    const result = await connector.getSessionDetail('17651473733')
    assert.approximately(
      (result.sportMetrics as Record<string, unknown>).allure as number,
      13.75,
      0.01
    )
  })
})

test.group('StravaConnector.listSessions — retourne MappedSessionSummary[]', () => {
  const SUMMARY_RESPONSE = [
    {
      id: 111,
      name: 'Morning Run',
      sport_type: 'Run',
      start_date_local: '2026-03-01T08:00:00',
      moving_time: 3600,
      distance: 10000,
      average_heartrate: 150,
    },
    {
      id: 222,
      name: 'Ride',
      sport_type: 'Ride',
      start_date_local: '2026-03-02T10:00:00',
      moving_time: 7200,
      distance: null,
      average_heartrate: null,
    },
  ]

  test('retourne le bon nombre de sessions', async ({ assert }) => {
    const connector = makeConnector(() => SUMMARY_RESPONSE)
    const result = await connector.listSessions({ perPage: 200 })
    assert.equal(result.length, 2)
  })

  test('sportSlug mappé correctement (Run → running)', async ({ assert }) => {
    const connector = makeConnector(() => SUMMARY_RESPONSE)
    const result = await connector.listSessions({ perPage: 200 })
    assert.equal(result[0].sportSlug, 'running')
  })

  test('date = start_date_local', async ({ assert }) => {
    const connector = makeConnector(() => SUMMARY_RESPONSE)
    const result = await connector.listSessions({ perPage: 200 })
    assert.equal(result[0].date, '2026-03-01T08:00:00')
  })

  test('durationMinutes = moving_time / 60', async ({ assert }) => {
    const connector = makeConnector(() => SUMMARY_RESPONSE)
    const result = await connector.listSessions({ perPage: 200 })
    assert.equal(result[0].durationMinutes, 60)
  })

  test('distanceKm null quand distance absente', async ({ assert }) => {
    const connector = makeConnector(() => SUMMARY_RESPONSE)
    const result = await connector.listSessions({ perPage: 200 })
    assert.isNull(result[1].distanceKm)
  })

  test('externalId = id as string', async ({ assert }) => {
    const connector = makeConnector(() => SUMMARY_RESPONSE)
    const result = await connector.listSessions({ perPage: 200 })
    assert.equal(result[0].externalId, '111')
  })
})

// ─── Helpers pour les tests streams ───────────────────────────────────────────

const RUN_DETAIL = {
  id: 99,
  name: 'Morning Run',
  sport_type: 'Run',
  start_date_local: '2024-03-01T07:30:00',
  moving_time: 3600,
  distance: 10000,
  average_heartrate: 155,
  average_speed: 2.778,
  calories: 500,
  total_elevation_gain: 50,
  max_heartrate: 170,
  device_name: 'Garmin',
}

const RIDE_DETAIL = { ...RUN_DETAIL, id: 88, sport_type: 'Ride' }

/** Fetcher qui distingue detail vs streams par URL */
function makeStreamsFetcher(opts: {
  detail?: object
  streams?: object
  streamsError?: boolean
}): (url: string) => object {
  return (url: string) => {
    if (url.includes('/streams')) {
      if (opts.streamsError) throw new Error('API error')
      return opts.streams ?? []
    }
    return opts.detail ?? RUN_DETAIL
  }
}

// ─── Tests : streams running ───────────────────────────────────────────────────

test.group('StravaConnector.getSessionDetail — running avec streams', () => {
  test('heartRateCurve présente dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.heartRateCurve)
    assert.isAbove((result.sportMetrics.heartRateCurve as unknown[]).length, 0)
  })

  test('paceCurve présente dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.paceCurve)
  })

  test('altitudeCurve présente dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.altitudeCurve)
  })

  test('gpsTrack présent dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.gpsTrack)
  })

  test('splits présents dans sportMetrics', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.splits)
    assert.isAbove((result.sportMetrics.splits as unknown[]).length, 0)
  })

  test('minHeartRate et maxHeartRate présents', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isNumber(result.sportMetrics.minHeartRate)
    assert.isNumber(result.sportMetrics.maxHeartRate)
  })

  test('elevationGain et elevationLoss présents', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isNumber(result.sportMetrics.elevationGain)
    assert.isNumber(result.sportMetrics.elevationLoss)
  })

  test('cadenceAvg présent si stream cadence fourni', async ({ assert }) => {
    const withCadence = [
      ...MINI_STREAMS,
      {
        type: 'cadence',
        data: [0, 85, 86, 87, 86, 85, 86, 87, 86, 85, 86, 85, 86, 87, 86, 85, 86, 87, 86, 85, 84],
      },
    ]
    const connector = makeConnector(makeStreamsFetcher({ streams: withCadence }))
    const result = await connector.getSessionDetail('99')
    assert.isNumber(result.sportMetrics.cadenceAvg)
  })

  test('allure et calories conservés depuis le détail brut', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isNumber((result.sportMetrics as Record<string, unknown>).allure)
    assert.isNumber((result.sportMetrics as Record<string, unknown>).calories)
  })
})

test.group('StravaConnector.getSessionDetail — running avec contexte FC max', () => {
  test('hrZones présentes quand maxHeartRate fourni + heartRateCurve', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99', { maxHeartRate: 185 })
    const zones = result.sportMetrics.hrZones as Record<string, number>
    assert.isObject(zones)
    assert.property(zones, 'z1')
    assert.property(zones, 'z5')
  })

  test('cardiacDrift présent quand maxHeartRate fourni', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99', { maxHeartRate: 185 })
    assert.isNumber(result.sportMetrics.cardiacDrift)
  })

  test('trimp présent quand maxHeartRate fourni', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99', { maxHeartRate: 185 })
    assert.isNumber(result.sportMetrics.trimp)
    assert.isAbove(result.sportMetrics.trimp as number, 0)
  })
})

test.group('StravaConnector.getSessionDetail — running sans contexte FC max', () => {
  test('hrZones absent quand pas de maxHeartRate', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isUndefined(result.sportMetrics.hrZones)
  })

  test('cardiacDrift absent quand pas de maxHeartRate', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isUndefined(result.sportMetrics.cardiacDrift)
  })

  test('trimp absent quand pas de maxHeartRate', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isUndefined(result.sportMetrics.trimp)
  })

  test('courbes présentes même sans maxHeartRate', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.heartRateCurve)
    assert.isArray(result.sportMetrics.paceCurve)
  })
})

test.group('StravaConnector.getSessionDetail — running sans streams (erreur API)', () => {
  test('session basique retournée sans courbes', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streamsError: true }))
    const result = await connector.getSessionDetail('99')
    assert.isUndefined(result.sportMetrics.heartRateCurve)
    assert.isUndefined(result.sportMetrics.paceCurve)
    assert.isUndefined(result.sportMetrics.splits)
  })

  test('metriques basiques toujours présentes après erreur streams', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streamsError: true }))
    const result = await connector.getSessionDetail('99')
    assert.isNumber((result.sportMetrics as Record<string, unknown>).allure)
    assert.equal((result.sportMetrics as Record<string, unknown>).calories, 500)
    assert.equal(result.sportMetrics.maxHeartRate, 170)
  })

  test('sportSlug, date, durationMinutes conservés', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streamsError: true }))
    const result = await connector.getSessionDetail('99')
    assert.equal(result.sportSlug, 'running')
    assert.equal(result.date, '2024-03-01')
    assert.equal(result.durationMinutes, 60)
  })
})

test.group('StravaConnector.getSessionDetail — activité non-running (vélo)', () => {
  test('cyclisme → pas de streams (pas de courbes dans sportMetrics)', async ({ assert }) => {
    let streamsCalled = false
    const connector = makeConnector((url) => {
      if (url.includes('/streams')) {
        streamsCalled = true
        return []
      }
      return RIDE_DETAIL
    })
    const result = await connector.getSessionDetail('88')
    assert.isFalse(streamsCalled, "L'API streams ne doit pas être appelée pour le vélo")
    assert.isUndefined(result.sportMetrics.heartRateCurve)
    assert.equal(result.sportSlug, 'cycling')
  })
})

test.group('StravaConnector.getSessionDetail — streams partiels (sans heartrate)', () => {
  test('sans heartrate → heartRateCurve undefined', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS_NO_HR }))
    const result = await connector.getSessionDetail('99')
    assert.isUndefined(result.sportMetrics.heartRateCurve)
  })

  test('sans heartrate → paceCurve toujours présente (GPS disponible)', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS_NO_HR }))
    const result = await connector.getSessionDetail('99')
    assert.isArray(result.sportMetrics.paceCurve)
  })

  test('sans heartrate + maxHeartRate → hrZones absent', async ({ assert }) => {
    const connector = makeConnector(makeStreamsFetcher({ streams: MINI_STREAMS_NO_HR }))
    const result = await connector.getSessionDetail('99', { maxHeartRate: 185 })
    assert.isUndefined(result.sportMetrics.hrZones)
  })
})

// ─── Test avec fixture réelle Strava ──────────────────────────────────────────

test.group('StravaConnector.getSessionDetail — fixture réelle Strava (~6km)', () => {
  test('import complet avec streams réels + contexte FC max → session enrichie', async ({
    assert,
  }) => {
    const sessionFixture = loadFixture('strava_session.json')
    const streamsFixture = loadFixture('strava_streams.json')

    const connector = makeConnector((url) => {
      if (url.includes('/streams')) return streamsFixture
      return sessionFixture
    })

    const result = await connector.getSessionDetail('17696043236', { maxHeartRate: 185 })

    assert.equal(result.sportSlug, 'running')
    assert.isArray(result.sportMetrics.heartRateCurve)
    assert.isArray(result.sportMetrics.paceCurve)
    assert.isArray(result.sportMetrics.splits)
    assert.isAbove((result.sportMetrics.splits as unknown[]).length, 0)
    assert.isObject(result.sportMetrics.hrZones)
    assert.isNumber(result.sportMetrics.cardiacDrift)
    assert.isNumber(result.sportMetrics.trimp)
    assert.isAbove(result.sportMetrics.trimp as number, 0)
  })

  test('import complet sans FC max → courbes sans zones', async ({ assert }) => {
    const sessionFixture = loadFixture('strava_session.json')
    const streamsFixture = loadFixture('strava_streams.json')

    const connector = makeConnector((url) => {
      if (url.includes('/streams')) return streamsFixture
      return sessionFixture
    })

    const result = await connector.getSessionDetail('17696043236')

    assert.isArray(result.sportMetrics.heartRateCurve)
    assert.isUndefined(result.sportMetrics.hrZones)
    assert.isUndefined(result.sportMetrics.trimp)
  })
})
