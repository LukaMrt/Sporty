import { test } from '@japa/runner'
import { addDaysIso, daysBetween, dayOfWeekIso, todayInTimezone } from '#domain/services/calendar'
import {
  plannedSessionDate,
  plannedWeekEndDate,
  planWeekNumberAt,
} from '#domain/services/planned_session_date'
import { syncWindowStart } from '#domain/services/sync_window'
import { findDuplicateSession } from '#domain/services/session_deduplication'
import { estimatePlannedTss } from '#domain/services/planned_load'
import { planTargetDistanceKm } from '#domain/services/plan_distance'
import { IntensityZone, PlanType } from '#domain/value_objects/planning_types'

test.group('calendar', () => {
  test('todayInTimezone : bascule de jour selon le fuseau', ({ assert }) => {
    const now = new Date('2026-03-01T23:30:00Z')
    assert.equal(todayInTimezone(null, now), '2026-03-01')
    assert.equal(todayInTimezone('Europe/Paris', now), '2026-03-02')
    assert.equal(todayInTimezone('America/New_York', now), '2026-03-01')
    assert.equal(todayInTimezone('Pas/UnFuseau', now), '2026-03-01')
  })

  test('arithmétique de dates calendaires', ({ assert }) => {
    assert.equal(addDaysIso('2026-02-28', 1), '2026-03-01')
    assert.equal(daysBetween('2026-01-01', '2026-01-31'), 30)
    assert.equal(dayOfWeekIso('2026-01-05'), 1) // lundi
  })
})

test.group('plannedSessionDate (source unique back/front)', () => {
  test('plan commençant un lundi : mardi = J+1, dimanche = fin de semaine', ({ assert }) => {
    assert.equal(plannedSessionDate('2026-01-05', 1, 2), '2026-01-06')
    assert.equal(plannedSessionDate('2026-01-05', 1, 0), '2026-01-11')
    assert.equal(plannedSessionDate('2026-01-05', 2, 1), '2026-01-12')
  })

  test('plan commençant un jeudi (transition/maintenance) : semaine jeudi → mercredi', ({
    assert,
  }) => {
    assert.equal(plannedSessionDate('2026-01-08', 1, 4), '2026-01-08')
    assert.equal(plannedSessionDate('2026-01-08', 1, 2), '2026-01-13')
  })

  test('fin de semaine et semaine courante', ({ assert }) => {
    assert.equal(plannedWeekEndDate('2026-01-05', 1), '2026-01-11')
    assert.equal(planWeekNumberAt('2026-01-05', '2026-01-11'), 1)
    assert.equal(planWeekNumberAt('2026-01-05', '2026-01-12'), 2)
    assert.equal(planWeekNumberAt('2026-01-05', '2026-01-01'), 0)
  })
})

test.group('syncWindowStart', () => {
  const now = new Date('2026-03-10T12:00:00Z')

  test('jamais synchronisé → 24 h', ({ assert }) => {
    assert.equal(syncWindowStart(null, now).toISOString(), '2026-03-09T12:00:00.000Z')
  })

  test('repart de lastSyncAt moins 1 h', ({ assert }) => {
    assert.equal(
      syncWindowStart('2026-03-05T12:00:00Z', now).toISOString(),
      '2026-03-05T11:00:00.000Z'
    )
  })

  test('plafonné à 30 jours', ({ assert }) => {
    assert.equal(
      syncWindowStart('2025-01-01T00:00:00Z', now).toISOString(),
      '2026-02-08T12:00:00.000Z'
    )
  })
})

test.group('findDuplicateSession', () => {
  const existing = [{ id: 1, sportId: 1, durationMinutes: 60, distanceKm: 10 }]

  test('même sport, durée et distance à ±10 % → doublon', ({ assert }) => {
    assert.equal(
      findDuplicateSession({ sportId: 1, durationMinutes: 63, distanceKm: 10.4 }, existing)?.id,
      1
    )
  })

  test('durée trop différente, autre sport → pas de doublon', ({ assert }) => {
    assert.isNull(
      findDuplicateSession({ sportId: 1, durationMinutes: 80, distanceKm: 10 }, existing)
    )
    assert.isNull(
      findDuplicateSession({ sportId: 2, durationMinutes: 60, distanceKm: 10 }, existing)
    )
  })
})

test.group('charge prévue et distance de plan', () => {
  test('1 h en Z4 ≈ 90 TSS, 1 h en Z2 ≈ 56 TSS', ({ assert }) => {
    assert.approximately(
      estimatePlannedTss({ targetDurationMinutes: 60, intensityZone: IntensityZone.Z4 }),
      90,
      1
    )
    assert.approximately(
      estimatePlannedTss({ targetDurationMinutes: 60, intensityZone: IntensityZone.Z2 }),
      56,
      1
    )
  })

  test('sans objectif, la distance vient du type de plan (plus de marathon par défaut)', ({
    assert,
  }) => {
    assert.equal(planTargetDistanceKm({ level: PlanType.TenKm }, null), 10)
    assert.equal(planTargetDistanceKm({ level: PlanType.TenKm }, { targetDistanceKm: 21.1 }), 21.1)
  })
})
