import { test } from '@japa/runner'
import { buildInsights, dailyAdvice, type InsightsInput } from '#domain/services/analysis/insights'
import type { FitnessDay } from '#domain/value_objects/fitness_profile'

/** Série de forme linéaire sur `days` jours, de `fromCtl` à `toCtl` */
function series(days: number, fromCtl: number, toCtl: number): FitnessDay[] {
  return Array.from({ length: days }, (_, i) => {
    const ctl = fromCtl + ((toCtl - fromCtl) * i) / (days - 1)
    return {
      date: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}`,
      tss: 50,
      ctl,
      atl: ctl,
      tsb: 0,
    }
  })
}

function input(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
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
    readiness: { level: 'unknown', score: null, components: [] },
    hrvLowStreak: 0,
    signals: [],
    regularity: {
      weeks: 0,
      activeWeeks: 0,
      currentStreak: 0,
      longestStreak: 0,
      byWeekday: [0, 0, 0, 0, 0, 0, 0],
      sessionsPerWeek: 0,
    },
    swimPace: [],
    goal: null,
    ...overrides,
  }
}

const fitness = (ctl: number, tsb: number, acwr: number) => ({
  chronicTrainingLoad: ctl,
  acuteTrainingLoad: ctl - tsb,
  trainingStressBalance: tsb,
  acuteChronicWorkloadRatio: acwr,
  calculatedAt: new Date(),
})

const ids = (i: InsightsInput) => buildInsights(i).map((x) => x.id)

test.group('Moteur d’enseignements', () => {
  test('aucune donnée → aucun constat', ({ assert }) => {
    assert.deepEqual(buildInsights(input()), [])
  })

  test('forme en hausse sur 4 semaines', ({ assert }) => {
    const result = buildInsights(
      input({ fitness: fitness(50, -15, 1.1), series: series(40, 40, 50) })
    )
    const rising = result.find((i) => i.id === 'fitnessRising')!
    assert.equal(rising.tone, 'positive')
    assert.isAbove(Number(rising.params.delta), 3)
    assert.include(
      result.map((i) => i.id),
      'productive'
    )
  })

  test('zones de fraîcheur : surcharge, frais, équilibré', ({ assert }) => {
    assert.include(ids(input({ fitness: fitness(50, -35, 1.2) })), 'overreached')
    assert.include(ids(input({ fitness: fitness(50, 12, 0.9) })), 'fresh')
    assert.include(ids(input({ fitness: fitness(50, -3, 1) })), 'balanced')
  })

  test('ACWR : alerte au-delà de 1,5, avertissement au-delà de 1,3, sous-charge sous 0,8', ({
    assert,
  }) => {
    assert.include(ids(input({ fitness: fitness(50, -20, 1.6) })), 'acwrDanger')
    assert.include(ids(input({ fitness: fitness(50, -20, 1.4) })), 'acwrHigh')
    assert.include(ids(input({ fitness: fitness(50, 10, 0.6) })), 'acwrLow')
    // Sous-charge ignorée quand la forme est quasi nulle (débutant, reprise)
    assert.notInclude(ids(input({ fitness: fitness(5, 2, 0.6) })), 'acwrLow')
  })

  test('les alertes passent devant les bonnes nouvelles', ({ assert }) => {
    const result = buildInsights(
      input({
        fitness: fitness(50, -35, 1.6),
        series: series(40, 40, 50),
        signals: ['spo2_low'],
      })
    )
    assert.equal(result[0].tone, 'alert')
    const tones = result.map((i) => i.priority)
    assert.deepEqual(
      tones,
      [...tones].sort((a, b) => b - a)
    )
  })

  test('rampe trop rapide', ({ assert }) => {
    // +20 de CTL en 7 jours
    const s = series(40, 20, 20).map((d, i) => (i >= 33 ? { ...d, ctl: 20 + (i - 32) * 3 } : d))
    assert.include(ids(input({ fitness: fitness(41, -20, 1.2), series: s })), 'rampTooFast')
  })

  test('répartition d’intensité sur les 4 dernières semaines', ({ assert }) => {
    const week = (lowShare: number) => ({
      week: '2026-01-05',
      zoneMinutes: [0, 0, 0, 0, 0] as [number, number, number, number, number],
      lowShare,
      tooMuchZ3: false,
    })
    assert.include(ids(input({ intensity: [week(0.85), week(0.8)] })), 'polarized')
    const grey = buildInsights(input({ intensity: [week(0.6), week(0.65)] }))
    assert.equal(grey[0].id, 'tooGrey')
    assert.equal(grey[0].params.percent, 63)
  })

  test('volume comparé à la période de comparaison', ({ assert }) => {
    const totals = (minutes: number) => ({
      sessions: 1,
      distanceBySport: {},
      durationMinutes: minutes,
      load: 0,
    })
    assert.include(ids(input({ totals: totals(300), comparison: totals(200) })), 'volumeUp')
    assert.include(ids(input({ totals: totals(100), comparison: totals(200) })), 'volumeDown')
    assert.include(ids(input({ totals: totals(210), comparison: totals(200) })), 'volumeSteady')
    // Pas de comparaison possible sans volume de référence
    assert.deepEqual(ids(input({ totals: totals(210), comparison: totals(0) })), [])
  })

  test('régularité : série en cours ou irrégularité', ({ assert }) => {
    const reg = (weeks: number, activeWeeks: number, currentStreak: number) => ({
      ...input().regularity,
      weeks,
      activeWeeks,
      currentStreak,
    })
    assert.include(ids(input({ regularity: reg(10, 10, 6) })), 'streak')
    assert.include(ids(input({ regularity: reg(10, 4, 1) })), 'irregular')
  })

  test('record battu et objectif', ({ assert }) => {
    const result = buildInsights(
      input({
        newRecords: [
          { distance: 1000, seconds: 230, sessionId: 1, date: '2026-01-10' },
          { distance: 5000, seconds: 1250, sessionId: 2, date: '2026-01-12' },
        ],
        goal: {
          distanceKm: 10,
          targetSeconds: 2700,
          eventDate: null,
          daysLeft: null,
          predictedSeconds: 2640,
          gapSeconds: -60,
          raceDay: null,
        },
      })
    )
    const record = result.find((i) => i.id === 'newRecord')!
    assert.deepEqual(record.params, { distance: 5000, time: 1250, count: 2 })
    assert.deepEqual(result.find((i) => i.id === 'goalOnTrack')!.params, { gap: 60 })
  })

  test('efficacité aérobie : lissée sur 2 semaines', ({ assert }) => {
    const ef = (values: number[]) => values.map((v, i) => ({ week: `w${i}`, ef: v }))
    assert.include(ids(input({ efficiency: ef([1.5, 1.5, 1.6, 1.6]) })), 'efficiencyUp')
    assert.include(ids(input({ efficiency: ef([1.6, 1.6, 1.5, 1.5]) })), 'efficiencyDown')
    // Moins de 4 semaines : pas de conclusion
    assert.notInclude(ids(input({ efficiency: ef([1.5, 1.7]) })), 'efficiencyUp')
  })

  test('récupération : signal faible, HRV basse, forme du jour', ({ assert }) => {
    const result = ids(
      input({
        signals: ['respiratory_rate_high'],
        hrvLowStreak: 4,
        readiness: { level: 'low', score: -0.5, components: [] },
      })
    )
    assert.includeMembers(result, ['weakSignal', 'hrvLow', 'readinessLow'])
  })

  test('natation : allure plus rapide = progrès', ({ assert }) => {
    assert.include(
      ids(input({ swimPace: [{ pacePer100m: 2.2 }, { pacePer100m: 2.0 }] })),
      'swimFaster'
    )
  })
})

test.group('Conseil du jour', () => {
  test('la récupération mesurée prime sur la fraîcheur', ({ assert }) => {
    assert.equal(dailyAdvice(15, 'low'), 'recover')
    assert.equal(dailyAdvice(15, 'good', ['spo2_low']), 'recover')
  })

  test('selon la fraîcheur', ({ assert }) => {
    assert.equal(dailyAdvice(-40, 'unknown'), 'recover')
    assert.equal(dailyAdvice(-20, 'unknown'), 'absorb')
    assert.equal(dailyAdvice(0, 'unknown'), 'steady')
    assert.equal(dailyAdvice(10, 'unknown'), 'quality')
    // Frais sur le papier mais récupération moyenne : pas de séance clé
    assert.equal(dailyAdvice(10, 'moderate'), 'steady')
  })

  test('sans aucune donnée : pas de conseil', ({ assert }) => {
    assert.isNull(dailyAdvice(null, 'unknown'))
    assert.equal(dailyAdvice(null, 'good'), 'quality')
  })
})
