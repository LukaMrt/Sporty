import { test } from '@japa/runner'
import RecalibratePlan from '#use_cases/planning/recalibrate_plan'
import PlanRecalibrator from '#use_cases/planning/plan_recalibrator'
import PlanPersister from '#use_cases/planning/plan_persister'
import {
  EchoPlanEngine,
  ImmediateUnitOfWork,
  InMemoryPlanRepo,
  InMemorySessionRepo,
  RecordingEventEmitter,
  StaticGoalRepo,
} from '#tests/helpers/base_mocks'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import type { WeekSummary } from '#domain/value_objects/week_summary'
import { calculateVdot } from '#domain/services/vdot_calculator'

async function setup(options: { autoRecalibrate?: boolean; sessionType?: SessionType } = {}) {
  const plans = new InMemoryPlanRepo()
  const sessions = new InMemorySessionRepo()
  const engine = new EchoPlanEngine()
  const emitter = new RecordingEventEmitter()
  const plan = await plans.seedPlan({
    startDate: '2026-01-05',
    weeks: 4,
    sessionType: options.sessionType ?? SessionType.Tempo,
    autoRecalibrate: options.autoRecalibrate,
  })
  const useCase = new RecalibratePlan(
    plans,
    sessions,
    new PlanRecalibrator(plans, new StaticGoalRepo(), engine, new PlanPersister(plans)),
    new ImmediateUnitOfWork(),
    emitter
  )
  return { plans, sessions, engine, emitter, plan, useCase }
}

const summary = (planned: number, actual: number, quality = true): WeekSummary => ({
  weekNumber: 1,
  plannedLoadTss: planned,
  actualLoadTss: actual,
  qualitySessions: quality
    ? [{ sessionType: 'tempo', actualTss: actual, plannedTss: planned }]
    : [],
})

test.group('RecalibratePlan', () => {
  test('ne fait rien si autoRecalibrate === false', async ({ assert }) => {
    const { useCase, engine } = await setup({ autoRecalibrate: false })
    await useCase.execute(1, summary(100, 200))
    assert.lengthOf(engine.recalibrations, 0)
  })

  test('ne fait rien si delta < ±10 %', async ({ assert }) => {
    const { useCase, engine } = await setup()
    await useCase.execute(1, summary(100, 105))
    assert.lengthOf(engine.recalibrations, 0)
  })

  test('ne fait rien sans plan actif', async ({ assert }) => {
    const { useCase, engine } = await setup()
    await useCase.execute(99, summary(100, 200))
    assert.lengthOf(engine.recalibrations, 0)
  })

  test('delta < −20 % → semaines suivantes régénérées avec 85 % du volume', async ({ assert }) => {
    const { useCase, engine } = await setup()
    await useCase.execute(1, summary(100, 70, false))

    assert.lengthOf(engine.recalibrations, 1)
    const ctx = engine.recalibrations[0]
    assert.equal(ctx.remainingWeeks[0].weekNumber, 2)
    assert.equal(ctx.remainingWeeks[0].targetVolumeMinutes, Math.round(180 * 0.85))
  })

  test('delta entre −10 % et −20 % → régénération sans réduction de volume', async ({ assert }) => {
    const { useCase, engine } = await setup()
    await useCase.execute(1, summary(100, 85, false))
    assert.equal(engine.recalibrations[0].remainingWeeks[0].targetVolumeMinutes, 180)
  })

  test('hausse de VDOT estimée sur la séance qualité de course liée (sa propre distance)', async ({
    assert,
  }) => {
    const { useCase, plans, sessions, emitter, plan } = await setup()
    const quality = plans.sessions.find((s) => s.weekNumber === 1)!
    sessions.add({ id: 50, date: '2026-01-06', distanceKm: 10, durationMinutes: 38 })
    await plans.updateSession(quality.id, {
      completedSessionId: 50,
      status: PlannedSessionStatus.Completed,
    })

    await useCase.execute(1, summary(100, 130))

    const expected = Math.round(calculateVdot(10_000, 38) * 2) / 2
    assert.equal((await plans.findById(plan.id))!.currentVdot, expected)
    assert.equal(emitter.events[0]?.event, 'plan:vdot_increased')
  })

  test('une sortie vélo liée ne fait jamais monter le VDOT', async ({ assert }) => {
    const { useCase, plans, sessions, plan } = await setup()
    const quality = plans.sessions.find((s) => s.weekNumber === 1)!
    sessions.add({
      id: 51,
      date: '2026-01-06',
      distanceKm: 30,
      durationMinutes: 60,
      sportSlug: 'cycling',
    })
    await plans.updateSession(quality.id, {
      completedSessionId: 51,
      status: PlannedSessionStatus.Completed,
    })

    await useCase.execute(1, summary(100, 130))

    assert.equal((await plans.findById(plan.id))!.currentVdot, 45)
  })

  test('3 séances qualité consécutives sous cible → proposition de baisse', async ({ assert }) => {
    const { useCase, plans, sessions, plan, engine } = await setup()
    const week1 = plans.sessions.filter((s) => s.weekNumber === 1)
    for (const [i, ps] of week1.entries()) {
      sessions.add({ id: 60 + i, date: '2026-01-06', durationMinutes: 30 })
      await plans.updateSession(ps.id, {
        completedSessionId: 60 + i,
        status: PlannedSessionStatus.Completed,
      })
    }

    await useCase.execute(1, summary(100, 60))

    assert.equal((await plans.findById(plan.id))!.pendingVdotDown, 43)
    assert.lengthOf(engine.recalibrations, 0)
  })

  test('séance qualité manquée (skipped) reportée sur un jour libre de la semaine suivante', async ({
    assert,
  }) => {
    const { useCase, plans } = await setup()
    const missed = plans.sessions.find((s) => s.weekNumber === 1)!
    await plans.updateSession(missed.id, { status: PlannedSessionStatus.Skipped })

    await useCase.execute(1, summary(100, 100))

    const moved = await plans.findSessionById(missed.id)
    assert.equal(moved!.weekNumber, 2)
    assert.equal(moved!.status, PlannedSessionStatus.Pending)
    assert.notInclude([2, 4, 6], moved!.dayOfWeek)
  })
})
