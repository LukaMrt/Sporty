import { test } from '@japa/runner'
import GeneratePlan from '#use_cases/planning/generate_plan'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'
import {
  TrainingMethodology,
  TrainingState,
  PlanStatus,
  PlanType,
  IntensityZone,
  SessionType,
} from '#domain/value_objects/planning_types'
import type { TrainingGoal } from '#domain/entities/training_goal'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { PlanRequest } from '#domain/value_objects/plan_request'
import type { PaginatedResult } from '#domain/entities/pagination'
import { UserLevel } from '#domain/entities/user_profile'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_GOAL: TrainingGoal = {
  id: 1,
  userId: 1,
  targetDistanceKm: 42.195,
  targetTimeMinutes: null,
  eventDate: null,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const PLAN_TEMPLATE: TrainingPlan = {
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
  startDate: (() => {
    const d = new Date()
    const day = d.getDay()
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + daysUntilNextMonday)
    return d.toISOString().slice(0, 10)
  })(),
  endDate: '2026-06-01',
  lastRecalibratedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const GENERATED_PLAN: GeneratedPlan = {
  weeks: [
    {
      weekNumber: 1,
      phaseName: 'FI',
      isRecoveryWeek: false,
      targetVolumeMinutes: 200,
      sessions: [
        {
          dayOfWeek: 1,
          sessionType: SessionType.Easy,
          targetDurationMinutes: 50,
          targetDistanceKm: 9,
          targetPacePerKm: '6:00',
          intensityZone: IntensityZone.Z2,
          intervals: null,
        },
      ],
    },
  ],
  methodology: TrainingMethodology.Daniels,
  totalWeeks: 12,
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
  trainingState: TrainingState.InPlan,
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

let capturedTrainingState: TrainingState | undefined

function makePlanRepo(existingActivePlan: TrainingPlan | null): TrainingPlanRepository {
  class MockPlanRepo extends TrainingPlanRepository {
    async create(): Promise<TrainingPlan> {
      return PLAN_TEMPLATE
    }
    async findById(): Promise<TrainingPlan | null> {
      return null
    }
    async findByUserId(): Promise<TrainingPlan[]> {
      return []
    }
    async findActiveByUserId(): Promise<TrainingPlan | null> {
      return existingActivePlan
    }
    async findActiveByGoalId(): Promise<TrainingPlan | null> {
      return null
    }
    async update(): Promise<TrainingPlan> {
      return PLAN_TEMPLATE
    }
    async delete(): Promise<void> {}
    async createWeek(
      data: Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<PlannedWeek> {
      return {
        id: 1,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    async findWeeksByPlanId(): Promise<PlannedWeek[]> {
      return []
    }
    async createSession(
      data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<PlannedSession> {
      return {
        id: 1,
        ...data,
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
      throw new Error('not implemented')
    }
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

function makeLoadCalculator(): TrainingLoadCalculator {
  class MockCalc extends TrainingLoadCalculator {
    calculate(): TrainingLoad {
      return { value: 50, method: 'rpe' }
    }
  }
  return new MockCalc()
}

function makeFitnessCalculator(): FitnessProfileCalculator {
  class MockFitness extends FitnessProfileCalculator {
    calculate(): FitnessProfile {
      return {
        chronicTrainingLoad: 45,
        acuteTrainingLoad: 50,
        trainingStressBalance: -5,
        acuteChronicWorkloadRatio: 1.1,
        calculatedAt: new Date(),
      }
    }
  }
  return new MockFitness()
}

function makePlanEngine(): TrainingPlanEngine {
  class MockEngine extends TrainingPlanEngine {
    generatePlan(): GeneratedPlan {
      return GENERATED_PLAN
    }
    recalibrate(): GeneratedPlan {
      return GENERATED_PLAN
    }
    generateMaintenancePlan(): GeneratedPlan {
      return GENERATED_PLAN
    }
    generateTransitionPlan(): GeneratedPlan {
      return GENERATED_PLAN
    }
  }
  return new MockEngine()
}

let capturedWeeklyVolume: number | undefined

function makePlanEngineCapturing(): TrainingPlanEngine {
  class CapturingEngine extends TrainingPlanEngine {
    generatePlan(request: PlanRequest): GeneratedPlan {
      capturedWeeklyVolume = request.currentWeeklyVolumeMinutes
      return GENERATED_PLAN
    }
    recalibrate(): GeneratedPlan {
      return GENERATED_PLAN
    }
    generateMaintenancePlan(): GeneratedPlan {
      return GENERATED_PLAN
    }
    generateTransitionPlan(): GeneratedPlan {
      return GENERATED_PLAN
    }
  }
  return new CapturingEngine()
}

function makeSession(date: string, durationMinutes: number): TrainingSession {
  return {
    id: Math.random(),
    userId: 1,
    sportId: 1,
    sportName: 'running',
    date,
    durationMinutes,
    distanceKm: null,
    avgHeartRate: null,
    perceivedEffort: null,
    sportMetrics: {},
    notes: null,
    createdAt: new Date().toISOString(),
  }
}

function makeUserProfileRepo(): UserProfileRepository {
  class MockProfileRepo extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return DEFAULT_PROFILE
    }
    async update(
      _userId: number,
      data: Partial<Omit<UserProfile, 'id' | 'userId'>>
    ): Promise<UserProfile> {
      if (data.trainingState) capturedTrainingState = data.trainingState
      return DEFAULT_PROFILE
    }
  }
  return new MockProfileRepo()
}

function makeUseCase(
  goal: TrainingGoal | null,
  existingPlan: TrainingPlan | null = null,
  sessions: TrainingSession[] = []
) {
  return new GeneratePlan(
    makeGoalRepo(goal),
    makePlanRepo(existingPlan),
    makeSessionRepo(sessions),
    makeLoadCalculator(),
    makeFitnessCalculator(),
    makePlanEngine(),
    makeUserProfileRepo()
  )
}

const FIVE_K_GOAL_FOR_VOLUME: TrainingGoal = { ...ACTIVE_GOAL, targetDistanceKm: 5 }

// Utilise un objectif 5k (floor = 0) pour tester la logique de calcul du volume
// sans que le plancher par distance n'interfère avec les assertions
function makeUseCaseCapturing(sessions: TrainingSession[]) {
  return new GeneratePlan(
    makeGoalRepo(FIVE_K_GOAL_FOR_VOLUME),
    makePlanRepo(null),
    makeSessionRepo(sessions),
    makeLoadCalculator(),
    makeFitnessCalculator(),
    makePlanEngineCapturing(),
    makeUserProfileRepo()
  )
}

const INPUT = {
  userId: 1,
  vdot: 45,
  sessionsPerWeek: 4,
  preferredDays: [1, 3, 5, 6],
  planDurationWeeks: 12,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('GeneratePlan — use case', () => {
  test('génère et persiste un plan quand tout est valide', async ({ assert }) => {
    const useCase = makeUseCase(ACTIVE_GOAL)
    const result = await useCase.execute(INPUT)

    assert.equal(result.plan.id, PLAN_TEMPLATE.id)
    assert.equal(result.plan.status, PlanStatus.Active)
    assert.lengthOf(result.weeks, 1)
    assert.lengthOf(result.sessions, 1)
  })

  test('lève NoActiveGoalError si aucun objectif actif', async ({ assert }) => {
    const useCase = makeUseCase(null)
    await assert.rejects(() => useCase.execute(INPUT), NoActiveGoalError)
  })

  test('lève ActivePlanExistsError si un plan actif existe déjà', async ({ assert }) => {
    const useCase = makeUseCase(ACTIVE_GOAL, PLAN_TEMPLATE)
    await assert.rejects(() => useCase.execute(INPUT), ActivePlanExistsError)
  })

  test('met à jour le trainingState en Preparation après génération', async ({ assert }) => {
    capturedTrainingState = undefined
    const useCase = makeUseCase(ACTIVE_GOAL)
    await useCase.execute(INPUT)

    assert.equal(capturedTrainingState, TrainingState.Preparation)
  })

  test('les séances ont des intervals, un type et une zone', async ({ assert }) => {
    const useCase = makeUseCase(ACTIVE_GOAL)
    const result = await useCase.execute(INPUT)
    const session = result.sessions[0]

    assert.isDefined(session.sessionType)
    assert.isDefined(session.intensityZone)
    assert.isDefined(session.targetDurationMinutes)
  })
})

test.group('GeneratePlan — calcul du volume hebdomadaire', () => {
  test('divise par le nombre de semaines actives, pas par 6 fixe', async ({ assert }) => {
    capturedWeeklyVolume = undefined

    // 2 séances le même jour (1 seule semaine active = 1, pas 6)
    const today = new Date().toISOString().slice(0, 10)
    const sessions = [makeSession(today, 60), makeSession(today, 60)]

    await makeUseCaseCapturing(sessions).execute(INPUT)

    // 120 min sur 1 semaine active → 120 min/semaine (pas 120/6 = 20)
    assert.equal(capturedWeeklyVolume, 120)
  })

  test('moyenne correcte sur plusieurs semaines actives', async ({ assert }) => {
    capturedWeeklyVolume = undefined

    // Exactement 7 jours d'écart → toujours dans deux semaines epoch distinctes
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const sessions = [
      makeSession(today.toISOString().slice(0, 10), 60), // semaine courante : 60 min
      makeSession(sevenDaysAgo.toISOString().slice(0, 10), 40), // semaine précédente : 40 min
    ]

    await makeUseCaseCapturing(sessions).execute(INPUT)

    // (60 + 40) / 2 semaines actives = 50
    assert.equal(capturedWeeklyVolume, 50)
  })

  test("retourne 0 si aucune séance dans l'historique", async ({ assert }) => {
    capturedWeeklyVolume = undefined
    await makeUseCaseCapturing([]).execute(INPUT)
    assert.equal(capturedWeeklyVolume, 0)
  })
})

const MARATHON_GOAL: TrainingGoal = { ...ACTIVE_GOAL, targetDistanceKm: 42.195 }
const HALF_GOAL: TrainingGoal = { ...ACTIVE_GOAL, targetDistanceKm: 21.1 }
const TEN_K_GOAL: TrainingGoal = { ...ACTIVE_GOAL, targetDistanceKm: 10 }
const FIVE_K_GOAL: TrainingGoal = { ...ACTIVE_GOAL, targetDistanceKm: 5 }

function makeUseCaseCapturingWithGoal(goal: TrainingGoal, sessions: TrainingSession[] = []) {
  return new GeneratePlan(
    makeGoalRepo(goal),
    makePlanRepo(null),
    makeSessionRepo(sessions),
    makeLoadCalculator(),
    makeFitnessCalculator(),
    makePlanEngineCapturing(),
    makeUserProfileRepo()
  )
}

test.group('GeneratePlan — volume minimal par distance (D+B)', () => {
  test('marathon : volume relevé à 200 min si historique insuffisant', async ({ assert }) => {
    capturedWeeklyVolume = undefined
    const useCase = makeUseCaseCapturingWithGoal(MARATHON_GOAL, [
      makeSession(new Date().toISOString().slice(0, 10), 60), // 60 min/semaine → insuffisant
    ])
    const result = await useCase.execute(INPUT)

    assert.equal(capturedWeeklyVolume, 200, 'Le volume doit être relevé au minimum marathon')
    assert.isTrue(result.volumeAdjusted, 'volumeAdjusted doit être true')
  })

  test('demi-marathon : volume relevé à 150 min si insuffisant', async ({ assert }) => {
    capturedWeeklyVolume = undefined
    const useCase = makeUseCaseCapturingWithGoal(HALF_GOAL, [
      makeSession(new Date().toISOString().slice(0, 10), 80), // 80 min < 150 min
    ])
    const result = await useCase.execute(INPUT)

    assert.equal(capturedWeeklyVolume, 150)
    assert.isTrue(result.volumeAdjusted)
  })

  test('10k : volume relevé à 100 min si insuffisant', async ({ assert }) => {
    capturedWeeklyVolume = undefined
    const useCase = makeUseCaseCapturingWithGoal(TEN_K_GOAL, [
      makeSession(new Date().toISOString().slice(0, 10), 50), // 50 min < 100 min
    ])
    const result = await useCase.execute(INPUT)

    assert.equal(capturedWeeklyVolume, 100)
    assert.isTrue(result.volumeAdjusted)
  })

  test('5k : pas de minimum — volume réel utilisé', async ({ assert }) => {
    capturedWeeklyVolume = undefined
    const useCase = makeUseCaseCapturingWithGoal(FIVE_K_GOAL, [
      makeSession(new Date().toISOString().slice(0, 10), 20),
    ])
    const result = await useCase.execute(INPUT)

    assert.equal(capturedWeeklyVolume, 20, 'Aucun floor pour le 5km')
    assert.isFalse(result.volumeAdjusted)
  })

  test("pas d'ajustement si volume déjà suffisant", async ({ assert }) => {
    capturedWeeklyVolume = undefined
    const useCase = makeUseCaseCapturingWithGoal(MARATHON_GOAL, [
      makeSession(new Date().toISOString().slice(0, 10), 250), // 250 > 200
    ])
    const result = await useCase.execute(INPUT)

    assert.equal(capturedWeeklyVolume, 250, 'Le volume réel doit être préservé')
    assert.isFalse(result.volumeAdjusted)
  })
})
