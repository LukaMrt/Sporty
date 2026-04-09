import { test } from '@japa/runner'
import GenerateTransitionPlan from '#use_cases/planning/generate_transition_plan'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import {
  TrainingMethodology,
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  SessionType,
  IntensityZone,
  TrainingState,
} from '#domain/value_objects/planning_types'
import { NoCompletedPlanError } from '#domain/errors/no_completed_plan_error'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { TransitionPlanRequest } from '#domain/value_objects/transition_plan_request'
import { UserLevel } from '#domain/entities/user_profile'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COMPLETED_PLAN: TrainingPlan = {
  id: 1,
  userId: 1,
  goalId: 10,
  methodology: TrainingMethodology.Daniels,
  level: PlanType.Marathon,
  status: PlanStatus.Completed,
  autoRecalibrate: false,
  vdotAtCreation: 45,
  currentVdot: 46,
  sessionsPerWeek: 4,
  preferredDays: [1, 3, 5, 6],
  startDate: '2026-01-01',
  endDate: '2026-03-01',
  lastRecalibratedAt: null,
  pendingVdotDown: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const GOAL: TrainingGoal = {
  id: 10,
  userId: 1,
  targetDistanceKm: 42.195,
  targetTimeMinutes: null,
  eventDate: '2026-03-01',
  status: 'achieved',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const USER_PROFILE: UserProfile = {
  id: 1,
  userId: 1,
  sportId: 1,
  level: UserLevel.Intermediate,
  objective: null,
  preferences: {} as never,
  maxHeartRate: null,
  restingHeartRate: null,
  vma: null,
  sex: null,
  trainingState: TrainingState.Preparation,
}

function makeWeeks(count: number, volumeMinutes = 300): PlannedWeek[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    planId: 1,
    weekNumber: i + 1,
    phaseName: 'FQ',
    phaseLabel: 'Affûtage',
    isRecoveryWeek: false,
    targetVolumeMinutes: volumeMinutes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makePlanRepo(
  plans: TrainingPlan[] = [],
  weeks: PlannedWeek[] = []
): TrainingPlanRepository & {
  createdPlans: TrainingPlan[]
  updatedWith: Record<number, Partial<TrainingPlan>>
} {
  const createdPlans: TrainingPlan[] = []
  const updatedWith: Record<number, Partial<TrainingPlan>> = {}

  class MockPlanRepo extends TrainingPlanRepository {
    async create(
      data: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<TrainingPlan> {
      const plan: TrainingPlan = {
        ...data,
        id: 99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      createdPlans.push(plan)
      return plan
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
    async update(id: number, data: Partial<TrainingPlan>): Promise<TrainingPlan> {
      updatedWith[id] = data
      return { ...plans[0], ...data }
    }
    async delete(): Promise<void> {}
    async createWeek(): Promise<PlannedWeek> {
      return {
        id: 1,
        planId: 99,
        weekNumber: 1,
        phaseName: 'TRANS',
        phaseLabel: 'Transition',
        isRecoveryWeek: false,
        targetVolumeMinutes: 150,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    async findWeeksByPlanId(): Promise<PlannedWeek[]> {
      return weeks
    }
    async createSession(): Promise<PlannedSession> {
      return {
        id: 1,
        planId: 99,
        weekNumber: 1,
        dayOfWeek: 1,
        sessionType: SessionType.Easy,
        targetDurationMinutes: 45,
        targetDistanceKm: null,
        targetPacePerKm: '6:00',
        intensityZone: IntensityZone.Z2,
        intervals: null,
        targetLoadTss: null,
        completedSessionId: null,
        status: PlannedSessionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    async findSessionById(): Promise<PlannedSession | null> {
      return null
    }
    async findSessionsByPlanId(): Promise<PlannedSession[]> {
      return []
    }
    async updateSession(): Promise<PlannedSession> {
      throw new Error('not impl')
    }
    async deleteSessionsFromWeek(): Promise<void> {}
  }

  const repo = new MockPlanRepo() as unknown as TrainingPlanRepository & {
    createdPlans: TrainingPlan[]
    updatedWith: Record<number, Partial<TrainingPlan>>
  }
  Object.defineProperty(repo, 'createdPlans', { get: () => createdPlans })
  Object.defineProperty(repo, 'updatedWith', { get: () => updatedWith })
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
      return goal ? [goal] : []
    }
    async findActiveByUserId(): Promise<TrainingGoal | null> {
      return null
    }
    async update(): Promise<TrainingGoal> {
      throw new Error('not impl')
    }
    async delete(): Promise<void> {}
  }
  return new MockGoalRepo()
}

function makeUserProfileRepo(
  profile: UserProfile
): UserProfileRepository & { updatedTrainingState: TrainingState | null } {
  let updatedTrainingState: TrainingState | null = null

  class MockProfileRepo extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not impl')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return profile
    }
    async update(_userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
      if (data.trainingState !== undefined) {
        updatedTrainingState = data.trainingState
      }
      return { ...profile, ...data }
    }
  }

  const repo = new MockProfileRepo() as unknown as UserProfileRepository & {
    updatedTrainingState: TrainingState | null
  }
  Object.defineProperty(repo, 'updatedTrainingState', { get: () => updatedTrainingState })
  return repo
}

function makeEngine(
  totalWeeks = 4
): TrainingPlanEngine & { capturedRequest: TransitionPlanRequest | null } {
  let capturedRequest: TransitionPlanRequest | null = null

  class MockEngine extends TrainingPlanEngine {
    generatePlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    recalibrate(): GeneratedPlan {
      throw new Error('not impl')
    }
    generateMaintenancePlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    generateTransitionPlan(req: TransitionPlanRequest): GeneratedPlan {
      capturedRequest = req
      return {
        methodology: TrainingMethodology.Daniels,
        totalWeeks,
        weeks: Array.from({ length: totalWeeks }, (_, i) => ({
          weekNumber: i + 1,
          phaseName: 'TRANS',
          isRecoveryWeek: false,
          targetVolumeMinutes: 150,
          sessions: [],
        })),
      }
    }
  }

  const engine = new MockEngine() as unknown as TrainingPlanEngine & {
    capturedRequest: TransitionPlanRequest | null
  }
  Object.defineProperty(engine, 'capturedRequest', { get: () => capturedRequest })
  return engine
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('GenerateTransitionPlan', () => {
  test('lève NoCompletedPlanError si aucun plan terminé', async ({ assert }) => {
    const planRepo = makePlanRepo([])
    const useCase = new GenerateTransitionPlan(
      planRepo,
      makeGoalRepo(null),
      makeUserProfileRepo(USER_PROFILE),
      makeEngine()
    )
    await assert.rejects(() => useCase.execute(1), NoCompletedPlanError)
  })

  test('crée un nouveau plan de transition actif', async ({ assert }) => {
    const weeks = makeWeeks(12, 300)
    const planRepo = makePlanRepo([COMPLETED_PLAN], weeks)
    const profileRepo = makeUserProfileRepo(USER_PROFILE)

    const useCase = new GenerateTransitionPlan(
      planRepo,
      makeGoalRepo(GOAL),
      profileRepo,
      makeEngine(4)
    )
    const result = await useCase.execute(1)

    assert.equal(result.plan.status, PlanStatus.Active)
    assert.equal(result.plan.userId, 1)
    assert.isTrue(planRepo.createdPlans.length > 0)
  })

  test('passe la distance de la course au moteur', async ({ assert }) => {
    const weeks = makeWeeks(12, 300)
    const planRepo = makePlanRepo([COMPLETED_PLAN], weeks)
    const engine = makeEngine(4)

    const useCase = new GenerateTransitionPlan(
      planRepo,
      makeGoalRepo(GOAL),
      makeUserProfileRepo(USER_PROFILE),
      engine
    )
    await useCase.execute(1)

    assert.equal(engine.capturedRequest?.raceDistanceKm, 42.195)
  })

  test('utilise le volume pic des semaines non-récupération', async ({ assert }) => {
    const weeks: PlannedWeek[] = [
      ...makeWeeks(3, 300),
      {
        id: 4,
        planId: 1,
        weekNumber: 4,
        phaseName: 'FI',
        phaseLabel: 'Fondation',
        isRecoveryWeek: true,
        targetVolumeMinutes: 200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const planRepo = makePlanRepo([COMPLETED_PLAN], weeks)
    const engine = makeEngine(4)

    const useCase = new GenerateTransitionPlan(
      planRepo,
      makeGoalRepo(GOAL),
      makeUserProfileRepo(USER_PROFILE),
      engine
    )
    await useCase.execute(1)

    // Le volume pic doit être 300 (non-récup), pas 200 (récup)
    assert.equal(engine.capturedRequest?.previousPeakVolumeMinutes, 300)
  })

  test('met le trainingState à Transition', async ({ assert }) => {
    const weeks = makeWeeks(4, 300)
    const planRepo = makePlanRepo([COMPLETED_PLAN], weeks)
    const profileRepo = makeUserProfileRepo(USER_PROFILE)

    const useCase = new GenerateTransitionPlan(
      planRepo,
      makeGoalRepo(GOAL),
      profileRepo,
      makeEngine(4)
    )
    await useCase.execute(1)

    assert.equal(profileRepo.updatedTrainingState, TrainingState.Transition)
  })
})
