import { test } from '@japa/runner'
import LinkCompletedSession from '#use_cases/planning/link_completed_session'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
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
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

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

const COMPLETED_SESSION: TrainingSession = {
  id: 77,
  userId: 1,
  sportId: 1,
  sportName: 'Course à pied',
  date: '2026-03-24',
  durationMinutes: 52,
  distanceKm: 9.2,
  avgHeartRate: 148,
  perceivedEffort: 6,
  sportMetrics: {},
  notes: null,
  createdAt: new Date().toISOString(),
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makePlanRepo(opts: {
  session: PlannedSession | null
  activePlan: TrainingPlan | null
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
      return { ...PLANNED_SESSION, ...data }
    }
    async deleteSessionsFromWeek(): Promise<void> {}
  }
  return new MockPlanRepo()
}

function makeSessionRepo(completedSession: TrainingSession | null): SessionRepository {
  class MockSessionRepo extends SessionRepository {
    async create(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return { data: [], meta: { page: 1, lastPage: 1, perPage: 100, total: 0 } }
    }
    async findById(): Promise<TrainingSession | null> {
      return completedSession
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

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('LinkCompletedSession', () => {
  test('lie une séance réalisée et passe le statut à completed', async ({ assert }) => {
    const planRepo = makePlanRepo({ session: PLANNED_SESSION, activePlan: ACTIVE_PLAN })
    const sessionRepo = makeSessionRepo(COMPLETED_SESSION)
    const useCase = new LinkCompletedSession(planRepo, sessionRepo)

    const result = await useCase.execute({
      userId: 1,
      plannedSessionId: 42,
      completedSessionId: 77,
    })

    assert.equal(result.completedSessionId, 77)
    assert.equal(result.status, PlannedSessionStatus.Completed)
  })

  test('lève PlannedSessionNotFoundError si la séance planifiée est introuvable', async ({
    assert,
  }) => {
    const planRepo = makePlanRepo({ session: null, activePlan: ACTIVE_PLAN })
    const sessionRepo = makeSessionRepo(COMPLETED_SESSION)
    const useCase = new LinkCompletedSession(planRepo, sessionRepo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, plannedSessionId: 99, completedSessionId: 77 }),
      PlannedSessionNotFoundError
    )
  })

  test('lève PlannedSessionForbiddenError si la séance appartient à un autre plan', async ({
    assert,
  }) => {
    const otherPlan: TrainingPlan = { ...ACTIVE_PLAN, id: 999 }
    const planRepo = makePlanRepo({ session: PLANNED_SESSION, activePlan: otherPlan })
    const sessionRepo = makeSessionRepo(COMPLETED_SESSION)
    const useCase = new LinkCompletedSession(planRepo, sessionRepo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, plannedSessionId: 42, completedSessionId: 77 }),
      PlannedSessionForbiddenError
    )
  })

  test('lève SessionNotFoundError si la séance réalisée est introuvable', async ({ assert }) => {
    const planRepo = makePlanRepo({ session: PLANNED_SESSION, activePlan: ACTIVE_PLAN })
    const sessionRepo = makeSessionRepo(null)
    const useCase = new LinkCompletedSession(planRepo, sessionRepo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, plannedSessionId: 42, completedSessionId: 999 }),
      SessionNotFoundError
    )
  })

  test('lève SessionNotFoundError si la séance réalisée appartient à un autre user', async ({
    assert,
  }) => {
    const otherUserSession: TrainingSession = { ...COMPLETED_SESSION, userId: 2 }
    const planRepo = makePlanRepo({ session: PLANNED_SESSION, activePlan: ACTIVE_PLAN })
    const sessionRepo = makeSessionRepo(otherUserSession)
    const useCase = new LinkCompletedSession(planRepo, sessionRepo)

    await assert.rejects(
      () => useCase.execute({ userId: 1, plannedSessionId: 42, completedSessionId: 77 }),
      SessionNotFoundError
    )
  })
})
