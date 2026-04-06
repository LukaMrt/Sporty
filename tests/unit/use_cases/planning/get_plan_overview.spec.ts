import { test } from '@japa/runner'
import GetPlanOverview from '#use_cases/planning/get_plan_overview'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { PaginatedResult } from '#domain/entities/pagination'
import {
  TrainingState,
  TrainingMethodology,
  PlanType,
  PlanStatus,
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'
import { UserLevel } from '#domain/entities/user_profile'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GOAL: TrainingGoal = {
  id: 1,
  userId: 1,
  targetDistanceKm: 42,
  targetTimeMinutes: null,
  eventDate: null,
  status: 'active',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

const PLAN: TrainingPlan = {
  id: 1,
  userId: 1,
  goalId: 1,
  methodology: TrainingMethodology.Daniels,
  level: PlanType.Marathon,
  status: PlanStatus.Active,
  autoRecalibrate: false,
  vdotAtCreation: 45,
  currentVdot: 45,
  sessionsPerWeek: 4,
  preferredDays: [1, 3, 5, 6],
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  lastRecalibratedAt: null,
  pendingVdotDown: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

const WEEK: PlannedWeek = {
  id: 1,
  planId: 1,
  weekNumber: 1,
  phaseName: 'FI',
  phaseLabel: 'Fondation',
  isRecoveryWeek: false,
  targetVolumeMinutes: 200,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

const SESSION: PlannedSession = {
  id: 1,
  planId: 1,
  weekNumber: 1,
  dayOfWeek: 1,
  sessionType: SessionType.Easy,
  targetDurationMinutes: 45,
  targetDistanceKm: 8,
  targetPacePerKm: '5:30',
  intensityZone: IntensityZone.Z2,
  intervals: null,
  targetLoadTss: 50,
  completedSessionId: null,
  status: PlannedSessionStatus.Pending,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

const FITNESS_PROFILE: FitnessProfile = {
  chronicTrainingLoad: 45,
  acuteTrainingLoad: 65,
  trainingStressBalance: -20,
  acuteChronicWorkloadRatio: 1.44,
  calculatedAt: new Date(),
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeGoalRepo(goal: TrainingGoal | null): TrainingGoalRepository {
  class MockGoalRepo extends TrainingGoalRepository {
    async create(): Promise<TrainingGoal> {
      throw new Error('not implemented')
    }
    async findById(): Promise<TrainingGoal | null> {
      return null
    }
    async findByUserId(): Promise<TrainingGoal[]> {
      return []
    }
    async findActiveByUserId(): Promise<TrainingGoal | null> {
      return goal
    }
    async update(): Promise<TrainingGoal> {
      throw new Error('not implemented')
    }
    async delete(): Promise<void> {}
  }
  return new MockGoalRepo()
}

function makePlanRepo(
  plan: TrainingPlan | null,
  weeks: PlannedWeek[],
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
      return weeks
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

function makeSessionRepo(sessions: TrainingSession[]): SessionRepository {
  class MockSessionRepo extends SessionRepository {
    async create(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return {
        data: sessions,
        meta: { page: 1, lastPage: 1, perPage: 100, total: sessions.length },
      }
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
      return sessions
    }
    async findByUserAndExternalIds(): Promise<{ externalId: string; id: number }[]> {
      return []
    }
    async forceDelete(): Promise<void> {}
  }
  return new MockSessionRepo()
}

function makeProfileRepo(profile: UserProfile | null): UserProfileRepository {
  class MockProfileRepo extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return profile
    }
    async update(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
  }
  return new MockProfileRepo()
}

function makeLoadCalculator(): TrainingLoadCalculator {
  class MockLoadCalc extends TrainingLoadCalculator {
    calculate(): TrainingLoad {
      return { value: 50, method: 'rpe' }
    }
  }
  return new MockLoadCalc()
}

function makeFitnessCalculator(result: FitnessProfile): FitnessProfileCalculator {
  class MockFitnessCalc extends FitnessProfileCalculator {
    calculate(): FitnessProfile {
      return result
    }
  }
  return new MockFitnessCalc()
}

const DEFAULT_PROFILE: UserProfile = {
  id: 1,
  userId: 1,
  sportId: 1,
  level: UserLevel.Intermediate,
  objective: null,
  preferences: {
    speedUnit: 'min_km',
    distanceUnit: 'km',
    weightUnit: 'kg',
    weekStartsOn: 'monday',
    dateFormat: 'DD/MM/YYYY',
    locale: 'fr',
  },
  maxHeartRate: 180,
  restingHeartRate: 55,
  vma: null,
  sex: null,
  trainingState: TrainingState.Idle,
}

const TRAINING_SESSION: TrainingSession = {
  id: 1,
  userId: 1,
  sportId: 1,
  sportName: 'Course à pied',
  date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  durationMinutes: 45,
  distanceKm: 8,
  avgHeartRate: 155,
  perceivedEffort: 6,
  sportMetrics: {},
  notes: null,
  importedFrom: 'strava',
  createdAt: new Date().toISOString(),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('GetPlanOverview', () => {
  test('retourne null si aucun plan actif', async ({ assert }) => {
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(null, [], []),
      makeSessionRepo([]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )

    const result = await useCase.execute(1)
    assert.isNull(result)
  })

  test('retourne null si aucun objectif actif', async ({ assert }) => {
    const useCase = new GetPlanOverview(
      makeGoalRepo(null),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )

    const result = await useCase.execute(1)
    assert.isNull(result)
  })

  test('retourne le plan overview avec fitnessProfile si des séances existent', async ({
    assert,
  }) => {
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([TRAINING_SESSION]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )

    const result = await useCase.execute(1)

    assert.isNotNull(result)
    assert.equal(result!.plan.id, PLAN.id)
    assert.equal(result!.goal.id, GOAL.id)
    assert.lengthOf(result!.weeks, 1)
    assert.isNotNull(result!.fitnessProfile)
    assert.equal(
      result!.fitnessProfile!.acuteChronicWorkloadRatio,
      FITNESS_PROFILE.acuteChronicWorkloadRatio
    )
  })

  test("retourne fitnessProfile null si aucune séance d'entraînement", async ({ assert }) => {
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )

    const result = await useCase.execute(1)

    assert.isNotNull(result)
    assert.isNull(result!.fitnessProfile)
  })

  test('retourne inactivityLevel none si dernière séance < 14 jours', async ({ assert }) => {
    const recentSession: TrainingSession = {
      ...TRAINING_SESSION,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([recentSession]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )
    const result = await useCase.execute(1)
    assert.isNotNull(result)
    assert.equal(result!.inactivityLevel, 'none')
    assert.equal(result!.daysSinceLastSession, 3)
  })

  test('retourne inactivityLevel warning si dernière séance entre 14 et 28 jours', async ({
    assert,
  }) => {
    const oldSession: TrainingSession = {
      ...TRAINING_SESSION,
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([oldSession]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )
    const result = await useCase.execute(1)
    assert.isNotNull(result)
    assert.equal(result!.inactivityLevel, 'warning')
    assert.equal(result!.daysSinceLastSession, 20)
  })

  test('retourne inactivityLevel critical si dernière séance > 28 jours', async ({ assert }) => {
    const veryOldSession: TrainingSession = {
      ...TRAINING_SESSION,
      date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([veryOldSession]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )
    const result = await useCase.execute(1)
    assert.isNotNull(result)
    assert.equal(result!.inactivityLevel, 'critical')
  })

  test('retourne inactivityLevel none et daysSinceLastSession null si aucune séance', async ({
    assert,
  }) => {
    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK], [SESSION]),
      makeSessionRepo([]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )
    const result = await useCase.execute(1)
    assert.isNotNull(result)
    assert.equal(result!.inactivityLevel, 'none')
    assert.isNull(result!.daysSinceLastSession)
  })

  test('groupe les séances par numéro de semaine', async ({ assert }) => {
    const session2: PlannedSession = { ...SESSION, id: 2, weekNumber: 2, dayOfWeek: 3 }
    const week2: PlannedWeek = { ...WEEK, id: 2, weekNumber: 2 }

    const useCase = new GetPlanOverview(
      makeGoalRepo(GOAL),
      makePlanRepo(PLAN, [WEEK, week2], [SESSION, session2]),
      makeSessionRepo([]),
      makeProfileRepo(DEFAULT_PROFILE),
      makeLoadCalculator(),
      makeFitnessCalculator(FITNESS_PROFILE)
    )

    const result = await useCase.execute(1)

    assert.isNotNull(result)
    assert.property(result!.sessionsByWeek, '1')
    assert.property(result!.sessionsByWeek, '2')
    assert.lengthOf(result!.sessionsByWeek[1], 1)
    assert.lengthOf(result!.sessionsByWeek[2], 1)
  })
})
