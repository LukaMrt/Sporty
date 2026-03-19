import { test } from '@japa/runner'
import { StravaConnector } from '#connectors/strava/strava_connector'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { RateLimitManager } from '#domain/interfaces/rate_limit_manager'

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

function makeConnector(fetcher: (url: string) => object): StravaConnector {
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
    assert.approximately(result.sportMetrics.allure as number, 6.0, 0.01)
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
    assert.equal(result.sportMetrics.calories, 500)
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
    assert.equal(result.sportMetrics.deviceName, 'Garmin Forerunner')
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
    assert.isNull(result.sportMetrics.allure)
  })

  test('sport_type vélo → allure en km/h (speed * 3.6)', async ({ assert }) => {
    const connector = makeConnector(() => ({
      ...FULL_DETAILED,
      sport_type: 'Ride',
      average_speed: 10,
    }))
    const result = await connector.getSessionDetail('12345')
    assert.approximately(result.sportMetrics.allure as number, 36.0, 0.01)
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
    assert.approximately(result.sportMetrics.allure as number, 13.75, 0.01)
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
