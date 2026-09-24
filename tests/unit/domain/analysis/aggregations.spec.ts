import { test } from '@japa/runner'
import {
  bestEfforts,
  efficiencyTrend,
  intensityByWeek,
  monotonyByWeek,
  physiologySuggestion,
  predictTimeFromVdot,
  riegel,
  vdotFromEfforts,
  volumeByPeriod,
  weekStart,
  type AnalysisSession,
} from '#domain/services/analysis/aggregations'
import { calculateVdot } from '#domain/services/vdot_calculator'
import { EMPTY_SESSION_ANALYSIS } from '#domain/value_objects/session_analysis'

function session(
  partial: Partial<AnalysisSession> & { id: number; date: string }
): AnalysisSession {
  return {
    sportSlug: 'running',
    durationMinutes: 60,
    distanceKm: 10,
    avgHeartRate: 140,
    trainingLoad: 60,
    analysis: { ...EMPTY_SESSION_ANALYSIS },
    ...partial,
  }
}

test.group('agrégations', () => {
  test('weekStart : lundi de la semaine', ({ assert }) => {
    assert.equal(weekStart('2026-01-11'), '2026-01-05') // dimanche → lundi précédent
    assert.equal(weekStart('2026-01-05'), '2026-01-05')
  })

  test('volume par semaine et par sport', ({ assert }) => {
    const buckets = volumeByPeriod(
      [
        session({ id: 1, date: '2026-01-05', distanceKm: 10 }),
        session({ id: 2, date: '2026-01-07', distanceKm: 5 }),
        session({ id: 3, date: '2026-01-08', sportSlug: 'cycling', distanceKm: 40 }),
      ],
      'week'
    )
    assert.lengthOf(buckets, 1)
    assert.equal(buckets[0].bySport.running.distanceKm, 15)
    assert.equal(buckets[0].bySport.cycling.sessions, 1)
  })

  test('80/20 : part du temps en Z1–Z2 et semaine grise', ({ assert }) => {
    const [week] = intensityByWeek([
      session({
        id: 1,
        date: '2026-01-05',
        analysis: { ...EMPTY_SESSION_ANALYSIS, zoneSeconds: [600, 1800, 1200, 0, 0] },
      }),
    ])
    assert.equal(week.lowShare, 0.67)
    assert.isTrue(week.tooMuchZ3)
    assert.deepEqual(week.zoneMinutes, [10, 30, 20, 0, 0])
  })

  test('monotonie : charge identique chaque jour → écart-type nul', ({ assert }) => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-01-0${5 + i}`.replace('-01-010', '-01-10').replace('-01-011', '-01-11'),
      tss: 50,
      ctl: 0,
      atl: 0,
      tsb: 0,
    }))
    assert.isNull(monotonyByWeek(days)[0].monotony)
  })

  test('meilleurs efforts : record par distance, filtre de période', ({ assert }) => {
    const sessions = [
      session({
        id: 1,
        date: '2025-06-01',
        analysis: { ...EMPTY_SESSION_ANALYSIS, bestEfforts: { 5000: 1200 } },
      }),
      session({
        id: 2,
        date: '2026-01-10',
        analysis: { ...EMPTY_SESSION_ANALYSIS, bestEfforts: { 5000: 1260 } },
      }),
    ]
    assert.equal(bestEfforts(sessions)[0].sessionId, 1)
    assert.equal(bestEfforts(sessions, '2026-01-01')[0].seconds, 1260)
  })

  test('VDOT dérivé et prédictions cohérentes', ({ assert }) => {
    const vdot = vdotFromEfforts([{ distance: 5000, seconds: 1200, sessionId: 1, date: '' }])!
    assert.approximately(vdot, calculateVdot(5000, 20), 0.1)
    // Inverse : le temps prédit sur 5 km redonne ~20 min
    assert.approximately(predictTimeFromVdot(vdot, 5000), 1200, 5)
    assert.isAbove(predictTimeFromVdot(vdot, 10000), 2400)
    assert.equal(riegel(1200, 5000, 10000), Math.round(1200 * 2 ** 1.06))
  })

  test('efficacité : uniquement les sorties faciles', ({ assert }) => {
    const trend = efficiencyTrend([
      session({
        id: 1,
        date: '2026-01-05',
        analysis: { ...EMPTY_SESSION_ANALYSIS, easy: true, efficiencyFactor: 1.2 },
      }),
      session({
        id: 2,
        date: '2026-01-06',
        analysis: { ...EMPTY_SESSION_ANALYSIS, easy: false, efficiencyFactor: 2 },
      }),
    ])
    assert.deepEqual(trend, [{ week: '2026-01-05', ef: 1.2 }])
  })

  test('suggestions FCmax / LTHR', ({ assert }) => {
    const s = physiologySuggestion([
      session({
        id: 1,
        date: '2026-01-05',
        analysis: { ...EMPTY_SESSION_ANALYSIS, observedMaxHr: 192, best20MinHr: 170 },
      }),
      session({
        id: 2,
        date: '2026-01-06',
        analysis: { ...EMPTY_SESSION_ANALYSIS, observedMaxHr: 188, best20MinHr: 175 },
      }),
    ])
    assert.equal(s.observedMaxHr, 192)
    assert.equal(s.estimatedLthr, Math.round(175 * 0.95))
    assert.equal(s.lthrSessionId, 2)
  })
})
