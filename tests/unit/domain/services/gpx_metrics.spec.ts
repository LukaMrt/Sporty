import { test } from '@japa/runner'
import { mergeGpxIntoImportedMetrics, resampleCurve } from '#domain/services/gpx_metrics'

test.group('mergeGpxIntoImportedMetrics', () => {
  test('la trace et les splits viennent du GPX, la courbe FC de la montre est gardée', ({
    assert,
  }) => {
    const watchCurve = [{ time: 0, value: 140 }]
    const merged = mergeGpxIntoImportedMetrics(
      { heartRateCurve: watchCurve, maxHeartRate: 170, splits: [] },
      {
        heartRateCurve: [{ time: 0, value: 90 }],
        maxHeartRate: 150,
        gpsTrack: [{ lat: 45, lon: 5, time: 0 }],
        splits: [{ km: 1, paceSeconds: 300 }],
      }
    )

    assert.deepEqual(merged.heartRateCurve, watchCurve)
    assert.equal(merged.maxHeartRate, 170)
    assert.lengthOf(merged.gpsTrack as unknown[], 1)
    assert.lengthOf(merged.splits as unknown[], 1)
  })

  test('complète ce que la montre ne fournissait pas', ({ assert }) => {
    const merged = mergeGpxIntoImportedMetrics({}, { cadenceAvg: 172 })
    assert.equal(merged.cadenceAvg, 172)
  })
})

test.group('resampleCurve', () => {
  test('instants irréguliers → grille régulière interpolée', ({ assert }) => {
    const curve = [
      { time: 3, value: 100 },
      { time: 8, value: 110 },
      { time: 26, value: 130 },
      { time: 33, value: 140 },
    ]
    assert.deepEqual(resampleCurve(curve, 15), [
      { time: 15, value: 118 },
      { time: 30, value: 136 },
    ])
  })

  test("pas d'interpolation au-dessus d'un trou de plus de 60 s", ({ assert }) => {
    const curve = [
      { time: 0, value: 100 },
      { time: 120, value: 160 },
    ]
    assert.deepEqual(resampleCurve(curve, 15), [
      { time: 0, value: 100 },
      { time: 120, value: 160 },
    ])
  })
})
