import { test } from '@japa/runner'
import { computeAllure, computeAllureFromDistance } from '#connectors/pace'

test.group('computeAllure', () => {
  test('course : min/km', ({ assert }) => {
    // 3,333 m/s = 5'00/km
    assert.closeTo(computeAllure(1000 / 300, 'running')!, 5, 0.001)
  })

  test('vélo : km/h', ({ assert }) => {
    assert.closeTo(computeAllure(10, 'cycling')!, 36, 0.001)
  })

  test('natation : min/100 m', ({ assert }) => {
    // 100 m en 2'00 = 0,8333 m/s
    assert.closeTo(computeAllure(100 / 120, 'swimming')!, 2, 0.001)
  })

  test('vitesse nulle ou absente → null', ({ assert }) => {
    assert.isNull(computeAllure(null, 'swimming'))
    assert.isNull(computeAllure(0, 'swimming'))
  })
})

test.group('computeAllureFromDistance', () => {
  test('natation : 1 500 m en 30 min → 2 min/100 m', ({ assert }) => {
    assert.closeTo(computeAllureFromDistance(1500, 1800, 'swimming')!, 2, 0.001)
  })

  test('distance absente → null', ({ assert }) => {
    assert.isNull(computeAllureFromDistance(null, 1800, 'swimming'))
  })
})
