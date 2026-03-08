import { test } from '@japa/runner'
import { StravaActivityMapper } from '#connectors/strava/strava_activity_mapper'
import type { StravaDetailedActivity } from '#connectors/strava/strava_activity_mapper'
import fixtureList from '../../../fixtures/strava_activity.json' with { type: 'json' }

const FIXTURE_ACTIVITY = fixtureList[0] as StravaDetailedActivity

const FULL_ACTIVITY: StravaDetailedActivity = {
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

test.group('StravaActivityMapper — activité complète (AC#1, #2, #3)', () => {
  const mapper = new StravaActivityMapper()

  test('AC#1 — name mappé correctement', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.name, 'Morning Run')
  })

  test('AC#1 — sport_type Run → sportSlug running', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.sportSlug, 'running')
  })

  test('AC#1 — start_date_local → date', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.date, '2024-03-01T07:30:00')
  })

  test('AC#1 — moving_time (s) → durationMinutes (/60)', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.durationMinutes, 60)
  })

  test('AC#1 — distance (m) → distanceKm (/1000)', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.distanceKm, 10)
  })

  test('AC#1 — average_heartrate → avgHeartRate', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.avgHeartRate, 145)
  })

  test('AC#1 — allure course = 1000 / (speed * 60)', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    // 1000 / (2.778 * 60) ≈ 5.996 min/km
    assert.approximately(result.sportMetrics.allure!, 6.0, 0.01)
  })

  test('AC#2 — importedFrom = strava', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.importedFrom, 'strava')
  })

  test('AC#2 — externalId = activity.id', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.externalId, 12345)
  })

  test('AC#3 — calories dans sportMetrics', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.sportMetrics.calories, 500)
  })

  test('AC#3 — elevationGain dans sportMetrics', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.sportMetrics.elevationGain, 120)
  })

  test('AC#3 — maxHeartRate dans sportMetrics', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.sportMetrics.maxHeartRate, 175)
  })

  test('AC#3 — deviceName dans sportMetrics', ({ assert }) => {
    const result = mapper.map(FULL_ACTIVITY)
    assert.equal(result.sportMetrics.deviceName, 'Garmin Forerunner')
  })
})

test.group('StravaActivityMapper — activité partielle (AC#6)', () => {
  const mapper = new StravaActivityMapper()

  test('AC#6 — sans FC → avgHeartRate null', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, average_heartrate: undefined })
    assert.isNull(result.avgHeartRate)
  })

  test('AC#6 — sans distance → distanceKm null', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, distance: undefined })
    assert.isNull(result.distanceKm)
  })

  test('AC#6 — distance 0 → distanceKm null', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, distance: 0 })
    assert.isNull(result.distanceKm)
  })

  test('AC#6 — sans speed → allure null', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, average_speed: undefined })
    assert.isNull(result.sportMetrics.allure)
  })

  test('AC#6 — sans calories → null dans sportMetrics', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, calories: undefined })
    assert.isNull(result.sportMetrics.calories)
  })

  test('AC#6 — sans device_name → null dans sportMetrics', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, device_name: undefined })
    assert.isNull(result.sportMetrics.deviceName)
  })

  test('AC#6 — activité minimale sans aucun champ optionnel → pas de crash', ({ assert }) => {
    const minimal: StravaDetailedActivity = {
      id: 99,
      name: 'Minimal',
      sport_type: 'Run',
      start_date_local: '2024-01-01T10:00:00',
      moving_time: 1800,
    }
    const result = mapper.map(minimal)
    assert.equal(result.externalId, 99)
    assert.isNull(result.distanceKm)
    assert.isNull(result.avgHeartRate)
    assert.isNull(result.sportMetrics.allure)
    assert.isNull(result.sportMetrics.calories)
    assert.isNull(result.sportMetrics.elevationGain)
    assert.isNull(result.sportMetrics.maxHeartRate)
    assert.isNull(result.sportMetrics.deviceName)
  })
})

test.group('StravaActivityMapper — allure vélo (AC#1)', () => {
  const mapper = new StravaActivityMapper()

  test('allure velo = speed * 3.6 (km/h)', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, sport_type: 'Ride', average_speed: 10 })
    assert.approximately(result.sportMetrics.allure!, 36.0, 0.01)
  })
})

test.group('StravaActivityMapper — sport_type non mappé (AC#5)', () => {
  const mapper = new StravaActivityMapper()

  test('sport inconnu → sportSlug = other', ({ assert }) => {
    const result = mapper.map({ ...FULL_ACTIVITY, sport_type: 'Yoga' })
    assert.equal(result.sportSlug, 'other')
  })
})

test.group('StravaActivityMapper — fixture réelle Strava (Afternoon Walk)', () => {
  const mapper = new StravaActivityMapper()

  test('name mappé depuis la fixture', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).name, 'Afternoon Walk')
  })

  test('sport_type Walk → walking', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).sportSlug, 'walking')
  })

  test('distance 2749m → 2.749 km', ({ assert }) => {
    assert.approximately(mapper.map(FIXTURE_ACTIVITY).distanceKm!, 2.749, 0.001)
  })

  test('moving_time 2268s → 38 min (arrondi)', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).durationMinutes, 38)
  })

  test('average_heartrate → 105.7', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).avgHeartRate, 105.7)
  })

  test('externalId = 17651473733', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).externalId, 17651473733)
  })

  test('importedFrom = strava', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).importedFrom, 'strava')
  })

  test('elevationGain = 13.4', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).sportMetrics.elevationGain, 13.4)
  })

  test('maxHeartRate = 115', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).sportMetrics.maxHeartRate, 115)
  })

  test('deviceName = Apple Watch Series 10', ({ assert }) => {
    assert.equal(mapper.map(FIXTURE_ACTIVITY).sportMetrics.deviceName, 'Apple Watch Series 10')
  })

  test('calories absent dans la fixture → null', ({ assert }) => {
    assert.isNull(mapper.map(FIXTURE_ACTIVITY).sportMetrics.calories)
  })

  test('allure marche = 1000 / (1.212 * 60) ≈ 13.75 min/km', ({ assert }) => {
    assert.approximately(mapper.map(FIXTURE_ACTIVITY).sportMetrics.allure!, 13.75, 0.01)
  })
})
