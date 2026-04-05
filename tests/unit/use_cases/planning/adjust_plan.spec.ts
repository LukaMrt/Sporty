import { test } from '@japa/runner'
import AdjustPlan from '#use_cases/planning/adjust_plan'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import {
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  IntensityZone,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_PLAN: TrainingPlan = {
  id: 10,
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

const PLANNED_SESSION: PlannedSession = {
  id: 42,
  planId: 10,
  weekNumber: 1,
  dayOfWeek: 1,
  sessionType: SessionType.Easy,
  targetDurationMinutes: 50,
  targetDistanceKm: 9,
  targetPacePerKm: '6:00',
  intensityZone: IntensityZone.Z2,
  intervals: null,
  targetLoadTss: null,
  completedSessionId: null,
  status: PlannedSessionStatus.Pending,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makePlanRepo(opts: {
  session: PlannedSession | null
  activePlan: TrainingPlan | null
  updatedSession?: PlannedSession
}): TrainingPlanRepository {
  class MockPlanRepo extends TrainingPlanRepository {
    async create(): Promise<TrainingPlan> {
      throw new Error('not implemented')
    }
    async findById(): Promise<TrainingPlan | null> {
      return null
    }
    async findByUserId(): Promise<TrainingPlan[]> {
      return []
    }
    async findActiveByUserId(): Promise<TrainingPlan | null> {
      return opts.activePlan
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
      return opts.session
    }
    async findSessionsByPlanId(): Promise<PlannedSession[]> {
      return []
    }
    async updateSession(
      _id: number,
      data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
    ): Promise<PlannedSession> {
      return { ...(opts.updatedSession ?? PLANNED_SESSION), ...data }
    }
    async deleteSessionsFromWeek(): Promise<void> {}
  }
  return new MockPlanRepo()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('AdjustPlan', () => {
  test('déplace une séance sur un autre jour', async ({ assert }) => {
    const repo = makePlanRepo({ session: PLANNED_SESSION, activePlan: ACTIVE_PLAN })
    const useCase = new AdjustPlan(repo)

    const result = await useCase.execute({ userId: 1, sessionId: 42, dayOfWeek: 3 })

    assert.equal(result.dayOfWeek, 3)
  })

  test("modifie la durée et l'allure", async ({ assert }) => {
    const repo = makePlanRepo({ session: PLANNED_SESSION, activePlan: ACTIVE_PLAN })
    const useCase = new AdjustPlan(repo)

    const result = await useCase.execute({
      userId: 1,
      sessionId: 42,
      targetDurationMinutes: 60,
      targetPacePerKm: '5:45',
    })

    assert.equal(result.targetDurationMinutes, 60)
    assert.equal(result.targetPacePerKm, '5:45')
  })

  test('lève PlannedSessionNotFoundError si la séance est introuvable', async ({ assert }) => {
    const repo = makePlanRepo({ session: null, activePlan: ACTIVE_PLAN })
    const useCase = new AdjustPlan(repo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, sessionId: 99, dayOfWeek: 2 }),
      PlannedSessionNotFoundError
    )
  })

  test('lève PlannedSessionForbiddenError si aucun plan actif', async ({ assert }) => {
    const repo = makePlanRepo({ session: PLANNED_SESSION, activePlan: null })
    const useCase = new AdjustPlan(repo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, sessionId: 42, dayOfWeek: 2 }),
      PlannedSessionForbiddenError
    )
  })

  test('lève PlannedSessionForbiddenError si la séance appartient à un autre plan', async ({
    assert,
  }) => {
    const otherPlan: TrainingPlan = { ...ACTIVE_PLAN, id: 999 }
    const repo = makePlanRepo({ session: PLANNED_SESSION, activePlan: otherPlan })
    const useCase = new AdjustPlan(repo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, sessionId: 42, dayOfWeek: 2 }),
      PlannedSessionForbiddenError
    )
  })
})
