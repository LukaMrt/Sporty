import { test } from '@japa/runner'
import fc from 'fast-check'
import { calculateVdot } from '#domain/services/vdot_calculator'
import {
  computeZoneBounds,
  getZoneForBpm,
  calculateZonesFromBounds,
  isZoneBoundsResult,
} from '#domain/services/heart_rate_zone_bounds'
import { plannedSessionDate } from '#domain/services/planned_session_date'
import { dayOfWeekIso } from '#domain/services/calendar'
import { predictTimeFromVdot } from '#domain/services/analysis/aggregations'
import { analyze } from '#lib/track_analyzer'

/**
 * Tests de propriété (§13.4) : invariants vérifiés sur des centaines
 * d'entrées générées aléatoirement.
 */
test.group('Propriétés du domaine', () => {
  test('VDOT : plus rapide sur la même distance ⇒ VDOT plus élevé', ({ assert }) => {
    fc.assert(
      fc.property(
        fc.constantFrom(1609, 5000, 10000, 21097, 42195),
        fc.double({ min: 3, max: 6, noNaN: true }), // min/km
        fc.double({ min: 0.01, max: 1, noNaN: true }),
        (distance, pace, faster) => {
          const slow = calculateVdot(distance, (distance / 1000) * pace)
          const fast = calculateVdot(distance, (distance / 1000) * (pace - faster))
          return fast > slow
        }
      )
    )
    assert.isTrue(true)
  })

  test('prédiction VDOT : aller-retour stable à la seconde près (5 km)', ({ assert }) => {
    fc.assert(
      fc.property(fc.double({ min: 30, max: 70, noNaN: true }), (vdot) => {
        const seconds = predictTimeFromVdot(vdot, 5000)
        return Math.abs(calculateVdot(5000, seconds / 60) - vdot) < 0.05
      })
    )
    assert.isTrue(true)
  })

  test('zones : bornes croissantes, répartition ≈ 100 %, zone monotone en FC', ({ assert }) => {
    fc.assert(
      fc.property(
        fc.integer({ min: 150, max: 215 }),
        fc.integer({ min: 35, max: 80 }),
        fc.array(fc.integer({ min: 40, max: 230 }), { minLength: 2, maxLength: 60 }),
        (max, rest, hrs) => {
          const outcome = computeZoneBounds(
            'karvonen',
            { maxHeartRate: max, restingHeartRate: rest },
            { lthr: null, customBoundsBpm: null }
          )
          if (!isZoneBoundsResult(outcome)) return false
          const b = outcome.bounds
          const increasing = b.every((v, i) => i === 0 || v > b[i - 1])
          const curve = hrs.map((value, i) => ({ time: i * 10, value }))
          const zones = calculateZonesFromBounds(b, curve)
          const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5
          const sorted = [...hrs].sort((x, y) => x - y)
          const monotone = sorted.every(
            (hr, i) => i === 0 || getZoneForBpm(b, hr) >= getZoneForBpm(b, sorted[i - 1])
          )
          // Arrondis : 5 zones à ±0,5 %, et le temps hors zone n'est pas compté
          return increasing && total <= 103 && monotone
        }
      )
    )
    assert.isTrue(true)
  })

  test('date de séance planifiée : bon jour de la semaine, dans la semaine du plan', ({
    assert,
  }) => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 6 }),
        (start, week, dow) => {
          const startIso = start.toISOString().slice(0, 10)
          const date = plannedSessionDate(startIso, week, dow)
          const offset = (Date.parse(date) - Date.parse(startIso)) / 86_400_000
          return dayOfWeekIso(date) === dow && offset >= (week - 1) * 7 && offset < week * 7
        }
      )
    )
    assert.isTrue(true)
  })

  test('track analyzer : robuste aux traces dégénérées (pas d’exception, valeurs finies)', ({
    assert,
  }) => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lat: fc.double({ min: -60, max: 60, noNaN: true }),
            lon: fc.double({ min: -170, max: 170, noNaN: true }),
            dt: fc.integer({ min: 0, max: 30 }),
            hr: fc.option(fc.integer({ min: 40, max: 220 }), { nil: undefined }),
          }),
          { minLength: 2, maxLength: 80 }
        ),
        (points) => {
          let t = 0
          const raw = points.map((p) => {
            t += p.dt * 1000
            return { lat: p.lat, lon: p.lon, timeMs: t, hr: p.hr }
          })
          const result = analyze(raw)
          return Number.isFinite(result.distanceMeters) && result.durationSeconds >= 0
        }
      )
    )
    assert.isTrue(true)
  })
})
