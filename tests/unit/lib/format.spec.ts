import { test } from '@japa/runner'
import { paceToKmh, kmToMiles } from '../../../inertia/lib/format.js'

test.group('format — paceToKmh', () => {
  test('5 min/km → 12.0 km/h', ({ assert }) => {
    assert.closeTo(paceToKmh(5), 12.0, 0.001)
  })

  test('6 min/km → 10.0 km/h', ({ assert }) => {
    assert.closeTo(paceToKmh(6), 10.0, 0.001)
  })

  test('4 min/km → 15.0 km/h', ({ assert }) => {
    assert.closeTo(paceToKmh(4), 15.0, 0.001)
  })
})

test.group('format — kmToMiles', () => {
  test('10 km → 6.21 mi (approx)', ({ assert }) => {
    assert.closeTo(kmToMiles(10), 6.2137, 0.001)
  })

  test('0 km → 0 mi', ({ assert }) => {
    assert.strictEqual(kmToMiles(0), 0)
  })

  test('1 km → 0.621 mi (approx)', ({ assert }) => {
    assert.closeTo(kmToMiles(1), 0.621371, 0.0001)
  })
})
