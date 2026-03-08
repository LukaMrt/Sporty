import { test } from '@japa/runner'
import { StravaSportMapper } from '#connectors/strava/strava_sport_mapper'

test.group('StravaSportMapper', () => {
  const mapper = new StravaSportMapper()

  // AC#4 — types connus
  test('Run → course', ({ assert }) => {
    assert.equal(mapper.map('Run'), 'course')
  })

  test('TrailRun → course', ({ assert }) => {
    assert.equal(mapper.map('TrailRun'), 'course')
  })

  test('VirtualRun → course', ({ assert }) => {
    assert.equal(mapper.map('VirtualRun'), 'course')
  })

  test('Ride → velo', ({ assert }) => {
    assert.equal(mapper.map('Ride'), 'velo')
  })

  test('MountainBikeRide → velo', ({ assert }) => {
    assert.equal(mapper.map('MountainBikeRide'), 'velo')
  })

  test('GravelRide → velo', ({ assert }) => {
    assert.equal(mapper.map('GravelRide'), 'velo')
  })

  test('EBikeRide → velo', ({ assert }) => {
    assert.equal(mapper.map('EBikeRide'), 'velo')
  })

  test('VirtualRide → velo', ({ assert }) => {
    assert.equal(mapper.map('VirtualRide'), 'velo')
  })

  test('Swim → natation', ({ assert }) => {
    assert.equal(mapper.map('Swim'), 'natation')
  })

  test('Walk → marche', ({ assert }) => {
    assert.equal(mapper.map('Walk'), 'marche')
  })

  test('Hike → randonnee', ({ assert }) => {
    assert.equal(mapper.map('Hike'), 'randonnee')
  })

  // AC#5 — fallback
  test('type inconnu → autre', ({ assert }) => {
    assert.equal(mapper.map('Yoga'), 'autre')
  })

  test('type vide → autre', ({ assert }) => {
    assert.equal(mapper.map(''), 'autre')
  })

  test('type non reconnu → autre', ({ assert }) => {
    assert.equal(mapper.map('Crossfit'), 'autre')
  })
})
