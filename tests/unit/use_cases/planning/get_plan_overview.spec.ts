import { test } from '@japa/runner'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'
import {
  InMemoryPlanRepo,
  InMemorySessionRepo,
  SAMPLE_FITNESS,
  StaticGoalRepo,
  stubGetFitnessProfile,
} from '#tests/helpers/base_mocks'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import type { TrainingGoal } from '#domain/entities/training_goal'
import { PlanStatus } from '#domain/value_objects/planning_types'

const TODAY = todayInTimezone(null)

const GOAL: TrainingGoal = {
  id: 1,
  userId: 1,
  targetDistanceKm: 10,
  targetTimeMinutes: null,
  eventDate: null,
  status: 'active',
  createdAt: '',
  updatedAt: '',
}

async function setup(options: { goalId?: number | null; goal?: TrainingGoal | null } = {}) {
  const plans = new InMemoryPlanRepo()
  const sessions = new InMemorySessionRepo()
  await plans.seedPlan({
    startDate: addDaysIso(TODAY, -8),
    weeks: 4,
    goalId: options.goalId === undefined ? 1 : options.goalId,
  })
  const useCase = new GetPlanOverview(
    new StaticGoalRepo(options.goal === undefined ? GOAL : options.goal),
    plans,
    sessions,
    makeMockUserProfileRepository(),
    stubGetFitnessProfile()
  )
  return { plans, sessions, useCase }
}

test.group('GetPlanOverview', () => {
  test('null si aucun plan actif', async ({ assert }) => {
    const { useCase } = await setup()
    assert.isNull(await useCase.execute(99))
  })

  test('null si plan de préparation sans objectif actif', async ({ assert }) => {
    const { useCase } = await setup({ goal: null })
    assert.isNull(await useCase.execute(1))
  })

  test('un plan de maintenance (sans objectif) reste affiché', async ({ assert }) => {
    const { useCase } = await setup({ goalId: null, goal: null })
    assert.isNotNull(await useCase.execute(1))
  })

  test('semaine courante, séances groupées et datées', async ({ assert }) => {
    const { useCase } = await setup()
    const overview = (await useCase.execute(1))!

    assert.equal(overview.currentWeekNumber, 2)
    assert.lengthOf(overview.sessionsByWeek[1], 3)
    assert.match(overview.sessionsByWeek[1][0].date, /^\d{4}-\d{2}-\d{2}$/)
    assert.deepEqual(overview.fitnessProfile, SAMPLE_FITNESS)
  })

  test('lecture seule : un plan terminé n’est PAS modifié par la consultation', async ({
    assert,
  }) => {
    const plans = new InMemoryPlanRepo()
    await plans.seedPlan({ startDate: addDaysIso(TODAY, -60), weeks: 4, goalId: 1 })
    const useCase = new GetPlanOverview(
      new StaticGoalRepo(GOAL),
      plans,
      new InMemorySessionRepo(),
      makeMockUserProfileRepository(),
      stubGetFitnessProfile()
    )

    await useCase.execute(1)

    assert.equal(plans.plans[0].status, PlanStatus.Active)
  })

  test('niveaux d’inactivité', async ({ assert }) => {
    const cases: [number | null, string][] = [
      [3, 'none'],
      [20, 'warning'],
      [40, 'critical'],
      [null, 'none'],
    ]
    for (const [daysAgo, level] of cases) {
      const { useCase, sessions } = await setup()
      if (daysAgo !== null) sessions.add({ id: 1, date: addDaysIso(TODAY, -daysAgo) })
      const overview = (await useCase.execute(1))!
      assert.equal(overview.inactivityLevel, level)
      assert.equal(overview.daysSinceLastSession, daysAgo)
    }
  })
})
