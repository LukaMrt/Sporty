import { test } from '@japa/runner'
import GenerateMaintenancePlan from '#use_cases/planning/generate_maintenance_plan'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
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
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { MaintenancePlanRequest } from '#domain/value_objects/maintenance_plan_request'
import { UserLevel } from '#domain/entities/user_profile'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COMPLETED_PREP_PLAN: TrainingPlan = {
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

const COMPLETED_MAINT_PLAN: TrainingPlan = {
  ...COMPLETED_PREP_PLAN,
  goalId: null,
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
  trainingState: TrainingState.Transition,
}

function makeWeeks(count: number, volume = 300, phaseName = 'FQ'): PlannedWeek[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    planId: 1,
    weekNumber: i + 1,
    phaseName,
    phaseLabel: phaseName,
    isRecoveryWeek: i === count - 1,
    targetVolumeMinutes: volume,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

function makeMaintenanceWeeks(maintenanceVolume: number): PlannedWeek[] {
  return [
    {
      id: 1,
      planId: 1,
      weekNumber: 1,
      phaseName: 'MAINT',
      phaseLabel: 'Maintenance',
      isRecoveryWeek: false,
      targetVolumeMinutes: maintenanceVolume,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      planId: 1,
      weekNumber: 2,
      phaseName: 'MAINT',
      phaseLabel: 'Maintenance',
      isRecoveryWeek: false,
      targetVolumeMinutes: maintenanceVolume,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      planId: 1,
      weekNumber: 3,
      phaseName: 'MAINT',
      phaseLabel: 'Maintenance',
      isRecoveryWeek: false,
      targetVolumeMinutes: maintenanceVolume,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 4,
      planId: 1,
      weekNumber: 4,
      phaseName: 'MAINT',
      phaseLabel: 'Maintenance',
      isRecoveryWeek: true,
      targetVolumeMinutes: Math.round(maintenanceVolume * 0.75),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]
}

function makePlanRepo(
  plans: TrainingPlan[] = [],
  weeks: PlannedWeek[] = []
): TrainingPlanRepository & { createdPlans: TrainingPlan[] } {
  const createdPlans: TrainingPlan[] = []

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
    async update(): Promise<TrainingPlan> {
      return plans[0]
    }
    async delete(): Promise<void> {}
    async createWeek(): Promise<PlannedWeek> {
      return {
        id: 1,
        planId: 99,
        weekNumber: 1,
        phaseName: 'MAINT',
        phaseLabel: 'Maintenance',
        isRecoveryWeek: false,
        targetVolumeMinutes: 100,
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
  }
  Object.defineProperty(repo, 'createdPlans', { get: () => createdPlans })
  return repo
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
      if (data.trainingState !== undefined) updatedTrainingState = data.trainingState
      return { ...profile, ...data }
    }
  }

  const repo = new MockProfileRepo() as unknown as UserProfileRepository & {
    updatedTrainingState: TrainingState | null
  }
  Object.defineProperty(repo, 'updatedTrainingState', { get: () => updatedTrainingState })
  return repo
}

function makeEngine(): TrainingPlanEngine & { capturedRequest: MaintenancePlanRequest | null } {
  let capturedRequest: MaintenancePlanRequest | null = null

  class MockEngine extends TrainingPlanEngine {
    generatePlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    recalibrate(): GeneratedPlan {
      throw new Error('not impl')
    }
    generateTransitionPlan(): GeneratedPlan {
      throw new Error('not impl')
    }
    generateMaintenancePlan(req: MaintenancePlanRequest): GeneratedPlan {
      capturedRequest = req
      return {
        methodology: TrainingMethodology.Daniels,
        totalWeeks: 4,
        weeks: Array.from({ length: 4 }, (_, i) => ({
          weekNumber: i + 1,
          phaseName: 'MAINT',
          isRecoveryWeek: i === 3,
          targetVolumeMinutes: Math.round(req.currentWeeklyVolumeMinutes * 0.35),
          sessions: [],
        })),
      }
    }
  }

  const engine = new MockEngine() as unknown as TrainingPlanEngine & {
    capturedRequest: MaintenancePlanRequest | null
  }
  Object.defineProperty(engine, 'capturedRequest', { get: () => capturedRequest })
  return engine
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('GenerateMaintenancePlan', () => {
  test('lève NoCompletedPlanError si aucun plan terminé', async ({ assert }) => {
    const planRepo = makePlanRepo([])
    const useCase = new GenerateMaintenancePlan(
      planRepo,
      makeUserProfileRepo(USER_PROFILE),
      makeEngine()
    )
    await assert.rejects(() => useCase.execute(1), NoCompletedPlanError)
  })

  test('crée un nouveau plan de maintenance actif', async ({ assert }) => {
    const weeks = makeWeeks(12, 300)
    const planRepo = makePlanRepo([COMPLETED_PREP_PLAN], weeks)

    const useCase = new GenerateMaintenancePlan(
      planRepo,
      makeUserProfileRepo(USER_PROFILE),
      makeEngine()
    )
    const result = await useCase.execute(1)

    assert.equal(result.plan.status, PlanStatus.Active)
    assert.isNull(result.plan.goalId)
    assert.equal(planRepo.createdPlans.length, 1)
  })

  test('utilise le volume pic des semaines non-récupération pour un plan de prépa', async ({
    assert,
  }) => {
    const weeks = makeWeeks(12, 300)
    const planRepo = makePlanRepo([COMPLETED_PREP_PLAN], weeks)
    const engine = makeEngine()

    const useCase = new GenerateMaintenancePlan(planRepo, makeUserProfileRepo(USER_PROFILE), engine)
    await useCase.execute(1)

    assert.equal(engine.capturedRequest?.currentWeeklyVolumeMinutes, 300)
  })

  test('reconstruit le volume pic depuis un plan maintenance (boucle)', async ({ assert }) => {
    // Plan de maintenance avec volume 105 min/semaine → pic reconstruit = 300 min (105 / 0.35)
    const maintenanceVolume = 105
    const weeks = makeMaintenanceWeeks(maintenanceVolume)
    const planRepo = makePlanRepo([COMPLETED_MAINT_PLAN], weeks)
    const engine = makeEngine()

    const useCase = new GenerateMaintenancePlan(planRepo, makeUserProfileRepo(USER_PROFILE), engine)
    await useCase.execute(1)

    const expectedPeak = Math.round(maintenanceVolume / 0.35)
    assert.equal(engine.capturedRequest?.currentWeeklyVolumeMinutes, expectedPeak)
  })

  test('met le trainingState à Maintenance', async ({ assert }) => {
    const weeks = makeWeeks(4, 300)
    const planRepo = makePlanRepo([COMPLETED_PREP_PLAN], weeks)
    const profileRepo = makeUserProfileRepo(USER_PROFILE)

    const useCase = new GenerateMaintenancePlan(planRepo, profileRepo, makeEngine())
    await useCase.execute(1)

    assert.equal(profileRepo.updatedTrainingState, TrainingState.Maintenance)
  })
})
