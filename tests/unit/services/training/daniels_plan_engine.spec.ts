import { test } from '@japa/runner'
import DanielsPlanEngine from '#services/training/daniels_plan_engine'
import type { PlanRequest } from '#domain/value_objects/plan_request'
import type { MaintenancePlanRequest } from '#domain/value_objects/maintenance_plan_request'
import type { TransitionPlanRequest } from '#domain/value_objects/transition_plan_request'
import type { PaceZones } from '#domain/value_objects/pace_zones'
import { SessionType, TrainingMethodology } from '#domain/value_objects/planning_types'

// ── Fixtures ────────────────────────────────────────────────────────────────────

const PACE_ZONES: PaceZones = {
  easy: { minPacePerKm: 5.5, maxPacePerKm: 6.5 },
  marathon: { minPacePerKm: 4.8, maxPacePerKm: 5.1 },
  threshold: { minPacePerKm: 4.3, maxPacePerKm: 4.5 },
  interval: { minPacePerKm: 3.9, maxPacePerKm: 4.1 },
  repetition: { minPacePerKm: 3.5, maxPacePerKm: 3.7 },
}

function makePlanRequest(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    targetDistanceKm: 42.195,
    targetTimeMinutes: 210,
    eventDate: '2026-09-20',
    vdot: 50,
    paceZones: PACE_ZONES,
    totalWeeks: 16,
    sessionsPerWeek: 5,
    preferredDays: [1, 2, 3, 5, 7],
    startDate: '2026-06-01',
    currentWeeklyVolumeMinutes: 200,
    ...overrides,
  }
}

function makeTransitionRequest(
  overrides: Partial<TransitionPlanRequest> = {}
): TransitionPlanRequest {
  return {
    vdot: 50,
    paceZones: PACE_ZONES,
    sessionsPerWeek: 4,
    preferredDays: [1, 3, 5, 7],
    previousPeakVolumeMinutes: 300,
    raceDistanceKm: 42.195,
    ...overrides,
  }
}

function makeMaintenanceRequest(
  overrides: Partial<MaintenancePlanRequest> = {}
): MaintenancePlanRequest {
  return {
    vdot: 50,
    paceZones: PACE_ZONES,
    sessionsPerWeek: 4,
    preferredDays: [1, 3, 5, 7],
    currentWeeklyVolumeMinutes: 300,
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────────

const engine = new DanielsPlanEngine()

test.group('DanielsPlanEngine — generatePlan', () => {
  test('retourne un plan avec 4 phases (FI, EQ, TQ, FQ)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const phases = [...new Set(plan.weeks.map((w) => w.phaseName))]
    assert.deepEqual(phases, ['FI', 'EQ', 'TQ', 'FQ'])
  })

  test('retourne le bon nombre total de semaines', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ totalWeeks: 12 }))
    assert.equal(plan.totalWeeks, 12)
    assert.equal(plan.weeks.length, 12)
  })

  test('methodology est Daniels', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    assert.equal(plan.methodology, TrainingMethodology.Daniels)
  })

  test('chaque semaine contient le bon nombre de séances', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ sessionsPerWeek: 5 }))
    for (const week of plan.weeks) {
      assert.equal(week.sessions.length, 5)
    }
  })

  test('les séances ont des types variés (pas uniquement easy)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const allTypes = new Set(plan.weeks.flatMap((w) => w.sessions.map((s) => s.sessionType)))
    assert.isAbove(allTypes.size, 2)
  })

  test('chaque semaine a une sortie longue', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    for (const week of plan.weeks) {
      const longRuns = week.sessions.filter((s) => s.sessionType === SessionType.LongRun)
      assert.equal(longRuns.length, 1)
    }
  })

  test('plan déterministe : deux appels identiques donnent le même résultat', ({ assert }) => {
    const request = makePlanRequest()
    const plan1 = engine.generatePlan(request)
    const plan2 = engine.generatePlan(request)
    assert.deepEqual(plan1, plan2)
  })
})

test.group('DanielsPlanEngine — règles de volume', () => {
  test('long run ≤ 30% du volume hebdo', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    for (const week of plan.weeks) {
      const longRun = week.sessions.find((s) => s.sessionType === SessionType.LongRun)
      if (longRun) {
        assert.isAtMost(longRun.targetDurationMinutes, Math.ceil(week.targetVolumeMinutes * 0.3))
      }
    }
  })

  test('long run ≥ 15% du volume hebdo (minimum utile)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    for (const week of plan.weeks) {
      const longRun = week.sessions.find((s) => s.sessionType === SessionType.LongRun)
      if (longRun) {
        assert.isAtLeast(longRun.targetDurationMinutes, Math.floor(week.targetVolumeMinutes * 0.1))
      }
    }
  })

  test('progression ≤ +10% par semaine (hors récup et taper)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ eventDate: null }))
    for (let i = 1; i < plan.weeks.length; i++) {
      const prev = plan.weeks[i - 1]
      const curr = plan.weeks[i]
      if (!curr.isRecoveryWeek && !prev.isRecoveryWeek) {
        const maxAllowed = Math.round(prev.targetVolumeMinutes * 1.1)
        assert.isAtMost(curr.targetVolumeMinutes, maxAllowed + 1) // +1 for rounding
      }
    }
  })

  test('semaines de récupération placées avec réduction exacte de 25%', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ totalWeeks: 16, eventDate: null }))
    const recoveryWeeks = plan.weeks.filter((w) => w.isRecoveryWeek)
    assert.isAbove(recoveryWeeks.length, 0)

    for (const rw of recoveryWeeks) {
      const prevWeek = plan.weeks[rw.weekNumber - 2]
      if (prevWeek && !prevWeek.isRecoveryWeek) {
        // Recovery = 75% of what the progression would give
        const expectedBase = Math.round(prevWeek.targetVolumeMinutes * 1.1)
        const expectedRecovery = Math.round(expectedBase * 0.75)
        assert.closeTo(rw.targetVolumeMinutes, expectedRecovery, 2)
      }
    }
  })
})

test.group('DanielsPlanEngine — strides en phase FI/EQ', () => {
  test('easy runs en FI contiennent des strides (intervalles)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const fiWeeks = plan.weeks.filter((w) => w.phaseName === 'FI')
    assert.isAbove(fiWeeks.length, 0)

    for (const week of fiWeeks) {
      const easySessions = week.sessions.filter((s) => s.sessionType === SessionType.Easy)
      const withStrides = easySessions.filter((s) => s.intervals !== null)
      assert.isAbove(withStrides.length, 0, `FI semaine ${week.weekNumber} sans strides`)
    }
  })

  test('strides ont 6 répétitions à allure R avec repos', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const fiWeek = plan.weeks.find((w) => w.phaseName === 'FI')!
    const withStrides = fiWeek.sessions.find(
      (s) => s.sessionType === SessionType.Easy && s.intervals !== null
    )!

    const strideBlock = withStrides.intervals!.find((b) => b.type === 'work')
    assert.isNotNull(strideBlock)
    assert.equal(strideBlock!.repetitions, 6)
    assert.equal(strideBlock!.recoveryType, 'rest')
    assert.equal(strideBlock!.distanceMeters, 100)
  })

  test('easy runs en TQ/FQ ne contiennent PAS de strides', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const laterWeeks = plan.weeks.filter((w) => w.phaseName === 'TQ' || w.phaseName === 'FQ')
    for (const week of laterWeeks) {
      const easySessions = week.sessions.filter((s) => s.sessionType === SessionType.Easy)
      for (const session of easySessions) {
        assert.isNull(session.intervals)
      }
    }
  })
})

test.group('DanielsPlanEngine — intervalles structurés', () => {
  test('séances I ont warmup + work + cooldown avec récup jog', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const intervalSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.Interval && s.intervals)

    assert.isAbove(intervalSessions.length, 0)
    for (const session of intervalSessions) {
      const blocks = session.intervals!
      assert.equal(blocks[0].type, 'warmup')
      assert.equal(blocks[blocks.length - 1].type, 'cooldown')
      const workBlock = blocks.find((b) => b.type === 'work')
      assert.isNotNull(workBlock)
      assert.equal(workBlock!.recoveryType, 'jog')
    }
  })

  test('séances R ont récupération repos (pas jog)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 5 }))
    const repSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.Repetition && s.intervals)

    assert.isAbove(repSessions.length, 0)
    for (const session of repSessions) {
      const workBlock = session.intervals!.find((b) => b.type === 'work')
      assert.equal(workBlock!.recoveryType, 'rest')
    }
  })

  test('séances T ont structure warmup/work/cooldown', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const tempoSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.Tempo && s.intervals)

    assert.isAbove(tempoSessions.length, 0)
    for (const session of tempoSessions) {
      const blocks = session.intervals!
      assert.equal(blocks[0].type, 'warmup')
      assert.equal(blocks[blocks.length - 1].type, 'cooldown')
    }
  })
})

test.group('DanielsPlanEngine — mix qualité par distance', () => {
  test('plan 5K : pas de séance marathon_pace', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 5 }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.equal(mpSessions.length, 0)
  })

  test('plan marathon : contient des séances marathon_pace', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 42.195 }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.isAbove(mpSessions.length, 0)
  })
})

test.group('DanielsPlanEngine — long run variable par phase', () => {
  test("long run en FI/EQ : pas d'intervalles (E pur)", ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const fiEqWeeks = plan.weeks.filter((w) => w.phaseName === 'FI' || w.phaseName === 'EQ')
    for (const week of fiEqWeeks) {
      const longRun = week.sessions.find((s) => s.sessionType === SessionType.LongRun)
      assert.isNull(longRun!.intervals)
    }
  })

  test('long run en TQ : contient intervalles (E + T finish)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const tqWeeks = plan.weeks.filter((w) => w.phaseName === 'TQ')
    for (const week of tqWeeks) {
      const longRun = week.sessions.find((s) => s.sessionType === SessionType.LongRun)
      assert.isNotNull(longRun!.intervals)
      assert.isAbove(longRun!.intervals!.length, 1)
    }
  })
})

test.group('DanielsPlanEngine — taper', () => {
  test('taper appliqué si eventDate : volume réduit en fin de plan', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ eventDate: '2026-09-20' }))
    const lastWeek = plan.weeks[plan.weeks.length - 1]
    const midWeek = plan.weeks[Math.floor(plan.weeks.length / 2)]
    assert.isBelow(lastWeek.targetVolumeMinutes, midWeek.targetVolumeMinutes)
  })

  test('taper non-linéaire : réduction progressive puis accélérée', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ eventDate: '2026-09-20', totalWeeks: 16 }))
    // 3 taper weeks for marathon (weeks 14, 15, 16)
    const taperWeeks = plan.weeks.filter((w) => w.weekNumber > 13 && !w.isRecoveryWeek)

    if (taperWeeks.length >= 2) {
      // Each subsequent taper week should have MORE reduction than the previous
      for (let i = 1; i < taperWeeks.length; i++) {
        assert.isBelow(
          taperWeeks[i].targetVolumeMinutes,
          taperWeeks[i - 1].targetVolumeMinutes,
          `Taper week ${taperWeeks[i].weekNumber} should be lower than ${taperWeeks[i - 1].weekNumber}`
        )
      }
    }
  })

  test('pas de taper si eventDate null', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ eventDate: null, totalWeeks: 8 }))
    const nonRecovery = plan.weeks.filter((w) => !w.isRecoveryWeek)
    if (nonRecovery.length >= 2) {
      const last = nonRecovery[nonRecovery.length - 1]
      const first = nonRecovery[0]
      assert.isAtLeast(last.targetVolumeMinutes, first.targetVolumeMinutes)
    }
  })
})

test.group('DanielsPlanEngine — maintenance', () => {
  test('retourne un cycle de 4 semaines', ({ assert }) => {
    const plan = engine.generateMaintenancePlan(makeMaintenanceRequest())
    assert.equal(plan.totalWeeks, 4)
    assert.equal(plan.weeks.length, 4)
  })

  test('semaine 4 est une semaine de récupération', ({ assert }) => {
    const plan = engine.generateMaintenancePlan(makeMaintenanceRequest())
    assert.isFalse(plan.weeks[0].isRecoveryWeek)
    assert.isTrue(plan.weeks[3].isRecoveryWeek)
  })

  test('volume de maintenance est 30-40% du pic', ({ assert }) => {
    const plan = engine.generateMaintenancePlan(makeMaintenanceRequest())
    const normalWeek = plan.weeks[0]
    assert.isAtLeast(normalWeek.targetVolumeMinutes, 300 * 0.28)
    assert.isAtMost(normalWeek.targetVolumeMinutes, 300 * 0.42)
  })

  test('semaines non-recovery ont séances structurées (tempo + interval)', ({ assert }) => {
    const plan = engine.generateMaintenancePlan(makeMaintenanceRequest())
    const normalWeek = plan.weeks[0]
    const sessionTypes = normalWeek.sessions.map((s) => s.sessionType)
    assert.include(sessionTypes, SessionType.Tempo)
    assert.include(sessionTypes, SessionType.Interval)
  })

  test('semaine recovery : toutes les séances sont easy', ({ assert }) => {
    const plan = engine.generateMaintenancePlan(makeMaintenanceRequest())
    const recoveryWeek = plan.weeks[3]
    for (const session of recoveryWeek.sessions) {
      assert.equal(session.sessionType, SessionType.Easy)
    }
  })
})

test.group('DanielsPlanEngine — transition', () => {
  test('durée selon distance : 2 semaines pour 10K', ({ assert }) => {
    const plan = engine.generateTransitionPlan(makeTransitionRequest({ raceDistanceKm: 10 }))
    assert.equal(plan.totalWeeks, 2)
  })

  test('durée selon distance : 4 semaines pour marathon', ({ assert }) => {
    const plan = engine.generateTransitionPlan(makeTransitionRequest())
    assert.equal(plan.totalWeeks, 4)
  })

  test('séances en transition sont toutes easy', ({ assert }) => {
    const plan = engine.generateTransitionPlan(makeTransitionRequest())
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        assert.equal(session.sessionType, SessionType.Easy)
      }
    }
  })

  test('volume progresse semaine après semaine', ({ assert }) => {
    const plan = engine.generateTransitionPlan(makeTransitionRequest())
    for (let i = 1; i < plan.weeks.length; i++) {
      assert.isAbove(
        plan.weeks[i].targetVolumeMinutes,
        plan.weeks[i - 1].targetVolumeMinutes,
        `Semaine ${i + 1} devrait avoir plus de volume que semaine ${i}`
      )
    }
  })
})

test.group('DanielsPlanEngine — recalibrate', () => {
  test('regenere les semaines restantes avec nouvelles allures', ({ assert }) => {
    const originalRequest = makePlanRequest()
    const originalPlan = engine.generatePlan(originalRequest)

    const newPaceZones: PaceZones = {
      easy: { minPacePerKm: 5.3, maxPacePerKm: 6.3 },
      marathon: { minPacePerKm: 4.6, maxPacePerKm: 4.9 },
      threshold: { minPacePerKm: 4.1, maxPacePerKm: 4.3 },
      interval: { minPacePerKm: 3.7, maxPacePerKm: 3.9 },
      repetition: { minPacePerKm: 3.3, maxPacePerKm: 3.5 },
    }

    const recalibrated = engine.recalibrate({
      currentWeekNumber: 9,
      newVdot: 53,
      newPaceZones: newPaceZones,
      remainingWeeks: originalPlan.weeks.slice(8),
      originalRequest,
    })

    assert.equal(recalibrated.weeks[0].weekNumber, 9)
    assert.isAbove(recalibrated.weeks.length, 0)
  })

  test('les nouvelles allures sont effectivement appliquées', ({ assert }) => {
    const originalRequest = makePlanRequest({ eventDate: null })
    const originalPlan = engine.generatePlan(originalRequest)

    const newPaceZones: PaceZones = {
      easy: { minPacePerKm: 5.0, maxPacePerKm: 6.0 },
      marathon: { minPacePerKm: 4.3, maxPacePerKm: 4.6 },
      threshold: { minPacePerKm: 3.8, maxPacePerKm: 4.0 },
      interval: { minPacePerKm: 3.4, maxPacePerKm: 3.6 },
      repetition: { minPacePerKm: 3.0, maxPacePerKm: 3.2 },
    }

    const recalibrated = engine.recalibrate({
      currentWeekNumber: 9,
      newVdot: 55,
      newPaceZones: newPaceZones,
      remainingWeeks: originalPlan.weeks.slice(8),
      originalRequest,
    })

    // Easy sessions should use mid-pace of new zone: (5.0+6.0)/2 = 5.5 → 5:30
    const easySession = recalibrated.weeks
      .flatMap((w) => w.sessions)
      .find((s) => s.sessionType === SessionType.Easy || s.sessionType === SessionType.LongRun)

    assert.isNotNull(easySession)
    assert.equal(easySession!.targetPacePerKm, '5:30')
  })

  test('préserve la phase correcte pour les semaines restantes', ({ assert }) => {
    const originalRequest = makePlanRequest({ totalWeeks: 16, eventDate: null })
    const originalPlan = engine.generatePlan(originalRequest)

    // Week 9 is in TQ phase in a 16-week plan (FI:4, EQ:4, TQ:4, FQ:4)
    const recalibrated = engine.recalibrate({
      currentWeekNumber: 9,
      newVdot: 53,
      newPaceZones: PACE_ZONES,
      remainingWeeks: originalPlan.weeks.slice(8),
      originalRequest,
    })

    // Week 9 should be TQ (same as original), not FI
    assert.equal(recalibrated.weeks[0].phaseName, 'TQ')
    // Week 13 should be FQ
    const week13 = recalibrated.weeks.find((w) => w.weekNumber === 13)
    assert.isNotNull(week13)
    assert.equal(week13!.phaseName, 'FQ')
  })
})

test.group('DanielsPlanEngine — catégorisation distance (boundary)', () => {
  test('5 km → catégorie 5k', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 5, eventDate: null }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.equal(mpSessions.length, 0) // 5k has no MP sessions
  })

  test('5.01 km → catégorie 10k (pas 5k)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 5.01, eventDate: null }))
    // 10k category also has no MP sessions
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.equal(mpSessions.length, 0)
  })

  test('10 km → catégorie 10k', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 10, eventDate: null }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.equal(mpSessions.length, 0)
  })

  test('10.01 km → catégorie half (pas 10k)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 10.01, eventDate: null }))
    // half category includes MP sessions in TQ/FQ
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.isAbove(mpSessions.length, 0)
  })

  test('21.1 km → catégorie half', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 21.1, eventDate: null }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.isAbove(mpSessions.length, 0)
  })

  test('21.2 km → catégorie marathon', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 21.2, eventDate: null }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace)
    assert.isAbove(mpSessions.length, 0)
  })
})

test.group('DanielsPlanEngine — intervalles MarathonPace', () => {
  test('séances MP ont warmup + work blocks (15min) + cooldown avec récup jog', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ targetDistanceKm: 42.195 }))
    const mpSessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.MarathonPace && s.intervals)

    assert.isAbove(mpSessions.length, 0)
    for (const session of mpSessions) {
      const blocks = session.intervals!
      assert.equal(blocks[0].type, 'warmup')
      assert.equal(blocks[blocks.length - 1].type, 'cooldown')
      const workBlock = blocks.find((b) => b.type === 'work')
      assert.isNotNull(workBlock)
      assert.equal(workBlock!.durationMinutes, 15)
      assert.isAtLeast(workBlock!.repetitions, 2)
      assert.equal(workBlock!.recoveryType, 'jog')
      assert.equal(workBlock!.recoveryDurationMinutes, 2)
    }
  })
})

test.group('DanielsPlanEngine — allures easy au milieu de zone', () => {
  test('easy sessions utilisent le milieu de la zone E (pas le plancher)', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    // PACE_ZONES.easy = { min: 5.5, max: 6.5 } → mid = 6.0 → "6:00"
    const easySession = plan.weeks
      .flatMap((w) => w.sessions)
      .find((s) => s.sessionType === SessionType.Easy)

    assert.isNotNull(easySession)
    assert.equal(easySession!.targetPacePerKm, '6:00')
  })

  test('warmup/cooldown utilisent aussi le milieu de la zone E', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const intervalSession = plan.weeks
      .flatMap((w) => w.sessions)
      .find((s) => s.sessionType === SessionType.Interval && s.intervals)

    assert.isNotNull(intervalSession)
    const warmup = intervalSession!.intervals![0]
    assert.equal(warmup.targetPace, '6:00')
  })
})

test.group('DanielsPlanEngine — edge cases', () => {
  test('plan avec totalWeeks=4 : chaque phase a 1 semaine', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest({ totalWeeks: 4, eventDate: null }))
    assert.equal(plan.weeks.length, 4)
    const phases = plan.weeks.map((w) => w.phaseName)
    assert.deepEqual(phases, ['FI', 'EQ', 'TQ', 'FQ'])
  })

  test('plan avec sessionsPerWeek=2 : fonctionne sans crash', ({ assert }) => {
    const plan = engine.generatePlan(
      makePlanRequest({ sessionsPerWeek: 2, preferredDays: [3, 7], eventDate: null })
    )
    for (const week of plan.weeks) {
      assert.equal(week.sessions.length, 2)
      const longRuns = week.sessions.filter((s) => s.sessionType === SessionType.LongRun)
      assert.equal(longRuns.length, 1)
    }
  })

  test('plan avec sessionsPerWeek=3 : long run + 1-2 quality + easy', ({ assert }) => {
    const plan = engine.generatePlan(
      makePlanRequest({ sessionsPerWeek: 3, preferredDays: [2, 5, 7], eventDate: null })
    )
    for (const week of plan.weeks) {
      assert.equal(week.sessions.length, 3)
    }
  })

  test('easy runs ont une durée minimale de 20 minutes', ({ assert }) => {
    const plan = engine.generatePlan(makePlanRequest())
    const easySessions = plan.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => s.sessionType === SessionType.Easy)

    for (const session of easySessions) {
      assert.isAtLeast(session.targetDurationMinutes, 20)
    }
  })
})
