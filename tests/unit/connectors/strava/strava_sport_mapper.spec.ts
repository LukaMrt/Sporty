import { test } from '@japa/runner'
import { StravaSportMapper } from '#connectors/strava/strava_sport_mapper'

test.group('StravaSportMapper', () => {
  const mapper = new StravaSportMapper()

  test('Run → running', ({ assert }) => {
    assert.equal(mapper.map('Run'), 'running')
  })

  test('TrailRun → running', ({ assert }) => {
    assert.equal(mapper.map('TrailRun'), 'running')
  })

  test('VirtualRun → running', ({ assert }) => {
    assert.equal(mapper.map('VirtualRun'), 'running')
  })

  test('Ride → cycling', ({ assert }) => {
    assert.equal(mapper.map('Ride'), 'cycling')
  })

  test('MountainBikeRide → cycling', ({ assert }) => {
    assert.equal(mapper.map('MountainBikeRide'), 'cycling')
  })

  test('GravelRide → cycling', ({ assert }) => {
    assert.equal(mapper.map('GravelRide'), 'cycling')
  })

  test('EBikeRide → cycling', ({ assert }) => {
    assert.equal(mapper.map('EBikeRide'), 'cycling')
  })

  test('VirtualRide → cycling', ({ assert }) => {
    assert.equal(mapper.map('VirtualRide'), 'cycling')
  })

  test('Swim → swimming', ({ assert }) => {
    assert.equal(mapper.map('Swim'), 'swimming')
  })

  test('Walk → walking', ({ assert }) => {
    assert.equal(mapper.map('Walk'), 'walking')
  })

  test('Hike → hiking', ({ assert }) => {
    assert.equal(mapper.map('Hike'), 'hiking')
  })

  test('type inconnu → other', ({ assert }) => {
    assert.equal(mapper.map('Yoga'), 'other')
  })

  test('type vide → other', ({ assert }) => {
    assert.equal(mapper.map(''), 'other')
  })

  test('type non reconnu → other', ({ assert }) => {
    assert.equal(mapper.map('Crossfit'), 'other')
  })
})
