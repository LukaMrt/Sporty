import { test } from '@japa/runner'
import GetAnalysis from '#use_cases/analysis/get_analysis'
import GetPeriodReport from '#use_cases/analysis/get_period_report'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'
import GetTodayOverview from '#use_cases/dashboard/get_today_overview'
import { BanisterFitnessCalculator } from '#services/training/banister_fitness_calculator'
import { TrainingLoadCalculatorImpl } from '#services/training/training_load_calculator_impl'
import {
  InMemoryPlanRepo,
  InMemorySessionRepo,
  SilentLogger,
  StaticGoalRepo,
} from '#tests/helpers/base_mocks'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import { weekStart } from '#domain/services/analysis/aggregations'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { DailyWellness } from '#domain/value_objects/daily_wellness'

const TODAY = todayInTimezone(null)

class StaticDailyMetrics extends DailyMetricsRepository {
  constructor(private days: DailyWellness[] = []) {
    super()
  }
  async upsertMany() {}
  async findRange(_userId: number, from: string, to: string) {
    return this.days.filter((d) => d.date >= from && d.date <= to)
  }
}

function setup(options: { goal?: TrainingGoal | null; plans?: InMemoryPlanRepo } = {}): {
  sessions: InMemorySessionRepo
  plans: InMemoryPlanRepo
  analysis: GetAnalysis
  report: GetPeriodReport
  today: GetTodayOverview
} {
  const sessions = new InMemorySessionRepo()
  const plans = options.plans ?? new InMemoryPlanRepo()
  const profiles = makeMockUserProfileRepository()
  const fitness = new GetFitnessProfile(
    sessions,
    profiles,
    new TrainingLoadCalculatorImpl(),
    new BanisterFitnessCalculator(),
    new SilentLogger()
  )
  const analysis = new GetAnalysis(
    sessions,
    profiles,
    new StaticDailyMetrics(),
    new StaticGoalRepo(options.goal ?? null),
    plans,
    fitness
  )
  return {
    sessions,
    plans,
    analysis,
    report: new GetPeriodReport(sessions, profiles, fitness),
    today: new GetTodayOverview(analysis, plans),
  }
}

/** Séance saisie à la main : effort perçu, aucune charge encore stockée */
function addManualRun(sessions: InMemorySessionRepo, id: number, date: string) {
  sessions.add({ id, date, durationMinutes: 50, perceivedEffort: 6, trainingLoad: null })
}

test.group('Charge effective (bug « 0 TSS »)', () => {
  test('le bilan compte la charge des séances sans charge stockée', async ({ assert }) => {
    const { sessions, report } = setup()
    addManualRun(sessions, 1, TODAY)
    const result = await report.execute(1, 'week', TODAY)
    assert.equal(result.totals.sessions, 1)
    assert.isAbove(result.totals.load, 0)
    assert.isAbove(result.busiestWeek!.load, 0)
  })

  test('le résumé pour Claude aussi', async ({ assert }) => {
    const { sessions, analysis } = setup()
    addManualRun(sessions, 1, TODAY)
    const result = await analysis.execute(1)
    assert.notMatch(result.claudeSummary, /charge 0 TSS/)
    assert.match(result.claudeSummary, /charge [1-9]\d* TSS/)
  })

  test('bilan, chiffres clés et calendrier disent la même charge que le modèle', async ({
    assert,
  }) => {
    const { sessions, analysis } = setup()
    addManualRun(sessions, 1, TODAY)
    const result = await analysis.execute(1)
    const calendarLoad = result.calendar.find((d) => d.date === TODAY)!.tss
    assert.equal(result.totals.current.load, Math.round(calendarLoad))
    assert.equal(result.calendar.find((d) => d.date === TODAY)!.sessionId, 1)
  })
})

test.group('GetAnalysis — filtres', () => {
  test('filtre sport : volume filtré, forme toujours globale', async ({ assert }) => {
    const { sessions, analysis } = setup()
    addManualRun(sessions, 1, addDaysIso(TODAY, -3))
    sessions.add({ id: 2, date: addDaysIso(TODAY, -2), sportSlug: 'cycling', perceivedEffort: 5 })
    const all = await analysis.execute(1)
    const running = await analysis.execute(1, { sport: 'running' })

    assert.deepEqual(all.filters.sports, ['cycling', 'running'])
    assert.equal(all.totals.current.sessions, 2)
    assert.equal(running.totals.current.sessions, 1)
    assert.equal(
      running.fitness.current!.chronicTrainingLoad,
      all.fitness.current!.chronicTrainingLoad
    )
  })

  test('période personnalisée et comparaison avec la période précédente', async ({ assert }) => {
    const { sessions, analysis } = setup()
    const from = addDaysIso(TODAY, -20)
    const to = addDaysIso(TODAY, -11)
    addManualRun(sessions, 1, addDaysIso(TODAY, -15)) // dans la période
    addManualRun(sessions, 2, addDaysIso(TODAY, -25)) // période précédente (10 jours avant)
    addManualRun(sessions, 3, addDaysIso(TODAY, -2)) // après la période

    const result = await analysis.execute(1, { from, to })
    assert.equal(result.range, 'custom')
    assert.equal(result.totals.current.sessions, 1)
    assert.equal(result.totals.comparison!.sessions, 1)
    assert.deepEqual(result.filters.comparison, {
      from: addDaysIso(TODAY, -30),
      to: addDaysIso(TODAY, -21),
    })
  })

  test('sans comparaison', async ({ assert }) => {
    const { sessions, analysis } = setup()
    addManualRun(sessions, 1, TODAY)
    const result = await analysis.execute(1, { compare: 'none' })
    assert.isNull(result.totals.comparison)
    assert.isNull(result.filters.comparison)
  })
})

test.group('GetAnalysis — objectif et plan', () => {
  test('projection jusqu’au jour J et réalisé vs prévu', async ({ assert }) => {
    const plans = new InMemoryPlanRepo()
    await plans.seedPlan({ startDate: addDaysIso(TODAY, -14), weeks: 6 })
    const eventDate = addDaysIso(TODAY, 20)
    const { sessions, analysis } = setup({
      plans,
      goal: {
        id: 1,
        userId: 1,
        targetDistanceKm: 10,
        targetTimeMinutes: 50,
        eventDate,
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
    })
    addManualRun(sessions, 1, addDaysIso(TODAY, -10))
    addManualRun(sessions, 2, addDaysIso(TODAY, -3))

    const result = await analysis.execute(1)
    assert.equal(result.fitness.projection.at(-1)!.date, eventDate)
    assert.equal(result.goal!.daysLeft, 20)
    assert.isNotNull(result.goal!.raceDay)
    assert.isAbove(result.fitness.adherence.length, 0)
    assert.isTrue(result.coverage.hasPlan)
  })
})

test.group('GetTodayOverview', () => {
  test('semaine en cours, dernière séance et conseil du jour', async ({ assert }) => {
    const { sessions, today } = setup()
    for (let i = 1; i <= 20; i++) addManualRun(sessions, i, addDaysIso(TODAY, -i * 2))
    addManualRun(sessions, 99, TODAY)

    const result = await today.execute(1)
    assert.equal(result.sessionCount, 21)
    assert.equal(result.week.from, weekStart(TODAY))
    assert.equal(result.lastSession!.id, 99)
    assert.isAbove(result.lastSession!.trainingLoad!, 0)
    assert.isNotNull(result.form.advice)
    assert.isAtMost(result.insights.length, 3)
  })

  test('sans séance', async ({ assert }) => {
    const { today } = setup()
    const result = await today.execute(1)
    assert.equal(result.sessionCount, 0)
    assert.isNull(result.lastSession)
  })
})
