import { test } from '@japa/runner'
import GetPlanHistory from '#use_cases/planning/get_plan_history'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingGoal } from '#domain/entities/training_goal'
import {
  TrainingMethodology,
  PlanType,
  PlanStatus,
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<TrainingPlan>): TrainingPlan {
  return {
    id: 1,
    userId: 1,
    goalId: null,
    methodology: TrainingMethodology.Daniels,
    level: PlanType.Marathon,
    status: PlanStatus.Completed,
    autoRecalibrate: false,
    vdotAtCreation: 45,
    currentVdot: 47,
    sessionsPerWeek: 4,
    preferredDays: [1, 3, 5, 6],
    startDate: '2025-01-01',
    endDate: '2025-04-01',
    lastRecalibratedAt: null,
    pendingVdotDown: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-04-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSession(overrides: Partial<PlannedSession>): PlannedSession {
  return {
    id: 1,
    planId: 1,
    weekNumber: 1,
    dayOfWeek: 1,
    sessionType: SessionType.Easy,
    targetDurationMinutes: 40,
    targetDistanceKm: null,
    targetPacePerKm: null,
    intensityZone: IntensityZone.Z2,
    intervals: null,
    targetLoadTss: null,
    completedSessionId: null,
    status: PlannedSessionStatus.Pending,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makePlanRepo(plans: TrainingPlan[], sessions: PlannedSession[]): TrainingPlanRepository {
  class MockPlanRepo extends TrainingPlanRepository {
    async create(): Promise<TrainingPlan> {
      throw new Error('not implemented')
    }
    async findById(): Promise<TrainingPlan | null> {
      return null
    }
    async findByUserId(): Promise<TrainingPlan[]> {
      return plans
    }
    async findActiveByUserId(): Promise<TrainingPlan | null> {
      return null
    }
    async findActiveByGoalId(): Promise<TrainingPlan | null> {
      return null
    }
    async update(): Promise<TrainingPlan> {
      throw new Error('not implemented')
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
    async findSessionsByPlanId(_planId: number): Promise<PlannedSession[]> {
      return sessions.filter((s) => s.planId === _planId)
    }
    async updateSession(): Promise<PlannedSession> {
      throw new Error('not implemented')
    }
    async deleteSessionsFromWeek(): Promise<void> {}
  }
  return new MockPlanRepo()
}

function makeGoalRepo(goal: TrainingGoal | null): TrainingGoalRepository {
  class MockGoalRepo extends TrainingGoalRepository {
    async create(): Promise<TrainingGoal> {
      throw new Error('not implemented')
    }
    async findById(): Promise<TrainingGoal | null> {
      return goal
    }
    async findByUserId(): Promise<TrainingGoal[]> {
      return []
    }
    async findActiveByUserId(): Promise<TrainingGoal | null> {
      return null
    }
    async update(): Promise<TrainingGoal> {
      throw new Error('not implemented')
    }
    async delete(): Promise<void> {}
  }
  return new MockGoalRepo()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('GetPlanHistory', () => {
  test('retourne vide si aucun plan archivé', async ({ assert }) => {
    const activePlan = makePlan({ status: PlanStatus.Active })
    const planRepo = makePlanRepo([activePlan], [])
    const goalRepo = makeGoalRepo(null)
    const useCase = new GetPlanHistory(planRepo, goalRepo)

    const result = await useCase.execute(1)

    assert.deepEqual(result, [])
  })

  test('retourne les plans completed et abandoned, pas les actifs', async ({ assert }) => {
    const completed = makePlan({ id: 1, status: PlanStatus.Completed, endDate: '2025-04-01' })
    const abandoned = makePlan({ id: 2, status: PlanStatus.Abandoned, endDate: '2025-02-01' })
    const active = makePlan({ id: 3, status: PlanStatus.Active })
    const planRepo = makePlanRepo([completed, abandoned, active], [])
    const goalRepo = makeGoalRepo(null)
    const useCase = new GetPlanHistory(planRepo, goalRepo)

    const result = await useCase.execute(1)

    assert.lengthOf(result, 2)
    assert.ok(result.every((e) => e.plan.status !== PlanStatus.Active))
  })

  test('trie les plans par date de fin décroissante', async ({ assert }) => {
    const older = makePlan({ id: 1, status: PlanStatus.Completed, endDate: '2025-01-01' })
    const newer = makePlan({ id: 2, status: PlanStatus.Completed, endDate: '2025-06-01' })
    const planRepo = makePlanRepo([older, newer], [])
    const goalRepo = makeGoalRepo(null)
    const useCase = new GetPlanHistory(planRepo, goalRepo)

    const result = await useCase.execute(1)

    assert.equal(result[0].plan.id, 2)
    assert.equal(result[1].plan.id, 1)
  })

  test('calcule le taux de completion (hors séances repos)', async ({ assert }) => {
    const plan = makePlan({ id: 1, status: PlanStatus.Completed })
    const sessions = [
      makeSession({ id: 1, planId: 1, status: PlannedSessionStatus.Completed }),
      makeSession({ id: 2, planId: 1, status: PlannedSessionStatus.Skipped }),
      makeSession({ id: 3, planId: 1, status: PlannedSessionStatus.Pending }),
      makeSession({ id: 4, planId: 1, sessionType: SessionType.Rest }), // exclue
    ]
    const planRepo = makePlanRepo([plan], sessions)
    const goalRepo = makeGoalRepo(null)
    const useCase = new GetPlanHistory(planRepo, goalRepo)

    const result = await useCase.execute(1)

    assert.equal(result[0].completedSessionsCount, 1)
    assert.equal(result[0].totalSessionsCount, 3)
  })

  test('résout la distance objectif depuis le goalId', async ({ assert }) => {
    const goal: TrainingGoal = {
      id: 10,
      userId: 1,
      targetDistanceKm: 42,
      targetTimeMinutes: null,
      eventDate: null,
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }
    const plan = makePlan({ id: 1, status: PlanStatus.Completed, goalId: 10 })
    const planRepo = makePlanRepo([plan], [])
    const goalRepo = makeGoalRepo(goal)
    const useCase = new GetPlanHistory(planRepo, goalRepo)

    const result = await useCase.execute(1)

    assert.equal(result[0].goalDistanceKm, 42)
  })

  test('goalDistanceKm est null si plan sans objectif (maintenance)', async ({ assert }) => {
    const plan = makePlan({ id: 1, status: PlanStatus.Completed, goalId: null })
    const planRepo = makePlanRepo([plan], [])
    const goalRepo = makeGoalRepo(null)
    const useCase = new GetPlanHistory(planRepo, goalRepo)

    const result = await useCase.execute(1)

    assert.isNull(result[0].goalDistanceKm)
  })
})
