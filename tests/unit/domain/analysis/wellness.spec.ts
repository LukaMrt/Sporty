import { test } from '@japa/runner'
import {
  baseline,
  hrvBelowBandStreak,
  readinessOf,
  recoveryTrend,
  smoothedWeight,
  weakSignals,
} from '#domain/services/analysis/wellness'
import { buildClaudeSummary, pearson, toCsv } from '#domain/services/analysis/report'
import { emptyWellness, type DailyWellness } from '#domain/value_objects/daily_wellness'
import { addDaysIso } from '#domain/services/calendar'

function days(count: number, fill: (i: number) => Partial<DailyWellness>, end = '2026-03-01') {
  return Array.from({ length: count }, (_, i) => ({
    ...emptyWellness(addDaysIso(end, i - count + 1)),
    ...fill(i),
  }))
}

test.group('wellness', () => {
  test('baseline : moyenne et écart-type des jours précédents', ({ assert }) => {
    const series = days(10, (i) => ({ hrvRmssd: i % 2 === 0 ? 50 : 60 }))
    const base = baseline(series, 'hrvRmssd', '2026-03-01', 60)!
    assert.approximately(base.mean, 55, 1)
    assert.approximately(base.sd, 5, 0.1)
  })

  test('HRV sous la bande plusieurs jours → série détectée', ({ assert }) => {
    const series = days(70, (i) => ({ hrvRmssd: i < 60 ? (i % 2 ? 58 : 62) : 40 }))
    assert.isAtLeast(hrvBelowBandStreak(recoveryTrend(series)), 3)
  })

  test('forme du jour : toutes les composantes exposées', ({ assert }) => {
    const series = days(30, (i) => ({
      hrvRmssd: i === 29 ? 70 : i % 2 ? 55 : 45,
      restingHeartRate: i % 2 ? 48 : 52,
      sleepMinutes: 480,
    }))
    const r = readinessOf(series, '2026-03-01', 8)
    assert.equal(r.level, 'good')
    assert.sameMembers(
      r.components.map((c) => c.key),
      ['hrv', 'restingHr', 'sleep', 'tsb']
    )
  })

  test('sans données → niveau inconnu', ({ assert }) => {
    assert.equal(readinessOf([], '2026-03-01', null).level, 'unknown')
  })

  test('signaux faibles : fréquence respiratoire anormale et SpO2 basse', ({ assert }) => {
    const series = days(31, (i) => ({
      respiratoryRate: i === 30 ? 20 : i % 2 ? 14 : 14.5,
      spo2: i === 30 ? 92 : 97,
    }))
    assert.sameMembers(weakSignals(series, '2026-03-01'), ['respiratory_rate_high', 'spo2_low'])
  })

  test('poids lissé', ({ assert }) => {
    const out = smoothedWeight(days(3, (i) => ({ weightKg: [70, 72, 70][i] })))
    assert.equal(out[0].trend, 70)
    assert.equal(out[1].trend, 70.2)
  })
})

test.group('rapport', () => {
  test('résumé pour Claude : sections présentes, sans données brutes', ({ assert }) => {
    const md = buildClaudeSummary({
      asOf: '2026-03-01',
      sessions: [
        {
          id: 1,
          date: '2026-02-28',
          sportSlug: 'running',
          durationMinutes: 45,
          distanceKm: 9,
          avgHeartRate: 145,
          trainingLoad: 55,
          analysis: null,
        },
      ],
      fitness: {
        chronicTrainingLoad: 40,
        acuteTrainingLoad: 45,
        trainingStressBalance: -5,
        acuteChronicWorkloadRatio: 1.12,
        calculatedAt: new Date(),
      },
      intensity: [],
      records: [],
      recentRecords: [{ distance: 5000, seconds: 1250, sessionId: 1, date: '2026-02-20' }],
      vdot: 48.2,
      efficiency: [],
      recovery: [],
      readiness: { level: 'unknown', score: null, components: [] },
      signals: [],
      wellness: [],
    })
    assert.include(md, '9.0 km')
    assert.include(md, 'CTL (forme) 40')
    assert.include(md, 'VDOT estimé (90 derniers jours) : 48.2')
    assert.include(md, 'Meilleur 5 km récent : 20:50')
  })

  test('pearson', ({ assert }) => {
    assert.equal(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]), 1)
    assert.isNull(pearson([1, 2], [1, 2]))
  })

  test('CSV : échappement des virgules et guillemets', ({ assert }) => {
    assert.equal(toCsv(['a', 'b'], [['x,y', 'say "hi"']]), 'a,b\n"x,y","say ""hi"""\n')
  })
})
