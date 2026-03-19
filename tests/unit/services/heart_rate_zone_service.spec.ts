import { test } from '@japa/runner'
import {
  getZoneForHr,
  calculateZones,
  calculateDrift,
  calculateTrimp,
} from '#domain/services/heart_rate_zone_service'
import type { DataPoint } from '#domain/value_objects/run_metrics'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Construit une courbe FC plate à une valeur donnée sur N secondes (1 point/s).
 */
function flatCurve(hr: number, durationSeconds: number, startAt = 0): DataPoint[] {
  return Array.from({ length: durationSeconds + 1 }, (_, i) => ({ time: startAt + i, value: hr }))
}

// ── getZoneForHr ──────────────────────────────────────────────────────────────

test.group('getZoneForHr — % FCmax (sans FC repos)', () => {
  const fcMax = 200

  test('Z1 : 50-60% FCmax', ({ assert }) => {
    assert.equal(getZoneForHr(fcMax, 100), 1) // 50%
    assert.equal(getZoneForHr(fcMax, 118), 1) // 59%
  })

  test('Z2 : 60-70% FCmax', ({ assert }) => {
    assert.equal(getZoneForHr(fcMax, 120), 2) // 60%
    assert.equal(getZoneForHr(fcMax, 138), 2) // 69%
  })

  test('Z3 : 70-80% FCmax', ({ assert }) => {
    assert.equal(getZoneForHr(fcMax, 140), 3) // 70%
    assert.equal(getZoneForHr(fcMax, 158), 3) // 79%
  })

  test('Z4 : 80-90% FCmax', ({ assert }) => {
    assert.equal(getZoneForHr(fcMax, 160), 4) // 80%
    assert.equal(getZoneForHr(fcMax, 178), 4) // 89%
  })

  test('Z5 : 90-100% FCmax', ({ assert }) => {
    assert.equal(getZoneForHr(fcMax, 180), 5) // 90%
    assert.equal(getZoneForHr(fcMax, 200), 5) // 100%
  })

  test('sous Z1 (< 50%) → zone 0', ({ assert }) => {
    assert.equal(getZoneForHr(fcMax, 99), 0) // 49.5%
  })
})

test.group('getZoneForHr — Karvonen (avec FC repos)', () => {
  // FCmax=190, FCrepos=50, réserve=140
  // Z2 : 60-70% réserve → 134-148 bpm
  const fcMax = 190
  const fcRest = 50

  test('Z2 Karvonen : 60-70% réserve', ({ assert }) => {
    // 60% : 50 + 0.60*140 = 134
    // 70% : 50 + 0.70*140 = 148
    assert.equal(getZoneForHr(fcMax, 134, fcRest), 2)
    assert.equal(getZoneForHr(fcMax, 147, fcRest), 2)
  })

  test('Karvonen Z3 : 70-80% réserve', ({ assert }) => {
    // 70% : 148, 80% : 162
    assert.equal(getZoneForHr(fcMax, 148, fcRest), 3)
    assert.equal(getZoneForHr(fcMax, 161, fcRest), 3)
  })

  test("zones Karvonen classent différemment qu'en % FCmax seul", ({ assert }) => {
    // 130 bpm avec FCmax=190 : 130/190 = 68.4% → Z2
    assert.equal(getZoneForHr(190, 130), 2)
    // 130 bpm Karvonen (FCmax=190, FCrepos=50) : (130-50)/140 = 57.1% → Z1
    assert.equal(getZoneForHr(190, 130, 50), 1)
  })
})

// ── calculateZones ────────────────────────────────────────────────────────────

test.group('calculateZones — répartition temporelle', () => {
  test('courbe plate 100% en Z2 (FCmax=200, 120 bpm)', ({ assert }) => {
    const curve = flatCurve(120, 600) // 120 bpm = 60% de 200 → Z2
    const zones = calculateZones(200, curve)
    assert.equal(zones.z1, 0)
    assert.equal(zones.z2, 100)
    assert.equal(zones.z3, 0)
    assert.equal(zones.z4, 0)
    assert.equal(zones.z5, 0)
  })

  test('courbe vide → toutes les zones à 0', ({ assert }) => {
    const zones = calculateZones(190, [])
    assert.deepEqual(zones, { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 })
  })

  test('moitié Z2 / moitié Z3 → 50% chaque', ({ assert }) => {
    const half1 = flatCurve(120, 300, 0) // Z2 pour FCmax=200
    const half2 = flatCurve(150, 300, 300) // Z3 : 75% de 200
    const curve = [...half1.slice(0, -1), ...half2]
    const zones = calculateZones(200, curve)
    assert.approximately(zones.z2, 50, 2)
    assert.approximately(zones.z3, 50, 2)
  })
})

// ── calculateDrift ────────────────────────────────────────────────────────────

test.group('calculateDrift', () => {
  test('courbe plate → drift ~0%', ({ assert }) => {
    const curve = flatCurve(150, 3600)
    assert.approximately(calculateDrift(curve), 0, 0.5)
  })

  test('drift positif : FC monte en 2e moitié', ({ assert }) => {
    const first = flatCurve(140, 1800, 0)
    const second = flatCurve(154, 1800, 1800)
    const curve = [...first.slice(0, -1), ...second]
    // (154 - 140) / 140 * 100 = 10%
    const drift = calculateDrift(curve)
    assert.isAbove(drift, 0)
    assert.approximately(drift, 10, 1)
  })

  test('drift négatif : FC descend en 2e moitié', ({ assert }) => {
    const first = flatCurve(160, 1800, 0)
    const second = flatCurve(140, 1800, 1800)
    const curve = [...first.slice(0, -1), ...second]
    const drift = calculateDrift(curve)
    assert.isBelow(drift, 0)
  })

  test('moins de 2 points → drift 0', ({ assert }) => {
    assert.equal(calculateDrift([]), 0)
    assert.equal(calculateDrift([{ time: 0, value: 150 }]), 0)
  })
})

// ── calculateTrimp ────────────────────────────────────────────────────────────

test.group('calculateTrimp', () => {
  test('60 min 100% en Z2 → TRIMP = 120', ({ assert }) => {
    const zones = { z1: 0, z2: 100, z3: 0, z4: 0, z5: 0 }
    assert.equal(calculateTrimp(60, zones), 120) // 60 min × 100% × coeff 2
  })

  test('60 min 100% en Z3 → TRIMP = 180', ({ assert }) => {
    const zones = { z1: 0, z2: 0, z3: 100, z4: 0, z5: 0 }
    assert.equal(calculateTrimp(60, zones), 180) // 60 min × coeff 3
  })

  test('30 min répartis Z2/Z4 50-50 → TRIMP = 90', ({ assert }) => {
    // 30 × 0.5 × 2 + 30 × 0.5 × 4 = 30 + 60 = 90
    const zones = { z1: 0, z2: 50, z3: 0, z4: 50, z5: 0 }
    assert.equal(calculateTrimp(30, zones), 90)
  })

  test('zones toutes à 0 → TRIMP = 0', ({ assert }) => {
    assert.equal(calculateTrimp(60, { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }), 0)
  })

  test('seance Z1 pure 60min → TRIMP = 60', ({ assert }) => {
    const zones = { z1: 100, z2: 0, z3: 0, z4: 0, z5: 0 }
    assert.equal(calculateTrimp(60, zones), 60)
  })
})
