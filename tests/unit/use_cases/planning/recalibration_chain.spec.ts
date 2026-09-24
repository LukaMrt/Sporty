import { test } from '@japa/runner'
import AutoLinkCompletedSession from '#use_cases/planning/auto_link_completed_session'
import DetectWeekCompletion from '#use_cases/planning/detect_week_completion'
import AdvancePlanLifecycle from '#use_cases/planning/advance_plan_lifecycle'
import WeekSummaryBuilder from '#use_cases/planning/week_summary_builder'
import RecalibratePlan from '#use_cases/planning/recalibrate_plan'
import PlanRecalibrator from '#use_cases/planning/plan_recalibrator'
import PlanPersister from '#use_cases/planning/plan_persister'
import GenerateMaintenancePlan from '#use_cases/planning/generate_maintenance_plan'
import {
  EchoPlanEngine,
  FixedLoadCalculator,
  ImmediateUnitOfWork,
  InMemoryPlanRepo,
  InMemorySessionRepo,
  RecordingEventEmitter,
  SilentLogger,
  StaticGoalRepo,
} from '#tests/helpers/base_mocks'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import {
  PlanStatus,
  PlannedSessionStatus,
  TrainingState,
} from '#domain/value_objects/planning_types'
import type { UserProfile } from '#domain/entities/user_profile'
import type { WeekSummary } from '#domain/value_objects/week_summary'

// Plan démarrant un lundi : séances mardi (2), jeudi (4), samedi (6)
const START = '2026-01-05'

function build(profile: Partial<UserProfile> | null = null) {
  const plans = new InMemoryPlanRepo()
  const sessions = new InMemorySessionRepo()
  const profiles = makeMockUserProfileRepository({
    findByUserId: async () => (profile ? (profile as UserProfile) : null),
    update: async () => ({}) as UserProfile,
  })
  const summaryBuilder = new WeekSummaryBuilder(
    sessions,
    profiles,
    new FixedLoadCalculator({ value: 60, method: 'rpe' })
  )
  const autoLink = new AutoLinkCompletedSession(plans, sessions)
  return { plans, sessions, profiles, summaryBuilder, autoLink }
}

test.group('AutoLinkCompletedSession', () => {
  test('lie la séance réalisée à la séance prévue le même jour', async ({ assert }) => {
    const { plans, sessions, autoLink } = build()
    await plans.seedPlan({ startDate: START, weeks: 2 })
    sessions.add({ id: 10, date: '2026-01-06' }) // mardi semaine 1

    const linked = await autoLink.execute(1, 10)

    assert.equal(linked!.dayOfWeek, 2)
    assert.equal(linked!.weekNumber, 1)
    assert.equal(linked!.status, PlannedSessionStatus.Completed)
  })

  test('tolère un jour d’écart', async ({ assert }) => {
    const { plans, sessions, autoLink } = build()
    await plans.seedPlan({ startDate: START, weeks: 2 })
    sessions.add({ id: 10, date: '2026-01-07' }) // mercredi

    assert.isNotNull(await autoLink.execute(1, 10))
  })

  test('ne lie pas au-delà d’un jour, ni une séance non course', async ({ assert }) => {
    const { plans, sessions, autoLink } = build()
    await plans.seedPlan({ startDate: START, weeks: 2, days: [2] })
    sessions.add({ id: 10, date: '2026-01-09' }) // vendredi : 3 jours après mardi
    sessions.add({ id: 11, date: '2026-01-06', sportSlug: 'cycling' })

    assert.isNull(await autoLink.execute(1, 10))
    assert.isNull(await autoLink.execute(1, 11))
  })
})

test.group('DetectWeekCompletion', () => {
  test('émet week:completed quand la dernière séance de la semaine est faite', async ({
    assert,
  }) => {
    const { plans, sessions, summaryBuilder, autoLink } = build()
    await plans.seedPlan({ startDate: START, weeks: 2 })
    const emitter = new RecordingEventEmitter()
    const detect = new DetectWeekCompletion(plans, autoLink, summaryBuilder, emitter)

    for (const [id, date] of [
      [10, '2026-01-06'],
      [11, '2026-01-08'],
      [12, '2026-01-10'],
    ] as const) {
      sessions.add({ id, date })
      await detect.execute(1, id)
    }

    assert.lengthOf(emitter.events, 1)
    const summary = emitter.events[0].data.weekSummary as WeekSummary
    assert.equal(summary.weekNumber, 1)
    assert.equal(summary.actualLoadTss, 180)
  })
})

test.group('AdvancePlanLifecycle', () => {
  test('clôture une semaine écoulée : séances en attente → skipped, week:completed émis', async ({
    assert,
  }) => {
    const { plans, profiles, summaryBuilder } = build({ timezone: null })
    // Plan commencé il y a 10 jours : la semaine 1 est écoulée
    const start = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10)
    await plans.seedPlan({ startDate: start, weeks: 4 })
    const emitter = new RecordingEventEmitter()
    const advance = new AdvancePlanLifecycle(
      plans,
      profiles,
      {} as GenerateMaintenancePlan,
      summaryBuilder,
      new ImmediateUnitOfWork(),
      emitter,
      new SilentLogger()
    )

    assert.equal(await advance.execute(1), 'none')
    assert.isTrue(
      plans.sessions
        .filter((s) => s.weekNumber === 1)
        .every((s) => s.status === PlannedSessionStatus.Skipped)
    )
    assert.lengthOf(emitter.events, 1)

    // Idempotent : un second passage ne ré-émet rien
    await advance.execute(1)
    assert.lengthOf(emitter.events, 1)
  })

  test('plan terminé → completed ; en maintenance → nouveau cycle généré', async ({ assert }) => {
    const { plans, profiles, summaryBuilder } = build({
      trainingState: TrainingState.Maintenance,
      timezone: null,
    })
    const start = new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10)
    await plans.seedPlan({ startDate: start, weeks: 4 })
    const maintenance = new GenerateMaintenancePlan(
      plans,
      profiles,
      new EchoPlanEngine(),
      new PlanPersister(plans),
      new ImmediateUnitOfWork()
    )
    const advance = new AdvancePlanLifecycle(
      plans,
      profiles,
      maintenance,
      summaryBuilder,
      new ImmediateUnitOfWork(),
      new RecordingEventEmitter(),
      new SilentLogger()
    )

    assert.equal(await advance.execute(1), 'maintenance_renewed')
    assert.equal(plans.plans[0].status, PlanStatus.Completed)
    assert.equal(plans.plans[1].status, PlanStatus.Active)
  })
})

test.group('Chaîne complète séance → semaine → recalibration', () => {
  test('3 séances trop courtes enregistrées → semaine close → plan recalibré', async ({
    assert,
  }) => {
    const { plans, sessions, summaryBuilder, autoLink } = build()
    await plans.seedPlan({ startDate: START, weeks: 3 })
    const engine = new EchoPlanEngine()
    const recalibrate = new RecalibratePlan(
      plans,
      sessions,
      new PlanRecalibrator(plans, new StaticGoalRepo(), engine, new PlanPersister(plans)),
      new ImmediateUnitOfWork(),
      new RecordingEventEmitter()
    )
    // Émetteur « réel » : week:completed déclenche la recalibration
    class ChainEmitter extends EventEmitter {
      async emit(event: string, data: Record<string, unknown>) {
        if (event === 'week:completed') {
          await recalibrate.execute(data.userId as number, data.weekSummary as WeekSummary)
        }
      }
    }
    // Charge réalisée 3 × 20 TSS contre ~3 × 56 prévus → delta < −20 %
    const detect = new DetectWeekCompletion(
      plans,
      autoLink,
      new WeekSummaryBuilder(
        sessions,
        makeMockUserProfileRepository(),
        new FixedLoadCalculator({ value: 20, method: 'rpe' })
      ),
      new ChainEmitter()
    )
    void summaryBuilder

    for (const [id, date] of [
      [10, '2026-01-06'],
      [11, '2026-01-08'],
      [12, '2026-01-10'],
    ] as const) {
      sessions.add({ id, date })
      await detect.execute(1, id)
    }

    assert.lengthOf(engine.recalibrations, 1)
    assert.equal(engine.recalibrations[0].remainingWeeks[0].weekNumber, 2)
    assert.isNotNull(plans.plans[0].lastRecalibratedAt)
  })
})
