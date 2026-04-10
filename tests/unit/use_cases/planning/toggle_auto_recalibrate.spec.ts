import { test } from '@japa/runner'
import ToggleAutoRecalibrate, {
  NoActivePlanError,
} from '#use_cases/planning/toggle_auto_recalibrate'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { PlanStatus, PlanType, TrainingMethodology } from '#domain/value_objects/planning_types'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'

const makePlan = (autoRecalibrate: boolean): TrainingPlan => ({
  id: 1,
  userId: 1,
  goalId: null,
  methodology: TrainingMethodology.Daniels,
  level: PlanType.Marathon,
  status: PlanStatus.Active,
  autoRecalibrate,
  vdotAtCreation: 45,
  currentVdot: 45,
  sessionsPerWeek: 4,
  preferredDays: [1, 3, 5, 6],
  startDate: '2026-01-01',
  endDate: '2026-06-01',
  lastRecalibratedAt: null,
  pendingVdotDown: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

function makePlanRepo(
  plan: TrainingPlan | null
): TrainingPlanRepository & { lastUpdate: Partial<TrainingPlan> | null } {
  let lastUpdate: Partial<TrainingPlan> | null = null

  class MockPlanRepo extends TrainingPlanRepository {
    async create(): Promise<TrainingPlan> {
      throw new Error('not implemented')
    }
    async findById(): Promise<TrainingPlan | null> {
      return plan
    }
    async findByUserId(): Promise<TrainingPlan[]> {
      return []
    }
    async findActiveByUserId(): Promise<TrainingPlan | null> {
      return plan
    }
    async findActiveByGoalId(): Promise<TrainingPlan | null> {
      return null
    }
    async update(_id: number, data: Partial<TrainingPlan>): Promise<TrainingPlan> {
      lastUpdate = data
      return { ...makePlan(false), ...data }
    }
    async delete(): Promise<void> {}
    async createWeek(): Promise<PlannedWeek> {
      throw new Error('not implemented')
    }
    async findWeeksByPlanId(): Promise<PlannedWeek[]> {
      return []
    }
    async createSession(): Promise<PlannedSession> {
      throw new Error('not implemented')
    }
    async findSessionById(): Promise<PlannedSession | null> {
      return null
    }
    async findSessionsByPlanId(): Promise<PlannedSession[]> {
      return []
    }
    async updateSession(): Promise<PlannedSession> {
      throw new Error('not implemented')
    }
    async deleteSessionsFromWeek(): Promise<void> {}
  }

  const repo = new MockPlanRepo()
  Object.defineProperty(repo, 'lastUpdate', { get: () => lastUpdate })
  return repo as unknown as TrainingPlanRepository & { lastUpdate: Partial<TrainingPlan> | null }
}

test.group('ToggleAutoRecalibrate', () => {
  test('bascule autoRecalibrate de true à false', async ({ assert }) => {
    const planRepo = makePlanRepo(makePlan(true))
    const useCase = new ToggleAutoRecalibrate(planRepo)

    const result = await useCase.execute(1)

    assert.isFalse(result)
    assert.isFalse(planRepo.lastUpdate?.autoRecalibrate)
  })

  test('bascule autoRecalibrate de false à true', async ({ assert }) => {
    const planRepo = makePlanRepo(makePlan(false))
    const useCase = new ToggleAutoRecalibrate(planRepo)

    const result = await useCase.execute(1)

    assert.isTrue(result)
    assert.isTrue(planRepo.lastUpdate?.autoRecalibrate)
  })

  test('lève NoActivePlanError si pas de plan actif', async ({ assert }) => {
    const planRepo = makePlanRepo(null)
    const useCase = new ToggleAutoRecalibrate(planRepo)

    await assert.rejects(() => useCase.execute(1), NoActivePlanError)
  })
})
