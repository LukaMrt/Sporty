import { test } from '@japa/runner'
import { buildSwimInputMetrics } from '#domain/services/swim_metrics'

test.group('buildSwimInputMetrics', () => {
  test('conserve le lieu et la longueur du bassin', ({ assert }) => {
    assert.deepEqual(buildSwimInputMetrics({ subType: 'pool', poolLengthM: 25 }), {
      subType: 'pool',
      poolLengthM: 25,
    })
  })

  test('ignore un lieu inconnu et les valeurs vides', ({ assert }) => {
    assert.deepEqual(buildSwimInputMetrics({ subType: 'lake', poolLengthM: null }), {})
  })
})
