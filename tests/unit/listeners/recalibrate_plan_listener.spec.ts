import { test } from '@japa/runner'
import RecalibratePlanListener from '#listeners/recalibrate_plan_listener'
import RecalibratePlan from '#use_cases/planning/recalibrate_plan'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { PlanStatus, PlanType, TrainingMethodology } from '#domain/value_objects/planning_types'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { WeekSummary } from '#use_cases/planning/recalibrate_plan'

const PLAN: TrainingPlan = {
  id: 1,
  userId: 1,
  goalId: null,
  methodology: TrainingMethodology.Daniels,
  level: PlanType.Marathon,
  status: PlanStatus.Active,
  autoRecalibrate: true,
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
}

const WEEK_SUMMARY: WeekSummary = {
  weekNumber: 2,
  plannedLoadTss: 100,
  actualLoadTss: 120,
  qualitySessions: [],
}

function makePlanRepo(plan: TrainingPlan | null): TrainingPlanRepository {
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
    async update(): Promise<TrainingPlan> {
      return plan!
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
  return new MockPlanRepo()
}

function makeSessionRepo(): SessionRepository {
  class MockSessionRepo extends SessionRepository {
    async create(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return { data: [], meta: { page: 1, lastPage: 1, perPage: 100, total: 0 } }
    }
    async findById(): Promise<TrainingSession | null> {
      return null
    }
    async findByIdIncludingTrashed(): Promise<TrainingSession | null> {
      return null
    }
    async update(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findTrashedByUserId(): Promise<TrainingSession[]> {
      return []
    }
    async softDelete(): Promise<void> {}
    async restore(): Promise<void> {}
    async findByUserIdAndDateRange(): Promise<TrainingSession[]> {
      return []
    }
    async findByUserAndExternalIds(): Promise<{ externalId: string; id: number }[]> {
      return []
    }
    async forceDelete(): Promise<void> {}
  }
  return new MockSessionRepo()
}

function makeGoalRepo(): TrainingGoalRepository {
  class MockGoalRepo extends TrainingGoalRepository {
    async create(): ReturnType<TrainingGoalRepository['create']> {
      throw new Error('not implemented')
    }
    async findById(): ReturnType<TrainingGoalRepository['findById']> {
      return null
    }
    async findByUserId(): ReturnType<TrainingGoalRepository['findByUserId']> {
      return []
    }
    async findActiveByUserId(): ReturnType<TrainingGoalRepository['findActiveByUserId']> {
      return null
    }
    async update(): ReturnType<TrainingGoalRepository['update']> {
      throw new Error('not implemented')
    }
    async delete(): Promise<void> {}
  }
  return new MockGoalRepo()
}

function makePlanEngine(): TrainingPlanEngine {
  const EMPTY_PLAN: GeneratedPlan = {
    weeks: [],
    methodology: TrainingMethodology.Daniels,
    totalWeeks: 0,
  }
  class MockPlanEngine extends TrainingPlanEngine {
    generatePlan() {
      return EMPTY_PLAN
    }
    recalibrate() {
      return EMPTY_PLAN
    }
    generateMaintenancePlan() {
      return EMPTY_PLAN
    }
    generateTransitionPlan() {
      return EMPTY_PLAN
    }
  }
  return new MockPlanEngine()
}

function makeEventEmitter(): EventEmitter {
  class MockEventEmitter extends EventEmitter {
    async emit(): Promise<void> {}
  }
  return new MockEventEmitter()
}

test.group('RecalibratePlanListener', () => {
  test('délègue au use case RecalibratePlan', async ({ assert }) => {
    let executeCalled = false
    const planRepo = makePlanRepo(PLAN)
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    useCase.execute = async () => {
      executeCalled = true
    }

    const listener = new RecalibratePlanListener(useCase)
    await listener.handle({ userId: 1, planId: 1, weekSummary: WEEK_SUMMARY })

    assert.isTrue(executeCalled)
  })
})
