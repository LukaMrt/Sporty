import { test } from '@japa/runner'
import {
  acwrSeries,
  comparisonPeriod,
  ctlDelta,
  currentWeek,
  goalOutlook,
  loadBySportByWeek,
  loadVsHrv,
  periodHighlights,
  planAdherence,
  regularity,
  withEffectiveLoads,
} from '#domain/services/analysis/overview'
import { periodTotals } from '#domain/services/analysis/report'
import type { AnalysisSession } from '#domain/services/analysis/aggregations'
import type { FitnessDay } from '#domain/value_objects/fitness_profile'

function session(
  partial: Partial<AnalysisSession> & { id: number; date: string }
): AnalysisSession {
  return {
    sportSlug: 'running',
    durationMinutes: 60,
    distanceKm: 10,
    avgHeartRate: null,
    trainingLoad: null,
    analysis: null,
    ...partial,
  }
}

const day = (date: string, ctl: number, tss = 0): FitnessDay => ({
  date,
  tss,
  ctl,
  atl: ctl,
  tsb: 0,
})

test.group('Charge effective', () => {
  test('séance sans charge stockée : prend la charge du modèle de forme', ({ assert }) => {
    const [s] = withEffectiveLoads([session({ id: 1, date: '2026-01-05' })], new Map([[1, 64]]))
    assert.equal(s.trainingLoad, 64)
    // Et le bilan n'affiche plus 0 TSS
    assert.equal(periodTotals([s]).load, 64)
  })

  test('hors fenêtre du modèle : charge stockée pondérée par sport', ({ assert }) => {
    const [walk, run, none] = withEffectiveLoads(
      [
        session({ id: 1, date: '2026-01-05', sportSlug: 'walking', trainingLoad: 50 }),
        session({ id: 2, date: '2026-01-05', trainingLoad: 50 }),
        session({ id: 3, date: '2026-01-05' }),
      ],
      new Map()
    )
    assert.equal(walk.trainingLoad, 15)
    assert.equal(run.trainingLoad, 50)
    assert.isNull(none.trainingLoad)
  })
})

test.group('Périodes de comparaison', () => {
  test('période précédente de même durée', ({ assert }) => {
    assert.deepEqual(comparisonPeriod('2026-02-01', '2026-02-28', 'previous'), {
      from: '2026-01-04',
      to: '2026-01-31',
    })
  })

  test('an dernier et aucune', ({ assert }) => {
    assert.deepEqual(comparisonPeriod('2026-02-01', '2026-02-28', 'year'), {
      from: '2025-02-01',
      to: '2025-02-28',
    })
    assert.isNull(comparisonPeriod('2026-02-01', '2026-02-28', 'none'))
  })
})

test.group('Régularité', () => {
  test('semaines actives, séries et jours de la semaine', ({ assert }) => {
    // Semaines du 5, 12, 19 janvier actives, 26 vide, 2 février (en cours) vide
    const sessions = [
      session({ id: 1, date: '2026-01-05' }), // lundi
      session({ id: 2, date: '2026-01-14' }), // mercredi
      session({ id: 3, date: '2026-01-21' }), // mercredi
    ]
    const r = regularity(sessions, '2026-01-05', '2026-02-03')
    assert.equal(r.weeks, 5)
    assert.equal(r.activeWeeks, 3)
    assert.equal(r.longestStreak, 3)
    assert.equal(r.currentStreak, 0)
    assert.deepEqual(r.byWeekday, [1, 0, 2, 0, 0, 0, 0])
  })

  test('la semaine en cours, encore vide, ne casse pas la série', ({ assert }) => {
    const sessions = [
      session({ id: 1, date: '2026-01-19' }),
      session({ id: 2, date: '2026-01-26' }),
    ]
    assert.equal(regularity(sessions, '2026-01-19', '2026-02-03').currentStreak, 2)
  })
})

test.group('Temps forts', () => {
  test('plus longue séance, semaine la plus chargée, mois le plus actif', ({ assert }) => {
    const h = periodHighlights([
      session({ id: 1, date: '2026-01-05', durationMinutes: 30, trainingLoad: 40 }),
      session({ id: 2, date: '2026-01-06', durationMinutes: 90, trainingLoad: 100 }),
      session({ id: 3, date: '2026-02-10', durationMinutes: 45, trainingLoad: 50 }),
    ])
    assert.equal(h.longest?.id, 2)
    assert.deepEqual(h.biggestWeek, { week: '2026-01-05', load: 140, durationMinutes: 120 })
    assert.deepEqual(h.mostActiveMonth, { month: '2026-01', durationMinutes: 120, sessions: 2 })
  })

  test('aucune séance', ({ assert }) => {
    assert.deepEqual(periodHighlights([]), {
      longest: null,
      biggestWeek: null,
      mostActiveMonth: null,
    })
  })
})

test.group('Dynamique de la forme', () => {
  test('charge par sport et par semaine', ({ assert }) => {
    assert.deepEqual(
      loadBySportByWeek([
        session({ id: 1, date: '2026-01-05', trainingLoad: 40.4 }),
        session({ id: 2, date: '2026-01-07', sportSlug: 'cycling', trainingLoad: 30 }),
        session({ id: 3, date: '2026-01-08', trainingLoad: 20 }),
      ]),
      [{ week: '2026-01-05', bySport: { running: 60, cycling: 30 } }]
    )
  })

  test('ACWR quotidien et variation de CTL', ({ assert }) => {
    const days = [
      { ...day('2026-01-01', 0), atl: 5 },
      { ...day('2026-01-02', 40), atl: 60 },
    ]
    assert.deepEqual(acwrSeries(days), [{ date: '2026-01-02', acwr: 1.5 }])
    const s = Array.from({ length: 10 }, (_, i) => day(`2026-01-${10 + i}`, 30 + i))
    assert.equal(ctlDelta(s, 7), 7)
    assert.isNull(ctlDelta(s, 28))
  })

  test('charge de la veille face à l’HRV du matin', ({ assert }) => {
    assert.deepEqual(
      loadVsHrv(
        [day('2026-01-01', 0, 120), day('2026-01-02', 0, 0)],
        [
          { date: '2026-01-02', hrv: 48 },
          { date: '2026-01-03', hrv: null },
        ]
      ),
      [{ date: '2026-01-02', hrv: 48, previousLoad: 120 }]
    )
  })
})

test.group('Plan et objectif', () => {
  test('réalisé vs prévu, semaines futures exclues', ({ assert }) => {
    const weeks = planAdherence(
      [
        { date: '2026-01-06', minutes: 60, tss: 50 },
        { date: '2026-01-08', minutes: 40, tss: 30 },
        { date: '2026-01-20', minutes: 60, tss: 50 }, // semaine future
      ],
      [session({ id: 1, date: '2026-01-07', durationMinutes: 70, trainingLoad: 65 })],
      '2026-01-10'
    )
    assert.deepEqual(weeks, [
      { week: '2026-01-05', plannedMinutes: 100, doneMinutes: 70, plannedLoad: 80, doneLoad: 65 },
    ])
  })

  test('objectif : écart prédit vs visé et forme projetée le jour J', ({ assert }) => {
    const outlook = goalOutlook({
      goal: { targetDistanceKm: 10, targetTimeMinutes: 50, eventDate: '2026-03-01' },
      vdot: 45,
      today: '2026-02-01',
      projection: [{ date: '2026-03-01', tss: 0, ctl: 48, atl: 30, tsb: 18 }],
    })
    assert.equal(outlook.daysLeft, 28)
    assert.equal(outlook.targetSeconds, 3000)
    assert.isNotNull(outlook.predictedSeconds)
    assert.equal(outlook.gapSeconds, outlook.predictedSeconds! - 3000)
    assert.deepEqual(outlook.raceDay, { ctl: 48, tsb: 18 })
  })

  test('objectif sans temps ni date', ({ assert }) => {
    const outlook = goalOutlook({
      goal: { targetDistanceKm: 21.1, targetTimeMinutes: null, eventDate: null },
      vdot: null,
      today: '2026-02-01',
      projection: [],
    })
    assert.isNull(outlook.gapSeconds)
    assert.isNull(outlook.daysLeft)
    assert.isNull(outlook.raceDay)
  })
})

test.group('Semaine en cours', () => {
  test('séances faites, prévues et volume habituel', ({ assert }) => {
    const week = currentWeek(
      '2026-02-04', // mercredi
      [
        session({ id: 1, date: '2026-01-06', durationMinutes: 120 }), // 4 semaines avant
        session({ id: 2, date: '2026-02-02', durationMinutes: 45, trainingLoad: 40 }),
      ],
      [
        {
          date: '2026-02-05',
          sessionType: 'easy',
          sportSlug: 'running',
          title: null,
          minutes: 50,
          tss: 45,
          intensityZone: 'z2',
          status: 'pending',
        },
      ]
    )
    assert.equal(week.from, '2026-02-02')
    assert.lengthOf(week.days, 7)
    assert.equal(week.days[0].sessions[0].id, 2)
    assert.lengthOf(week.days[3].planned, 1)
    assert.equal(week.doneMinutes, 45)
    assert.equal(week.doneLoad, 40)
    assert.equal(week.plannedMinutes, 50)
    assert.equal(week.typicalMinutes, 30)
  })

  test('sans plan ni historique', ({ assert }) => {
    const week = currentWeek('2026-02-04', [], null)
    assert.isNull(week.plannedMinutes)
    assert.isNull(week.typicalMinutes)
  })
})
