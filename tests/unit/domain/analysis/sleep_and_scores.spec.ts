import { test } from '@japa/runner'
import { latestWatchScores, sleepRegularity } from '#domain/services/analysis/wellness'
import { buildInsights } from '#domain/services/analysis/insights'
import { emptyWellness, type DailyWellness } from '#domain/value_objects/daily_wellness'

function night(date: string, sleepMinutes: number, bedtime: number): DailyWellness {
  return { ...emptyWellness(date), sleepMinutes, sleepBedtimeMinutes: bedtime }
}

const baseInsights = {
  fitness: null,
  series: [],
  monotony: [],
  totals: { sessions: 0, distanceBySport: {}, durationMinutes: 0, load: 0 },
  comparison: null,
  intensity: [],
  efficiency: [],
  decoupling: [],
  newRecords: [],
  vdotHistory: [],
  readiness: { level: 'unknown' as const, score: null, components: [] },
  hrvLowStreak: 0,
  signals: [],
  regularity: {
    weeks: 0,
    activeWeeks: 0,
    currentStreak: 0,
    longestStreak: 0,
    byWeekday: [0, 0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number, number],
    sessionsPerWeek: 0,
  },
  swimPace: [],
  goal: null,
}

test.group('Régularité du sommeil', () => {
  test('durée moyenne, coucher moyen et variation', ({ assert }) => {
    const series = [
      night('2026-03-01', 400, -60),
      night('2026-03-02', 420, 0),
      night('2026-03-03', 410, 60),
      night('2026-03-04', 390, -60),
      night('2026-03-05', 430, 60),
    ]
    const r = sleepRegularity(series, '2026-03-05')
    assert.equal(r.nights, 5)
    assert.equal(r.avgMinutes, 410)
    assert.equal(r.avgBedtime, 0)
    assert.equal(r.bedtimeSd, 54)
  })

  test('moins de 5 couchers : pas de variation calculée', ({ assert }) => {
    const r = sleepRegularity([night('2026-03-05', 420, -30)], '2026-03-05')
    assert.isNull(r.bedtimeSd)
  })

  test('constats : sommeil trop court et horaires irréguliers', ({ assert }) => {
    const ids = buildInsights({
      ...baseInsights,
      sleep: { nights: 10, avgMinutes: 385, bedtimeSd: 80, avgBedtime: -20 },
    }).map((i) => i.id)
    assert.includeMembers(ids, ['sleepShort', 'bedtimeIrregular'])
  })

  test('constat : FC de récupération en hausse', ({ assert }) => {
    const ids = buildInsights({ ...baseInsights, heartRateRecovery: [20, 21, 25, 26] }).map(
      (i) => i.id
    )
    assert.include(ids, 'hrrUp')
  })
})

test.group('Scores de la montre', () => {
  test('dernière valeur récente de chaque score', ({ assert }) => {
    const series: DailyWellness[] = [
      { ...emptyWellness('2026-02-20'), readinessScore: 50 }, // trop ancien
      { ...emptyWellness('2026-03-04'), bodyBattery: 70, sleepScore: 80 },
      { ...emptyWellness('2026-03-05'), bodyBattery: 85 },
    ]
    assert.deepEqual(latestWatchScores(series, '2026-03-05'), [
      { field: 'bodyBattery', value: 85, date: '2026-03-05' },
      { field: 'sleepScore', value: 80, date: '2026-03-04' },
    ])
  })
})
