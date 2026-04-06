import { test } from '@japa/runner'
import ResumeFromInactivity from '#use_cases/planning/resume_from_inactivity'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import {
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  IntensityZone,
  TrainingMethodology,
} from '#domain/value_objects/planning_types'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { RecalibrationContext } from '#domain/value_objects/recalibration_context'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

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
  startDate,
  endDate: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  lastRecalibratedAt: null,
  pendingVdotDown: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const GOAL: TrainingGoal = {
  id: 1,
  userId: 1,
  targetDistanceKm: 42,
  targetTimeMinutes: null,
  eventDate: null,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function makeWeeks(count: number): PlannedWeek[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    planId: 1,
    weekNumber: i + 1,
    phaseName: 'FI',
    phaseLabel: 'Fondation',
    isRecoveryWeek: false,
    targetVolumeMinutes: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

function makeSession(weekNumber: number, dayOfWeek: number): PlannedSession {
  return {
    id: weekNumber * 10 + dayOfWeek,
    planId: 1,
    weekNumber,
    dayOfWeek,
    sessionType: SessionType.Easy,
    targetDurationMinutes: 45,
    targetDistanceKm: 8,
    targetPacePerKm: '5:30',
    intensityZone: IntensityZone.Z2,
    intervals: null,
    targetLoadTss: 50,
    completedSessionId: null,
    status: PlannedSessionStatus.Pending,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makePlanRepo(
  plan: TrainingPlan | null,
  weeks: PlannedWeek[] = [],
  sessions: PlannedSession[] = []
): TrainingPlanRepository & {
  updatedWith: Partial<TrainingPlan> | null
  deletedFromWeek: number | null
} {
  let updatedWith: Partial<TrainingPlan> | null = null
  let deletedFromWeek: number | null = null

  class MockPlanRepo extends TrainingPlanRepository {
    async create(): Promise<TrainingPlan> {
      throw new Error('not impl')
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
    async update(_id: number, data: Partial<TrainingPlan>): Promise<TrainingPlan> {
      updatedWith = data
      return { ...plan!, ...data }
    }
    async delete(): Promise<void> {}
    async createWeek(): Promise<PlannedWeek> {
      throw new Error('not impl')
    }
    async findWeeksByPlanId(): Promise<PlannedWeek[]> {
      return weeks
    }
    async createSession(): Promise<PlannedSession> {
      return makeSession(1, 1)
    }
    async findSessionById(): Promise<PlannedSession | null> {
      return null
    }
    async findSessionsByPlanId(): Promise<PlannedSession[]> {
      return sessions
    }
    async updateSession(): Promise<PlannedSession> {
      return makeSession(1, 1)
    }
    async deleteSessionsFromWeek(_planId: number, fromWeek: number): Promise<void> {
      deletedFromWeek = fromWeek
    }
  }

  const repo = new MockPlanRepo() as unknown as TrainingPlanRepository & {
    updatedWith: Partial<TrainingPlan> | null
    deletedFromWeek: number | null
  }
  Object.defineProperty(repo, 'updatedWith', { get: () => updatedWith })
  Object.defineProperty(repo, 'deletedFromWeek', { get: () => deletedFromWeek })
  return repo
}

function makeGoalRepo(goal: TrainingGoal | null): TrainingGoalRepository {
  class MockGoalRepo extends TrainingGoalRepository {
    async create(): Promise<TrainingGoal> {
      throw new Error('not impl')
    }
    async findById(): Promise<TrainingGoal | null> {
      return goal
    }
    async findByUserId(): Promise<TrainingGoal[]> {
      return []
    }
    async findActiveByUserId(): Promise<TrainingGoal | null> {
      return goal
    }
    async update(): Promise<TrainingGoal> {
      throw new Error('not impl')
    }
    async delete(): Promise<void> {}
  }
  return new MockGoalRepo()
}

function makeEngine(): TrainingPlanEngine {
  class MockEngine extends TrainingPlanEngine {
    generatePlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    generateMaintenancePlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    generateTransitionPlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    recalibrate(ctx: RecalibrationContext): GeneratedPlan {
      return {
        methodology: TrainingMethodology.Daniels,
        totalWeeks: ctx.remainingWeeks.length,
        weeks: ctx.remainingWeeks.map((w) => ({
          ...w,
          sessions: w.sessions,
        })),
      }
    }
  }
  return new MockEngine()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('ResumeFromInactivity', () => {
  test('ne fait rien si aucun plan actif', async ({ assert }) => {
    const planRepo = makePlanRepo(null)
    const useCase = new ResumeFromInactivity(planRepo, makeGoalRepo(null), makeEngine())
    await useCase.execute(1, 20)
    assert.isNull(planRepo.updatedWith)
  })

  test("réduit le VDOT selon la durée d'inactivité (14 jours → ~3%)", async ({ assert }) => {
    const weeks = makeWeeks(4)
    const sessions = [makeSession(2, 1), makeSession(3, 3)]
    const planRepo = makePlanRepo(ACTIVE_PLAN, weeks, sessions)

    const useCase = new ResumeFromInactivity(planRepo, makeGoalRepo(GOAL), makeEngine())
    await useCase.execute(1, 14)

    assert.isNotNull(planRepo.updatedWith)
    const newVdot = planRepo.updatedWith!.currentVdot!
    assert.isBelow(newVdot, ACTIVE_PLAN.currentVdot)
    assert.isAbove(newVdot, 40) // réduction raisonnable
  })

  test("réduit le VDOT de ~7% après 28 jours d'inactivité", async ({ assert }) => {
    const weeks = makeWeeks(4)
    const sessions = [makeSession(2, 1)]
    const planRepo = makePlanRepo(ACTIVE_PLAN, weeks, sessions)

    const useCase = new ResumeFromInactivity(planRepo, makeGoalRepo(GOAL), makeEngine())
    await useCase.execute(1, 28)

    const newVdot = planRepo.updatedWith!.currentVdot!
    const expectedMax = ACTIVE_PLAN.currentVdot * 0.94 // au plus -6%
    const expectedMin = ACTIVE_PLAN.currentVdot * 0.92 // au moins -8%
    assert.isBelow(newVdot, expectedMax + 1)
    assert.isAbove(newVdot, expectedMin - 1)
  })

  test('supprime et recrée les séances futures', async ({ assert }) => {
    const weeks = makeWeeks(4)
    const sessions = [makeSession(2, 1), makeSession(3, 3)]
    const planRepo = makePlanRepo(ACTIVE_PLAN, weeks, sessions)

    const useCase = new ResumeFromInactivity(planRepo, makeGoalRepo(GOAL), makeEngine())
    await useCase.execute(1, 20)

    assert.isNotNull(planRepo.deletedFromWeek)
    assert.isNotNull(planRepo.updatedWith?.lastRecalibratedAt)
  })

  test('ne fait rien si aucune semaine future', async ({ assert }) => {
    const shortPlan = { ...ACTIVE_PLAN }
    const planRepo = makePlanRepo(shortPlan, makeWeeks(2), [makeSession(1, 1)])

    const useCase = new ResumeFromInactivity(planRepo, makeGoalRepo(GOAL), makeEngine())
    await useCase.execute(1, 20)

    // Plan de 2 semaines démarré il y a 14 jours → semaine courante ≥ 2, pas de semaine future
    assert.isNull(planRepo.deletedFromWeek)
  })
})
