import { test } from '@japa/runner'
import { mergeGpxIntoImportedMetrics } from '#domain/services/gpx_metrics'

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
