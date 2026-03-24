import { test } from '@japa/runner'
import GetNextSession from '#use_cases/planning/get_next_session'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import {
  TrainingMethodology,
  PlanType,
  PlanStatus,
  IntensityZone,
  SessionType,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

const BASE_PLAN: TrainingPlan = {
  id: 1,
  userId: 1,
  goalId: null,
  methodology: TrainingMethodology.Daniels,
  level: PlanType.Marathon,
  status: PlanStatus.Active,
  autoRecalibrate: false,
  vdotAtCreation: 45,
  currentVdot: 45,
  sessionsPerWeek: 4,
  preferredDays: [1, 3, 5, 6],
  startDate: isoDate(new Date()),
  endDate: dateOffset(84),
  lastRecalibratedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function makeSession(overrides: Partial<PlannedSession>): PlannedSession {
  return {
    id: 1,
    planId: 1,
    weekNumber: 1,
    dayOfWeek: new Date().getDay(), // today by default
    sessionType: SessionType.Easy,
    targetDurationMinutes: 45,
    targetDistanceKm: null,
    targetPacePerKm: '5:30',
    intensityZone: IntensityZone.Z2,
    intervals: null,
    targetLoadTss: null,
    completedSessionId: null,
    status: PlannedSessionStatus.Pending,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makePlanRepo(
  plan: TrainingPlan | null,
  sessions: PlannedSession[]
): TrainingPlanRepository {
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
      return plan
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
    async findSessionsByPlanId(): Promise<PlannedSession[]> {
      return sessions
    }
    async updateSession(): Promise<PlannedSession> {
      throw new Error('not implemented')
    }
  }
  return new MockPlanRepo()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.group('GetNextSession', () => {
  test('returns null when no active plan', async ({ assert }) => {
    const uc = new GetNextSession(makePlanRepo(null, []))
    const result = await uc.execute(1)
    assert.isNull(result)
  })

  test('returns plan_completed when plan status is completed', async ({ assert }) => {
    const plan = { ...BASE_PLAN, status: PlanStatus.Completed }
    const uc = new GetNextSession(makePlanRepo(plan, []))
    const result = await uc.execute(1)
    assert.deepEqual(result, { state: 'plan_completed' })
  })

  test('returns plan_completed when all sessions are past or done', async ({ assert }) => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const session = makeSession({
      dayOfWeek: yesterday.getDay(),
      status: PlannedSessionStatus.Completed,
    })
    const uc = new GetNextSession(makePlanRepo(BASE_PLAN, [session]))
    const result = await uc.execute(1)
    assert.deepEqual(result, { state: 'plan_completed' })
  })

  test('returns upcoming with isToday=true when pending session is today', async ({ assert }) => {
    const todayDow = new Date().getDay()
    const session = makeSession({ dayOfWeek: todayDow })
    const uc = new GetNextSession(makePlanRepo(BASE_PLAN, [session]))
    const result = await uc.execute(1)
    assert.equal(result?.state, 'upcoming')
    if (result?.state === 'upcoming') {
      assert.isTrue(result.isToday)
      assert.equal(result.date, isoDate(new Date()))
    }
  })

  test('returns rest_today when no session today but future session exists', async ({ assert }) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const session = makeSession({ weekNumber: 1, dayOfWeek: tomorrow.getDay() })
    // Ensure startDate puts week 1 at a date where tomorrow works
    const plan = { ...BASE_PLAN, startDate: isoDate(new Date()) }
    const uc = new GetNextSession(makePlanRepo(plan, [session]))
    const result = await uc.execute(1)
    assert.equal(result?.state, 'rest_today')
    if (result?.state === 'rest_today') {
      assert.equal(result.nextDate, isoDate(tomorrow))
    }
  })

  test('skips rest-type sessions when finding next session', async ({ assert }) => {
    const todayDow = new Date().getDay()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const restSession = makeSession({ dayOfWeek: todayDow, sessionType: SessionType.Rest })
    const realSession = makeSession({
      id: 2,
      dayOfWeek: tomorrow.getDay(),
      sessionType: SessionType.Easy,
    })
    const uc = new GetNextSession(makePlanRepo(BASE_PLAN, [restSession, realSession]))
    const result = await uc.execute(1)
    // Today has only a rest session → treat as rest day
    assert.equal(result?.state, 'rest_today')
  })
})
