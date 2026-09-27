import { test } from '@japa/runner'
import CloseFinishedGoal from '#use_cases/planning/close_finished_goal'
import CreateGoal from '#use_cases/planning/create_goal'
import { ActiveGoalExistsError } from '#domain/errors/active_goal_exists_error'
import { PlanStatus } from '#domain/value_objects/planning_types'
import { InMemoryGoalRepo, InMemoryPlanRepo } from '#tests/helpers/base_mocks'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'

async function setup(planStatus: PlanStatus | null) {
  const goals = new InMemoryGoalRepo()
  const plans = new InMemoryPlanRepo()
  const goal = await goals.create({
    userId: 1,
    targetDistanceKm: 21.1,
    targetTimeMinutes: 120,
    eventDate: null,
    status: 'active',
  })
  if (planStatus) {
    const plan = await plans.seedPlan({ startDate: '2026-01-05', weeks: 4, goalId: goal.id })
    await plans.update(plan.id, { status: planStatus })
  }
  const close = new CloseFinishedGoal(goals, plans)
  const profiles = makeMockUserProfileRepository({
    update: async (_userId, data) => ({ ...data }) as never,
  })
  const createGoal = new CreateGoal(goals, profiles, close)
  return { goals, goal, close, createGoal }
}

const NEW_GOAL = { userId: 1, targetDistanceKm: 10, targetTimeMinutes: 45 }

test.group('CloseFinishedGoal', () => {
  test('plan terminé → objectif atteint', async ({ assert }) => {
    const { close, goal, goals } = await setup(PlanStatus.Completed)
    const closed = await close.execute(1)
    assert.equal(closed?.id, goal.id)
    assert.equal((await goals.findById(goal.id))!.status, 'achieved')
  })

  test('plan encore actif (préparation ou transition) → objectif conservé', async ({ assert }) => {
    const { close, goal, goals } = await setup(PlanStatus.Active)
    assert.isNull(await close.execute(1))
    assert.equal((await goals.findById(goal.id))!.status, 'active')
  })

  test('aucun objectif actif → rien à faire', async ({ assert }) => {
    const close = new CloseFinishedGoal(new InMemoryGoalRepo(), new InMemoryPlanRepo())
    assert.isNull(await close.execute(1))
  })
})

test.group('CreateGoal — objectif précédent terminé (bug « un seul objectif à la fois »)', () => {
  test('un objectif dont le plan est terminé ne bloque plus le suivant', async ({ assert }) => {
    const { createGoal, goals, goal } = await setup(PlanStatus.Completed)
    const created = await createGoal.execute(NEW_GOAL)
    assert.equal(created.status, 'active')
    assert.equal((await goals.findById(goal.id))!.status, 'achieved')
  })

  test('un objectif encore sans plan (assistant en cours) bloque toujours', async ({ assert }) => {
    const { createGoal } = await setup(null)
    await assert.rejects(() => createGoal.execute(NEW_GOAL), ActiveGoalExistsError)
  })

  test('un objectif en cours de préparation bloque toujours', async ({ assert }) => {
    const { createGoal } = await setup(PlanStatus.Active)
    await assert.rejects(() => createGoal.execute(NEW_GOAL), ActiveGoalExistsError)
  })
})
