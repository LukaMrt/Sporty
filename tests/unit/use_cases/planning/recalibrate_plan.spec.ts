import { test } from '@japa/runner'
import RecalibratePlan from '#use_cases/planning/recalibrate_plan'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { EventEmitter } from '#domain/interfaces/event_emitter'
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
import type { GeneratedPlan } from '#domain/interfaces/training_plan_engine'
import type { WeekSummary } from '#use_cases/planning/recalibrate_plan'

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

const WEEK_SUMMARY_WITHIN_THRESHOLD: WeekSummary = {
  weekNumber: 2,
  plannedLoadTss: 100,
  actualLoadTss: 105, // +5 % → sous le seuil de 10 %
  qualitySessions: [],
}

const WEEK_SUMMARY_MODERATE_OVERSHOOT: WeekSummary = {
  weekNumber: 2,
  plannedLoadTss: 100,
  actualLoadTss: 115, // +15 % → ajustement allures
  qualitySessions: [{ sessionType: SessionType.Tempo, actualTss: 30, plannedTss: 25 }],
}

const WEEK_SUMMARY_UNDERSHOOT: WeekSummary = {
  weekNumber: 2,
  plannedLoadTss: 100,
  actualLoadTss: 70, // -30 % → réduction charge
  qualitySessions: [],
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makePlanRepo(
  plan: TrainingPlan | null,
  sessions: PlannedSession[] = [],
  weeks: PlannedWeek[] = []
): TrainingPlanRepository & {
  updatedWith: Partial<TrainingPlan> | null
  deletedFromWeek: number | null
} {
  let updatedWith: Partial<TrainingPlan> | null = null
  let deletedFromWeek: number | null = null

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
    async update(_id: number, data: Partial<TrainingPlan>): Promise<TrainingPlan> {
      updatedWith = data
      return { ...ACTIVE_PLAN, ...data }
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
    async deleteSessionsFromWeek(_planId: number, fromWeek: number): Promise<void> {
      deletedFromWeek = fromWeek
    }
  }

  const repo = new MockPlanRepo()
  Object.defineProperty(repo, 'updatedWith', { get: () => updatedWith })
  Object.defineProperty(repo, 'deletedFromWeek', { get: () => deletedFromWeek })
  return repo as unknown as TrainingPlanRepository & {
    updatedWith: Partial<TrainingPlan> | null
    deletedFromWeek: number | null
  }
}

function makeSessionRepo(sessions: TrainingSession[] = []): SessionRepository {
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
      return sessions
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

function makeEventEmitter(): EventEmitter {
  class MockEventEmitter extends EventEmitter {
    async emit(): Promise<void> {}
  }
  return new MockEventEmitter()
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

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('RecalibratePlan', () => {
  test('ne fait rien si autoRecalibrate === false', async ({ assert }) => {
    const planRepo = makePlanRepo({ ...ACTIVE_PLAN, autoRecalibrate: false })
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    await useCase.execute(1, WEEK_SUMMARY_MODERATE_OVERSHOOT)

    assert.isNull(planRepo.updatedWith)
  })

  test('ne fait rien si delta < ±10 %', async ({ assert }) => {
    const planRepo = makePlanRepo(ACTIVE_PLAN)
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    await useCase.execute(1, WEEK_SUMMARY_WITHIN_THRESHOLD)

    assert.isNull(planRepo.updatedWith)
  })

  test('met à jour le plan si delta > +20 % avec séances qualité', async ({ assert }) => {
    // Session semaine 3 (future) pour que le use case ne retourne pas tôt
    const futureSessions: PlannedSession[] = [
      {
        id: 99,
        planId: 1,
        weekNumber: 3,
        dayOfWeek: 2,
        sessionType: SessionType.Easy,
        targetDurationMinutes: 45,
        targetDistanceKm: null,
        targetPacePerKm: null,
        intensityZone: IntensityZone.Z2,
        intervals: null,
        targetLoadTss: 40,
        completedSessionId: null,
        status: PlannedSessionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const futureWeeks: PlannedWeek[] = [
      {
        id: 3,
        planId: 1,
        weekNumber: 3,
        phaseName: 'FI',
        phaseLabel: 'Foundation',
        isRecoveryWeek: false,
        targetVolumeMinutes: 180,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const planRepo = makePlanRepo(ACTIVE_PLAN, futureSessions, futureWeeks)
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    const highOvershoot: WeekSummary = {
      weekNumber: 2,
      plannedLoadTss: 100,
      actualLoadTss: 130, // +30 %
      qualitySessions: [{ sessionType: SessionType.Interval, actualTss: 40, plannedTss: 30 }],
    }

    await useCase.execute(1, highOvershoot)

    // Le plan doit être mis à jour (lastRecalibratedAt)
    assert.isNotNull(planRepo.updatedWith)
  })

  test('réduit la charge si delta > -20 %', async ({ assert }) => {
    const futureSessions: PlannedSession[] = [
      {
        id: 99,
        planId: 1,
        weekNumber: 3,
        dayOfWeek: 2,
        sessionType: SessionType.Easy,
        targetDurationMinutes: 45,
        targetDistanceKm: null,
        targetPacePerKm: null,
        intensityZone: IntensityZone.Z2,
        intervals: null,
        targetLoadTss: 40,
        completedSessionId: null,
        status: PlannedSessionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const futureWeeks: PlannedWeek[] = [
      {
        id: 3,
        planId: 1,
        weekNumber: 3,
        phaseName: 'FI',
        phaseLabel: 'Foundation',
        isRecoveryWeek: false,
        targetVolumeMinutes: 180,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    const planRepo = makePlanRepo(ACTIVE_PLAN, futureSessions, futureWeeks)
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    await useCase.execute(1, WEEK_SUMMARY_UNDERSHOOT)

    assert.isNotNull(planRepo.updatedWith)
  })

  test('ne recalibre pas si pas de plan actif', async ({ assert }) => {
    const planRepo = makePlanRepo(null)
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    await useCase.execute(1, WEEK_SUMMARY_MODERATE_OVERSHOOT)

    assert.isNull(planRepo.updatedWith)
  })

  test('crée une proposition de baisse VDOT après 3 séances qualité sous cibles', async ({
    assert,
  }) => {
    // Simuler 3 semaines de séances qualité complétées mais qui n'ont pas atteint les cibles
    const sessions: PlannedSession[] = [1, 2, 3].flatMap((week) => [
      {
        id: week * 10,
        planId: 1,
        weekNumber: week,
        dayOfWeek: 2,
        sessionType: SessionType.Tempo,
        targetDurationMinutes: 60,
        targetDistanceKm: null,
        targetPacePerKm: null,
        intensityZone: IntensityZone.Z4,
        intervals: null,
        targetLoadTss: 50,
        completedSessionId: week * 100,
        status: PlannedSessionStatus.Completed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    const planRepo = makePlanRepo(ACTIVE_PLAN, sessions)
    const useCase = new RecalibratePlan(
      planRepo,
      makeSessionRepo(),
      makeGoalRepo(),
      makePlanEngine(),
      makeEventEmitter()
    )

    // Semaine courante = 3, pas de sous-performance marquée sur le delta global
    // mais les séances qualité des 3 dernières semaines sont complétées (doit déclencher check)
    const weekSummary: WeekSummary = {
      weekNumber: 3,
      plannedLoadTss: 100,
      actualLoadTss: 115, // +15 % → dans la plage modérée
      qualitySessions: [{ sessionType: SessionType.Tempo, actualTss: 20, plannedTss: 50 }],
    }

    await useCase.execute(1, weekSummary)

    // Chaque séance qualité a completedSessionId non nul mais recentSessions est vide
    // → la session liée est introuvable → détectée comme sous-cible pour les 3 semaines
    // → pendingVdotDown doit être créé (currentVdot - 2 = 43)
    assert.isNotNull(planRepo.updatedWith)
    assert.equal(planRepo.updatedWith?.pendingVdotDown, 43)
  })
})
