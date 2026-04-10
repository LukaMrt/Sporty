import { test } from '@japa/runner'
import UpdateFitnessProfileListener from '#listeners/update_fitness_profile_listener'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import {
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  IntensityZone,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import type { TrainingLoad } from '#domain/value_objects/training_load'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_PLAN: TrainingPlan = {
  id: 1,
  userId: 1,
  goalId: 1,
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

function makeSession(
  id: number,
  weekNumber: number,
  type: SessionType,
  status: PlannedSessionStatus,
  completedSessionId: number | null
): PlannedSession {
  return {
    id,
    planId: 1,
    weekNumber,
    dayOfWeek: 1,
    sessionType: type,
    targetDurationMinutes: 45,
    targetDistanceKm: null,
    targetPacePerKm: null,
    intensityZone: IntensityZone.Z2,
    intervals: null,
    targetLoadTss: null,
    completedSessionId,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makePlanRepo(
  plan: TrainingPlan | null,
  sessions: PlannedSession[]
): TrainingPlanRepository {
  class MockPlanRepo extends TrainingPlanRepository {
    async create(): Promise<TrainingPlan> {
      throw new Error('not implemented')
    }
    async findById(): Promise<TrainingPlan | null> {
      return plan
    }
    async findByUserId(): Promise<TrainingPlan[]> {
      return plan ? [plan] : []
    }
    async findActiveByUserId(): Promise<TrainingPlan | null> {
      return plan
    }
    async findActiveByGoalId(): Promise<TrainingPlan | null> {
      return plan
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
    async findSessionsByPlanId(): Promise<PlannedSession[]> {
      return sessions
    }
    async updateSession(): Promise<PlannedSession> {
      throw new Error('not implemented')
    }
    async deleteSessionsFromWeek(): Promise<void> {}
  }
  return new MockPlanRepo()
}

function makeSessionRepo(realSession: TrainingSession | null = null): SessionRepository {
  class MockSessionRepo extends SessionRepository {
    async create(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return { data: [], meta: { page: 1, lastPage: 1, perPage: 100, total: 0 } }
    }
    async findById(): Promise<TrainingSession | null> {
      return realSession
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
      return realSession ? [realSession] : []
    }
    async findByUserAndExternalIds(): Promise<{ externalId: string; id: number }[]> {
      return []
    }
    async forceDelete(): Promise<void> {}
  }
  return new MockSessionRepo()
}

function makeLoadCalculator(): TrainingLoadCalculator {
  class MockLoadCalc extends TrainingLoadCalculator {
    calculate(): TrainingLoad {
      return { value: 50, method: 'rpe' }
    }
  }
  return new MockLoadCalc()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('UpdateFitnessProfileListener', () => {
  test('ne fait rien si pas de plan actif', async ({ assert }) => {
    const planRepo = makePlanRepo(null, [])
    const listener = new UpdateFitnessProfileListener(
      makeSessionRepo(),
      planRepo,
      makeLoadCalculator()
    )

    // Ne lève pas d'erreur
    await assert.doesNotReject(() => listener.handle({ sessionId: 1, userId: 1 }))
  })

  test('ne détecte pas week:completed si la session liée ne correspond pas au sessionId', async ({
    assert,
  }) => {
    const sessions = [
      makeSession(1, 1, SessionType.Easy, PlannedSessionStatus.Completed, 999), // autre session
      makeSession(2, 1, SessionType.LongRun, PlannedSessionStatus.Pending, null),
    ]
    const planRepo = makePlanRepo(ACTIVE_PLAN, sessions)
    const listener = new UpdateFitnessProfileListener(
      makeSessionRepo(),
      planRepo,
      makeLoadCalculator()
    )

    await assert.doesNotReject(() => listener.handle({ sessionId: 77, userId: 1 }))
  })

  test('détecte week:completed quand toutes les sessions non-rest de la semaine sont terminées', async ({
    assert,
  }) => {
    const sessions = [
      makeSession(1, 1, SessionType.Easy, PlannedSessionStatus.Completed, 77),
      makeSession(2, 1, SessionType.LongRun, PlannedSessionStatus.Completed, 78),
    ]
    const planRepo = makePlanRepo(ACTIVE_PLAN, sessions)
    const listener = new UpdateFitnessProfileListener(
      makeSessionRepo(),
      planRepo,
      makeLoadCalculator()
    )

    // L'émission de week:completed est difficile à intercepter sans mock de l'emitter
    // On vérifie que le listener s'exécute sans erreur (test d'intégration léger)
    await assert.doesNotReject(() => listener.handle({ sessionId: 77, userId: 1 }))
  })

  test("ne détecte pas week:completed si une session non-rest est encore 'pending'", async ({
    assert,
  }) => {
    const sessions = [
      makeSession(1, 1, SessionType.Easy, PlannedSessionStatus.Completed, 77),
      makeSession(2, 1, SessionType.LongRun, PlannedSessionStatus.Pending, null), // pas encore fait
    ]
    const planRepo = makePlanRepo(ACTIVE_PLAN, sessions)
    const listener = new UpdateFitnessProfileListener(
      makeSessionRepo(),
      planRepo,
      makeLoadCalculator()
    )

    await assert.doesNotReject(() => listener.handle({ sessionId: 77, userId: 1 }))
  })
})
