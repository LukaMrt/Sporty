import { test } from '@japa/runner'
import {
  computeZoneBounds,
  resolveZoneBounds,
  previewAllMethods,
  validateZoneBounds,
  getZoneForBpm,
  calculateZonesFromBounds,
  boundsToThresholds,
  isZoneBoundsResult,
} from '#domain/services/heart_rate_zone_bounds'
import { getZoneForHr, calculateZones } from '#domain/services/heart_rate_zone_service'
import type { ZoneBoundsBpm } from '#domain/value_objects/heart_rate_zones_config'

const PHYSIO = { maxHeartRate: 190, restingHeartRate: 50 }
const NO_CFG = { lthr: null, customBoundsBpm: null }

test.group('computeZoneBounds — méthodes', () => {
  test('karvonen : FC repos + % de la FC de réserve', ({ assert }) => {
    const r = computeZoneBounds('karvonen', PHYSIO, NO_CFG)
    assert.deepEqual(isZoneBoundsResult(r) && r.bounds, [120, 134, 148, 162, 176, 190])
  })

  test('percent_max : % de la FCmax', ({ assert }) => {
    const r = computeZoneBounds('percent_max', PHYSIO, NO_CFG)
    assert.deepEqual(isZoneBoundsResult(r) && r.bounds, [95, 114, 133, 152, 171, 190])
  })

  test('auto : Karvonen si FC repos connue, sinon % FCmax', ({ assert }) => {
    const withRest = computeZoneBounds('auto', PHYSIO, NO_CFG)
    const withoutRest = computeZoneBounds('auto', { ...PHYSIO, restingHeartRate: null }, NO_CFG)
    assert.equal(isZoneBoundsResult(withRest) && withRest.method, 'karvonen')
    assert.equal(isZoneBoundsResult(withoutRest) && withoutRest.method, 'percent_max')
  })

  test('lthr (Friel) : 75/85/90/95/100 % LTHR, plafond FCmax', ({ assert }) => {
    const r = computeZoneBounds('lthr', PHYSIO, { lthr: 170, customBoundsBpm: null })
    assert.deepEqual(isZoneBoundsResult(r) && r.bounds, [128, 145, 153, 162, 170, 190])
  })

  test('lthr sans FCmax : plafond à 110 % LTHR', ({ assert }) => {
    const r = computeZoneBounds(
      'lthr',
      { maxHeartRate: null, restingHeartRate: null },
      { lthr: 160, customBoundsBpm: null }
    )
    assert.equal(isZoneBoundsResult(r) && r.bounds[5], 176)
  })

  test('méthodes indisponibles → raison explicite', ({ assert }) => {
    assert.deepEqual(computeZoneBounds('karvonen', { ...PHYSIO, restingHeartRate: null }, NO_CFG), {
      issue: 'missing_resting_hr',
    })
    assert.deepEqual(
      computeZoneBounds('percent_max', { maxHeartRate: null, restingHeartRate: null }, NO_CFG),
      {
        issue: 'missing_max_hr',
      }
    )
    assert.deepEqual(computeZoneBounds('lthr', PHYSIO, NO_CFG), { issue: 'missing_lthr' })
    assert.deepEqual(computeZoneBounds('custom', PHYSIO, NO_CFG), { issue: 'invalid_bounds' })
    assert.deepEqual(
      computeZoneBounds('karvonen', { maxHeartRate: 60, restingHeartRate: 70 }, NO_CFG),
      {
        issue: 'invalid_physiology',
      }
    )
  })

  test('custom : bornes saisies utilisées telles quelles', ({ assert }) => {
    const bounds: ZoneBoundsBpm = [100, 120, 140, 155, 170, 185]
    const r = computeZoneBounds('custom', PHYSIO, { lthr: null, customBoundsBpm: bounds })
    assert.deepEqual(isZoneBoundsResult(r) && r.bounds, bounds)
  })
})

test.group('resolveZoneBounds', () => {
  test('repli sur auto si la méthode choisie n’est plus applicable', ({ assert }) => {
    const r = resolveZoneBounds({ method: 'lthr', lthr: null, customBoundsBpm: null }, PHYSIO)
    assert.equal(r!.method, 'karvonen')
  })

  test('null si aucune FC connue', ({ assert }) => {
    assert.isNull(resolveZoneBounds(null, { maxHeartRate: null, restingHeartRate: null }))
  })

  test('previewAllMethods : une entrée par méthode', ({ assert }) => {
    assert.sameMembers(Object.keys(previewAllMethods(PHYSIO, NO_CFG)), [
      'auto',
      'karvonen',
      'percent_max',
      'lthr',
      'custom',
    ])
  })
})

test.group('validateZoneBounds', () => {
  test('refuse égalité, ordre décroissant, hors plage, mauvaise longueur', ({ assert }) => {
    assert.isTrue(validateZoneBounds([100, 120, 140, 155, 170, 185]))
    assert.isFalse(validateZoneBounds([100, 120, 120, 155, 170, 185]))
    assert.isFalse(validateZoneBounds([100, 90, 140, 155, 170, 185]))
    assert.isFalse(validateZoneBounds([20, 120, 140, 155, 170, 185]))
    assert.isFalse(validateZoneBounds([100, 120, 140, 155, 170, 260]))
    assert.isFalse(validateZoneBounds([100, 120, 140]))
    assert.isFalse(validateZoneBounds(null))
  })
})

test.group('getZoneForBpm / calculateZonesFromBounds', () => {
  const bounds: ZoneBoundsBpm = [100, 120, 140, 155, 170, 185]

  test('frontières : borne basse incluse, hors zone sous Z1, Z5 au-delà du max', ({ assert }) => {
    assert.equal(getZoneForBpm(bounds, 99), 0)
    assert.equal(getZoneForBpm(bounds, 100), 1)
    assert.equal(getZoneForBpm(bounds, 119), 1)
    assert.equal(getZoneForBpm(bounds, 120), 2)
    assert.equal(getZoneForBpm(bounds, 170), 5)
    assert.equal(getZoneForBpm(bounds, 200), 5)
  })

  test('répartition temporelle', ({ assert }) => {
    const zones = calculateZonesFromBounds(bounds, [
      { time: 0, value: 110 },
      { time: 60, value: 130 },
      { time: 120, value: 130 },
    ])
    assert.deepEqual(zones, { z1: 50, z2: 50, z3: 0, z4: 0, z5: 0 })
  })

  test('boundsToThresholds', ({ assert }) => {
    assert.deepEqual(boundsToThresholds(bounds)[0], { zone: 1, minBpm: 100, maxBpm: 120 })
    assert.lengthOf(boundsToThresholds(bounds), 5)
  })
})

test.group('Non-régression : adaptateurs historiques = méthode auto', () => {
  test('getZoneForHr et calculateZones inchangés sur des valeurs usuelles', ({ assert }) => {
    // Karvonen 190/50 : Z2 = [134, 148[, Z4 = [162, 176[
    assert.equal(getZoneForHr(190, 140, 50), 2)
    assert.equal(getZoneForHr(190, 165, 50), 4)
    assert.equal(getZoneForHr(190, 100, 50), 0)
    // %FCmax 200 : Z3 = [140, 160[
    assert.equal(getZoneForHr(200, 150), 3)
    const zones = calculateZones(200, [
      { time: 0, value: 150 },
      { time: 60, value: 150 },
    ])
    assert.equal(zones.z3, 100)
  })
})
