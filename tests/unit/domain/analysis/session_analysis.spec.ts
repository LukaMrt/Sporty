import { test } from '@japa/runner'
import {
  aerobicDecoupling,
  bestEffortSeconds,
  bestWindowMean,
  computeSessionAnalysis,
  percentile,
} from '#domain/services/analysis/session_analysis'
import type { GpsPoint, DataPoint } from '#domain/value_objects/run_metrics'

/** Trace rectiligne vers le nord : `metersPerPoint` mètres toutes les `secondsPerPoint` s */
function straightTrack(
  points: number,
  metersPerPoint: number,
  secondsPerPoint: number
): GpsPoint[] {
  const degPerMeter = 1 / 111_195
  return Array.from({ length: points }, (_, i) => ({
    lat: 45 + i * metersPerPoint * degPerMeter,
    lon: 5,
    time: i * secondsPerPoint,
  }))
}

test.group('bestEffortSeconds', () => {
  test('allure constante : 1 km en 300 s à 3,33 m/s', ({ assert }) => {
    const track = straightTrack(401, 10, 3) // 4 km à 10 m / 3 s
    assert.approximately(bestEffortSeconds(track, 1000)!, 300, 2)
  })

  test('trouve le segment le plus rapide au milieu de la séance', ({ assert }) => {
    const slow = straightTrack(101, 10, 6) // 1 km en 600 s
    const fastStart = slow[100]
    const fast = straightTrack(101, 10, 2).map((p) => ({
      lat: fastStart.lat + (p.lat - 45),
      lon: 5,
      time: fastStart.time + p.time,
    }))
    const track = [...slow, ...fast.slice(1)]
    assert.approximately(bestEffortSeconds(track, 1000)!, 200, 2)
  })

  test('distance supérieure à la trace → null', ({ assert }) => {
    assert.isNull(bestEffortSeconds(straightTrack(11, 10, 3), 1000))
  })
})

test.group('fenêtres et percentiles FC', () => {
  test('bestWindowMean : meilleure moyenne sur la fenêtre', ({ assert }) => {
    const curve: DataPoint[] = [
      { time: 0, value: 130 },
      { time: 600, value: 170 },
      { time: 1800, value: 140 },
      { time: 3000, value: 140 },
    ]
    assert.equal(bestWindowMean(curve, 1200), 170)
    assert.isNull(bestWindowMean(curve, 4000))
  })

  test('percentile ignore un pic isolé', ({ assert }) => {
    const values = [...Array.from({ length: 199 }, () => 170), 230]
    assert.equal(percentile(values, 0.99), 170)
  })
})

test.group('aerobicDecoupling', () => {
  test('même allure, FC qui dérive de 150 à 160 → découplage ≈ 6 %', ({ assert }) => {
    const track = straightTrack(121, 50, 15) // allure constante sur 30 min
    const curve: DataPoint[] = [
      { time: 0, value: 150 },
      { time: 900, value: 160 },
      { time: 1800, value: 160 },
    ]
    assert.approximately(aerobicDecoupling(track, curve)!, 6.3, 0.5)
  })
})

test.group('computeSessionAnalysis', () => {
  test('séance de course complète', ({ assert }) => {
    const track = straightTrack(401, 25, 7.5) // 10 km en 50 min
    const curve: DataPoint[] = [
      { time: 0, value: 140 },
      { time: 3000, value: 140 },
    ]
    const analysis = computeSessionAnalysis(
      {
        durationMinutes: 50,
        distanceKm: 10,
        avgHeartRate: 140,
        isRunning: true,
        gpsTrack: track,
        heartRateCurve: curve,
      },
      [100, 120, 140, 155, 170, 185]
    )
    assert.approximately(analysis.bestEfforts[5000]!, 1500, 5)
    assert.approximately(analysis.efficiencyFactor!, 200 / 140, 0.01)
    assert.deepEqual(analysis.zoneSeconds, [0, 0, 3000, 0, 0])
    assert.isFalse(analysis.easy)
    assert.equal(analysis.best20MinHr, 140)
  })

  test('autre sport : pas de meilleurs efforts ni d’efficacité', ({ assert }) => {
    const analysis = computeSessionAnalysis(
      {
        durationMinutes: 60,
        distanceKm: 30,
        avgHeartRate: 130,
        isRunning: false,
        gpsTrack: straightTrack(101, 300, 36),
      },
      null
    )
    assert.deepEqual(analysis.bestEfforts, {})
    assert.isNull(analysis.efficiencyFactor)
  })
})

test.group('Allure ajustée à la pente (Minetti)', () => {
  test('coût : 1 sur le plat, plus élevé en montée', async ({ assert }) => {
    const { minettiCostFactor } = await import('#domain/services/analysis/session_analysis')
    assert.approximately(minettiCostFactor(0), 1, 1e-9)
    assert.isAbove(minettiCostFactor(0.1), 1.4)
    assert.isBelow(minettiCostFactor(-0.1), 1)
  })

  test('sur le plat, GAP = allure réelle ; en montée, GAP plus rapide', async ({ assert }) => {
    const { gradeAdjustedPace } = await import('#domain/services/analysis/session_analysis')
    const flat = straightTrack(101, 10, 3).map((p) => ({ ...p, ele: 100 }))
    assert.approximately(gradeAdjustedPace(flat)!, 300, 2) // 1 km en 300 s
    const uphill = straightTrack(101, 10, 3).map((p, i) => ({ ...p, ele: 100 + i }))
    assert.isBelow(gradeAdjustedPace(uphill)!, 250)
    assert.isNull(gradeAdjustedPace(straightTrack(10, 10, 3)))
  })
})
